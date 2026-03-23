# Implementation Plan — Doc Quality & Compliance Check System

**Project:** Document Quality & Compliance Check System
**Version:** 1.0
**Duration:** 6 Weeks
**Owner:** Development Team

---

## Overview

This document describes the 6-week implementation plan for delivering the Document Quality & Compliance Check System — an AI-assisted platform for analysing technical documentation against arc42, Model Card, and SOP templates, with automated EU AI Act compliance verification.

---

## Week 1: Foundation & Core Architecture

**Goal:** Project setup, core domain models, and basic document analysis.

### Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1.1 | Repository setup, CI/CD pipeline (GitHub Actions) | DevOps | ✅ Done |
| 1.2 | Python project scaffold (FastAPI, pyproject.toml) | Backend | ✅ Done |
| 1.3 | Core Pydantic models: Document, Compliance, Report, Review | Backend | ✅ Done |
| 1.4 | Structured logging with structlog | Backend | ✅ Done |
| 1.5 | Configuration management (pydantic-settings, .env) | Backend | ✅ Done |
| 1.6 | Security utilities: input sanitization, filename validation | Backend | ✅ Done |
| 1.7 | arc42 document analyzer (12-section checker) | Backend | ✅ Done |
| 1.8 | Model Card analyzer (9-section checker) | Backend | ✅ Done |
| 1.9 | Unit tests for document analyzer | QA | ✅ Done |

### Deliverables
- Working document analysis service
- FastAPI app with `/documents/analyze` and `/documents/upload` endpoints
- Test coverage >80% for core services

---

## Week 2: Compliance Engine & EU AI Act

**Goal:** Implement EU AI Act compliance checking and regulation mapping.

### Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 2.1 | EU AI Act risk level classifier (Annex III categories) | Backend | ✅ Done |
| 2.2 | EU AI Act role detector (Provider / Deployer / Both) | Backend | ✅ Done |
| 2.3 | 9 EU AI Act requirement checkers (Art. 9–15, 43, 49) | Backend | ✅ Done |
| 2.4 | Domain-to-regulation mapping (Medical, Finance, HR, General) | Backend | ✅ Done |
| 2.5 | Compliance API routes (`/compliance/check/eu-ai-act`) | Backend | ✅ Done |
| 2.6 | Unit tests for compliance checker | QA | ✅ Done |
| 2.7 | MDR / GDPR / ISO 9001 framework stubs | Backend | 🔄 In Progress |

### Deliverables
- Full EU AI Act compliance check endpoint
- Regulation applicability detection
- Compliance score calculation

---

## Week 3: Report Generation & HITL Workflow

**Goal:** PDF report generation and Human-In-The-Loop review workflow.

### Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 3.1 | PDF report generator using ReportLab | Backend | ✅ Done |
| 3.2 | Section checklist table in PDF | Backend | ✅ Done |
| 3.3 | Compliance results in PDF report | Backend | ✅ Done |
| 3.4 | Report download endpoint | Backend | ✅ Done |
| 3.5 | HITL review workflow service (in-memory) | Backend | ✅ Done |
| 3.6 | Review record CRUD (create, read, update) | Backend | ✅ Done |
| 3.7 | Modification request model with importance levels | Backend | ✅ Done |
| 3.8 | Unit tests for report generator and HITL workflow | QA | ✅ Done |
| 3.9 | HTML report format (future milestone) | Backend | 📋 Planned |

### Deliverables
- Downloadable PDF compliance reports
- HITL review API
- Full test suite for reports and reviews

---

## Week 4: AI Agent Integration & Template Management

**Goal:** Anthropic Claude integration for AI-enhanced analysis; SOP template management.

### Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 4.1 | DocumentCheckAgent with LLM enrichment | AI | ✅ Done |
| 4.2 | ComplianceCheckAgent wrapping compliance service | AI | ✅ Done |
| 4.3 | Anthropic API key configuration and error handling | Backend | ✅ Done |
| 4.4 | 6 active SOP templates (markdown) | Content | ✅ Done |
| 4.5 | Template manager service (list, get by ID, index) | Backend | ✅ Done |
| 4.6 | Template API routes | Backend | ✅ Done |
| 4.7 | Unit tests for template manager | QA | ✅ Done |
| 4.8 | arc42 full template document | Content | ✅ Done |
| 4.9 | Inactive template stubs (test_strategy, deployment, etc.) | Content | ✅ Done |

### Deliverables
- AI-enhanced document analysis (optional, requires API key)
- 6 fully documented SOP templates
- arc42 reference template

