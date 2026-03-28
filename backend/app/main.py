import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, SessionLocal
from app.models import Project, Setting, PromptTemplate
from app.routers import categories, projects, tasks, deleted_tasks, settings, conversations, prompt_templates


DEFAULT_SETTINGS = [
    ("theme", '"light"'),
    ("theme_color", '"#3b82f6"'),
    ("font_size", '"medium"'),
    ("ai_provider", '"Anthropic"'),
    ("ai_providers_config", json.dumps({
        "Anthropic": {"api_key": "", "model": "claude-sonnet-4-6", "base_url": "", "proxy": ""},
        "OpenAI":    {"api_key": "", "model": "gpt-4o",             "base_url": "", "proxy": ""},
        "阿里百炼":  {"api_key": "", "model": "qwen-plus",          "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1", "proxy": ""},
        "Ollama":    {"api_key": "ollama", "model": "llama3",       "base_url": "http://localhost:11434/v1", "proxy": ""},
        "其他":      {"api_key": "", "model": "",                   "base_url": "", "proxy": ""},
    })),
    ("conversation_history_limit", "3"),
    ("base_prompt", '""'),
    ('prompt_global', '"你是 TaskFlow 的 AI 助手，帮助用户管理所有项目和任务。"'),
    ('prompt_project', '"你是 TaskFlow 的 AI 助手，专注于当前项目的任务管理和规划。"'),
    ('prompt_today', '"你是 TaskFlow 的 AI 助手，帮助用户专注于今日任务，提高当天工作效率。"'),
    ('prompt_week', '"你是 TaskFlow 的 AI 助手，帮助用户规划和管理本周任务。"'),
]

PRESET_TEMPLATES = [
    {
        "name": "周报",
        "scope": ["week", "global"],
        "prompt": (
            "请根据当前上下文中的本周任务数据，生成一份工作周报。\n\n"
            "格式：\n## 本周完成\n## 进行中\n## 未完成/延期\n## 下周计划\n\n"
            "语言简洁专业。"
        ),
    },
    {
        "name": "日报",
        "scope": ["today", "global"],
        "prompt": (
            "请根据当前上下文中的今日任务数据，生成一份工作日报。\n\n"
            "格式：\n## 今日完成\n## 工作进展\n## 存在问题\n## 明日计划\n\n"
            "语言简洁，适合发给团队。"
        ),
    },
    {
        "name": "月报",
        "scope": ["global"],
        "prompt": (
            "请根据当前上下文中的任务数据，生成本月工作月报。\n\n"
            "格式：\n## 月度概述\n## 各项目进展\n## 重点成果\n## 问题与风险\n## 下月计划\n\n"
            "语言正式，适合发给上级。"
        ),
    },
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

        # Seed preset prompt templates if none exist
        if not db.query(PromptTemplate).first():
            for i, tpl in enumerate(PRESET_TEMPLATES):
                db.add(PromptTemplate(
                    name=tpl["name"],
                    prompt=tpl["prompt"],
                    scope=json.dumps(tpl["scope"], ensure_ascii=False),
                    is_preset=True,
                    enabled=True,
                    sort_order=i,
                ))

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
app.include_router(conversations.router, prefix="/api")
app.include_router(prompt_templates.router, prefix="/api")

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
