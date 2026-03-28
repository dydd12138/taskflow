import json
from datetime import datetime, timedelta
from pathlib import Path

import anthropic
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Setting, Task, Project, Conversation
from app.schemas import ConversationResponse, ChatRequest

NOTES_DIR = Path("data/notes")

router = APIRouter(prefix="/conversations", tags=["conversations"])

# ── Anthropic tool definitions ────────────────────────────────────────────────
TOOLS_ANTHROPIC = [
    {
        "name": "create_task",
        "description": "在指定项目中创建一个新任务。日期字段必须是 YYYY-MM-DD 格式，请根据系统提示中的当前日期推算「今天」「下周一」等相对日期。time_type 规则：有明确截止日期用 deadline；有开始+结束区间用 date_range（同时填 start_date 和 end_date）；无时间要求用 none。",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "项目ID"},
                "name": {"type": "string", "description": "任务名称"},
                "priority": {"type": "string", "enum": ["none", "low", "medium", "high"]},
                "time_type": {"type": "string", "enum": ["none", "deadline", "date_range"], "description": "none=无时间；deadline=只有截止日期；date_range=有开始和结束日期区间"},
                "deadline": {"type": "string", "description": "截止日期 YYYY-MM-DD，time_type=deadline 时填写"},
                "start_date": {"type": "string", "description": "开始日期 YYYY-MM-DD，time_type=date_range 时必填"},
                "end_date": {"type": "string", "description": "结束日期 YYYY-MM-DD，time_type=date_range 时必填"},
                "note": {"type": "string"},
            },
            "required": ["project_id", "name"],
        },
    },
    {
        "name": "update_task",
        "description": "更新已有任务的字段。日期字段必须是 YYYY-MM-DD 格式，请根据系统提示中的当前日期推算相对日期。修改时间范围时，time_type、start_date、end_date 需同时提供。",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "integer"},
                "name": {"type": "string"},
                "priority": {"type": "string", "enum": ["none", "low", "medium", "high"]},
                "time_type": {"type": "string", "enum": ["none", "deadline", "date_range"], "description": "none=无时间；deadline=只有截止日期；date_range=有开始和结束日期区间"},
                "deadline": {"type": "string", "description": "截止日期 YYYY-MM-DD，time_type=deadline 时填写"},
                "start_date": {"type": "string", "description": "开始日期 YYYY-MM-DD，time_type=date_range 时必填"},
                "end_date": {"type": "string", "description": "结束日期 YYYY-MM-DD，time_type=date_range 时必填"},
                "note": {"type": "string"},
                "manual_status": {"type": "string", "enum": ["none", "in_progress", "blocked"], "description": "none=无标记；in_progress=推进中；blocked=搁置"},
            },
            "required": ["task_id"],
        },
    },
    {
        "name": "complete_task",
        "description": "将任务标记为已完成",
        "input_schema": {
            "type": "object",
            "properties": {"task_id": {"type": "integer"}},
            "required": ["task_id"],
        },
    },
    {
        "name": "update_note",
        "description": "更新或追加项目的 Markdown 笔记",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "integer"},
                "mode": {"type": "string", "enum": ["replace", "append"]},
                "section_title": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["project_id", "mode", "content"],
        },
    },
]

# OpenAI-compatible tool format (converted from Anthropic format)
TOOLS_OPENAI = [
    {
        "type": "function",
        "function": {
            "name": t["name"],
            "description": t["description"],
            "parameters": t["input_schema"],
        },
    }
    for t in TOOLS_ANTHROPIC
]


def get_setting(key: str, db: Session, default: str = "") -> str:
    row = db.query(Setting).filter(Setting.key == key).first()
    if row is None:
        return default
    try:
        return json.loads(row.value)
    except Exception:
        return row.value


def get_provider_config(db: Session):
    """Return (provider, api_key, model, base_url, proxy) for the active provider."""
    provider = get_setting("ai_provider", db, "Anthropic")
    configs_raw = get_setting("ai_providers_config", db, "{}")
    try:
        configs = json.loads(configs_raw) if isinstance(configs_raw, str) else configs_raw
    except Exception:
        configs = {}
    if not isinstance(configs, dict):
        configs = {}
    config = configs.get(provider, {})
    api_key = config.get("api_key", "")
    model = config.get("model", "claude-sonnet-4-6" if provider == "Anthropic" else "gpt-4o")
    base_url = config.get("base_url", "")
    proxy = config.get("proxy", "")
    return provider, api_key, model, base_url, proxy


def make_async_http_client(proxy_url: str):
    """Create an httpx.AsyncClient with proxy, or None if no proxy configured."""
    if not proxy_url:
        return None
    import httpx
    try:
        return httpx.AsyncClient(proxy=proxy_url)
    except TypeError:
        return httpx.AsyncClient(proxies={"http://": proxy_url, "https://": proxy_url})


