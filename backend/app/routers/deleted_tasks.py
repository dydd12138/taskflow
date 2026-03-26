from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import DeletedTask, Task, Project
from app.schemas.deleted_task import DeletedTaskResponse
from app.schemas.task import TaskResponse
from datetime import datetime
import json

router = APIRouter(prefix="/deleted-tasks", tags=["deleted-tasks"])


class RestoreRequest(BaseModel):
    project_id: int


@router.get("", response_model=list[DeletedTaskResponse])
def get_deleted_tasks(db: Session = Depends(get_db)):
    rows = db.query(DeletedTask).order_by(DeletedTask.deleted_at.desc()).all()
    result = []
    for dt in rows:
        task_data = json.loads(dt.task_snapshot)
        result.append(DeletedTaskResponse(
            id=dt.id,
            task_id=dt.task_id,
            task_snapshot=TaskResponse(**task_data),
            original_project_id=dt.original_project_id,
            original_project_name=dt.original_project_name,
            deleted_at=dt.deleted_at,
        ))
    return result


@router.post("/{deleted_id}/restore", response_model=TaskResponse, status_code=201)
def restore_task(deleted_id: int, body: RestoreRequest, db: Session = Depends(get_db)):
    dt = db.query(DeletedTask).filter(DeletedTask.id == deleted_id).first()
    if not dt:
        raise HTTPException(status_code=404, detail="Deleted task not found")

    project = db.query(Project).filter(Project.id == body.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task_data = json.loads(dt.task_snapshot)

    # Determine sort_order: prefer snapshot value if not already taken in target project
    snapshot_order = task_data.get("sort_order", 0)
    conflict = (
        db.query(Task)
        .filter(Task.project_id == body.project_id, Task.sort_order == snapshot_order)
        .first()
    )
    if conflict:
        max_task = (
            db.query(Task)
            .filter(Task.project_id == body.project_id)
            .order_by(Task.sort_order.desc())
            .first()
        )
        new_order = (max_task.sort_order + 1) if max_task else 0
    else:
        new_order = snapshot_order

    now = datetime.now()
    skip = {"id", "project_id", "sort_order", "created_at", "updated_at"}
    date_fields = {"deadline", "start_date", "end_date"}
    task_fields = {}
    for k, v in task_data.items():
        if k in skip:
            continue
        if k in date_fields and v is not None:
            v = datetime.fromisoformat(v)
        task_fields[k] = v

    task = Task(
        project_id=body.project_id,
        sort_order=new_order,
        created_at=now,
        updated_at=now,
        **task_fields,
    )
    db.add(task)
    db.delete(dt)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{deleted_id}", status_code=204)
def purge_task(deleted_id: int, db: Session = Depends(get_db)):
    dt = db.query(DeletedTask).filter(DeletedTask.id == deleted_id).first()
    if not dt:
        raise HTTPException(status_code=404, detail="Deleted task not found")
    db.delete(dt)
    db.commit()
    return None


@router.delete("", status_code=204)
def purge_all_tasks(db: Session = Depends(get_db)):
    db.query(DeletedTask).delete()
    db.commit()
    return None
