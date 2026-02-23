"""Security utilities: input validation and sanitization."""
import re
from pathlib import Path

import bleach


_ALLOWED_FILENAME_RE = re.compile(r'^[\w\-. ]+$')
_ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.md', '.txt'}


def sanitize_text(text: str) -> str:
    """Strip HTML/JS from user-supplied text to prevent XSS."""
    return bleach.clean(text, tags=[], strip=True)


def validate_filename(filename: str) -> str:
    """Validate and sanitize an uploaded filename.

    Raises:
        ValueError: if filename is invalid or has disallowed extension.
    """
    name = Path(filename).name
    if not _ALLOWED_FILENAME_RE.match(name):
        raise ValueError(f"Invalid filename: {filename!r}")
    ext = Path(name).suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext!r}")
    return name


def validate_file_size(size_bytes: int, max_mb: int = 50) -> None:
    """Raise ValueError if file exceeds maximum allowed size."""
    max_bytes = max_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise ValueError(f"File size {size_bytes} bytes exceeds limit of {max_bytes} bytes")
