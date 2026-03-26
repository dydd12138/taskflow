from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ProjectCreate(BaseModel):
    name: str
    color: str | None = "#6B7280"
    category_id: int | None = None
    status: str | None = "not_started"


class ProjectUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    status: str | None = None
    category_id: int | None = None
    sort_order: int | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str
    status: str
    category_id: int | None
    sort_order: int
    created_at: datetime
    updated_at: datetime
