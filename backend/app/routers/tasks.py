from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, and_
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Task, Project, DeletedTask
from app.schemas import TaskCreate, TaskUpdate, TaskResponse
from datetime import datetime

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
def get_tasks(
    project_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Task)

    if project_id is not None:
        query = query.filter(Task.project_id == project_id)

    if date_from is not None or date_to is not None:
        # A task matches if ANY of deadline / start_date / end_date falls in [date_from, date_to].
        # func.date() extracts the date part; SQLite stores ISO strings so string comparison is correct.
        date_cols = [Task.deadline, Task.start_date, Task.end_date]
        per_col = []
        for col in date_cols:
            conds = [col.isnot(None)]
            if date_from is not None:
                conds.append(func.date(col) >= date_from)
            if date_to is not None:
                conds.append(func.date(col) <= date_to)
            per_col.append(and_(*conds))
        query = query.filter(or_(*per_col))

    return query.order_by(Task.sort_order).all()


@router.post("", response_model=TaskResponse, status_code=201)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    max_order = (
        db.query(Task)
        .filter(Task.project_id == data.project_id)
        .order_by(Task.sort_order.desc())
        .first()
    )
    new_order = (max_order.sort_order + 1) if max_order else 0

    task = Task(
        project_id=data.project_id,
        name=data.name,
        time_type=data.time_type,
        deadline=data.deadline,
        start_date=data.start_date,
        end_date=data.end_date,
        is_all_day=data.is_all_day,
        priority=data.priority,
        manual_status=data.manual_status,
        is_completed=data.is_completed,
        note=data.note,
        sort_order=new_order,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    task.updated_at = datetime.now()

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    project = db.query(Project).filter(Project.id == task.project_id).first()
    project_name = project.name if project else "Unknown"

    task_snapshot = TaskResponse.model_validate(task).model_dump_json()

    deleted_task = DeletedTask(
        task_id=task.id,
        task_snapshot=task_snapshot,
        original_project_id=task.project_id,
        original_project_name=project_name,
    )
    db.add(deleted_task)
    db.delete(task)
    db.commit()
    return None
