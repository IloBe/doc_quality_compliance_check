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
│   │       │       ├── audit_trail.py              ← Audit event query & scheduling endpoints
│   │       │       ├── bridge.py                   ← EU AI Act compliance run & alert endpoints
│   │       │       ├── compliance.py               ← Regulatory compliance checking endpoints
│   │       │       ├── dashboard.py                ← KPI aggregation & analytics endpoints
│   │       │       ├── documents.py                ← Document upload, analysis endpoints
│   │       │       ├── observability.py            ← AI quality telemetry & Prometheus metrics endpoints
│   │       │       ├── reports.py                  ← Report generation & download endpoints
│   │       │       ├── research.py                 ← External regulatory research endpoints
│   │       │       ├── risk_templates.py           ← FMEA/RMF risk template CRUD endpoints
│   │       │       ├── skills.py                   ← Skills API (orchestrator bridge, logging, events)
│   │       │       ├── stakeholders.py             ← Stakeholder profile & employee assignment endpoints
│   │       │       ├── templates.py                ← Template library endpoints
│   │       │       └── __init__.py
│   │       │
│   │       ├── services/                           ← Business logic & orchestration layer
│   │       │   ├── compliance_checker.py           ← EU AI Act, ISO, GDPR compliance logic
│   │       │   ├── document_analyzer.py            ← Document parsing & quality assessment
│   │       │   ├── document_lock_service.py        ← Document locking lifecycle & conflict prevention
│   │       │   ├── hitl_workflow.py                ← Human-in-the-loop review lifecycle & persistence
│   │       │   ├── ocr_fallback.py                 ← OCR for image-based documents
│   │       │   ├── quality_service.py              ← AI quality observation recording & aggregation
│   │       │   ├── report_generator.py             ← PDF/Markdown report generation
│   │       │   ├── research_service.py             ← Perplexity API research & fallback
│   │       │   ├── risk_template_seeder.py         ← FMEA/RMF default template seeding
│   │       │   ├── skills_service.py               ← Orchestrator skill endpoints & audit logging
│   │       │   ├── stakeholder_service.py          ← Stakeholder profile CRUD & employee assignment
│   │       │   ├── template_manager.py             ← Template loading & caching
│   │       │   └── __init__.py
│   │       │
│   │       ├── core/                               ← Cross-cutting utilities & infrastructure
│   │       │   ├── config.py                       ← Pydantic Settings (env vars, defaults)
│   │       │   ├── database.py                     ← SQLAlchemy engine, session, table creation
│   │       │   ├── logging_config.py               ← Structured logging (structlog) configuration
│   │       │   ├── observability.py                ← OpenTelemetry tracing & Prometheus metric helpers
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
│   │       │   ├── quality.py                      ← AI quality observation & evaluation models
│   │       │   ├── report.py                       ← Report format & generation models
│   │       │   ├── research.py                     ← Research request/response models
│   │       │   ├── review.py                       ← HITL review verdict & modification models
│   │       │   ├── risk_template.py                ← FMEA/RMF risk template request/response models
│   │       │   ├── skills.py                       ← Skills API request/response models (LogEventRequest, etc.)
│   │       │   ├── stakeholder.py                  ← Stakeholder profile & employee assignment models
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
│   │   └── versions/                               ← Sequential migration files
│   │       ├── 001_initial_hitl_reviews.py         ← Initial schema: HITL review records
│   │       ├── 002_skills_api_tables.py            ← Skill documents & findings tables
│   │       ├── 003_audit_events_provenance.py      ← Audit event trail with provenance fields
│   │       ├── 004_user_sessions.py                ← User session & authentication tables
│   │       ├── 005_app_users_and_recovery_tokens.py← App users, password recovery tokens
│   │       ├── 006_quality_observations.py         ← AI quality observation telemetry table
│   │       ├── 007_stakeholder_profiles.py         ← Stakeholder role profiles table
│   │       ├── 008_stakeholder_employee_assignments.py ← Employee-to-role assignment table
│   │       ├── 009_audit_schedule.py               ← Audit scheduling & calendar table
│   │       ├── 010_bridge_human_reviews.py         ← Bridge run HITL review linkage
│   │       └── 011_risk_templates.py               ← FMEA & RMF risk template tables
│   │
│   ├── tests/                                      ← Integration & unit tests
│   │   ├── conftest.py                             ← Pytest fixtures & shared test setup
│   │   ├── test_auth_session_api.py                ← Session login/logout/recovery tests
│   │   ├── test_auth_authorization_api.py          ← RBAC authorization tests
│   │   ├── test_auth_rate_limit_api.py             ← Rate limiting & throttle tests
│   │   ├── test_auth_recovery_api.py               ← Password recovery flow tests
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
│   │   └── test_uat_workflow.py                    ← User acceptance testing workflows
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
│   │   │   ├── bridge.tsx                          ← EU AI Act compliance runner (redirects to artifact lab)
│   │   │   ├── compliance.tsx                      ← Compliance standards display (EU AI Act, ISO, GDPR, etc.)
│   │   │   ├── architecture.tsx                    ← arc42 template viewer (markdown-rendered, typography-styled)
│   │   │   ├── sops.tsx                            ← Standard operating procedures (SOP) library
│   │   │   ├── audit-trail.tsx                     ← Read-only audit event timeline & compliance scheduling
│   │   │   ├── auditor-vault.tsx                   ← Auditor artifact vault (read-only evidence archive)
│   │   │   ├── auditor-workstation.tsx             ← HITL auditor decision workspace (approve/reject/flag)
│   │   │   ├── exports.tsx                         ← Export registry (download compliance & audit reports)
│   │   │   ├── risk.tsx                            ← Risk management workspace (FMEA + RMF templates)
│   │   │   │
│   │   │   ├── admin/                              ← Admin section (protected: qm_lead, architect)
│   │   │   │   ├── index.tsx                       ← Admin centre overview (navigation cards, KPI summary)
│   │   │   │   ├── observability.tsx               ← AI quality telemetry, prompt/output pairs, Prometheus
│   │   │   │   └── stakeholders.tsx                ← Stakeholder role matrix & employee assignments
│   │   │   │
│   │   │   ├── artifact-lab/                       ← Artifact generation workspace
│   │   │   │   ├── index.tsx                       ← Artifact Lab overview (run cards, doc links)
│   │   │   │   └── [runId].tsx                     ← Per-run artifact viewer (kind selector, workflow link)
│   │   │   │
│   │   │   ├── compliance/
│   │   │   │   └── request-standard-mapping.tsx    ← Standard-to-request compliance mapping view
│   │   │   │
│   │   │   ├── doc/
│   │   │   │   └── [docId]/
│   │   │   │       └── bridge.tsx                  ← Per-document compliance bridge run page
│   │   │   │
│   │   │   └── help/                               ← Help & knowledge base section
│   │   │       ├── index.tsx                       ← Help centre (summary grid, navigation cards, snippets)
│   │   │       ├── glossary.tsx                    ← Governance & compliance glossary
│   │   │       └── qa.tsx                          ← Q&A panel with sidebar + detail drill-down
│   │   │
│   │   ├── components/                             ← Reusable React components
│   │   │   ├── AppShell.tsx                        ← Main layout wrapper (sidebar + topbar)
│   │   │   ├── Sidebar.tsx                         ← Left navigation (menu items, icons, active state)
│   │   │   ├── Topbar.tsx                          ← Top navigation (user profile, logout, settings)
│   │   │   ├── DocBridgePage.tsx                   ← Bridge orchestration UI (agents, logs, alerts)
│   │   │   ├── OperationsDrawer.tsx                ← Document action menu (lock, bridge, report)
│   │   │   ├── BlockingModal.tsx                   ← Dialog for alerts & confirmations
│   │   │   ├── FooterInfoCard.tsx                  ← Contextual governance note card (page footer)
│   │   │   ├── PageHeaderWithWhy.tsx               ← Standardised page header with "Why this page" section
│   │   │   ├── WhyThisPageMatters.tsx              ← Collapsible governance rationale panel
│   │   │   ├── buttonStyles.ts                     ← Shared header button/toggle/chip class helpers
│   │   │   │
│   │   │   ├── admin/                              ← Admin section components
│   │   │   │   ├── AdminCenterSummaryGrid.tsx      ← Admin KPI cards grid
│   │   │   │   ├── AdminNavigationCards.tsx        ← Admin module navigation cards
│   │   │   │   ├── observability/                  ← Observability sub-components
│   │   │   │   │   ├── ObservabilityKpiGrid.tsx    ← Quality KPI summary (score, latency, hallucination)
│   │   │   │   │   ├── ObservabilityAspectTable.tsx← Pass/warn/fail breakdown per quality aspect
│   │   │   │   │   ├── ObservabilityWorkflowTable.tsx ← Per-component latency & outcome table
│   │   │   │   │   ├── ObservabilityPromptPairsPanel.tsx ← Recent GenAI prompt/output pairs
│   │   │   │   │   ├── ObservabilityControls.tsx   ← Timeframe selector & source toggle controls
│   │   │   │   │   └── ObservabilitySidePanels.tsx ← Prometheus snapshot & trace detail panels
│   │   │   │   │
│   │   │   │   └── stakeholders/                   ← Stakeholder admin sub-components
│   │   │   │       ├── StakeholderProfilesList.tsx ← Role profile cards with permission matrix
│   │   │   │       ├── StakeholderProfileEditor.tsx← Employee assignment form (single + bulk add)
│   │   │   │       └── StakeholderSessionCard.tsx  ← Session info and active user context card
│   │   │   │
│   │   │   ├── architecture/                       ← arc42 architecture page components
│   │   │   │   ├── Arc42TemplateListPanel.tsx      ← arc42 section list sidebar
│   │   │   │   └── Arc42TemplateContentPanel.tsx   ← arc42 HTML content renderer (typography-styled)
│   │   │   │
│   │   │   ├── artifact-lab/                       ← Artifact Lab placeholder (components inline in page)
│   │   │   │
│   │   │   ├── auditorWorkstation/                 ← HITL workstation components
│   │   │   │   ├── AuditorWorkstationKpiGrid.tsx   ← Pending/approved/rejected review KPIs
│   │   │   │   ├── AuditorPendingQueuePanel.tsx    ← Queued HITL review items
│   │   │   │   ├── AuditorDecisionPanel.tsx        ← Approve / reject / flag verdict controls
│   │   │   │   └── AuditorFollowUpPanel.tsx        ← Follow-up action tracking panel
│   │   │   │
│   │   │   ├── auditTrail/                         ← Audit trail page components
│   │   │   │   ├── AuditTrailKpiGrid.tsx           ← Event count & compliance rate KPI cards
│   │   │   │   ├── AuditTrailTimelineTable.tsx     ← Chronological event timeline table
│   │   │   │   ├── AuditTrailFiltersPanel.tsx      ← Type / severity / date range filter bar
│   │   │   │   ├── AuditTrailEventDetailsPanel.tsx ← Drill-down event detail side panel
│   │   │   │   └── AuditTrailSchedulePanel.tsx     ← Upcoming audit schedule calendar
│   │   │   │
│   │   │   ├── bridge/                             ← Bridge run overview components
│   │   │   │   ├── BridgeOverviewStatCard.tsx      ← Single run statistics card
│   │   │   │   └── BridgeSystemStatusCard.tsx      ← Agent & pipeline health status card
│   │   │   │
│   │   │   ├── compliance/                         ← Compliance standards page components
│   │   │   │   ├── StandardCard.tsx                ← Compliance standard summary card
│   │   │   │   ├── AlertsPanel.tsx                 ← Active compliance alert list
│   │   │   │   ├── AlertArchiveList.tsx            ← Archived compliance alert list
│   │   │   │   └── ShortcutCards.tsx               ← Quick-action shortcut cards
│   │   │   │
│   │   │   ├── dashboard/                          ← Dashboard page components
│   │   │   │   ├── KpiGrid.tsx                     ← KPI metric cards grid
│   │   │   │   ├── RiskDistributionCard.tsx        ← Risk level breakdown chart card
│   │   │   │   ├── StandardsCoverageTable.tsx      ← Compliance standards coverage table
│   │   │   │   └── TimeframeSelector.tsx           ← 24h / 7d / 30d window toggle
│   │   │   │
│   │   │   ├── documentHub/                        ← Document Hub page components
│   │   │   │   ├── DocumentHubPage.tsx             ← Full document hub layout
│   │   │   │   └── DocumentCard.tsx                ← Individual document card with actions
│   │   │   │
│   │   │   ├── exportsRegistry/                    ← Exports registry page components
│   │   │   │   ├── ExportsRegistryKpiGrid.tsx      ← Export count & format KPI cards
│   │   │   │   ├── ExportsRegistryTable.tsx        ← Paginated export records table
│   │   │   │   ├── ExportsRegistryFiltersPanel.tsx ← Type / format / date filter bar
│   │   │   │   └── ExportDownloadDialog.tsx        ← Download confirmation & format dialog
│   │   │   │
│   │   │   ├── helpCenter/                         ← Help & knowledge base components
│   │   │   │   ├── HelpCenterSummaryGrid.tsx       ← Help centre topic count summary
│   │   │   │   ├── HelpNavigationCards.tsx         ← Topic navigation cards
│   │   │   │   ├── HelpSnippetHighlights.tsx       ← Featured snippet cards
│   │   │   │   ├── HelpSearchPanel.tsx             ← Full-text search bar & results
│   │   │   │   ├── HelpQaSidebar.tsx               ← Q&A category sidebar
│   │   │   │   ├── HelpQaDetailPanel.tsx           ← Q&A entry detail panel
│   │   │   │   ├── GlossaryTable.tsx               ← Searchable glossary term table
│   │   │   │   └── GlossaryComposer.tsx            ← Glossary entry editor / composer
│   │   │   │
│   │   │   ├── risk/                               ← Risk management page components
│   │   │   │   ├── RiskKpiGrid.tsx                 ← Risk count & severity KPI cards
│   │   │   │   ├── RiskFiltersPanel.tsx            ← Type / severity filter bar
│   │   │   │   ├── RiskRecordsTable.tsx            ← Risk record table with inline actions
│   │   │   │   ├── FmeaTemplateTable.tsx           ← FMEA template viewer/editor table
│   │   │   │   ├── RmfTemplateTable.tsx            ← RMF template viewer/editor table
│   │   │   │   ├── RiskTemplateEditor.tsx          ← Template editor form (add/edit rows)
│   │   │   │   └── RiskReferenceImages.tsx         ← Reference diagram & image display
│   │   │   │
│   │   │   └── sops/                               ← SOP library page components
│   │   │       ├── SopListPanel.tsx                ← SOP list sidebar
│   │   │       └── SopContentPanel.tsx             ← SOP HTML content renderer (typography-styled)
│   │   │
│   │   ├── lib/                                    ← TypeScript utilities, API clients & view models
│   │   │   ├── authClient.ts                       ← Auth API client (login, logout, me, recovery)
│   │   │   ├── authContext.tsx                     ← Auth provider & user context hook
│   │   │   ├── artifactExportClient.ts             ← Artifact export download API client
│   │   │   ├── artifactLabViewModel.ts             ← Artifact Lab view model (run cards, doc resolution)
│   │   │   ├── architectureViewModel.ts            ← arc42 page view model (field parsing, br sanitization)
│   │   │   ├── adminCenterViewModel.ts             ← Admin centre view model (cards, navigation data)
│   │   │   ├── adminObservabilityViewModel.ts      ← Observability view model (KPI builders, mock telemetry)
│   │   │   ├── adminStakeholdersViewModel.ts       ← Stakeholders view model (role matrix, assignments)
│   │   │   ├── auditorVaultViewModel.ts            ← Auditor vault view model (evidence records)
│   │   │   ├── auditorWorkstationViewModel.ts      ← HITL workstation view model (queue, verdicts)
│   │   │   ├── auditTrailClient.ts                 ← Audit trail API client (events, schedule)
│   │   │   ├── auditTrailViewModel.ts              ← Audit trail view model (timeline, KPIs)
│   │   │   ├── bridgeClient.ts                     ← Bridge API client (run compliance, fetch alerts)
│   │   │   ├── bridgeOverview.ts                   ← Bridge overview stat & status helpers
│   │   │   ├── bridgeRunViewModel.ts               ← Bridge run view model (per-run data builders)
│   │   │   ├── complianceMappingRequestClient.ts   ← Compliance mapping request API client
│   │   │   ├── complianceStandards.ts              ← Compliance standards data & helpers
│   │   │   ├── dashboardClient.ts                  ← Dashboard API client (KPI aggregation)
│   │   │   ├── dashboardSummaryBuilder.ts          ← Dashboard KPI summary builder helpers
│   │   │   ├── documentHub.ts                      ← Document Hub view model helpers
│   │   │   ├── documentLockClient.ts               ← Document lock/unlock API client
│   │   │   ├── documentRetrievalClient.ts          ← Document retrieval & search API client
│   │   │   ├── documentUploadClient.ts             ← Document upload API client
│   │   │   ├── exportRegistryClient.ts             ← Export registry API client
│   │   │   ├── exportRegistryViewModel.ts          ← Export registry view model (table, filters)
│   │   │   ├── helpCenterViewModel.ts              ← Help centre view model (Q&A, glossary, snippets)
│   │   │   ├── markdownStyles.ts                   ← Shared Tailwind Typography prose class string
│   │   │   ├── mockStore.ts                        ← Mock data store (documents, runs, findings)
│   │   │   ├── observabilityClient.ts              ← Observability telemetry API client
│   │   │   ├── rbac.ts                             ← Role-based access control helpers & permission matrix
│   │   │   ├── riskActionClient.ts                 ← Risk action API client (create, update, delete)
│   │   │   ├── riskTemplateClient.ts               ← Risk template API client (FMEA/RMF CRUD)
│   │   │   ├── riskViewModel.ts                    ← Risk page view model (KPIs, table data)
│   │   │   ├── selectionStyles.ts                  ← Shared toggle/selection button class helpers
│   │   │   ├── sopsViewModel.ts                    ← SOP library view model (list, content mapping)
│   │   │   ├── stakeholderClient.ts                ← Stakeholder API client (profiles, assignments)
│   │   │   └── useSubstringFilter.ts               ← Generic substring filter hook (search/filter UX)
│   │   │
│   │   ├── tests/                                  ← Frontend unit tests (Vitest)
│   │   │   ├── vitest.d.ts                         ← Global test symbol declarations (describe, it, expect)
│   │   │   ├── artifactLabWorkflow.test.ts         ← Artifact Lab document resolution tests (3 tests)
│   │   │   └── architectureViewModel.test.ts       ← arc42 metadata sanitization tests (2 tests)
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
│   │   ├── vitest.config.ts                        ← Vitest test runner config (globals, node env)
│   │   ├── next.config.js                          ← Next.js config (rewrite proxies /api/* to backend)
│   │   ├── tsconfig.json                           ← TypeScript compiler config
│   │   ├── tailwind.config.js                      ← Tailwind CSS config (+ @tailwindcss/typography)
│   │   ├── postcss.config.js                       ← PostCSS processing
│   │   ├── package.json                            ← Node.js dependencies (Next.js, React, Tailwind, Vitest)
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
│   │               ├── runtime_limits.py           ← Per-flow timeout & token budget enforcement
│   │               ├── service.py                  ← Orchestrator service wrapper & routing logic
│   │               ├── skills_api.py               ← HTTP client for backend Skills API
│   │               │
│   │               ├── adapters/                   ← LLM provider adapters (abstraction layer)
│   │               │   ├── base.py                 ← ModelAdapter ABC (interface)
│   │               │   ├── anthropic_adapter.py    ← Claude 3.5 Sonnet adapter (production)
│   │               │   ├── openai_compatible_adapter.py ← OpenAI-compatible API adapter
│   │               │   ├── nemotron_adapter.py     ← Nemotron scaffold adapter
│   │               │   ├── scaffold_utils.py       ← Shared adapter scaffolding helpers
│   │               │   └── registry.py             ← get_adapter() factory function
│   │               │
│   │               ├── flows/                      ← Orchestration workflow definitions
│   │               │   └── document_review_flow.py ← DocumentReviewFlow (CrewAI Flow best practice)
│   │               │                                 Handles routing, state, multi-crew dispatch
│   │               │
│   │               ├── crews/                      ← Crew team definitions (reusable agent groups)
│   │               │   ├── review_flow.py          ← build_generate_audit_package_crew() factory
│   │               │   │                             Agents: intake, evidence, compliance, review
│   │               │   │                             Tools: get_document, search, extract, write_finding, log_event
│   │               │   └── config/                 ← Crew YAML config files (agents, tasks)
│   │               │
│   │               └── prompts/                    ← LLM prompt templates
│   │                   └── model_validator_stage_v1.txt ← Validator stage prompt template
│   │
│   └── [other services]
│
├── 📁 Templates & Documentation
│   ├── templates/                                  ← Governance & compliance templates (loaded at build time)
│   │   ├── arc42/                                  ← arc42 software architecture template
│   │   │   └── arc42_template.md                   ← Structured template for system documentation
│   │   │
│   │   └── sop/                                    ← Standard Operating Procedures library (13 SOPs)
│   │       ├── sop_risk_management_procedure.md    ← Risk identification, evaluation, treatment, monitoring
│   │       ├── sop_capa.md                         ← Corrective & Preventive Actions workflow
│   │       ├── sop_supplier_management.md          ← Third-party supplier evaluation & monitoring
│   │       ├── sop_quality_requirements.md         ← QA checklist (functionality, security, audit logging)
│   │       ├── sop_architecture.md                 ← Architecture review & documentation SOP
│   │       ├── sop_business_goals.md               ← Business goals alignment & traceability SOP
│   │       ├── sop_change_control.md               ← Change request & approval workflow SOP
│   │       ├── sop_document_control.md             ← Document version control & lifecycle SOP
│   │       ├── sop_glossary.md                     ← Shared governance terminology reference
│   │       ├── sop_internal_audit.md               ← Internal audit procedure & evidence requirements
│   │       ├── sop_risk_assessment.md              ← Risk assessment methodology SOP
│   │       ├── sop_security_incident_response.md   ← Security incident detection & response SOP
│   │       └── sop_stakeholders.md                 ← Stakeholder identification & engagement SOP
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
| **Audit Trail** | `src/doc_quality/api/routes/audit_trail.py` | `/audit-trail/events`, `/audit-trail/schedule` | Audit event timeline & schedule |
| **Bridge** | `src/doc_quality/api/routes/bridge.py` | `/bridge/run/eu-ai-act`, `/bridge/alerts/*` | EU AI Act compliance orchestration |
| **Compliance** | `src/doc_quality/api/routes/compliance.py` | `/compliance/check/*`, `/compliance/applicable-regulations` | Regulatory compliance checking |
| **Dashboard** | `src/doc_quality/api/routes/dashboard.py` | `/dashboard/summary` | KPI aggregation & analytics |
| **Documents** | `src/doc_quality/api/routes/documents.py` | `/documents/upload`, `/documents/analyze` | Document processing |
| **Observability** | `src/doc_quality/api/routes/observability.py` | `/observability/summary`, `/observability/observations` | AI quality telemetry & Prometheus metrics |
| **Reports** | `src/doc_quality/api/routes/reports.py` | `/reports/generate`, `/reports/download/*` | Report generation |
| **Research** | `src/doc_quality/api/routes/research.py` | `/research/domain/*` | External regulatory research |
| **Risk Templates** | `src/doc_quality/api/routes/risk_templates.py` | `/risk-templates/fmea`, `/risk-templates/rmf` | FMEA & RMF template CRUD |
| **Skills** | `src/doc_quality/api/routes/skills.py` | `/skills/document/*`, `/skills/finding/*`, `/skills/log_event` | Orchestrator integration |
| **Stakeholders** | `src/doc_quality/api/routes/stakeholders.py` | `/stakeholders/profiles`, `/stakeholders/assignments` | Role profiles & employee assignments |
| **Templates** | `src/doc_quality/api/routes/templates.py` | `/templates/`, `/templates/{id}` | Template library |

### Frontend Pages

| Route | File | Purpose |
| --- | --- | --- |
| `/login` | `frontend/pages/login.tsx` | User authentication |
| `/forgot-access` | `frontend/pages/forgot-access.tsx` | Password recovery request |
| `/reset-access` | `frontend/pages/reset-access.tsx` | Password reset |
| `/` | `frontend/pages/index.tsx` | Document Hub (list, search, actions) |
| `/dashboard` | `frontend/pages/dashboard.tsx` | KPI dashboard |
| `/bridge` | `frontend/pages/bridge.tsx` | EU AI Act compliance runner |
| `/compliance` | `frontend/pages/compliance.tsx` | Compliance standards |
| `/compliance/request-standard-mapping` | `frontend/pages/compliance/request-standard-mapping.tsx` | Standard-to-request mapping |
| `/architecture` | `frontend/pages/architecture.tsx` | arc42 architecture template |
| `/sops` | `frontend/pages/sops.tsx` | SOP library |
| `/audit-trail` | `frontend/pages/audit-trail.tsx` | Audit event timeline & scheduling |
| `/auditor-vault` | `frontend/pages/auditor-vault.tsx` | Evidence archive (read-only) |
| `/auditor-workstation` | `frontend/pages/auditor-workstation.tsx` | HITL review decision workspace |
| `/exports` | `frontend/pages/exports.tsx` | Export registry |
| `/risk` | `frontend/pages/risk.tsx` | Risk management (FMEA + RMF) |
| `/artifact-lab` | `frontend/pages/artifact-lab/index.tsx` | Artifact Lab run overview |
| `/artifact-lab/[runId]` | `frontend/pages/artifact-lab/[runId].tsx` | Per-run artifact viewer |
| `/doc/[docId]/bridge` | `frontend/pages/doc/[docId]/bridge.tsx` | Per-document bridge run |
| `/admin` | `frontend/pages/admin/index.tsx` | Admin centre overview |
| `/admin/observability` | `frontend/pages/admin/observability.tsx` | AI quality telemetry dashboard |
| `/admin/stakeholders` | `frontend/pages/admin/stakeholders.tsx` | Stakeholder governance & rights |
| `/help` | `frontend/pages/help/index.tsx` | Help centre |
| `/help/glossary` | `frontend/pages/help/glossary.tsx` | Governance glossary |
| `/help/qa` | `frontend/pages/help/qa.tsx` | Q&A knowledge base |

### Core Services

| Service | File | Responsibility |
| --- | --- | --- |
| **Compliance Checker** | `src/doc_quality/services/compliance_checker.py` | EU AI Act, ISO, GDPR compliance analysis |
| **Document Analyzer** | `src/doc_quality/services/document_analyzer.py` | Text extraction & quality assessment |
| **Document Lock** | `src/doc_quality/services/document_lock_service.py` | Document locking lifecycle & conflict prevention |
| **HITL Workflow** | `src/doc_quality/services/hitl_workflow.py` | Human-in-the-loop review persistence & lifecycle |
| **Quality Service** | `src/doc_quality/services/quality_service.py` | AI quality observation recording & aggregation |
| **Report Generator** | `src/doc_quality/services/report_generator.py` | PDF/Markdown report creation |
| **Research Service** | `src/doc_quality/services/research_service.py` | Perplexity API integration & fallback |
| **Risk Template Seeder** | `src/doc_quality/services/risk_template_seeder.py` | FMEA/RMF default template seeding |
| **Skills Service** | `src/doc_quality/services/skills_service.py` | Orchestrator bridge & audit logging |
| **Stakeholder Service** | `src/doc_quality/services/stakeholder_service.py` | Stakeholder profile CRUD & employee assignment |
| **Template Manager** | `src/doc_quality/services/template_manager.py` | Template loading & caching |

### ORM Models (Database Tables)

| Model | File | Purpose | Migration |
| --- | --- | --- | --- |
| `ReviewRecordORM` | `src/doc_quality/models/orm.py` | HITL review lifecycle & verdicts | 001 |
| `SkillDocumentORM` | `src/doc_quality/models/orm.py` | Uploaded documents metadata | 002 |
| `FindingORM` | `src/doc_quality/models/orm.py` | Compliance findings & evidence | 002 |
| `AuditEventORM` | `src/doc_quality/models/orm.py` | Immutable compliance audit trail | 003 |
| `UserSessionORM` | `src/doc_quality/models/orm.py` | HTTP-only session cookies & RBAC | 004 |
| `AppUserORM` | `src/doc_quality/models/orm.py` | App users & password recovery tokens | 005 |
| `QualityObservationORM` | `src/doc_quality/models/orm.py` | AI quality telemetry observations | 006 |
| `StakeholderProfileORM` | `src/doc_quality/models/orm.py` | Stakeholder role profiles | 007 |
| `StakeholderEmployeeAssignmentORM` | `src/doc_quality/models/orm.py` | Employee-to-role assignments | 008 |
| `AuditScheduleORM` | `src/doc_quality/models/orm.py` | Audit schedule calendar entries | 009 |
| `BridgeHumanReviewORM` | `src/doc_quality/models/orm.py` | Bridge run HITL review linkage | 010 |
| `RiskTemplateORM` | `src/doc_quality/models/orm.py` | FMEA & RMF risk template records | 011 |

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│                     (localhost:3000)                              │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/JSON
                         ↓
    ┌────────────────────────────────────────────────┐
    │    Next.js Frontend (pages router)             │
    │  ├─ Auth pages (login, recovery)               │
    │  ├─ Document Hub (list, search, lock)          │
    │  ├─ Dashboard (KPI, mock/backend)              │
    │  ├─ Bridge & Artifact Lab (run, artifacts)     │
    │  ├─ Compliance (standards, mapping)            │
    │  ├─ Governance (arc42, SOP library)            │
    │  ├─ Audit Trail (timeline, schedule)           │
    │  ├─ Auditor (vault, workstation HITL)          │
    │  ├─ Risk (FMEA, RMF templates)                 │
    │  ├─ Exports (registry, download)               │
    │  ├─ Admin (observability, stakeholders)        │
    │  └─ Help (Q&A, glossary, snippets)             │
    │                                                │
    │  Clients: authClient, bridgeClient,            │
    │           dashboardClient, auditTrailClient,   │
    │           observabilityClient, stakeholderClient│
    └────────────────────┬───────────────────────────┘
                         │ Proxy: /api/* → 127.0.0.1:8000
                         │ (or NEXT_PUBLIC_API_ORIGIN)
                         ↓
    ┌──────────────────────────────────────────────────┐
    │  FastAPI Backend (port 8000)                    │
    │  ├─ API Routes (/api/v1/*)                     │
    │  │  ├─ auth, audit_trail, bridge, compliance   │
    │  │  ├─ dashboard, documents, observability     │
    │  │  ├─ reports, research, risk_templates       │
    │  │  ├─ skills, stakeholders, templates         │
    │  │                                               │
    │  ├─ Services Layer                              │
    │  │  ├─ compliance_checker                       │
    │  │  ├─ document_analyzer                        │
    │  │  ├─ document_lock_service                    │
    │  │  ├─ hitl_workflow                            │
    │  │  ├─ quality_service                          │
    │  │  ├─ report_generator                         │
    │  │  ├─ research_service                         │
    │  │  ├─ risk_template_seeder                     │
    │  │  ├─ skills_service (orchestrator bridge)    │
    │  │  └─ stakeholder_service                      │
    │  │                                               │
    │  ├─ Core (auth, logging, security)              │
    │  │  ├─ session_auth (RBAC, cookies)            │
    │  │  ├─ logging_config (structlog)               │
    │  │  ├─ observability (OTel, Prometheus)         │
    │  │  ├─ rate_limit (global throttle)             │
    │  │  └─ security (sanitization)                  │
    │  │                                               │
    │  └─ PostgreSQL ORM                              │
    │     ├─ UserSessionORM / AppUserORM              │
    │     ├─ ReviewRecordORM / BridgeHumanReviewORM   │
    │     ├─ AuditEventORM / AuditScheduleORM         │
    │     ├─ SkillDocumentORM / FindingORM            │
    │     ├─ QualityObservationORM                    │
    │     ├─ StakeholderProfileORM / AssignmentORM    │
    │     └─ RiskTemplateORM                          │
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
    │  LLM Adapters:   │              │  - quality_obs     │
    │  • Anthropic     │              │  - stakeholders    │
    │  • OpenAI        │              │  - risk_templates  │
    │  • Nemotron      │              └────────────────────┘
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
# Backend unit & integration tests
pytest tests/ -v

# Specific backend test file
pytest tests/test_bridge_run_api.py -v

# With logging output
pytest tests/test_auth_session_api.py -v -s

# Frontend unit tests (Vitest)
cd frontend && npm test

# Frontend tests in watch mode
cd frontend && npm run test:watch
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
- **Want to add a frontend view model?** → `frontend/lib/` (follow existing `*ViewModel.ts` pattern)
- **Want to add a frontend test?** → `frontend/tests/` (Vitest, globals enabled)

---

**Document Version**: 0.2.0  
**Last Updated**: April 3, 2026  
**Status**: Phase 0 MVP — full structure documented
