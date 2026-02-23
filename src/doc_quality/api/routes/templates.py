"""API routes for SOP template management."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from ...services.template_manager import get_template_by_id, get_template_index, list_templates

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/")
async def templates_index() -> dict:
    """Return list of all available SOP templates."""
    return {"templates": list_templates()}


@router.get("/index", response_class=PlainTextResponse)
async def templates_index_markdown() -> str:
    """Return formatted markdown index of all templates."""
    return get_template_index()


@router.get("/{template_id}", response_class=PlainTextResponse)
async def get_template(template_id: str) -> str:
    """Return the content of a specific SOP template."""
    content = get_template_by_id(template_id)
    if content is None:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")
    return content
