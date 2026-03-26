from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project, Task
from app.schemas import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(
        case((Project.category_id.is_(None), 1), else_=0),
        Project.category_id,
        Project.sort_order,
    ).all()
    return projects


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    query = db.query(Project).filter(Project.category_id == data.category_id)
    max_order = query.order_by(Project.sort_order.desc()).first()
    new_order = (max_order.sort_order + 1) if max_order else 0
    
    project = Project(
        name=data.name,
        color=data.color,
        status=data.status,
        category_id=data.category_id,
        sort_order=new_order,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.query(Task).filter(Task.project_id == project_id).update({"project_id": 1})

    db.delete(project)
    db.commit()
    return None
