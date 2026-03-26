from datetime import datetime
from sqlalchemy import Integer, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class DeletedTask(Base):
    __tablename__ = "deleted_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[int] = mapped_column(Integer, nullable=False)
    task_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    original_project_id: Mapped[int] = mapped_column(Integer, nullable=False)
    original_project_name: Mapped[str] = mapped_column(Text, nullable=False)
    deleted_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
