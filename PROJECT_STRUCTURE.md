# Project Structure — Doc Quality Compliance Check

Complete tree-style overview of the codebase with inline descriptions of major components.

```
doc_quality_compliance_check/
│
├── 📋 Root Configuration & Documentation Files
│   ├── README.md                                   ← Main project documentation & getting started guide
│   ├── pyproject.toml                              ← Python project metadata, dependencies (uv-managed)
│   ├── requirements.txt                            ← Python package dependencies snapshot
│   ├── uv.lock                                     ← Locked dependency versions (uv package manager)
│   ├── docker-compose.yml                          ← Local dev environment: PostgreSQL 16 container
│   ├── .env.example                                ← Environment variables template
│   ├── .env.postgresql.example                     ← PostgreSQL-specific env vars template
│   ├── LICENSE                                     ← MIT License
│   └── .gitignore                                  ← Git ignore rules
│
├── 📚 Design & Planning Documents
│   ├── project-context/                            ← System architecture & implementation docs (3-phase model)
│   │   ├── 1.define/                               ← System Architecture & Requirements Phase
│   │   │   ├── sad.md                              ← System Architecture Document (ISO 25010, EU AI Act, HITL design)
│   │   │   └── [other planning docs]
│   │   │
│   │   ├── 2.build/                                ← Implementation & Integration Phase
│   │   │   ├── integration.md                      ← Next.js + FastAPI topology, API clients, auth flows
│   │   │   ├── backend.md                          ← Backend services, ORM models, API routes
│   │   │   ├── frontend.md                         ← Frontend pages, components, UX patterns
│   │   │   ├── setup.md                            ← Environment config, database setup, deployment
│   │   │   └── [other implementation docs]
│   │   │
│   │   └── 3.deliver/                              ← Deployment & Operations Phase (future)
│   │
│   ├── AGENTS.md                                   ← Agentic system overview & crew definitions
│   ├── CHECKLIST.md                                ← MVP completeness checklist
│   ├── IMPLEMENTATION_PLAN.md                      ← Phased delivery roadmap
│   ├── CREWAI_BEST_PRACTICES_ASSESSMENT.md         ← CrewAI pattern evaluation
│   ├── SEARCH_CONCEPT_README.md                    ← Vector search & retrieval strategy
│   │
│   └── 📖 Operational & Compliance Guides
│       ├── DATABASE_README.md                      ← PostgreSQL schema, migrations, setup, troubleshooting
│       ├── POSTGRES_SETUP_QUICKSTART.md            ← Copy/paste terminal commands for DB init
│       ├── POSTGRES_SETUP.md                       ← Detailed database configuration & verification
│       ├── POSTGRES_INFRASTRUCTURE_SETUP.md        ← Schema overview, deployment options
│       ├── AUTHENTICATION_AUTHORIZATION_README.md  ← Login, session, RBAC, throttling, recovery flows
│       ├── OBSERVABILITY_LOGGING_README.md         ← Structured logging, audit trail, monitoring
│       ├── APP_USER_HANDBOOK.md                    ← User guide for stakeholders & operational controls
│       ├── HITL_QUICK_REFERENCE.md                 ← Human-in-the-loop review workflow summary
│       ├── HITL_PERSISTENCE_FIX.md                 ← HITL data persistence implementation
│       ├── HITL_PERSISTENCE_CHANGE_SUMMARY.md      ← Recent HITL changes & decisions
│       └── HITL_PERSISTENCE_VERIFICATION.md        ← HITL testing & validation
│
├── 🔧 Backend Application (FastAPI + SQLAlchemy)
│   ├── src/
│   │   └── doc_quality/                            ← Main backend package
│   │       │
│   │       ├── api/                                ← FastAPI HTTP API layer
│   │       │   ├── main.py                         ← FastAPI app creation, middleware, lifespan, error handlers
│   │       │   └── routes/                         ← API endpoint modules (v1 prefix)
│   │       │       ├── auth.py                     ← Login, logout, session, password recovery endpoints
│   │       │       ├── bridge.py                   ← EU AI Act compliance run & alert endpoints
│   │       │       ├── compliance.py               ← Regulatory compliance checking endpoints
│   │       │       ├── dashboard.py                ← KPI aggregation & analytics endpoints
│   │       │       ├── documents.py                ← Document upload, analysis endpoints
│   │       │       ├── reports.py                  ← Report generation & download endpoints
│   │       │       ├── research.py                 ← External regulatory research endpoints
│   │       │       ├── skills.py                   ← Skills API (orchestrator bridge, logging, events)
│   │       │       ├── templates.py                ← Template library endpoints
│   │       │       └── __init__.py
│   │       │
│   │       ├── services/                           ← Business logic & orchestration layer
│   │       │   ├── compliance_checker.py           ← EU AI Act, ISO, GDPR compliance logic
│   │       │   ├── document_analyzer.py            ← Document parsing & quality assessment
│   │       │   ├── hitl_workflow.py                ← Human-in-the-loop review lifecycle & persistence
│   │       │   ├── ocr_fallback.py                 ← OCR for image-based documents
│   │       │   ├── report_generator.py             ← PDF/Markdown report generation
│   │       │   ├── research_service.py             ← Perplexity API research & fallback
│   │       │   ├── skills_service.py               ← Orchestrator skill endpoints & audit logging
│   │       │   ├── template_manager.py             ← Template loading & caching
│   │       │   └── __init__.py
│   │       │
│   │       ├── core/                               ← Cross-cutting utilities & infrastructure
│   │       │   ├── config.py                       ← Pydantic Settings (env vars, defaults)
│   │       │   ├── database.py                     ← SQLAlchemy engine, session, table creation
│   │       │   ├── logging_config.py               ← Structured logging (structlog) configuration
│   │       │   ├── passwords.py                    ← Password hashing (bcrypt) & verification
│   │       │   ├── rate_limit.py                   ← Global API throttling & login abuse protection
│   │       │   ├── security.py                     ← Input sanitization, PII redaction, file validation
│   │       │   ├── session_auth.py                 ← Session creation/validation, RBAC dependencies
│   │       │   └── __init__.py
│   │       │
│   │       ├── models/                             ← Pydantic models & SQLAlchemy ORM
│   │       │   ├── orm.py                          ← All ORM classes (UserSessionORM, ReviewRecordORM, AuditEventORM, etc.)
│   │       │   ├── compliance.py                   ← Compliance check & requirement models
│   │       │   ├── document.py                     ← Document analysis & section models
│   │       │   ├── report.py                       ← Report format & generation models
│   │       │   ├── research.py                     ← Research request/response models
│   │       │   ├── review.py                       ← HITL review verdict & modification models
│   │       │   ├── skills.py                       ← Skills API request/response models (LogEventRequest, etc.)
│   │       │   └── __init__.py
│   │       │
│   │       ├── agents/                             ← LLM agent definitions (future expandable)
│   │       │   └── [agent specs & configurations]
│   │       │
│   │       ├── prompts/                            ← LLM prompt templates
│   │       │   └── [compliance, analysis, review prompts]
│   │       │
│   │       └── __init__.py
│   │
│   ├── init_postgres.py                            ← Database initialization & migration runner script
│   │
│   ├── migrations/                                 ← Alembic database migrations
│   │   ├── alembic.ini                             ← Alembic config
│   │   ├── env.py                                  ← Migration runtime environment
│   │   ├── script.py.mako                          ← Migration template
│   │   ├── versions/                               ← Migration files (001_init, 002_hitl, etc.)
│   │   └── __pycache__/
│   │
│   ├── tests/                                      ← Integration & unit tests
│   │   ├── conftest.py                             ← Pytest fixtures & shared test setup
│   │   ├── test_auth_session_api.py                ← Session login/logout/recovery tests
│   │   ├── test_auth_authorization_api.py          ← RBAC authorization tests
│   │   ├── test_auth_rate_limit_api.py             ← Rate limiting & throttle tests
│   │   ├── test_bridge_run_api.py                  ← EU AI Act bridge execution tests
│   │   ├── test_compliance_checker.py              ← Compliance checking logic tests
│   │   ├── test_dashboard_api.py                   ← Dashboard aggregation tests
│   │   ├── test_document_analyzer.py               ← Document parsing & analysis tests
│   │   ├── test_error_envelope_api.py              ← Error response format tests
│   │   ├── test_hitl_workflow.py                   ← Human review lifecycle tests
│   │   ├── test_integration_api_workflow.py        ← End-to-end workflow tests
│   │   ├── test_report_generator.py                ← Report generation tests
│   │   ├── test_research_service.py                ← Research service tests
│   │   ├── test_skills_api.py                      ← Skills API endpoint tests
│   │   ├── test_template_manager.py                ← Template loading tests
│   │   ├── test_uat_workflow.py                    ← User acceptance testing workflows
│   │   └── __pycache__/
│   │
│   └── reports/                                    ← Generated compliance reports (output directory)
│
├── 🎨 Frontend Application (Next.js + React + TypeScript)
│   ├── frontend/
│   │   ├── pages/                                  ← Next.js page router (server-side & client routes)
│   │   │   ├── _app.tsx                            ← App wrapper, auth bootstrap, AuthProvider context
│   │   │   ├── _document.tsx                       ← HTML document structure
│   │   │   ├── login.tsx                           ← Email/password login page
│   │   │   ├── forgot-access.tsx                   ← Password recovery request page
│   │   │   ├── reset-access.tsx                    ← Password reset (token-based) page
│   │   │   ├── index.tsx                           ← Document Hub (listing, search, lock/bridge actions)
│   │   │   ├── dashboard.tsx                       ← KPI dashboard (mock or backend toggle)
│   │   │   ├── workflow.tsx                        ← Multi-agent orchestration viewer
│   │   │   ├── bridge.tsx                          ← EU AI Act compliance runner (redirects to workflow)
│   │   │   ├── compliance.tsx                      ← Compliance standards display (EU AI Act, ISO, GDPR, etc.)
│   │   │   ├── architecture.tsx                    ← arc42 template viewer
│   │   │   ├── sops.tsx                            ← Standard operating procedures (SOP) library
│   │   │   └── doc/
│   │   │       └── governance-manual.tsx           ← Governance & quality manual
│   │   │
│   │   ├── components/                             ← Reusable React components
│   │   │   ├── _app.tsx                            ← Alias/wrapper for _app logic
│   │   │   ├── AppShell.tsx                        ← Main layout wrapper (sidebar + topbar)
│   │   │   ├── Sidebar.tsx                         ← Left navigation (menu items, icons, active state)
│   │   │   ├── Topbar.tsx                          ← Top navigation (user profile, logout, settings)
│   │   │   ├── DocBridgePage.tsx                   ← Bridge orchestration UI (agents, logs, alerts)
│   │   │   ├── OperationsDrawer.tsx                ← Document action menu (lock, bridge, report)
│   │   │   ├── BlockingModal.tsx                   ← Dialog for alerts & confirmations
│   │   │   └── [other UI components]
│   │   │
│   │   ├── lib/                                    ← TypeScript utilities & API clients
│   │   │   ├── authClient.ts                       ← Auth API client (login, logout, me, recovery)
│   │   │   ├── bridgeClient.ts                     ← Bridge API client (run compliance, fetch alerts)
│   │   │   ├── dashboardClient.ts                  ← Dashboard API client (KPI aggregation)
│   │   │   ├── authContext.tsx                     ← Auth provider & user context hook
│   │   │   ├── rbac.ts                             ← Role-based access control helpers
│   │   │   ├── mockStore.ts                        ← Mock data store (MVP fallback data)
│   │   │   └── [other utilities]
│   │   │
│   │   ├── styles/                                 ← Global CSS & styling
│   │   │   └── globals.css
│   │   │
│   │   ├── css/                                    ← Component-scoped styles
│   │   │   └── [component stylesheets]
│   │   │
│   │   ├── public/                                 ← Static assets (images, docs, fonts)
│   │   │   ├── docs/
│   │   │   │   ├── governance-manual.md            ← Governance manual markdown
│   │   │   │   └── [other markdown docs]
│   │   │   └── [images, icons, fonts]
│   │   │
│   │   ├── app/                                    ← Next.js app router config (future)
│   │   │
│   │   ├── next.config.js                          ← Next.js config (rewrite proxies /api/* to backend)
│   │   ├── tsconfig.json                           ← TypeScript compiler config
│   │   ├── tailwind.config.js                      ← Tailwind CSS config
│   │   ├── postcss.config.js                       ← PostCSS processing
│   │   ├── package.json                            ← Node.js dependencies (Next.js, React, Tailwind)
│   │   ├── package-lock.json                       ← Locked npm dependencies
│   │   ├── .env.local                              ← Local env vars (API origin, feature toggles)
│   │   ├── .env.local.example                      ← Env vars template
│   │   ├── .next/                                  ← Build output (auto-generated)
│   │   ├── node_modules/                           ← npm packages (auto-generated)
│   │   └── .vscode/                                ← VS Code workspace settings
│   │
│   └── next-env.d.ts                               ← Next.js TypeScript declarations
│
├── 🤖 Orchestrator Service (CrewAI-based, separate FastAPI)
│   ├── services/
│   │   └── orchestrator/                           ← Multi-agent orchestration service (port 8010)
│   │       ├── pyproject.toml                      ← Orchestrator dependencies (crewai, anthropic, fastapi)
│   │       ├── Dockerfile                          ← Container image for orchestrator
│   │       ├── README.md                           ← Orchestrator-specific documentation
│   │       │
│   │       └── src/
│   │           └── doc_quality_orchestrator/
│   │               ├── __init__.py
│   │               ├── __main__.py                 ← uvicorn entry point
│   │               ├── config.py                   ← OrchestratorSettings (model, timeouts, feature flags)
│   │               ├── models.py                   ← Pydantic request/response models
│   │               ├── main.py                     ← FastAPI app, health endpoint, routes
│   │               ├── service.py                  ← Orchestrator service wrapper & routing logic
│   │               ├── skills_api.py               ← HTTP client for backend Skills API
│   │               │
│   │               ├── adapters/                   ← LLM provider adapters (abstraction layer)
│   │               │   ├── base.py                 ← ModelAdapter ABC (interface)
│   │               │   ├── anthropic_adapter.py    ← Claude 3.5 Sonnet adapter (production)
│   │               │   ├── openai_compatible_adapter.py ← OpenAI-compatible API adapter
│   │               │   ├── nemotron_adapter.py     ← Nemotron scaffold adapter
│   │               │   └── registry.py             ← get_adapter() factory function
│   │               │
│   │               ├── flows/                      ← Orchestration workflow definitions
│   │               │   ├── document_review_flow.py ← DocumentReviewFlow (CrewAI Flow best practice)
│   │               │   │                             Handles routing, state, multi-crew dispatch
│   │               │   │
│   │               │   └── [additional flows]
│   │               │
│   │               ├── crews/                      ← Crew team definitions (reusable agent groups)
│   │               │   ├── review_flow.py          ← build_generate_audit_package_crew() factory
│   │               │   │                             Agents: intake, evidence, compliance, review
│   │               │   │                             Tools: get_document, search, extract, write_finding, log_event
│   │               │   │
│   │               │   └── [additional crews]
│   │               │
│   │               └── [config, utilities, constants]
│   │
│   └── [other services]
│
├── 📋 Database & Migrations
│   ├── migrations/                                 ← Alembic migration files
│   │   ├── versions/
│   │   │   ├── 001_init_users_sessions.py          ← Initial schema: user_sessions, users
│   │   │   ├── 002_add_hitl_reviews.py             ← HITL review table
│   │   │   ├── 003_add_audit_events.py             ← Audit trail table
│   │   │   ├── 004_add_skill_tables.py             ← Documents, findings, skills tables
│   │   │   └── [additional migrations]
│   │   │
│   │   ├── alembic.ini                             ← Alembic configuration
│   │   ├── env.py                                  ← Migration environment setup
│   │   └── script.py.mako                          ← Migration script template
│   │
│   └── doc_quality.db                              ← SQLite dev database (alternative to PostgreSQL)
│
├── 📁 Templates & Documentation
│   ├── templates/                                  ← Governance & compliance templates (loaded at build time)
│   │   ├── arc42/                                  ← arc42 software architecture template
│   │   │   └── arc42_template.md                   ← Structured template for system documentation
│   │   │
│   │   └── sop/                                    ← Standard Operating Procedures library
│   │       ├── sop_risk_management_procedure.md    ← Risk ID, evaluation, treatment, monitoring
│   │       ├── sop_capa.md                         ← Corrective & Preventive Actions workflow
│   │       ├── sop_supplier_management.md          ← Third-party supplier evaluation & monitoring
│   │       ├── sop_quality_requirements.md         ← QA checklist (functionality, security, audit logging)
│   │       └── [additional SOP templates]
│   │
│   └── [other template libraries]
│
├── 📊 Documentation & Reports
│   ├── docs/
│   │   └── images/
│   │       └── DocQuality_Compliance-QA-Lab.JPG    ← Product screenshot
│   │
│   └── reports/                                    ← Generated compliance & analysis reports (output)
│
├── 🔐 Git & Environment
│   ├── .git/                                       ← Git repository
│   ├── .github/                                    ← GitHub workflows & actions
│   ├── .gitignore                                  ← Git ignore rules
│   ├── .env                                        ← Environment variables (local, .gitignored)
│   ├── .env.example                                ← Env template for developers
│   └── .venv/                                      ← Python virtual environment
│
└── 🛠️ Development Tools & Meta
    ├── .vscode/                                    ← VS Code workspace settings
    ├── .cursor/                                    ← Cursor IDE configuration
    ├── .pytest_cache/                              ← pytest cache
    └── __pycache__/                                ← Python compiled bytecode cache

```

