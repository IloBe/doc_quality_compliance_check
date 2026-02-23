# arc42 Architecture Documentation Template

**Project/System:** _______________
**Version:** 1.0
**Date:** _______________
**Authors:** _______________
**Status:** Draft

> This template follows the arc42 documentation structure (https://arc42.org).
> arc42 is licensed under the Creative Commons Attribution 4.0 license.

---

## 1. Introduction and Goals

### 1.1 Requirements Overview

> What are the essential features of the system? Who needs it and why?

| Priority | Requirement | Description |
|----------|------------|-------------|
| 1 | | |

### 1.2 Quality Goals

> The top 3–5 quality goals for the architecture (ISO 25010).

| Priority | Quality Attribute | Motivation |
|----------|-----------------|-----------|
| 1 | | |

### 1.3 Stakeholders

| Role | Name | Expectations |
|------|------|-------------|
| | | |

---

## 2. Constraints

### 2.1 Technical Constraints

| Constraint | Description | Background |
|-----------|-------------|-----------|
| | | |

### 2.2 Organisational Constraints

| Constraint | Description | Background |
|-----------|-------------|-----------|
| | | |

### 2.3 Conventions

| Convention | Description |
|-----------|-------------|
| | |

---

## 3. Context and Scope

### 3.1 Business Context

> System context diagram showing the system and all communication partners.

**System Context Diagram:**
```
[External Actor A] ---(Interface 1)---> [THIS SYSTEM]
[THIS SYSTEM] ---(Interface 2)---> [External System B]
```

| Partner | Input | Output | Description |
|---------|-------|--------|-------------|
| | | | |

### 3.2 Technical Context

> Technical interfaces (channels, protocols, hardware).

| Channel | Technology | Protocol | Description |
|---------|-----------|---------|-------------|
| | | | |

---

## 4. Solution Strategy

> Fundamental decisions and solution strategies shaping the architecture.

| Goal/Constraint | Strategy | Link to Details |
|----------------|---------|----------------|
| | | |

**Key Architectural Decisions:**
1. _______________
2. _______________

---

## 5. Building Block View

### 5.1 Whitebox Overall System

> Decomposition of the overall system into building blocks.

**Component Diagram:**
```
[Component A] --> [Component B]
[Component B] --> [Component C]
```

| Building Block | Responsibility | Interface |
|---------------|---------------|---------|
| | | |

### 5.2 Level 2 — Decomposition

> (Add additional levels as needed)

---

## 6. Runtime View

### 6.1 Scenario: [Name]

> Important runtime scenarios showing how building blocks interact.

**Sequence Diagram:**
```
Actor -> System: Request
System -> DB: Query
DB -> System: Result
System -> Actor: Response
```

| Scenario | Participants | Description |
|---------|-------------|-------------|
| | | |

---

## 7. Deployment View

### 7.1 Infrastructure Level 1

> Technical infrastructure and mapping of building blocks to infrastructure.

**Deployment Diagram:**
```
[Environment: Production]
  [Server A]
    [Container: API Service]
    [Container: Database]
  [Server B]
    [Container: Frontend]
```

| Node | Technology | Deployed Artefacts |
|------|-----------|-------------------|
| | | |

### 7.2 Infrastructure Level 2

> (Add additional detail as needed)

---

## 8. Concepts

### 8.1 Domain Model

> Domain concepts and entities.

### 8.2 Architecture Patterns

| Pattern | Application | Rationale |
|---------|-----------|----------|
| | | |

### 8.3 Security Concepts

| Concept | Implementation | Standard |
|---------|---------------|---------|
| Authentication | | |
| Authorisation | | |
| Encryption at rest | | |
| Encryption in transit | | |

### 8.4 Observability

| Aspect | Tool | Description |
|--------|------|-------------|
| Logging | | |
| Monitoring | | |
| Tracing | | |

### 8.5 Error Handling

> Strategy for error handling and resilience patterns.

---

## 9. Architecture Decisions

> Architecture Decision Records (ADRs).

### ADR-001: [Title]

**Status:** Accepted | Proposed | Deprecated
**Date:** _______________
**Context:** _______________
**Decision:** _______________
**Consequences:** _______________

---

## 10. Quality Requirements

### 10.1 Quality Tree

> Hierarchy of quality attributes and their sub-characteristics.

```
Quality
├── Performance
│   ├── Response time < 200ms
│   └── Throughput > 1000 req/s
├── Security
│   ├── Authentication
│   └── Authorisation
└── Maintainability
    ├── Testability
    └── Modularity
```

### 10.2 Quality Scenarios

| ID | Quality Attribute | Scenario | Measure | Target |
|----|-----------------|---------|---------|--------|
| QS-01 | | | | |

---

## 11. Risks and Technical Debt

### 11.1 Risks

| ID | Risk | Probability | Impact | Mitigation |
|----|------|------------|--------|-----------|
| R-01 | | | | |

### 11.2 Technical Debt

| ID | Description | Impact | Resolution Plan |
|----|-------------|--------|----------------|
| TD-01 | | | |

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| API | Application Programming Interface |
| | |

---

## Document History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | | | Initial arc42 template |
