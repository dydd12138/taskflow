from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.task import TaskResponse


class DeletedTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    task_snapshot: TaskResponse
    original_project_id: int
    original_project_name: str
    deleted_at: datetime
