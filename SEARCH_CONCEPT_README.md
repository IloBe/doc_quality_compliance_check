# How Is Search Done?

This document explains the **currently implemented search/retrieval concepts**, their **business use cases**, and the **coding locations**.

## 1) Current implemented search concepts

| Search concept | What it does | Business use case | Implemented coding files |
| --- | --- | --- | --- |
| Lexical keyword search (`ILIKE`) | Substring match on filename and extracted text | Fast lookup of documents during intake/evidence extraction | [src/doc_quality/services/skills_service.py](src/doc_quality/services/skills_service.py) (`search_documents()`), [src/doc_quality/models/skills.py](src/doc_quality/models/skills.py) (`SearchDocumentsRequest`) |
| Metadata filtering | Optional filter by `document_type` and bounded `limit` | Restrict retrieval to the right artifact class (e.g., SOP, risk docs) | [src/doc_quality/services/skills_service.py](src/doc_quality/services/skills_service.py), [src/doc_quality/models/skills.py](src/doc_quality/models/skills.py) |
| Recency ranking | Order results by newest (`created_at DESC`) | Prefer latest WIP/updated files in operational workflows | [src/doc_quality/services/skills_service.py](src/doc_quality/services/skills_service.py) |
| Deterministic ID fetch | Direct fetch by `document_id` | Traceable evidence retrieval for an already known document | [src/doc_quality/services/skills_service.py](src/doc_quality/services/skills_service.py) (`get_document()`), [src/doc_quality/api/routes/skills.py](src/doc_quality/api/routes/skills.py) |
| Orchestrator tool-driven retrieval | Agents call `get_document` and `search_documents` as tools | Intake scope resolution and evidence collection in review flows | [services/orchestrator/src/doc_quality_orchestrator/crews/review_flow.py](services/orchestrator/src/doc_quality_orchestrator/crews/review_flow.py), [services/orchestrator/src/doc_quality_orchestrator/crews/config/tasks.yaml](services/orchestrator/src/doc_quality_orchestrator/crews/config/tasks.yaml), [services/orchestrator/src/doc_quality_orchestrator/skills_api.py](services/orchestrator/src/doc_quality_orchestrator/skills_api.py) |
| LLM-assisted regulation research (not vector retrieval) | Perplexity call + static fallback map; extract framework names from answer text | Discover applicable regulations/standards by domain for compliance context | [src/doc_quality/services/research_service.py](src/doc_quality/services/research_service.py), [src/doc_quality/agents/research_agent.py](src/doc_quality/agents/research_agent.py), [src/doc_quality/api/routes/research.py](src/doc_quality/api/routes/research.py) |

---

### Details
Implemented search/retrieval concepts (current)

1.1 Lexical substring search (SQL ILIKE)

- Concept: simple keyword match over filename + extracted text.
- Business use case: quick document lookup for intake/evidence steps.
- Implemented in:
    - skills_service.search_documents()
    - SearchDocumentsRequest

1.2 Metadata-constrained retrieval

- Concept: optional document_type filter + result limit.
- Business use case: narrow searches to relevant artifact classes for audit workflows.
- Implemented in:
    - skills_service.search_documents()
    - SearchDocumentsRequest fields

1.3 Recency-first ranking

- Concept: order by created_at DESC.
- Business use case: when query is broad/empty, prioritize latest artifact in fast-moving compliance cycles.
- Implemented in:
    - skills_service.search_documents()

---

## 2) Retrieval methods currently **not** implemented

- BM25 ranking (native): Not present (no BM25/TFIDF/Elasticsearch/OpenSearch implementation in app code)
- Dense embedding retrieval (vector similarity): Not present (no embedding/vector index/vector store)
- Hybrid retrieval (BM25 + dense + re-ranking)

---

## 3) Would BM25 and dense retrieval make sense here?

**Yes — for this product, adding BM25 + dense retrieval is sensible** as document volume grows (WIP, approved, deleted, templates).

### Why this makes sense

1. Lexical-only search can miss semantically similar documents when terminology differs.
2. Compliance evidence often requires finding related passages, not exact wording.
3. Bridge/compliance workflows benefit from better recall and ranking quality as corpus size increases.
4. Status-aware retrieval (WIP vs approved vs deleted/template) becomes critical over time.

### Where it helps most

- Bridge compliance run evidence support (finding similar controls and prior approved evidence)
- Research and cross-document traceability
- Draft-vs-approved comparison and reuse of validated controls

---

## 4) Suggested target architecture (incremental)

### Phase A — Better lexical baseline

- Add weighted ranking over title + type + text + recency.
- Exclude or down-rank deleted documents by default.
- Add explicit status filters (`wip`, `approved`, `deleted`, `template`).

### Phase B — Dense retrieval with PostgreSQL extension

- Use PostgreSQL vector extension (e.g., `pgvector`) for embeddings.
- Store chunk-level vectors plus metadata (`document_id`, status, section, timestamps).
- Retrieve with cosine/L2 similarity + metadata filters.

### Phase C — Hybrid retrieval

- Candidate set from BM25/lexical + vector search.
- Fuse results (RRF or weighted score).
- Optional cross-encoder re-ranker for top-N precision.

### Phase D — Agentic retrieval quality

- Enforce evidence grounding rules (quote + location + source doc).
- Add evaluation set and retrieval KPIs (Recall@k, nDCG, hallucination rate).
- Keep reasoning in agents, retrieval in search layer (RAG alone is retrieval, not reasoning).

---

## 5) Data governance notes for compliance context

- Keep full provenance for retrieved evidence (document id, section/page, timestamp).
- Soft-delete strategy: never physically remove records needed for audits; use status flags.
- Apply role-based filtering so retrieval respects permissions.
- Version embeddings when content changes to avoid stale retrieval.

---

## 6) Short decision summary

- **Current state:** lexical + metadata + recency retrieval is implemented and functional.
- **Recommended next step:** introduce hybrid retrieval (BM25 + dense embeddings), preferably with PostgreSQL + vector extension, to improve scale, recall, and audit-quality evidence retrieval.
