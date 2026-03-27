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

# ── 前端静态文件服务（仅在容器内 static/ 目录存在时挂载）─────────────────────────
# 开发环境直接 uvicorn 启动时无 static/ 目录，此段自动跳过，不影响本地开发。
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_STATIC_DIR = Path("static")
if _STATIC_DIR.exists():
    # /assets/* 单独挂载，享有 ETag / 缓存头
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

    # SPA fallback：文件存在则返回文件（favicon 等），否则返回 index.html
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        f = _STATIC_DIR / full_path
        if f.is_file():
            return FileResponse(f)
        return FileResponse(_STATIC_DIR / "index.html")