---

## 📍 Key Component Locations

### Backend API Endpoints (`/api/v1`)

| Module | File | Endpoints | Purpose |
| --- | --- | --- | --- |
| **Auth** | `src/doc_quality/api/routes/auth.py` | `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/recovery/*` | User authentication & session management |
| **Bridge** | `src/doc_quality/api/routes/bridge.py` | `/bridge/run/eu-ai-act`, `/bridge/alerts/*` | EU AI Act compliance orchestration |
| **Compliance** | `src/doc_quality/api/routes/compliance.py` | `/compliance/check/*`, `/compliance/applicable-regulations` | Regulatory compliance checking |
| **Dashboard** | `src/doc_quality/api/routes/dashboard.py` | `/dashboard/summary` | KPI aggregation & analytics |
| **Documents** | `src/doc_quality/api/routes/documents.py` | `/documents/upload`, `/documents/analyze` | Document processing |
| **Reports** | `src/doc_quality/api/routes/reports.py` | `/reports/generate`, `/reports/download/*` | Report generation |
| **Research** | `src/doc_quality/api/routes/research.py` | `/research/domain/*` | External regulatory research |
| **Skills** | `src/doc_quality/api/routes/skills.py` | `/skills/document/*`, `/skills/finding/*`, `/skills/log_event` | Orchestrator integration |
| **Templates** | `src/doc_quality/api/routes/templates.py` | `/templates/`, `/templates/{id}` | Template library |