def build_system_prompt(context_type: str, context_id: str, db: Session) -> str:
    today = datetime.now().date()

    def fmt_task(t, project_name=None, show_status=False):
        parts = []
        if project_name is not None:
            parts.append(f"项目: {project_name}")
        parts.append(f"优先级: {t.priority}")
        if show_status and t.manual_status and t.manual_status != 'none':
            label = {'in_progress': '推进中', 'blocked': '搁置'}.get(t.manual_status, t.manual_status)
            parts.append(f"状态: {label}")
        if t.deadline:
            parts.append(f"截止: {t.deadline.date()}")
        if t.start_date:
            parts.append(f"开始: {t.start_date.date()}")
        if t.end_date:
            parts.append(f"结束: {t.end_date.date()}")
        line = f"- [{t.id}] {t.name} ({', '.join(parts)})"
        if t.note and t.note.strip():
            line += f"\n  备注: {t.note.strip()}"
        return line

    if context_type == "global":
        base_prompt = get_setting("prompt_global", db)
        tasks = db.query(Task).filter(Task.is_completed == False).all()
        projects = db.query(Project).all()
        project_map = {p.id: p.name for p in projects}
        task_lines = [fmt_task(t, project_map.get(t.project_id, '未知'), show_status=True) for t in tasks]
        context_block = "当前所有未完成任务：\n" + ("\n".join(task_lines) if task_lines else "（无）")

    elif context_type == "project":
        project_id = int(context_id)
        base_prompt = get_setting("prompt_project", db)
        project = db.query(Project).filter(Project.id == project_id).first()
        project_name = project.name if project else f"项目{project_id}"
        tasks = (
            db.query(Task)
            .filter(Task.project_id == project_id, Task.is_completed == False)
            .order_by(Task.sort_order)
            .all()
        )
        task_lines = [fmt_task(t, show_status=True) for t in tasks]
        note_path = NOTES_DIR / f"{project_id}.md"
        note_content = note_path.read_text(encoding="utf-8") if note_path.exists() else ""
        context_block = (
            f"当前项目：{project_name}（ID: {project_id}）\n"
            "未完成任务：\n" + ("\n".join(task_lines) if task_lines else "（无）")
        )
        if note_content.strip():
            context_block += f"\n\n项目笔记：\n{note_content}"

    elif context_type == "today":
        base_prompt = get_setting("prompt_today", db)
        tasks = db.query(Task).filter(Task.is_completed == False).all()
        today_tasks = [
            t for t in tasks
            if (t.deadline and t.deadline.date() == today)
            or (t.start_date and t.start_date.date() <= today and t.end_date and t.end_date.date() >= today)
            or (t.end_date and t.end_date.date() == today)
        ]
        projects = db.query(Project).all()
        project_map = {p.id: p.name for p in projects}
        task_lines = [fmt_task(t, project_map.get(t.project_id, '未知'), show_status=True) for t in today_tasks]
        context_block = f"今日（{today.isoformat()}）相关任务：\n" + (
            "\n".join(task_lines) if task_lines else "（无）"
        )

    elif context_type == "week":
        base_prompt = get_setting("prompt_week", db)
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        tasks = db.query(Task).filter(Task.is_completed == False).all()
        week_tasks = [
            t for t in tasks
            if (t.deadline and week_start <= t.deadline.date() <= week_end)
            or (t.end_date and week_start <= t.end_date.date() <= week_end)
            or (t.start_date and week_start <= t.start_date.date() <= week_end)
        ]
        projects = db.query(Project).all()
        project_map = {p.id: p.name for p in projects}
        task_lines = [fmt_task(t, project_map.get(t.project_id, '未知'), show_status=True) for t in week_tasks]
        context_block = (
            f"本周（{week_start.isoformat()} ~ {week_end.isoformat()}）相关任务：\n"
            + ("\n".join(task_lines) if task_lines else "（无）")
        )

    else:
        base_prompt = ""
        context_block = ""

    weekday_cn = ["一", "二", "三", "四", "五", "六", "日"][today.weekday()]
    date_line = f"当前日期：{today.isoformat()}（星期{weekday_cn}）"

    global_base = get_setting("base_prompt", db, "")

    parts = []
    if global_base.strip():
        parts.append(global_base.strip())
    if base_prompt.strip():
        parts.append(base_prompt.strip())
    if context_block.strip():
        parts.append(context_block.strip())
    parts.append(date_line)
    return "\n\n".join(parts)


