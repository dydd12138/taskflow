import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.prompt_template import PromptTemplate
from app.schemas.prompt_template import (
    PromptTemplateCreate,
    PromptTemplateUpdate,
    PromptTemplateResponse,
)

router = APIRouter(prefix="/prompt-templates", tags=["prompt-templates"])


@router.get("", response_model=List[PromptTemplateResponse])
def list_templates(db: Session = Depends(get_db)):
    return (
        db.query(PromptTemplate)
        .order_by(PromptTemplate.sort_order, PromptTemplate.id)
        .all()
    )


@router.post("", response_model=PromptTemplateResponse)
def create_template(data: PromptTemplateCreate, db: Session = Depends(get_db)):
    t = PromptTemplate(
        name=data.name,
        prompt=data.prompt,
        scope=json.dumps(data.scope, ensure_ascii=False),
        is_preset=data.is_preset,
        enabled=data.enabled,
        sort_order=data.sort_order,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.patch("/{template_id}", response_model=PromptTemplateResponse)
def update_template(
    template_id: int, data: PromptTemplateUpdate, db: Session = Depends(get_db)
):
    t = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    if data.name is not None:
        t.name = data.name
    if data.prompt is not None:
        t.prompt = data.prompt
    if data.scope is not None:
        t.scope = json.dumps(data.scope, ensure_ascii=False)
    if data.enabled is not None:
        t.enabled = data.enabled
    if data.sort_order is not None:
        t.sort_order = data.sort_order
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    t = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(t)
    db.commit()
    return {"ok": True}
