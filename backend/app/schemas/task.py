from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TaskCreate(BaseModel):
    project_id: int
    name: str
    time_type: str | None = "deadline"
    deadline: datetime | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_all_day: bool | None = True
    priority: str | None = "none"
    manual_status: str | None = "not_started"
    is_completed: bool | None = False
    note: str | None = None


class TaskUpdate(BaseModel):
    project_id: int | None = None
    name: str | None = None
    time_type: str | None = None
    deadline: datetime | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_all_day: bool | None = None
    priority: str | None = None
    manual_status: str | None = None
    is_completed: bool | None = None
    note: str | None = None
    sort_order: int | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    time_type: str
    deadline: datetime | None
    start_date: datetime | None
    end_date: datetime | None
    is_all_day: bool
    priority: str
    manual_status: str
    is_completed: bool
    note: str | None
    sort_order: int
    created_at: datetime
    updated_at: datetime
