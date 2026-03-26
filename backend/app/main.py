from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, SessionLocal
from app.models import Project, Setting
from app.routers import categories, projects, tasks, deleted_tasks, settings


DEFAULT_SETTINGS = [
    ("theme", '"light"'),
    ("theme_color", '"#3b82f6"'),
    ("font_size", '"medium"'),
    ("ai_provider", '"Anthropic"'),
    ("ai_api_key", '""'),
    ("ai_model", '"claude-sonnet-4-6"'),
    ("ai_proxy", '""'),
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if not db.query(Project).filter(Project.id == 1).first():
            db.add(Project(
                id=1, name="未分类", color="#6B7280", status="not_started",
                category_id=None, sort_order=0,
            ))

        existing_keys = {s.key for s in db.query(Setting.key).all()}
        for key, value in DEFAULT_SETTINGS:
            if key not in existing_keys:
                db.add(Setting(key=key, value=value))

        db.commit()
    finally:
        db.close()

    yield


app = FastAPI(title="TaskFlow API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(deleted_tasks.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