### Frontend Pages

| Route | File | Purpose |
| --- | --- | --- |
| `/login` | `frontend/pages/login.tsx` | User authentication |
| `/forgot-access` | `frontend/pages/forgot-access.tsx` | Password recovery request |
| `/reset-access` | `frontend/pages/reset-access.tsx` | Password reset |
| `/` | `frontend/pages/index.tsx` | Document Hub (list, search, actions) |
| `/dashboard` | `frontend/pages/dashboard.tsx` | KPI dashboard |
| `/workflow` | `frontend/pages/workflow.tsx` | Multi-agent orchestration |
| `/compliance` | `frontend/pages/compliance.tsx` | Compliance standards |
| `/architecture` | `frontend/pages/architecture.tsx` | arc42 architecture template |
| `/sops` | `frontend/pages/sops.tsx` | SOP library |

### Core Services

| Service | File | Responsibility |
| --- | --- | --- |
| **Compliance Checker** | `src/doc_quality/services/compliance_checker.py` | EU AI Act, ISO, GDPR compliance analysis |
| **Document Analyzer** | `src/doc_quality/services/document_analyzer.py` | Text extraction & quality assessment |
| **HITL Workflow** | `src/doc_quality/services/hitl_workflow.py` | Human-in-the-loop review persistence & lifecycle |
| **Report Generator** | `src/doc_quality/services/report_generator.py` | PDF/Markdown report creation |
| **Research Service** | `src/doc_quality/services/research_service.py` | Perplexity API integration & fallback |
| **Skills Service** | `src/doc_quality/services/skills_service.py` | Orchestrator bridge & audit logging |
| **Template Manager** | `src/doc_quality/services/template_manager.py` | Template loading & caching |

