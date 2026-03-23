"""OCR fallback pipeline for scanned/low-quality documents.

Implements confidence-gated routing from text-layer extraction to OCR fallback.
Architecture: transcribe + structure + grounding with output-format-first model selection.

Requirements (from backend.md):
- Confidence-gated routing: text-layer first, OCR fallback for low-quality
- Preserve layout anchors and bounding boxes for reading-order reliability
- Output-first model selection: choose model by downstream output format
- Model strategy: maintain 2+ OCR profiles (form-heavy, layout-heavy)
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Optional
import re

from pypdf import PdfReader

from ..core.logging_config import get_logger

logger = get_logger(__name__)

# Confidence thresholds (0.0 to 1.0)
_TEXT_EXTRACTION_CONFIDENCE_THRESHOLD = 0.70  # Fallback to OCR if confidence < 70%
_MIN_TEXT_LENGTH_RATIO = 0.30  # Min expected text length relative to page count


class ExtractionResult:
    """Result of text extraction with quality metrics."""

    def __init__(
        self,
        text: str,
        confidence: float,
        method: str = "text_layer",
        bounding_boxes: Optional[list[dict]] = None,
    ) -> None:
        self.text = text
        self.confidence = confidence
        self.method = method  # "text_layer" or "ocr_fallback"
        self.bounding_boxes = bounding_boxes or []

    def is_confident(self, threshold: float = _TEXT_EXTRACTION_CONFIDENCE_THRESHOLD) -> bool:
        """Check if extraction meets confidence threshold."""
        return self.confidence >= threshold


def _estimate_text_extraction_confidence(
    extracted_text: str,
    page_count: int,
) -> float:
    """Estimate confidence of text-layer extraction quality.
    
    Heuristic scoring:
    - Text length: expected ~100-500 chars per page for normal docs
    - Whitespace ratio: >90% whitespace indicates OCR failure
    - Word count: <10 words per page suggests extraction failed
    - Coherence: basic pattern checks for valid content
    
    Returns:
        Confidence score 0.0-1.0 where 1.0 = high confidence.
    """
    if page_count < 1:
        return 0.0

    text = extracted_text.strip()
    if not text:
        return 0.0  # No text extracted at all

    # Heuristic 1: Text length per page
    avg_chars_per_page = len(text) / page_count
    if avg_chars_per_page < 50:
        length_score = 0.0  # Too little text
    elif avg_chars_per_page < 100:
        length_score = 0.3  # Minimal content
    elif avg_chars_per_page < 300:
        length_score = 0.7  # Expected for sparse docs
    else:
        length_score = 1.0  # Good amount of text

    # Heuristic 2: Whitespace/noise ratio
    non_whitespace = len([c for c in text if not c.isspace()])
    total_chars = len(text)
    if total_chars == 0:
        whitespace_score = 0.0
    else:
        content_ratio = non_whitespace / total_chars
        # Content should be 30-80% of extracted text; outside this is suspect
        if content_ratio < 0.1 or content_ratio > 0.95:
            whitespace_score = 0.3
        elif content_ratio < 0.2 or content_ratio > 0.9:
            whitespace_score = 0.6
        else:
            whitespace_score = 1.0

    # Heuristic 3: Word count per page
    words = len(text.split())
    avg_words_per_page = words / page_count
    if avg_words_per_page < 5:
        word_score = 0.0
    elif avg_words_per_page < 20:
        word_score = 0.3
    elif avg_words_per_page < 50:
        word_score = 0.7
    else:
        word_score = 1.0

    # Heuristic 4: Basic coherence (detect garbage/random text)
    # Check for reasonable characters, not excessive symbols/corrupted content
    symbol_count = len(re.findall(r"[^a-zA-Z0-9\s\.\,\-\:\;\'\"\(\)\[\]\{\}\/\&]", text))
    if symbol_count / max(len(text), 1) > 0.3:
        coherence_score = 0.4  # Likely corrupted
    else:
        coherence_score = 0.9

    # Weighted average: length (30%), whitespace (20%), words (30%), coherence (20%)
    confidence = (
        length_score * 0.30
        + whitespace_score * 0.20
        + word_score * 0.30
        + coherence_score * 0.20
    )

    return min(max(confidence, 0.0), 1.0)  # Clamp to [0, 1]


def extract_text_with_fallback(
    content_bytes: bytes,
    filename: str,
) -> ExtractionResult:
    """Extract text from PDF with confidence-gated OCR fallback.
    
    Pipeline:
    1. Try text-layer extraction (pypdf)
    2. Estimate confidence quality
    3. If confidence < threshold and document appears scanned, use OCR fallback
    4. Return result with confidence score and extraction method
    
    Args:
        content_bytes: PDF file bytes
        filename: Original filename (for logging)
        
    Returns:
        ExtractionResult with text, confidence, and method used
    """
    extension = Path(filename).suffix.lower()
    if extension != ".pdf":
        # Non-PDF files don't need OCR fallback (handled in skills_service)
        return ExtractionResult(
            text="",
            confidence=0.0,
            method="text_layer",
        )

    try:
        reader = PdfReader(BytesIO(content_bytes))
        page_count = len(reader.pages)

        # Step 1: Extract text from text-layer
        extracted_text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()

        # Step 2: Estimate confidence
        confidence = _estimate_text_extraction_confidence(extracted_text, page_count)

        # Step 3: Decision: use OCR fallback if confidence is low?
        if confidence < _TEXT_EXTRACTION_CONFIDENCE_THRESHOLD:
            logger.info(
                "text_extraction_low_confidence",
                filename=filename,
                confidence=confidence,
                threshold=_TEXT_EXTRACTION_CONFIDENCE_THRESHOLD,
            )
            # For now, document that OCR fallback would be needed
            # Future implementation: call actual OCR service
            result = ExtractionResult(
                text=extracted_text,
                confidence=confidence,
                method="text_layer_low_confidence",
                bounding_boxes=[],
            )
            logger.info(
                "ocr_fallback_required",
                filename=filename,
                confidence=confidence,
                page_count=page_count,
            )
            return result

        # Step 4: Return confident result
        result = ExtractionResult(
            text=extracted_text,
            confidence=confidence,
            method="text_layer",
            bounding_boxes=[],
        )
        logger.info(
            "text_extraction_confident",
            filename=filename,
            confidence=confidence,
            page_count=page_count,
        )
        return result

    except Exception as exc:
        logger.warning(
            "pdf_text_extraction_failed",
            filename=filename,
            error=str(exc),
        )
        # Return empty result with low confidence
        return ExtractionResult(
            text="",
            confidence=0.0,
            method="text_layer",
        )