---

## Week 5: Frontend Dashboard & Integration

**Goal:** Build the web dashboard and connect all backend services.

### Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 5.1 | HTML/CSS/JS frontend dashboard | Frontend | ✅ Done |
| 5.2 | Document analysis form (paste text + file upload) | Frontend | ✅ Done |
| 5.3 | EU AI Act compliance check form | Frontend | ✅ Done |
| 5.4 | Template browser with live preview | Frontend | ✅ Done |
| 5.5 | Report generation and download UI | Frontend | ✅ Done |
| 5.6 | API health status indicator | Frontend | ✅ Done |
| 5.7 | Drag-and-drop file upload | Frontend | ✅ Done |
| 5.8 | XSS protection (escapeHtml utility) | Frontend | ✅ Done |
| 5.9 | Responsive design (mobile-friendly) | Frontend | ✅ Done |
| 5.10 | Static file serving via FastAPI | Backend | ✅ Done |

### Deliverables
- Fully functional web dashboard
- End-to-end integration of all backend APIs
- Mobile-responsive UI

---

## Week 6: Testing, Security & Production Hardening

**Goal:** Final QA, security review, documentation, and deployment preparation.

### Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 6.1 | Integration tests for all API endpoints | QA | 📋 Planned |
| 6.2 | Security audit: input validation, CORS, rate limiting | Security | 📋 Planned |
| 6.3 | Performance benchmarking (load testing with locust) | QA | 📋 Planned |
| 6.4 | Database persistence layer (replace in-memory stores) | Backend | 📋 Planned |
| 6.5 | Authentication & authorisation (JWT / OAuth2) | Backend | 📋 Planned |
| 6.6 | CrewAI orchestrator service with one end-to-end workflow | Backend | 📋 Planned |
| 6.7 | Model adapter interface (`AnthropicAdapter`, `NemotronAdapter` scaffold) | Backend | 📋 Planned |
| 6.8 | Enforce Skills API boundary for agent/orchestrator tool access | Backend | 📋 Planned |
| 6.9 | Docker containerisation | DevOps | 📋 Planned |
| 6.10 | Deployment to staging environment | DevOps | 📋 Planned |
| 6.11 | Final documentation review | All | 📋 Planned |
| 6.12 | Stakeholder demo and sign-off | PM | 📋 Planned |

### Deliverables
- Production-ready deployment package
- Docker Compose / Kubernetes manifests
- Security hardening report
- Final stakeholder sign-off

---

## Architecture Decisions

| ADR | Decision | Rationale |
|-----|---------|-----------|
| ADR-001 | FastAPI as web framework | High performance, async-native, automatic OpenAPI docs |
| ADR-002 | Pydantic v2 for data validation | Type safety, performance, serialization |
| ADR-003 | Structlog for logging | Structured JSON logs, easier observability |
| ADR-004 | ReportLab for PDF generation | Mature Python PDF library, no external dependencies |
| ADR-005 | In-memory store for HITL reviews (v1) | Simplicity for initial implementation; replaced by DB in v2 |
| ADR-006 | Anthropic Claude for LLM analysis | Best-in-class document analysis capabilities |
| ADR-007 | Vanilla JS frontend | No build toolchain required, simpler deployment |
| ADR-008 | Hybrid CrewAI orchestration over Skills API | Enables multi-step workflows with minimal rewrite and strong guardrails |
| ADR-009 | Provider adapter layer for LLM/VLM access | Keeps orchestration vendor-neutral; allows Nemotron support via adapter |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Anthropic API unavailable | Rule-based analysis works independently of LLM |
| Large file uploads | File size validation (50MB limit), async processing |
| Compliance interpretation errors | Human review required for all compliance decisions |
| In-memory data loss | Documented as v1 limitation; DB persistence planned for v2 |

---

## Future Milestones (Post Week 6)

- [ ] Database persistence (PostgreSQL / SQLite)
- [ ] User authentication (JWT)
- [ ] Additional SOP templates (Test Strategy, Deployment, Data Governance, Security)
- [ ] GDPR / MDR / ISO 27001 full compliance checkers
- [ ] Bulk document processing
- [ ] Webhook notifications on review completion
- [ ] Integration with Confluence / SharePoint
- [ ] Multi-language support (German, French)
- [ ] Advanced AI agent with multi-step reasoning
- [ ] Dedicated `services/orchestrator/` runtime with CrewAI flow packaging
- [ ] Nemotron provider adapter promoted from scaffold to production integration
- [ ] Dashboard analytics and trend reporting
