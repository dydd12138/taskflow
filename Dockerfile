# ── Stage 1: 构建前端静态文件 ──────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /build

# 先复制 package 文件，利用 Docker 层缓存
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# 再复制源码并构建
COPY index.html vite.config.ts tsconfig.json eslint.config.js ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build
# 产物在 /build/dist/


# ── Stage 2: Python 运行时 ─────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# 先安装依赖，利用层缓存
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/app ./app

# 从 Stage 1 复制前端产物
COPY --from=frontend-builder /build/dist ./static

# 创建数据库目录（实际文件通过 volume 挂载）
RUN mkdir -p /app/data

EXPOSE 8080

# PORT 环境变量控制监听端口，默认 8080
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
