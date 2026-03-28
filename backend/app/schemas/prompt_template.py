import json
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator


class PromptTemplateCreate(BaseModel):
    name: str
    prompt: str
    scope: list[str] = []
    is_preset: bool = False
    enabled: bool = True
    sort_order: int = 0


class PromptTemplateUpdate(BaseModel):
    name: str | None = None
    prompt: str | None = None
    scope: list[str] | None = None
    enabled: bool | None = None
    sort_order: int | None = None


class PromptTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    prompt: str
    scope: list[str]
    is_preset: bool
    enabled: bool
    sort_order: int
    created_at: datetime

    @field_validator("scope", mode="before")
    @classmethod
    def parse_scope(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v or []
