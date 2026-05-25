# Admin Dashboard Documentation

> **Navigation:** [← Back to Main README](README.md)

## Overview

The Admin Dashboard provides centralized governance for the **Doc Quality Compliance Checker** application. It enables app administrators to manage stakeholder roles, control AI model priorities, and configure runtime parameters without direct API access.

### Admin Access

- **URL:** `/admin/stakeholders`
- **Required Role:** `app_admin`, `qm_lead`, or `riskmanager`
- **Required Permission:** Varies by feature

---

## Table of Contents

1. [Architecture](#architecture)
2. [Admin Tasks](#admin-tasks)
3. [Stakeholder Profiles Management](#stakeholder-profiles-management)
4. [Model Policy Management](#model-policy-management)
5. [UI Components](#ui-components)
6. [SOLID Design Principles](#solid-design-principles)
7. [API Integration](#api-integration)
8. [Troubleshooting](#troubleshooting)

---

## Architecture

### Component Hierarchy

```
┌─ Admin Pages
│  ├─ /admin/stakeholders (Primary)
│  │  └─ Tabs: "Role Profiles" | "Model Policy"
│  └─ /admin/model-policy (Standalone alternative)
│
├─ React Components (SOLID)
│  ├─ ModelPolicyEditorSection
│  │  └─ Lifecycle & integration wrapper
│  ├─ ModelPolicyEditor
│  │  └─ State orchestration & layout
│  ├─ ModelPrioritySortable
│  │  └─ Model reordering & ranking UI
│  └─ ModelParametersEditor
│     └─ Parameter sliders (T/P/K)
│
├─ Frontend Libraries
│  ├─ adminModelPolicyViewModel
│  │  └─ Types, validation, utilities
│  └─ modelPolicyClient
│     └─ HTTP client (fetch/update)
│
└─ Backend API
   ├─ GET /api/v1/admin/model-policy
   ├─ PUT /api/v1/admin/model-policy
   └─ GET /api/v1/admin/model-policy/active
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Admin Pages                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ /admin/stakeholders (Primary)           /admin/model-policy  │ │
│  │ Tab: Role Profiles | Model Policy       (Standalone)        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────┬─────────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ ModelPolicyEditorSection    │
        │ (Lifecycle & Integration)   │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │ ModelPolicyEditor           │
        │ (State Orchestration)       │
        ├──────────┬──────────────────┤
        │          │                  │
        ▼          ▼                  ▼
    ┌────┐  ┌───────────┐  ┌──────────────────┐
    │List│  │Parameters │  │Selector Buttons  │
    └────┘  │  Sliders  │  │& Validation      │
            └───────────┘  └──────────────────┘
        │          │                  │
        └─────┬────┴──────────────────┘
              │
              ▼
    ┌──────────────────────────────────┐
    │   API Client Layer               │
    │ modelPolicyClient.ts             │
    │ - fetchModelPolicy()             │
    │ - updateModelPolicy()            │
    │ - fetchActiveModelStatus()       │
    └──────┬───────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │   Backend REST API               │
    │ GET /api/v1/admin/model-policy   │
    │ PUT /api/v1/admin/model-policy   │
    │ GET /api/v1/admin/.../active     │
    └──────────────────────────────────┘
```

---

## Admin Tasks

### Quick Reference

| Task | Location | Required Role | Duration |
|------|----------|---------------|----------|
| Manage stakeholder roles | `/admin/stakeholders` → "Role Profiles" | `app_admin` | 5-10 min |
| Assign employees to roles | `/admin/stakeholders` → "Role Profiles" | `app_admin` | 2-5 min |
| Configure model priority | `/admin/stakeholders` → "Model Policy" | `app_admin` | 3-5 min |
| Adjust inference parameters | `/admin/stakeholders` → "Model Policy" | `app_admin` | 2-3 min |
| View active model status | Topbar AI Disclaimer | All roles | Real-time |
| Audit policy changes | Audit Trail (linked) | `auditor` | 2-5 min |

---

## Stakeholder Profiles Management

### Purpose

Centralized role template governance. Define who can do what in compliance workflows.

### Location

`/admin/stakeholders` → **"Role Profiles"** tab

### Default Roles

| Role | Purpose | Typical Permissions |
|------|---------|-------------------|
| `qm_lead` | Quality Manager Lead | compliance.check.write, model.policy.read |
| `auditor` | Audit Reviewer | compliance.check.read, audit.view |
| `riskmanager` | Risk Assessment Officer | risk.assessment.write |
| `architect` | System Architect | bridge.run.write, architecture.read |
| `app_admin` | Application Administrator | model.policy.write, stakeholder.profiles.write |
| `service` | System Service Account | All (internal) |

### How to Manage Stakeholder Profiles

#### 1. **View Profile List**
- Left sidebar shows all available roles
- Click a role to view/edit details
- Green badge = Active, Red = Inactive

#### 2. **Edit Role Profile**
- **Title:** Role display name (e.g., "Compliance QA Lead")
- **Description:** Detailed responsibility statement
- **Active/Inactive:** Toggle to enable/disable role
- **Permissions:** Checkbox grid for granular access control

#### 3. **Save Changes**
- Click **"Save template"** button
- Confirmation message appears
- Changes apply to new assignments immediately

#### 4. **Manage Employee Assignments**
- **Single Add:** Enter employee name, press Enter
- **Bulk Add:** Toggle "Bulk add mode", paste CSV list
- **Remove:** Click trash icon next to employee name
- Employees can have multiple roles

#### 5. **Validation**
- Role must have ≥1 permission
- Employee names must be non-empty
- Duplicates are automatically deduplicated

### Permission Catalog

Each role can grant these permissions:

- **compliance.check.read** — View compliance check results
- **compliance.check.write** — Execute compliance checks
- **model.policy.read** — View model configuration
- **model.policy.write** — Edit model priority & parameters
- **audit.view** — Access audit trail
- **risk.assessment.read** — View risk models
- **risk.assessment.write** — Create/edit risk assessments
- **bridge.run.write** — Execute bridge workflows
- **architecture.read** — View system architecture
- **stakeholder.profiles.write** — Manage roles & permissions

---

## Model Policy Management

### Purpose

Control AI model ranking, fallback strategy, and inference parameters without modifying code.

### Location

`/admin/stakeholders` → **"Model Policy"** tab  
**OR** `/admin/model-policy` (full-screen standalone)

### Key Features

✅ **Drag/Reorder Priority Ranking** — Set which model is tried first
✅ **Parameter Sliders** — Adjust Temperature, Top-P, Top-K
✅ **Enable/Disable Models** — Quick fallback management
✅ **Default Model Selection** — Mark primary model
✅ **Real-time Validation** — Prevents invalid configurations
✅ **Summary View** — Quick overview without full editor

### How to Manage Model Policy

#### 1. **View Current Configuration**

Default view shows:
- Priority ranking (1 = highest)
- Model name & provider (Ollama/Anthropic/etc.)
- Enabled/Disabled status
- Current parameters (T, P, K values)
- Which is default model

#### 2. **Click "Edit Policy"**

Opens full editor with three sections:
- **Left:** Model ranking list
- **Right:** Parameter sliders
- **Bottom:** Model selector buttons

#### 3. **Reorder Model Priority**

- Click model row to select it
- Use **↑** arrow to move up (higher priority)
- Use **↓** arrow to move down (lower priority)
- Top model = tried first when available

**Example Ordering:**
```
Priority 1: Llama 3.1 8B (Ollama) — Fast, on-prem
Priority 2: Llama 3.1 70B (Ollama) — Better quality
Priority 3: Claude 3.5 (Anthropic) — Premium fallback
```

#### 4. **Toggle Model Enabled/Disabled**

- Click toggle button (⊙/⊗) on model row
- Green = Enabled (can be selected)
- Gray = Disabled (skipped during resolution)
- System falls back to next enabled model

**Use Case:**
```
Disable a model if:
- It's undergoing maintenance
- It's consuming too many resources
- Quality issues need investigation
- License expired
```

#### 5. **Set Default Model**

- Click **"Set Default"** button on model row
- Selected model gets blue highlight + "DEFAULT" badge
- This model is used when no priority override exists

#### 6. **Edit Runtime Parameters**

Click a model name to see parameter sliders:

##### Temperature (0.0 — 2.0)
- **Lower (0.0-0.5):** More deterministic, focused responses
- **Middle (0.7-1.0):** Balanced output
- **Higher (1.5-2.0):** More creative, diverse outputs
- **Typical:** 0.2 for compliance, 0.7 for general

##### Top-P (0.0 — 1.0)
- **Lower:** More focused on likely tokens
- **Higher:** More diverse vocabulary
- **Typical:** 0.9 (consider top 90% by probability)

##### Top-K (1 — 500)
- **Lower:** Restrict to top K tokens
- **Higher:** Allow wider token vocabulary
- **Typical:** 32-40 for compliance work

**How to Edit:**
- Drag slider or click/type in number field
- Changes appear in real-time
- Validation prevents invalid ranges

#### 7. **Delete a Model**

- Hover over model row
- Click trash icon (appears on hover only)
- Model removed from policy
- If it was default, system picks next enabled model

#### 8. **Save Changes**

- Click **"Save Policy"** button (bottom right)
- Validation runs:
  - ≥1 model required
  - Model IDs must be unique
  - Default model must exist in list
  - Parameters must be in valid ranges
- Error message shows specific issues if validation fails
- Success confirmation on save

#### 9. **Cancel Editing**

- Click **"Cancel"** button
- All unsaved changes discarded
- Returns to summary view

### Default Model Hierarchy

Out of box, model priority is:

```
1. llama3.1:8b (Ollama)
   - Fast, on-premise, deterministic
   - Temp: 0.2, Top-P: 0.9, Top-K: 40

2. llama3.1:70b (Ollama)
   - Higher quality, still on-prem
   - Temp: 0.15, Top-P: 0.9, Top-K: 32

3. qwen3:32b (Ollama)
   - Multilingual support
   - Temp: 0.2, Top-P: 0.85, Top-K: 40
```

Fallbacks available but disabled:
- Anthropic Claude (premium)
- Perplexity (research mode)

### Validation Rules

| Field | Constraint | Error |
|-------|-----------|-------|
| Model ID | Non-empty, unique | "Model ID is required" / "Model IDs must be unique" |
| Display Name | Non-empty | "Display name is required" |
| Priority | 1-1000 | "Priority must be between 1 and 1000" |
| Temperature | 0.0-2.0 | "Temperature must be between 0 and 2" |
| Top-P | 0.0-1.0 | "Top P must be between 0 and 1" |
| Top-K | 1-500 | "Top K must be between 1 and 500" |
| Default Model | Must exist in list | "Default model ID must exist in items list" |
| Min Models | ≥1 | "At least one model must be configured" |

---

## UI Components

### Reusable Component Library

#### **ModelPrioritySortable.tsx**
Displays ranked model list with reordering controls.

**Props:**
```typescript
{
  items: ModelCandidate[]
  defaultModelId: string
  onReorder: (newOrder) => void
  onToggleEnabled: (modelId) => void
  onRemove: (modelId) => void
  onSelectDefault: (modelId) => void
  isReadOnly?: boolean
}
```

**Features:**
- Up/down arrow buttons for reordering
- Toggle enable/disable state
- Set as default button
- Hover-only delete button
- Provider color badges

#### **ModelParametersEditor.tsx**
Parameter slider interface for Temperature, Top-P, Top-K.

**Props:**
```typescript
{
  modelId: string
  displayName: string
  params: RuntimeModelParameters
  onParamChange: (modelId, param, value) => void
  isReadOnly?: boolean
}
```

**Features:**
- Range sliders with inline number inputs
- Directional labels ("More deterministic" ↔ "More creative")
- Real-time validation
- Keyboard support

#### **ModelPolicyEditor.tsx**
Main orchestration component. Manages state and layout.

**Props:**
```typescript
{
  policy: ModelPolicyUI
  isLoading?: boolean
  isSaving?: boolean
  error?: string
  onSave: (policy) => Promise<void>
  onCancel: () => void
}
```

**Features:**
- Three-column layout
- Model selector buttons
- Validation error display
- Success/error messages
- Save/Cancel buttons

#### **ModelPolicyEditorSection.tsx**
Integration wrapper for embedding in admin tabs.

**Props:**
```typescript
None (self-contained)
```

**Features:**
- Fetch policy on mount
- Toggle editor/summary view
- Summary table
- Error handling with fallback defaults

---

## SOLID Design Principles

### Architecture Decisions

#### **S — Single Responsibility**
Each component has **one job**:

- **ModelPrioritySortable:** Only reordering & ranking UI
- **ModelParametersEditor:** Only parameter sliders
- **ModelPolicyEditor:** Only orchestration & state
- **ModelPolicyEditorSection:** Only lifecycle & integration

#### **O — Open/Closed**
Extensible without modification:

- New providers can be added to `PROVIDER_DISPLAY_NAMES`
- New parameters via `RuntimeModelParameters` interface
- Validation rules isolated in pure functions

#### **L — Liskov Substitution**
Consistent interfaces:

- All components accept standard props
- API client follows predictable error handling
- View models provide consistent transformations

#### **I — Interface Segregation**
Focused component props:

- `ModelParametersEditor` only needs: `modelId`, `displayName`, `params`, `onParamChange`
- No bloated prop objects
- Clear single-purpose contracts

#### **D — Dependency Inversion**
Components don't directly fetch/update:

- API calls via `modelPolicyClient.ts`
- View model utilities via `adminModelPolicyViewModel.ts`
- State management via callbacks (`onSave`, `onCancel`, etc.)

---

## API Integration

### HTTP Endpoints

#### **GET /api/v1/admin/model-policy**
Fetch current model policy configuration.

**Request:**
```
GET /api/v1/admin/model-policy HTTP/1.1
Authorization: <session-cookie>
```

**Response (200):**
```json
{
  "default_model_id": "llama3.1:8b",
  "items": [
    {
      "model_id": "llama3.1:8b",
      "display_name": "Llama 3.1 8B",
      "provider": "ollama",
      "enabled": true,
      "priority": 1,
      "params": {
        "temperature": 0.2,
        "top_p": 0.9,
        "top_k": 40
      }
    }
  ],
  "updated_by": "alice@company.com",
  "updated_at": "2026-05-17T10:30:00Z"
}
```

**Error (403):**
```json
{
  "detail": "Insufficient permissions. Required: model.policy.read"
}
```

#### **PUT /api/v1/admin/model-policy**
Update model policy configuration.

**Request:**
```json
{
  "default_model_id": "llama3.1:8b",
  "items": [
    {
      "model_id": "llama3.1:8b",
      "display_name": "Llama 3.1 8B",
      "provider": "ollama",
      "enabled": true,
      "priority": 1,
      "params": {
        "temperature": 0.2,
        "top_p": 0.9,
        "top_k": 40
      }
    }
  ]
}
```

**Response (200):**
Returns updated policy (same format as GET).

**Error (422):**
```json
{
  "detail": "Validation error: Default model ID must exist in items list"
}
```

**Error (403):**
```json
{
  "detail": "Insufficient permissions. Required: model.policy.write"
}
```

#### **GET /api/v1/admin/model-policy/active**
Get currently active model for display purposes.

**Response (200):**
```json
{
  "active_model": {
    "model_id": "llama3.1:8b",
    "display_name": "Llama 3.1 8B",
    "provider": "ollama",
    "priority": 1,
    "params": {
      "temperature": 0.2,
      "top_p": 0.9,
      "top_k": 40
    }
  },
  "policy_updated_at": "2026-05-17T10:30:00Z",
  "policy_updated_by": "alice@company.com"
}
```

### Frontend Client Functions

#### **fetchModelPolicy()**
```typescript
import { fetchModelPolicy } from '@/lib/modelPolicyClient';

const policy = await fetchModelPolicy();
```

#### **updateModelPolicy(policy)**
```typescript
import { updateModelPolicy } from '@/lib/modelPolicyClient';

await updateModelPolicy({
  default_model_id: 'llama3.1:8b',
  items: [...]
});
```

#### **fetchActiveModelStatus()**
```typescript
import { fetchActiveModelStatus } from '@/lib/modelPolicyClient';

const status = await fetchActiveModelStatus();
console.log(status.active_model.display_name);
```

### Error Handling

All client functions throw descriptive errors:

```typescript
try {
  const policy = await fetchModelPolicy();
} catch (error) {
  console.error(error.message);
  // "Backend responded with 403"
  // "Failed to fetch model policy"
  // Falls back to demo defaults in some cases
}
```

---

## Troubleshooting

### Common Issues

#### **"Model Policy tab is missing"**
- Verify role: Must be `app_admin`, `qm_lead`, or `riskmanager`
- Check permission: Role must have `model.policy.read` permission
- Refresh page after role assignment

#### **"Cannot save model policy" error**
- Check validation errors displayed (usually on screen)
- Ensure ≥1 model is enabled
- Ensure default model exists in list
- Verify parameters are in valid ranges
- Check network connection

#### **Model parameters won't update**
- Reload page to refresh policy
- Check browser console for JavaScript errors
- Verify API endpoint is accessible
- Check user has `model.policy.write` permission

#### **UI looks broken or misaligned**
- Clear browser cache: Ctrl+Shift+Delete
- Hard refresh: Ctrl+F5
- Verify CSS/Tailwind is loaded in DevTools

#### **Active model not showing in Topbar**
- Check `/api/v1/admin/model-policy/active` responds
- Verify network tab: Request should return 200
- Model policy might not be saved
- Try clicking "Edit Policy" then "Save" again

### Debug Mode

To inspect internal state, in browser DevTools console:

```javascript
// Fetch current policy
fetch('/api/v1/admin/model-policy').then(r => r.json()).then(console.log)

// Check active model
fetch('/api/v1/admin/model-policy/active').then(r => r.json()).then(console.log)
```

### Logs

Backend logs are in: `logs/compliance_checker.log`

Look for entries with:
- `model_policy` — Model policy operations
- `admin` — Administrative actions
- `[ERROR]` — Errors during operations

---

## File Structure

```
frontend/
├── pages/
│   └── admin/
│       ├── stakeholders.tsx          ← Primary admin page (with tabs)
│       └── model-policy.tsx          ← Standalone model policy page
├── components/
│   ├── admin/
│   │   ├── model_policy/
│   │   │   ├── ModelPolicyEditor.tsx
│   │   │   ├── ModelPolicySortable.tsx
│   │   │   ├── ModelParametersEditor.tsx
│   │   │   └── ModelPolicyEditorSection.tsx
│   │   └── stakeholders/
│   │       ├── StakeholderProfileEditor.tsx
│   │       ├── StakeholderProfilesList.tsx
│   │       └── StakeholderSessionCard.tsx
│   └── common/
│       └── PageHeaderWithWhy.tsx
└── lib/
    ├── adminModelPolicyViewModel.ts  ← Types & utilities
    ├── modelPolicyClient.ts          ← HTTP client
    └── adminStakeholdersViewModel.ts ← Stakeholder types
```

---

## Quick Reference

### Common Admin Tasks

**I need to...**

| Task | Steps |
|------|-------|
| Add employee to role | 1. Go to `/admin/stakeholders` → Role Profiles<br>2. Select role<br>3. Enter employee name<br>4. Press Enter |
| Change model priority | 1. Go to `/admin/stakeholders` → Model Policy<br>2. Click "Edit Policy"<br>3. Use ↑↓ arrows<br>4. Click "Save Policy" |
| Adjust model parameters | 1. Go to `/admin/stakeholders` → Model Policy<br>2. Click "Edit Policy"<br>3. Click model name<br>4. Adjust sliders<br>5. Click "Save Policy" |
| Disable a model | 1. Go to `/admin/stakeholders` → Model Policy<br>2. Click "Edit Policy"<br>3. Click toggle button (on model row)<br>4. Click "Save Policy" |
| Grant admin permission | 1. Go to `/admin/stakeholders` → Role Profiles<br>2. Select role<br>3. Check permission checkboxes<br>4. Click "Save template" |
| Prevent model from being used | Disable the model in Model Policy editor |

---

## Related Documentation

- [Main README](README.md) — Project overview
- [Backend Model Policy Service](src/doc_quality/services/model_policy_service.py) — Backend implementation
- [API Routes](src/doc_quality/api/routes/model_policy.py) — REST endpoints
- [Stakeholder Authorization](src/doc_quality/models/orm.py) — Role & permission ORM

---

## Support

**For issues or questions:**

1. Check this documentation first
2. Review [Troubleshooting](#troubleshooting) section
3. Check backend logs: `logs/compliance_checker.log`
4. Run `npm run lint` in frontend directory for errors
5. Run `pytest` in backend for test coverage

---

**Last Updated:** May 17, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