### ORM Models (Database Tables)

| Model | File | Purpose | Phase |
| --- | --- | --- | --- |
| `UserSessionORM` | `src/doc_quality/models/orm.py` | HTTP-only session cookies & RBAC | MVP |
| `ReviewRecordORM` | `src/doc_quality/models/orm.py` | HITL review lifecycle & verdicts | MVP |
| `AuditEventORM` | `src/doc_quality/models/orm.py` | Immutable compliance audit trail | MVP |
| `SkillDocumentORM` | `src/doc_quality/models/orm.py` | Uploaded documents metadata | MVP |
| `FindingORM` | `src/doc_quality/models/orm.py` | Compliance findings & evidence | MVP |

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│                     (localhost:3000)                              │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/JSON
                         ↓
    ┌────────────────────────────────────────┐
    │    Next.js Frontend (pages router)     │
    │  ├─ Auth pages (login, recovery)       │
    │  ├─ Document Hub (list, search)        │
    │  ├─ Dashboard (KPI, mock/backend)      │
    │  ├─ Bridge (orchestration UI)          │
    │  ├─ Compliance standards               │
    │  └─ Governance pages (arc42, SOP)      │
    │                                        │
    │  Clients: authClient, bridgeClient,    │
    │           dashboardClient              │
    └────────────────────┬───────────────────┘
                         │ Proxy: /api/* → 127.0.0.1:8000
                         │ (or NEXT_PUBLIC_API_ORIGIN)
                         ↓
    ┌──────────────────────────────────────────────────┐
    │  FastAPI Backend (port 8000)                    │
    │  ├─ API Routes (/api/v1/*)                     │
    │  │  ├─ auth, bridge, compliance, dashboard      │
    │  │  ├─ documents, reports, research, skills    │
    │  │  └─ templates                                │
    │  │                                               │
    │  ├─ Services Layer                              │
    │  │  ├─ compliance_checker                       │
    │  │  ├─ document_analyzer                        │
    │  │  ├─ hitl_workflow                            │
    │  │  ├─ report_generator                         │
    │  │  ├─ research_service                         │
    │  │  └─ skills_service (orchestrator bridge)    │
    │  │                                               │
    │  ├─ Core (auth, logging, security)              │
    │  │  ├─ session_auth (RBAC, cookies)            │
    │  │  ├─ logging_config (structlog)               │
    │  │  ├─ rate_limit (global throttle)             │
    │  │  └─ security (sanitization)                  │
    │  │                                               │
    │  └─ PostgreSQL ORM                              │
    │     ├─ UserSessionORM (sessions)                │
    │     ├─ ReviewRecordORM (HITL reviews)           │
    │     ├─ AuditEventORM (audit trail)              │
    │     ├─ SkillDocumentORM (documents)             │
    │     └─ FindingORM (findings)                    │
    └────────┬──────────────────────────────────────┬─┘
             │                                      │
             │                                      │
    ┌────────↓────────┐              ┌──────────────↓──────┐
    │  Orchestrator    │              │   PostgreSQL 16    │
    │  (port 8010)     │              │  (port 5432)       │
    │                  │              │                    │
    │  CrewAI Flow:    │              │  Tables:           │
    │  • Intake Agent  │              │  - user_sessions   │
    │  • Evidence      │              │  - hitl_reviews    │
    │  • Compliance    │              │  - audit_events    │
    │  • Review        │              │  - skill_docs      │
    │                  │              │  - findings        │
    │  LLM Adapters:   │              └────────────────────┘
    │  • Anthropic     │
    │  • OpenAI        │
    │  • Nemotron      │
    └──────────────────┘

```

---

## 🚀 Development & Deployment Paths

### Local Development (3 terminals)

```bash
# Terminal 1: Database
docker compose up -d
.\.venv\Scripts\python.exe init_postgres.py

# Terminal 2: Backend API (uvicorn)
.\.venv\Scripts\python.exe -m uvicorn src.doc_quality.api.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 3: Frontend (Next.js dev server)
cd frontend && npm run dev
```

### Testing

```bash
# Unit & integration tests
pytest tests/ -v

# Specific test file
pytest tests/test_bridge_run_api.py -v

# With logging output
pytest tests/test_auth_session_api.py -v -s
```

### Production (Future)

- Frontend: Next.js static build → CDN or App Runner
- Backend: FastAPI → AWS App Runner or ECS
- Orchestrator: CrewAI service → ECS or Lambda
- Database: PostgreSQL → AWS RDS or managed PostgreSQL

---

## 📚 Documentation Navigation

| Topic | Document | Location |
| --- | --- | --- |
| **Getting Started** | README | `./README.md` |
| **System Architecture** | System Architecture Document (SAD) | `project-context/1.define/sad.md` |
| **Backend Implementation** | Backend Guide | `project-context/2.build/backend.md` |
| **Frontend Implementation** | Frontend Guide | `project-context/2.build/frontend.md` |
| **Integration Topology** | Integration Guide | `project-context/2.build/integration.md` |
| **Database Setup** | Database README | `./DATABASE_README.md` |
| **Authentication & RBAC** | Auth & Authz Guide | `./AUTHENTICATION_AUTHORIZATION_README.md` |
| **Logging & Observability** | Observability Guide | `./OBSERVABILITY_LOGGING_README.md` |
| **User Operations** | App User Handbook | `./APP_USER_HANDBOOK.md` |
| **Project Structure** | **This File** | `./PROJECT_STRUCTURE.md` |

---

## 💡 Quick Navigation Tips

- **Want to add an API endpoint?** → `src/doc_quality/api/routes/`
- **Want to add business logic?** → `src/doc_quality/services/`
- **Want to modify the database schema?** → `migrations/versions/` + `src/doc_quality/models/orm.py`
- **Want to add a UI page?** → `frontend/pages/`
- **Want to add a reusable component?** → `frontend/components/`
- **Want to add a new agent or crew?** → `services/orchestrator/src/doc_quality_orchestrator/crews/`
- **Want to understand the audit trail?** → See `OBSERVABILITY_LOGGING_README.md`

---

**Document Version**: 0.1.0  
**Last Updated**: March 30, 2026  
**Status**: Phase 0 MVP structure documented