def build_anthropic_messages(history_rows: list) -> list:
    """Convert DB rows to Anthropic API messages format."""
    messages = []
    for row in history_rows:
        if row.role == "tool":
            continue
        elif row.role == "assistant" and row.tool_calls:
            try:
                tool_calls_data = json.loads(row.tool_calls)
                tool_calls_list = tool_calls_data if isinstance(tool_calls_data, list) else [tool_calls_data]
                content = []
                if row.content:
                    content.append({"type": "text", "text": row.content})
                for tc in tool_calls_list:
                    content.append({
                        "type": "tool_use",
                        "id": tc.get("id", f"tool_{row.id}"),
                        "name": tc.get("name", "unknown"),
                        "input": tc.get("input", {}),
                    })
                messages.append({"role": "assistant", "content": content})
                messages.append({
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": tc.get("id", f"tool_{row.id}"),
                            "content": "操作已由用户确认执行",
                        }
                        for tc in tool_calls_list
                    ],
                })
            except Exception:
                messages.append({"role": "assistant", "content": row.content})
        else:
            messages.append({"role": row.role, "content": row.content})
    return messages


def build_openai_messages(system_prompt: str, history_rows: list) -> list:
    """Convert DB rows to OpenAI API messages format."""
    messages = [{"role": "system", "content": system_prompt}]
    for row in history_rows:
        if row.role == "tool":
            continue
        elif row.role == "assistant" and row.tool_calls:
            try:
                tool_calls_data = json.loads(row.tool_calls)
                tool_calls_list = tool_calls_data if isinstance(tool_calls_data, list) else [tool_calls_data]
                oai_tool_calls = [
                    {
                        "id": tc.get("id", f"tool_{row.id}"),
                        "type": "function",
                        "function": {
                            "name": tc.get("name", ""),
                            "arguments": json.dumps(tc.get("input", {})),
                        },
                    }
                    for tc in tool_calls_list
                ]
                messages.append({
                    "role": "assistant",
                    "content": row.content or None,
                    "tool_calls": oai_tool_calls,
                })
                for tc in tool_calls_list:
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.get("id", f"tool_{row.id}"),
                        "content": "操作已由用户确认执行",
                    })
            except Exception:
                messages.append({"role": "assistant", "content": row.content})
        else:
            messages.append({"role": row.role, "content": row.content})
    return messages


@router.get("", response_model=list[ConversationResponse])
def get_conversations(
    type: str = Query(...),
    id: str = Query(...),
    db: Session = Depends(get_db),
):
    return (
        db.query(Conversation)
        .filter(Conversation.context_type == type, Conversation.context_id == id)
        .order_by(Conversation.id)
        .all()
    )


@router.delete("", status_code=204)
def clear_conversations(
    type: str = Query(...),
    id: str = Query(...),
    db: Session = Depends(get_db),
):
    db.query(Conversation).filter(
        Conversation.context_type == type, Conversation.context_id == id
    ).delete()
    db.commit()
    return None


