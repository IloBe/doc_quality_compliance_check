"""Single-tenant scope helpers for persistence boundaries."""
from __future__ import annotations

from typing import Any


DEFAULT_TENANT_ID = "default_tenant"


def apply_tenant_scope(query: Any, model: Any, *, tenant_id: str = DEFAULT_TENANT_ID, org_id: str | None = None, project_id: str | None = None) -> Any:
    """Apply the default tenant scope plus optional org/project narrowing."""
    scoped_query = query.filter(model.tenant_id == tenant_id)
    if org_id is not None and hasattr(model, "org_id"):
        scoped_query = scoped_query.filter(model.org_id == org_id)
    if project_id is not None and hasattr(model, "project_id"):
        scoped_query = scoped_query.filter(model.project_id == project_id)
    return scoped_query