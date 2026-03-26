# TaskFlow · 技术方案文档 v1.0

---

## 一、技术选型

本项目目标：部署在 NAS，通过浏览器 Web 访问，后端存储尽可能轻量化。

### 1.1 整体架构

| 层级 | 技术选型 | 选型理由 |
|------|----------|----------|
| 前端 | React + Tailwind CSS | 延续 Demo 技术栈，无需重建 |
| 后端 | FastAPI (Python) | 轻量、已熟悉、与现有 NAS 项目一致 |
| 数据库 | SQLite | 单文件、NAS 友好、无需独立数据库服务 |
| ORM | SQLAlchemy + Alembic | 类型安全 + Schema 迁移管理 |
| 容器化 | Docker Compose | 单文件即可部署，与 WorkPilot 同套路 |
| 反向代理 | Nginx | 与现有 NAS 环境一致 |

> SQLite 对个人任务管理完全够用，单文件备份方便。后续若需多用户扩展可迁移至 PostgreSQL，FastAPI + SQLAlchemy 的切换成本极低。

### 1.2 部署架构

Docker Compose 单文件管理三个服务：

| 服务 | 镜像 | 对外端口 | 说明 |
|------|------|----------|------|
| backend | python:3.12-slim | 内部 8000 | FastAPI 应用 |
| frontend | node:alpine (build) → nginx:alpine | 内部 80 | 构建产物由 Nginx 托管 |
| nginx | nginx:alpine | 3020（可改） | 反向代理，/api/* → backend，/* → frontend |

---

## 二、数据模型

共 5 张核心表，使用 SQLite 存储。

### 2.1 分类表 `categories`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| name | TEXT | NOT NULL | 分类名称 |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | 排序权重，越小越靠前 |
| created_at | DATETIME | NOT NULL, DEFAULT now | 创建时间 |

> 「未分类」不存入此表，前端约定 `category_id = NULL` 表示未分类。

---

### 2.2 项目表 `projects`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| name | TEXT | NOT NULL | 项目名称 |
| color | TEXT | NOT NULL, DEFAULT '#6B7280' | 颜色（HEX） |
| status | TEXT | NOT NULL, DEFAULT 'not_started' | not_started / in_progress / completed |
| category_id | INTEGER | FK → categories.id, NULL | NULL 表示未分类 |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | 同分类内排序 |
| created_at | DATETIME | NOT NULL, DEFAULT now | 创建时间 |
| updated_at | DATETIME | NOT NULL, DEFAULT now | 最后更新时间 |

---

### 2.3 任务表 `tasks`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| project_id | INTEGER | FK → projects.id, NOT NULL | 所属项目 |
| name | TEXT | NOT NULL | 任务名称（允许同名，以 id 区分） |
| time_type | TEXT | NOT NULL, DEFAULT 'deadline' | deadline（截止时间）/ range（起止时间） |
| deadline | DATETIME | NULL | 截止时间，time_type=deadline 时有效 |
| start_date | DATETIME | NULL | 开始时间，time_type=range 时有效 |
| end_date | DATETIME | NULL | 结束时间，time_type=range 时有效 |
| is_all_day | BOOLEAN | NOT NULL, DEFAULT 1 | 全天(1) 或 指定时间(0) |
| priority | TEXT | NOT NULL, DEFAULT 'none' | none / low / medium / high |
| manual_status | TEXT | NOT NULL, DEFAULT 'not_started' | 手动状态，与看板泳道无关 |
| is_completed | BOOLEAN | NOT NULL, DEFAULT 0 | 完成标记（✓） |
| note | TEXT | NULL | 备注 |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | 项目内排序 |
| created_at | DATETIME | NOT NULL, DEFAULT now | 创建时间 |
| updated_at | DATETIME | NOT NULL, DEFAULT now | 最后更新时间 |

> **看板泳道**（未开始/进行中/已逾期/已完成）为前端计算字段，不存入数据库，由 `deadline`/`start_date`/`end_date`/`is_completed` 推算。
>
> `is_all_day=1` 时，时间字段只存日期（时间部分统一为 00:00:00）；`is_all_day=0` 时存精确到小时的时间。

---

### 2.4 已删除任务表 `deleted_tasks`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 主键 |
| task_id | INTEGER | NOT NULL | 原任务 id（已从 tasks 表删除） |
| task_snapshot | TEXT | NOT NULL | JSON 序列化的完整任务数据快照 |
| original_project_id | INTEGER | NOT NULL | 删除前所属项目 id |
| original_project_name | TEXT | NOT NULL | 删除前所属项目名称快照 |
| deleted_at | DATETIME | NOT NULL, DEFAULT now | 删除时间 |

> 恢复时若原 `project_id` 仍存在则直接恢复；若已被删除则由用户选择目标项目。

---

### 2.5 设置表 `settings`

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| key | TEXT | PK | 设置键名 |
| value | TEXT | NOT NULL | 设置值（JSON 字符串） |
| updated_at | DATETIME | NOT NULL, DEFAULT now | 最后更新时间 |

预定义 key：

| key | value 示例 | 说明 |
|-----|-----------|------|
| theme | "light" | light / dark |
| theme_color | "#2563EB" | 主题色 HEX |
| font_size | "medium" | small / medium / large |
| ai_provider | "anthropic" | AI 服务商 |
| ai_api_key | "sk-ant-..." | API Key（建议加密存储） |
| ai_model | "claude-sonnet-4-20250514" | 模型名称 |
| ai_proxy | "https://..." | 代理地址，可为空字符串 |

---

## 三、项目工程结构

### 3.1 目录结构

```
taskflow/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口，注册路由
│   │   ├── database.py          # SQLite 连接 & Session 管理
│   │   ├── models/              # SQLAlchemy ORM 模型
│   │   │   ├── __init__.py
│   │   │   ├── category.py
│   │   │   ├── project.py
│   │   │   ├── task.py
│   │   │   ├── deleted_task.py
│   │   │   └── setting.py
│   │   ├── schemas/             # Pydantic 请求/响应 Schema
│   │   │   ├── category.py
│   │   │   ├── project.py
│   │   │   ├── task.py
│   │   │   └── setting.py
│   │   └── routers/             # API 路由，一个文件对应一组资源
│   │       ├── categories.py
│   │       ├── projects.py
│   │       ├── tasks.py
│   │       ├── deleted_tasks.py
│   │       └── settings.py
│   └── data/                    # SQLite 文件，通过 volume 挂载
│       └── taskflow.db
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/                 # Axios 封装，与后端路由一一对应
        │   ├── categories.ts
        │   ├── projects.ts
        │   ├── tasks.ts
        │   └── settings.ts
        ├── store/               # Zustand 状态管理，替换 Demo 的 mock 数据
        │   ├── categoryStore.ts
        │   ├── projectStore.ts
        │   ├── taskStore.ts
        │   └── settingStore.ts
        ├── components/          # 可复用 UI 组件
        │   ├── Sidebar/
        │   ├── TaskList/
        │   ├── TaskDetail/
        │   ├── KanbanBoard/
        │   ├── GanttChart/
        │   ├── Calendar/
        │   └── AIChat/
        ├── views/               # 页面级视图（对应左侧导航）
        │   ├── TodayView.tsx
        │   ├── WeekView.tsx
        │   ├── AllTasksView.tsx
        │   ├── CalendarView.tsx
        │   └── ProjectView.tsx
        ├── hooks/               # 自定义 Hooks（如 useTaskFilter、useDateRange）
        └── utils/               # 纯函数工具
            ├── kanban.ts        # 看板泳道计算逻辑
            ├── dateFilter.ts    # 今天/本周任务筛选逻辑
            └── time.ts          # 时间格式化工具
```

---

### 3.2 API 路由设计

| Method | 路径 | 说明 |
|--------|------|------|
| GET | /api/categories | 获取所有分类 |
| POST | /api/categories | 新建分类 |
| PATCH | /api/categories/{id} | 更新分类（名称/排序） |
| DELETE | /api/categories/{id} | 删除分类 |
| GET | /api/projects | 获取所有项目（含 category_id） |
| POST | /api/projects | 新建项目 |
| PATCH | /api/projects/{id} | 更新项目（名称/颜色/状态/排序/分类） |
| DELETE | /api/projects/{id} | 删除项目（任务转移到未分类项目） |
| GET | /api/tasks | 获取任务列表（支持 project_id / date_range 查询参数） |
| POST | /api/tasks | 新建任务 |
| PATCH | /api/tasks/{id} | 更新任务 |
| DELETE | /api/tasks/{id} | 删除任务（写入 deleted_tasks） |
| GET | /api/deleted-tasks | 获取已删除任务列表 |
| POST | /api/deleted-tasks/{id}/restore | 恢复任务（body 传目标 project_id） |
| DELETE | /api/deleted-tasks/{id} | 彻底删除单条 |
| DELETE | /api/deleted-tasks | 清空已删除 |
| GET | /api/settings | 获取所有设置 |
| PATCH | /api/settings/{key} | 更新单项设置 |

---

### 3.3 关键配置文件

**docker-compose.yml**

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    volumes:
      - ./backend/data:/app/data
    environment:
      - DATABASE_URL=sqlite:////app/data/taskflow.db
    restart: unless-stopped

  frontend:
    build: ./frontend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "3020:80"        # NAS 上暴露的端口，按需修改
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
```

**nginx.conf（核心路由部分）**

```nginx
location /api/ {
    proxy_pass http://backend:8000/api/;
    proxy_set_header Host $host;
}
location / {
    proxy_pass http://frontend:80/;
}
```

**backend/requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.36
alembic==1.13.3
pydantic==2.9.2
python-multipart==0.0.12
```

**backend/Dockerfile**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**frontend/Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

---

## 四、开发建议

### 4.1 推荐开发顺序

| 阶段 | 内容 | 产出 |
|------|------|------|
| Phase 1 | 后端脚手架：FastAPI + SQLite + Alembic 初始化，跑通 /api/tasks CRUD | 可用的 REST API |
| Phase 2 | 前端对接：Zustand store 替换 Demo 的 mock 数据，接入真实 API | 数据持久化 |
| Phase 3 | P0 功能完善：分类/项目管理、任务完整 CRUD、已删除、设置 | 核心功能完整 |
| Phase 4 | P1 视图：今天、本周、所有任务、日历 | 全视图可用 |
| Phase 5 | AI 对话：接入设置中配置的 API Key，实现流式对话 | AI 功能上线 |
| Phase 6 | Docker Compose 打包、NAS 部署验证 | 上线 |

### 4.2 注意事项

- **数据持久化**：SQLite 文件通过 Docker volume 挂载到宿主机 `./backend/data/`，容器重建不丢数据，建议定期备份此目录。
- **Schema 迁移**：Alembic 迁移文件纳入版本控制，后续改表结构通过 `alembic revision --autogenerate` 生成迁移脚本，不要直接修改数据库文件。
- **API Key 安全**：AI 设置中的 API Key 建议存入 settings 表前做简单加密（如 Python `cryptography` 库的 Fernet），避免明文存储在 SQLite 文件中。
- **前端开发代理**：Vite 开发环境在 `vite.config.ts` 中配置 proxy 将 `/api/*` 转发到 `localhost:8000`，与生产环境 Nginx 路由保持一致，无需改代码切换环境。
- **工具函数复用**：看板泳道判断、今天/本周筛选等时间计算逻辑统一放在 `frontend/src/utils/`，方便跨视图复用，也便于单独测试。
- **未分类项目**：建议在后端初始化时自动创建一条 `name="未分类"` 的特殊项目（`id=1`），删除项目时任务的 `project_id` 统一指向它，前端根据此 id 做特殊渲染处理。

---

*文档版本：v1.0 · 状态：定稿*
