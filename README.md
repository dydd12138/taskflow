# TaskFlow

一个支持 AI 对话的个人任务管理工具。

## 功能

- **任务管理** — 按项目组织任务，支持截止日期、优先级、状态标记
- **多视图** — 今日、本周（甘特图）、看板、日历、全部任务
- **AI 对话** — 全局 / 项目 / 今日 / 本周四种上下文对话，可创建修改任务、编辑笔记
- **斜杠指令** — 输入 `/` 触发快捷指令（周报、日报、月报等），支持自定义
- **项目笔记** — 每个项目内置 Markdown 编辑器
- **多 AI 提供商** — 支持 Anthropic、OpenAI、阿里百炼、Ollama 及自定义接口

## 技术栈

- **前端**：React + TypeScript + Vite + Tailwind CSS
- **后端**：FastAPI + SQLite
- **部署**：Docker 单容器（前端静态文件由 FastAPI 服务）

## 本地开发

```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端
npm install
npm run dev
```

## Docker 部署

```bash
docker compose up -d
```

访问 `http://localhost:8080`，数据持久化在 `./data/` 目录。
