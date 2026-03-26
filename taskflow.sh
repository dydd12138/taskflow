#!/usr/bin/env bash
# TaskFlow 项目管理脚本

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR"
BACKEND_LOG="/tmp/taskflow-backend.log"
FRONTEND_LOG="/tmp/taskflow-frontend.log"
BACKEND_PID_FILE="/tmp/taskflow-backend.pid"
FRONTEND_PID_FILE="/tmp/taskflow-frontend.pid"
BACKEND_PORT=8000
FRONTEND_PORT=5173

# ── 颜色 ──────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RESET='\033[0m'

info()    { echo -e "${BLUE}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; }

# ── 工具函数 ──────────────────────────────────────────────────────────────────
pid_alive() {
    local pid="$1"
    [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

port_listening() {
    local port="$1"
    fuser "${port}/tcp" >/dev/null 2>&1
}

read_pid() {
    local file="$1"
    if [[ -f "$file" ]]; then
        cat "$file"
    fi
}

kill_pid_file() {
    local file="$1"
    local name="$2"
    local pid
    pid=$(read_pid "$file")
    if pid_alive "$pid"; then
        kill "$pid" 2>/dev/null
        # 等待进程退出（最多 5 秒）
        local i=0
        while pid_alive "$pid" && [ $i -lt 50 ]; do
            sleep 0.1
            i=$(( i + 1 ))
        done
        if pid_alive "$pid"; then
            kill -9 "$pid" 2>/dev/null
        fi
        success "$name 已停止 (PID $pid)"
    else
        warn "$name 未在运行"
    fi
    rm -f "$file"
}

kill_port() {
    local port="$1"
    fuser -k "${port}/tcp" 2>/dev/null || true
    sleep 0.5
}

# ── start ─────────────────────────────────────────────────────────────────────
do_start() {
    # 后端
    if port_listening "$BACKEND_PORT"; then
        warn "后端已在运行 (port $BACKEND_PORT)"
    else
        kill_port "$BACKEND_PORT"
        info "启动后端 (port $BACKEND_PORT)..."
        cd "$BACKEND_DIR"
        python3 -m uvicorn app.main:app --reload --port "$BACKEND_PORT" \
            >"$BACKEND_LOG" 2>&1 &
        echo $! >"$BACKEND_PID_FILE"
        # 等待启动（检测端口监听）
        local i=0
        while [ $i -lt 50 ]; do
            if port_listening "$BACKEND_PORT"; then
                success "后端已启动  port $BACKEND_PORT"
                break
            fi
            sleep 0.3
            i=$(( i + 1 ))
        done
        if [ $i -ge 50 ]; then
            error "后端启动超时，查看日志: $BACKEND_LOG"
        fi
        cd "$SCRIPT_DIR"
    fi

    # 前端
    if port_listening "$FRONTEND_PORT"; then
        warn "前端已在运行 (port $FRONTEND_PORT)"
    else
        kill_port "$FRONTEND_PORT"
        info "启动前端 (port $FRONTEND_PORT)..."
        cd "$FRONTEND_DIR"
        npm run dev >"$FRONTEND_LOG" 2>&1 &
        echo $! >"$FRONTEND_PID_FILE"
        local i=0
        while [ $i -lt 40 ]; do
            if port_listening "$FRONTEND_PORT"; then
                success "前端已启动  port $FRONTEND_PORT"
                break
            fi
            sleep 0.3
            i=$(( i + 1 ))
        done
        if [ $i -ge 40 ]; then
            error "前端启动超时，查看日志: $FRONTEND_LOG"
        fi
    fi

    echo ""
    echo -e "  ${CYAN}前端${RESET}  http://localhost:${FRONTEND_PORT}"
    echo -e "  ${CYAN}后端${RESET}  http://localhost:${BACKEND_PORT}"
}

# ── stop ──────────────────────────────────────────────────────────────────────
do_stop() {
    info "停止服务..."
    kill_pid_file "$BACKEND_PID_FILE"  "后端"
    kill_pid_file "$FRONTEND_PID_FILE" "前端"
    # 兜底：确保端口释放
    kill_port "$BACKEND_PORT"
    kill_port "$FRONTEND_PORT"
}

# ── restart ───────────────────────────────────────────────────────────────────
do_restart() {
    do_stop
    echo ""
    do_start
}

# ── status ────────────────────────────────────────────────────────────────────
do_status() {
    echo -e "\n${BLUE}TaskFlow 服务状态${RESET}"
    echo "────────────────────────────────"

    if port_listening "$BACKEND_PORT"; then
        local bpid
        bpid=$(fuser "${BACKEND_PORT}/tcp" 2>/dev/null | tr -s ' ' | sed 's/^ //')
        echo -e "  后端   ${GREEN}● 运行中${RESET}  PID $bpid  port $BACKEND_PORT"
    else
        echo -e "  后端   ${RED}○ 已停止${RESET}"
    fi

    if port_listening "$FRONTEND_PORT"; then
        local fpid
        fpid=$(fuser "${FRONTEND_PORT}/tcp" 2>/dev/null | tr -s ' ' | sed 's/^ //')
        echo -e "  前端   ${GREEN}● 运行中${RESET}  PID $fpid  port $FRONTEND_PORT"
    else
        echo -e "  前端   ${RED}○ 已停止${RESET}"
    fi

    echo "────────────────────────────────"

    if pid_alive "$backend_pid" && pid_alive "$frontend_pid"; then
        echo -e "  ${CYAN}访问地址${RESET}  http://localhost:${FRONTEND_PORT}"
    fi
    echo ""
}

# ── 入口 ──────────────────────────────────────────────────────────────────────
case "${1:-}" in
    start)   do_start   ;;
    stop)    do_stop    ;;
    restart) do_restart ;;
    status)  do_status  ;;
    *)
        echo -e "用法: ${0##*/} {start|stop|restart|status}"
        echo ""
        echo "  start    启动后端和前端"
        echo "  stop     停止所有服务"
        echo "  restart  重启所有服务"
        echo "  status   查看运行状态"
        exit 1
        ;;
esac