@router.post("/chat")
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    provider, api_key, model, base_url, proxy = get_provider_config(db)
    history_limit = int(get_setting("conversation_history_limit", db, default="50"))
    system_prompt = build_system_prompt(req.type, req.id, db)

    history_rows = (
        db.query(Conversation)
        .filter(
            Conversation.context_type == req.type,
            Conversation.context_id == req.id,
        )
        .order_by(Conversation.id.desc())
        .limit(history_limit)
        .all()
    )
    history_rows.reverse()

    # Build user message (handle quote)
    user_content = req.message
    if req.quoted_message_id:
        quoted = db.query(Conversation).filter(Conversation.id == req.quoted_message_id).first()
        if quoted:
            user_content = f"> {quoted.content}\n\n{req.message}"

    # Detach history from session before commit so generate() can access them safely
    from types import SimpleNamespace
    history_plain = [
        SimpleNamespace(
            id=row.id,
            role=row.role,
            content=row.content,
            tool_calls=row.tool_calls,
        )
        for row in history_rows
    ]

    # Save user message
    user_conv = Conversation(
        context_type=req.type,
        context_id=req.id,
        role="user",
        content=user_content,
        quoted_message_id=req.quoted_message_id,
    )
    db.add(user_conv)
    db.flush()
    user_conv_id = user_conv.id
    db.commit()

    async def generate():
        accumulated_text = ""
        tool_blocks: list[dict] = []
        try:

            # ── Anthropic ──────────────────────────────────────────────────────
            if provider == "Anthropic":
                client_kwargs: dict = {"api_key": api_key, "timeout": 60.0}
                if base_url:
                    client_kwargs["base_url"] = base_url
                http_client = make_async_http_client(proxy)
                if http_client:
                    client_kwargs["http_client"] = http_client
                client = anthropic.AsyncAnthropic(**client_kwargs)

                anthropic_messages = build_anthropic_messages(history_plain)
                anthropic_messages.append({"role": "user", "content": user_content})

                current_tool: dict | None = None
                current_input_json = ""

                try:
                    async with client.messages.stream(
                        model=model,
                        max_tokens=4096,
                        system=system_prompt,
                        messages=anthropic_messages,
                        tools=TOOLS_ANTHROPIC,
                    ) as stream:
                        async for event in stream:
                            if not hasattr(event, "type"):
                                continue
                            if event.type == "content_block_start":
                                block = event.content_block
                                if hasattr(block, "type") and block.type == "tool_use":
                                    current_tool = {"id": block.id, "name": block.name}
                                    current_input_json = ""
                            elif event.type == "content_block_delta":
                                delta = event.delta
                                if not hasattr(delta, "type"):
                                    continue
                                if delta.type == "text_delta":
                                    accumulated_text += delta.text
                                    yield f"data: {json.dumps({'type': 'text', 'content': delta.text})}\n\n"
                                elif delta.type == "input_json_delta" and current_tool is not None:
                                    current_input_json += delta.partial_json
                            elif event.type == "content_block_stop":
                                if current_tool is not None:
                                    try:
                                        current_tool["input"] = json.loads(current_input_json) if current_input_json else {}
                                    except Exception:
                                        current_tool["input"] = {}
                                    tool_blocks.append(current_tool)
                                    current_tool = None
                                    current_input_json = ""

                except anthropic.APITimeoutError:
                    yield f"data: {json.dumps({'type': 'error', 'content': '请求超时'})}\n\n"
                    return
                except anthropic.APIError as e:
                    yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
                    return

            # ── OpenAI-compatible ──────────────────────────────────────────────
            else:
                try:
                    import openai as openai_lib
                except ImportError:
                    yield f"data: {json.dumps({'type': 'error', 'content': 'openai 包未安装'})}\n\n"
                    return

                client_kwargs = {"api_key": api_key or "ollama", "timeout": 60.0}
                if base_url:
                    client_kwargs["base_url"] = base_url
                http_client = make_async_http_client(proxy)
                if http_client:
                    client_kwargs["http_client"] = http_client
                client = openai_lib.AsyncOpenAI(**client_kwargs)

                openai_messages = build_openai_messages(system_prompt, history_plain)
                openai_messages.append({"role": "user", "content": user_content})

                tool_calls_acc: dict[int, dict] = {}

                try:
                    stream = await client.chat.completions.create(
                        model=model,
                        messages=openai_messages,
                        tools=TOOLS_OPENAI,
                        max_tokens=4096,
                        stream=True,
                    )
                    async for chunk in stream:
                        if not chunk.choices:
                            continue
                        delta = chunk.choices[0].delta
                        if delta.content:
                            accumulated_text += delta.content
                            yield f"data: {json.dumps({'type': 'text', 'content': delta.content})}\n\n"
                        if delta.tool_calls:
                            for tc_delta in delta.tool_calls:
                                idx = tc_delta.index
                                if idx not in tool_calls_acc:
                                    tool_calls_acc[idx] = {"id": "", "name": "", "arguments": ""}
                                if tc_delta.id:
                                    tool_calls_acc[idx]["id"] = tc_delta.id
                                if tc_delta.function:
                                    if tc_delta.function.name:
                                        tool_calls_acc[idx]["name"] = tc_delta.function.name
                                    if tc_delta.function.arguments:
                                        tool_calls_acc[idx]["arguments"] += tc_delta.function.arguments

                except openai_lib.APITimeoutError:
                    yield f"data: {json.dumps({'type': 'error', 'content': '请求超时'})}\n\n"
                    return
                except openai_lib.APIError as e:
                    yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
                    return

                for idx in sorted(tool_calls_acc.keys()):
                    tc = tool_calls_acc[idx]
                    try:
                        input_data = json.loads(tc["arguments"]) if tc["arguments"] else {}
                    except Exception:
                        input_data = {}
                    tool_blocks.append({"id": tc["id"], "name": tc["name"], "input": input_data})

            # ── Save assistant message & emit final events ──────────────────────
            tool_calls_json = json.dumps(tool_blocks) if tool_blocks else None
            asst_conv = Conversation(
                context_type=req.type,
                context_id=req.id,
                role="assistant",
                content=accumulated_text,
                tool_calls=tool_calls_json,
            )
            db.add(asst_conv)
            db.flush()          # INSERT → populates asst_conv.id
            asst_id = asst_conv.id
            db.commit()

            if tool_blocks:
                yield f"data: {json.dumps({'type': 'tool_calls', 'content': tool_blocks})}\n\n"

            yield f"data: {json.dumps({'type': 'done', 'message_id': asst_id})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': f'服务器错误：{e}'})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'message_id': -1})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
