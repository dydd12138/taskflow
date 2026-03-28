import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { marked } from 'marked';
import { useApp } from '../store';
import { conversationsApi } from '../api/conversations';
import { tasksApi } from '../api/tasks';
import { notesApi } from '../api/notes';
import { promptTemplatesApi } from '../api/promptTemplates';

marked.setOptions({ breaks: true, gfm: true });

// ─── Markdown renderer ────────────────────────────────────────────────────────
function Markdown({ content }) {
  if (!content) return null;
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none
        prose-p:my-1 prose-headings:my-1.5 prose-ul:my-1 prose-ol:my-1
        prose-li:my-0 prose-pre:my-1 prose-blockquote:my-1
        prose-code:text-blue-600 dark:prose-code:text-blue-400
        prose-code:bg-slate-100 dark:prose-code:bg-slate-800
        prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs"
      dangerouslySetInnerHTML={{ __html: marked.parse(content) }}
    />
  );
}

// ─── Tool call helpers ────────────────────────────────────────────────────────
const TOOL_META = {
  create_task:   { icon: '➕', label: (i) => `创建任务「${i.name ?? ''}」` },
  update_task:   { icon: '✏️', label: (i) => `更新任务 #${i.task_id ?? ''}` },
  complete_task: { icon: '✅', label: (i) => `完成任务 #${i.task_id ?? ''}` },
  update_note:   { icon: '📝', label: (i) => `${i.mode === 'append' ? '追加' : '更新'}笔记${i.section_title ? `「${i.section_title}」` : ''}` },
};

async function executeToolCall(toolCall, contextProjectId) {
  const pid = toolCall.input.project_id ?? contextProjectId;
  switch (toolCall.name) {
    case 'create_task':
      await tasksApi.create({
        project_id: pid,
        name: toolCall.input.name,
        time_type: toolCall.input.time_type ?? 'deadline',
        deadline: toolCall.input.deadline ?? null,
        start_date: toolCall.input.start_date ?? null,
        end_date: toolCall.input.end_date ?? null,
        is_all_day: true,
        priority: toolCall.input.priority ?? 'none',
        manual_status: 'none',
        is_completed: false,
        note: toolCall.input.note ?? null,
        sort_order: 0,
      });
      break;

    case 'update_task': {
      const updates = {};
      if (toolCall.input.name !== undefined) updates.name = toolCall.input.name;
      if (toolCall.input.time_type !== undefined) updates.time_type = toolCall.input.time_type;
      if (toolCall.input.deadline !== undefined) updates.deadline = toolCall.input.deadline || null;
      if (toolCall.input.start_date !== undefined) updates.start_date = toolCall.input.start_date || null;
      if (toolCall.input.end_date !== undefined) updates.end_date = toolCall.input.end_date || null;
      if (toolCall.input.priority !== undefined) updates.priority = toolCall.input.priority;
      if (toolCall.input.manual_status !== undefined) updates.manual_status = toolCall.input.manual_status;
      if (toolCall.input.note !== undefined) updates.note = toolCall.input.note;
      await tasksApi.update(toolCall.input.task_id, updates);
      break;
    }

    case 'complete_task':
      await tasksApi.update(toolCall.input.task_id, { is_completed: true });
      break;

    case 'update_note': {
      const projectId = pid;
      const now = new Date();
      const ts = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      const action = toolCall.input.mode === 'append' ? '追加' : '编辑';
      const title = toolCall.input.section_title ? `\n\n## ${toolCall.input.section_title}\n\n` : '\n\n';
      const wrapped =
        `\n\n> 🤖 AI ${action} · ${ts}\n\n` +
        (toolCall.input.mode === 'append' ? title.trimStart() : '') +
        toolCall.input.content +
        `\n\n> ─────────────────────`;

      let newContent = '';
      if (toolCall.input.mode === 'append') {
        const currentNote = await notesApi.get(projectId);
        newContent = currentNote + wrapped;
      } else {
        newContent = wrapped.trimStart();
      }
      await notesApi.save(projectId, newContent);
      break;
    }

    default:
      break;
  }
}

// ─── ToolCallCard ─────────────────────────────────────────────────────────────
function ToolCallCard({ toolCalls, status, contextProjectId, onExecuted, onCancelled }) {
  const [checked, setChecked] = useState(() => toolCalls.map(() => true));
  const [editing, setEditing] = useState(() => toolCalls.map(() => false));
  const [editInputs, setEditInputs] = useState(() => toolCalls.map(tc => ({ ...tc.input })));
  const [previewing, setPreviewing] = useState(() => toolCalls.map(() => false));
  const [running, setRunning] = useState(false);

  const isDone = status === 'executed' || status === 'cancelled';

  const toggleCheck = (i) => {
    if (isDone) return;
    setChecked(prev => prev.map((v, j) => j === i ? !v : v));
  };

  const updateEditInput = (i, key, val) => {
    setEditInputs(prev => prev.map((inp, j) => j === i ? { ...inp, [key]: val } : inp));
  };

  const handleConfirm = async () => {
    setRunning(true);
    try {
      for (let i = 0; i < toolCalls.length; i++) {
        if (!checked[i]) continue;
        // Merge edited inputs
        const merged = { ...toolCalls[i], input: editInputs[i] };
        await executeToolCall(merged, contextProjectId);
      }
      onExecuted();
    } catch (err) {
      console.error('Tool execution error:', err);
      onExecuted(); // still mark as executed to avoid stuck state
    }
    setRunning(false);
  };

  return (
    <div className={`rounded-xl border overflow-hidden text-sm transition-opacity
      ${isDone ? 'opacity-60' : ''}
      ${status === 'cancelled' ? 'border-slate-200 dark:border-slate-700' : 'border-blue-200 dark:border-blue-800/50'}`}
    >
      {/* Header */}
      <div className={`px-3 py-2 text-xs font-semibold
        ${isDone ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'}`}
      >
        {isDone
          ? (status === 'executed' ? '✓ 已执行' : '✗ 已取消')
          : 'AI 建议执行以下操作'}
      </div>

      {/* Tool items */}
      {toolCalls.map((tc, i) => {
        const meta = TOOL_META[tc.name] ?? { icon: '🔧', label: () => tc.name };
        const inp = editInputs[i];
        return (
          <div key={i} className="border-t border-slate-100 dark:border-slate-700/60 px-3 py-2">
            <div className="flex items-start gap-2">
              {/* Checkbox */}
              {!isDone && (
                <button
                  onClick={() => toggleCheck(i)}
                  className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border transition-colors
                    ${checked[i]
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-slate-300 dark:border-slate-600'}`}
                >
                  {checked[i] && (
                    <svg className="w-3 h-3 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>{meta.icon}</span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">
                    {meta.label(inp)}
                  </span>
                  {/* Edit button for create/update task */}
                  {!isDone && (tc.name === 'create_task' || tc.name === 'update_task') && (
                    <button
                      onClick={() => setEditing(prev => prev.map((v, j) => j === i ? !v : v))}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600
                        text-slate-500 hover:text-blue-500 hover:border-blue-300 transition-colors"
                    >
                      {editing[i] ? '收起' : '编辑'}
                    </button>
                  )}
                  {/* Preview button for update_note */}
                  {tc.name === 'update_note' && (
                    <button
                      onClick={() => setPreviewing(prev => prev.map((v, j) => j === i ? !v : v))}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600
                        text-slate-500 hover:text-blue-500 hover:border-blue-300 transition-colors"
                    >
                      {previewing[i] ? '收起' : '展开预览'}
                    </button>
                  )}
                </div>

                {/* Inline details for task */}
                {(tc.name === 'create_task' || tc.name === 'update_task') && !editing[i] && (
                  <div className="mt-0.5 flex gap-2 text-[11px] text-slate-400 dark:text-slate-500 flex-wrap">
                    {inp.time_type === 'date_range'
                      ? <span>{inp.start_date || '?'} → {inp.end_date || '?'}</span>
                      : inp.deadline
                        ? <span>截止：{inp.deadline}</span>
                        : null
                    }
                    {inp.priority && inp.priority !== 'none' && (
                      <span>优先级：{{ low:'低', medium:'中', high:'高' }[inp.priority] ?? inp.priority}</span>
                    )}
                  </div>
                )}

                {/* Inline editor for task */}
                {editing[i] && (tc.name === 'create_task' || tc.name === 'update_task') && (
                  <div className="mt-2 space-y-1.5">
                    {tc.name === 'create_task' && (
                      <input
                        value={inp.name ?? ''}
                        onChange={e => updateEditInput(i, 'name', e.target.value)}
                        placeholder="任务名称"
                        className="w-full text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-600
                          bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    )}
                    {/* time_type + priority row */}
                    <div className="flex gap-1.5">
                      <select
                        value={inp.time_type ?? 'none'}
                        onChange={e => {
                          const tt = e.target.value;
                          setEditInputs(prev => prev.map((cur, j) => {
                            if (j !== i) return cur;
                            const patch = { ...cur, time_type: tt };
                            if (tt === 'deadline') { patch.start_date = null; patch.end_date = null; }
                            if (tt === 'date_range') { patch.deadline = null; }
                            if (tt === 'none') { patch.deadline = null; patch.start_date = null; patch.end_date = null; }
                            return patch;
                          }));
                        }}
                        className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-600
                          bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="none">无时间</option>
                        <option value="deadline">截止日期</option>
                        <option value="date_range">日期区间</option>
                      </select>
                      <select
                        value={inp.priority ?? 'none'}
                        onChange={e => updateEditInput(i, 'priority', e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-600
                          bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        {['none','low','medium','high'].map(p => (
                          <option key={p} value={p}>{{ none:'无', low:'低', medium:'中', high:'高' }[p]}</option>
                        ))}
                      </select>
                    </div>
                    {/* deadline input */}
                    {(inp.time_type ?? 'none') === 'deadline' && (
                      <input
                        type="date"
                        value={inp.deadline ?? ''}
                        onChange={e => updateEditInput(i, 'deadline', e.target.value)}
                        className="w-full text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-600
                          bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    )}
                    {/* date_range inputs */}
                    {inp.time_type === 'date_range' && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          value={inp.start_date ?? ''}
                          onChange={e => updateEditInput(i, 'start_date', e.target.value)}
                          className="flex-1 text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-600
                            bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <span className="text-slate-400 text-xs flex-shrink-0">→</span>
                        <input
                          type="date"
                          value={inp.end_date ?? ''}
                          onChange={e => updateEditInput(i, 'end_date', e.target.value)}
                          className="flex-1 text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-600
                            bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Note preview */}
                {previewing[i] && tc.name === 'update_note' && (
                  <div className="mt-2 p-2 rounded bg-slate-50 dark:bg-slate-800/50 text-[11px]
                    text-slate-600 dark:text-slate-300 max-h-32 overflow-y-auto leading-relaxed
                    whitespace-pre-wrap font-mono">
                    {inp.content}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Action buttons */}
      {!isDone && (
        <div className="border-t border-slate-100 dark:border-slate-700/60 px-3 py-2
          flex gap-2 justify-end">
          <button
            onClick={onCancelled}
            disabled={running}
            className="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600
              text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700
              disabled:opacity-40 transition-colors"
          >全部取消</button>
          <button
            onClick={handleConfirm}
            disabled={running || checked.every(v => !v)}
            className="px-3 py-1 text-xs rounded-lg bg-blue-500 hover:bg-blue-600 text-white
              disabled:opacity-40 transition-colors flex items-center gap-1"
          >
            {running && (
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            全部确认
          </button>
        </div>
      )}
    </div>
  );
}

// ─── QuoteBar ─────────────────────────────────────────────────────────────────
function QuoteBar({ quoted, onClear }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60
      border-t border-slate-100 dark:border-slate-700">
      <span className="text-[10px] text-slate-400 flex-shrink-0">引用：</span>
      <span className="flex-1 text-xs text-slate-500 dark:text-slate-400 truncate">
        {quoted.content?.slice(0, 50)}{quoted.content?.length > 50 ? '…' : ''}
      </span>
      <button
        onClick={onClear}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Parse "> quoted\n\nmain" format used by backend for quoted messages
function parseQuotedContent(content) {
  if (!content?.startsWith('> ')) return { quotedText: null, mainText: content };
  const sep = content.indexOf('\n\n');
  if (sep === -1) return { quotedText: null, mainText: content };
  return { quotedText: content.slice(2, sep), mainText: content.slice(sep + 2) };
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, onQuote }) {
  const [hovered, setHovered] = useState(false);
  const isUser = msg.role === 'user';
  const { quotedText, mainText } = isUser ? parseQuotedContent(msg.content) : { quotedText: null, mainText: msg.content };

  return (
    <div
      className={`group flex ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative max-w-[88%]">
        {/* Quote button */}
        {onQuote && hovered && (
          <button
            onClick={() => onQuote(msg)}
            title="引用"
            className={`absolute -top-5 flex items-center gap-0.5 text-[10px]
              text-slate-400 hover:text-blue-500 transition-colors bg-white dark:bg-slate-900
              border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 z-10 shadow-sm
              ${isUser ? 'left-0' : 'right-0'}`}
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            引用
          </button>
        )}

        <div
          className={`px-3 py-2 text-sm leading-relaxed rounded-2xl
            ${isUser
              ? 'bg-blue-500 text-white rounded-br-md'
              : msg.error
                ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-bl-md border border-red-100 dark:border-red-800/50'
                : 'bg-slate-100 dark:bg-slate-700/80 text-slate-800 dark:text-slate-100 rounded-bl-md'
            }`}
        >
          {/* Quoted block */}
          {isUser && quotedText && (
            <div className="mb-1.5 pl-2 border-l-2 border-white/50 text-white/70 text-xs line-clamp-3 whitespace-pre-wrap break-words">
              {quotedText}
            </div>
          )}
          {/* Message body */}
          {isUser
            ? <span className="whitespace-pre-wrap break-words">{mainText}</span>
            : <Markdown content={msg.content} />
          }
          {msg.suffix && (
            <span className={`text-[11px] ml-1 ${
              msg.suffixType === 'error'   ? 'text-red-400 dark:text-red-500' :
              msg.suffixType === 'stopped' ? 'text-slate-400 dark:text-slate-500' : ''
            }`}>
              {msg.suffix}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LoadingDots ──────────────────────────────────────────────────────────────
function LoadingDots() {
  return (
    <div className="flex justify-start">
      <div className="bg-slate-100 dark:bg-slate-700/80 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
        {[0, 150, 300].map(delay => (
          <span
            key={delay}
            className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── SlashMenu ────────────────────────────────────────────────────────────────
function SlashMenu({ items, onSelect, activeIndex }) {
  if (items.length === 0) {
    return (
      <div className="absolute bottom-full left-0 mb-1 w-52 bg-white dark:bg-slate-800
        border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-2 z-50">
        <p className="text-xs text-slate-400 dark:text-slate-500 px-3 py-1">暂无匹配指令</p>
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 mb-1 w-60 bg-white dark:bg-slate-800
      border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-50 max-h-52 overflow-y-auto">
      {items.map((tpl, i) => (
        <button
          key={tpl.id}
          onClick={() => onSelect(tpl)}
          className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2
            ${i === activeIndex
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
        >
          <span className="text-sm font-medium">{tpl.name}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Convert DB history rows → UI messages ────────────────────────────────────
function adaptHistory(rows) {
  const result = [];
  for (const row of rows) {
    if (row.role === 'tool') continue; // legacy, skip
    if (row.role === 'assistant' && row.tool_calls) {
      try {
        const tc = JSON.parse(row.tool_calls);
        const list = Array.isArray(tc) ? tc : [tc];
        if (row.content) {
          result.push({ id: `asst-${row.id}`, role: 'assistant', content: row.content, dbId: row.id });
        }
        result.push({ id: `tc-${row.id}`, role: 'tool_calls', toolCalls: list, status: 'executed' });
      } catch {
        result.push({ id: String(row.id), role: 'assistant', content: row.content, dbId: row.id });
      }
    } else {
      result.push({ id: String(row.id), role: row.role, content: row.content, dbId: row.id });
    }
  }
  return result;
}

// ─── AiPanel ──────────────────────────────────────────────────────────────────
export default function AiPanel({ contextType, contextId, contextLabel, fullWidth = false }) {
  const { state, actions } = useApp();
  const { settings } = state;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quotedMsg, setQuotedMsg] = useState(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);
  const [allTemplates, setAllTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  // ── Resizable panel ─────────────────────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(360);
  const isDragging    = useRef(false);
  const dragStartX    = useRef(0);
  const dragStartW    = useRef(360);

  useEffect(() => {
    if (fullWidth) return;
    const onMove = (e) => {
      if (!isDragging.current) return;
      const dx = dragStartX.current - e.clientX; // drag left → wider
      setPanelWidth(Math.max(260, Math.min(640, dragStartW.current + dx)));
    };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [fullWidth]);

  const onDragHandleDown = useCallback((e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = panelWidth;
    e.preventDefault();
  }, [panelWidth]);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const abortCtrl   = useRef(null);
  const timeoutId   = useRef(null);

  const ctxKey = `${contextType}:${contextId}`;
  const contextProjectId = contextType === 'project' ? parseInt(contextId, 10) : null;
  const currentProviderCfg = settings.providerConfigs?.[settings.aiProvider] ?? {};
  const model = currentProviderCfg.model || 'claude-sonnet-4-6';

  // Load prompt templates once on mount
  useEffect(() => {
    promptTemplatesApi.list().then(setAllTemplates).catch(() => {});
  }, []);

  // Slash menu items: templates enabled and matching current context type
  const slashItems = useMemo(
    () => allTemplates.filter(t => t.enabled && t.scope.includes(contextType)),
    [allTemplates, contextType]
  );

  // Load history when context changes; abort any in-flight request first
  useEffect(() => {
    if (abortCtrl.current) {
      abortCtrl.current.abort('context-switch');
      abortCtrl.current = null;
    }
    clearTimeout(timeoutId.current);
    timeoutId.current = null;

    setMessages([]);
    setInput('');
    setLoading(false);
    setQuotedMsg(null);
    setSelectedTemplate(null);
    setConfirmingClear(false);

    conversationsApi.list(contextType, contextId).then(rows => {
      if (rows.length > 0) {
        setMessages(adaptHistory(rows));
      } else {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: '你好，我是你的任务助手，有什么可以帮你的？',
        }]);
      }
    }).catch(() => {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '你好，我是你的任务助手，有什么可以帮你的？',
      }]);
    });
  }, [ctxKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Append suffix to the last assistant message ────────────────────────────
  const appendSuffix = useCallback((asstId, text, type) => {
    setMessages(prev => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.id === asstId) {
        copy[copy.length - 1] = { ...last, suffix: text, suffixType: type };
      }
      return copy;
    });
  }, []);

  // ── Send ───────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const supplement = input.trim();
    // Need either a selected template or non-empty text input
    if (!selectedTemplate && !supplement) return;
    if (loading) return;

    // Compose the actual text sent to the API
    let text;
    if (selectedTemplate && supplement) {
      text = selectedTemplate.prompt.trim() + '\n\n' + supplement;
    } else if (selectedTemplate) {
      text = selectedTemplate.prompt.trim();
    } else {
      text = supplement;
    }

    const quotedId = quotedMsg?.dbId ?? null;
    setInput('');
    setQuotedMsg(null);
    setSelectedTemplate(null);
    setShowSlashMenu(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Display content: show template name tag + supplement in bubble
    const displayContent = (() => {
      let d = '';
      if (selectedTemplate) d += `**/${selectedTemplate.name}**`;
      if (selectedTemplate && supplement) d += '\n' + supplement;
      if (!selectedTemplate) d = supplement;
      if (quotedMsg) d = `> ${quotedMsg.content}\n\n${d}`;
      return d;
    })();
    const asstId = `a-${Date.now()}`;
    setMessages(prev => [
      ...prev.filter(m => m.id !== 'welcome'),
      { id: `u-${Date.now()}`, role: 'user', content: displayContent },
      { id: asstId, role: 'assistant', content: '' },
    ]);
    setLoading(true);

    const controller = new AbortController();
    abortCtrl.current = controller;
    timeoutId.current = setTimeout(() => controller.abort('timeout'), 60000);

    const cleanup = () => {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
      abortCtrl.current = null;
      setLoading(false);
    };

    try {
      await conversationsApi.chat(
        contextType,
        contextId,
        text,
        quotedId,
        controller.signal,
        // onChunk
        (chunk) => {
          setMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.id === asstId) {
              copy[copy.length - 1] = { ...last, content: last.content + chunk };
            }
            return copy;
          });
        },
        // onToolCalls
        (toolCalls) => {
          setMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            const base = (last?.id === asstId && !last.content) ? copy.slice(0, -1) : copy;
            return [
              ...base,
              { id: `tc-${Date.now()}`, role: 'tool_calls', toolCalls, status: 'pending' },
            ];
          });
        },
        // onDone
        () => {
          setMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.id === asstId && !last.content) return copy.slice(0, -1);
            return copy;
          });
          cleanup();
        },
        // onError (SSE error event from backend)
        (errMsg) => {
          appendSuffix(asstId, `（${errMsg}）`, 'error');
        },
      );
    } catch (err) {
      if (err?.name === 'AbortError') {
        if (controller.signal.reason === 'timeout') {
          appendSuffix(asstId, '（请求超时，请重试）', 'error');
        } else {
          appendSuffix(asstId, '（已停止）', 'stopped');
        }
      } else {
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.id === asstId && !last.content) {
            copy[copy.length - 1] = { ...last, content: '请求失败：' + err.message, error: true };
          } else if (last?.id === asstId) {
            appendSuffix(asstId, `（请求失败：${err.message}）`, 'error');
          }
          return copy;
        });
      }
      cleanup();
    }
  }, [input, selectedTemplate, loading, contextType, contextId, quotedMsg, appendSuffix]);

  // ── Stop ────────────────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    abortCtrl.current?.abort();
  }, []);

  // Handle tool execution completion
  const handleToolExecuted = useCallback(async (tcMsgId) => {
    setMessages(prev => prev.map(m =>
      m.id === tcMsgId ? { ...m, status: 'executed' } : m
    ));
    await actions.refreshTasks();
    if (contextType === 'project' && contextProjectId) {
      actions.fetchNote(contextProjectId);
    }
  }, [actions, contextType, contextProjectId]);

  const handleToolCancelled = useCallback((tcMsgId) => {
    setMessages(prev => prev.map(m =>
      m.id === tcMsgId ? { ...m, status: 'cancelled' } : m
    ));
  }, []);

  // Clear chat
  const handleClear = async () => {
    if (!confirmingClear) { setConfirmingClear(true); return; }
    setConfirmingClear(false);
    try { await conversationsApi.clear(contextType, contextId); } catch { /* ignore */ }
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '你好，我是你的任务助手，有什么可以帮你的？',
    }]);
  };

  // Slash query: text after '/'
  const slashQuery = showSlashMenu ? input.slice(1) : '';
  const filteredSlashItems = useMemo(() => {
    if (!slashQuery) return slashItems;
    const q = slashQuery.toLowerCase();
    return slashItems.filter(t => t.name.toLowerCase().includes(q));
  }, [slashItems, slashQuery]);

  const selectSlashItem = useCallback((tpl) => {
    setSelectedTemplate(tpl);
    setInput('');
    setShowSlashMenu(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (showSlashMenu && filteredSlashItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashMenuIndex(i => (i + 1) % filteredSlashItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashMenuIndex(i => (i - 1 + filteredSlashItems.length) % filteredSlashItems.length);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        selectSlashItem(filteredSlashItems[slashMenuIndex]);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape') {
      if (showSlashMenu) { setShowSlashMenu(false); return; }
      if (selectedTemplate) { setSelectedTemplate(null); return; }
      setConfirmingClear(false);
    }
  };

  const handleTextInput = (e) => {
    const val = e.target.value;
    setInput(val);
    // Only show slash menu when no template is already selected
    if (!selectedTemplate) {
      const shouldShow = val.startsWith('/') && slashItems.length > 0;
      setShowSlashMenu(shouldShow);
      if (shouldShow) setSlashMenuIndex(0);
    }
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
  };

  return (
    <div
      className={`relative bg-white dark:bg-slate-900 flex flex-col
        ${fullWidth ? 'w-full h-full' : 'flex-shrink-0 border-l border-slate-200 dark:border-slate-700'}`}
      style={fullWidth ? undefined : { width: panelWidth }}
    >
      {/* ── Drag handle ──────────────────────────────────────────────────── */}
      {!fullWidth && (
        <div
          onMouseDown={onDragHandleDown}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-20
            hover:bg-blue-400/60 active:bg-blue-500/80 transition-colors"
        />
      )}
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700
        flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">AI 对话</span>
          {contextLabel && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              {contextLabel}
            </span>
          )}
          <span className="text-[10px] text-slate-300 dark:text-slate-600 truncate hidden">
            {model}
          </span>
        </div>
        <button
          onClick={handleClear}
          onBlur={() => setTimeout(() => setConfirmingClear(false), 200)}
          title={confirmingClear ? '再次点击确认清空' : '清空对话'}
          className={`px-2 py-1 rounded-md text-xs transition-colors flex-shrink-0
            ${confirmingClear
              ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-800'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
          {confirmingClear ? '确认清空？' : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.map((msg, idx) => {
          // Loading dots: last message is empty assistant
          if (loading && msg.role === 'assistant' && !msg.content && !msg.error
              && idx === messages.length - 1) {
            return <LoadingDots key={msg.id} />;
          }
          // Tool call confirmation card
          if (msg.role === 'tool_calls') {
            return (
              <ToolCallCard
                key={msg.id}
                toolCalls={msg.toolCalls}
                status={msg.status}
                contextProjectId={contextProjectId}
                onExecuted={() => handleToolExecuted(msg.id)}
                onCancelled={() => handleToolCancelled(msg.id)}
              />
            );
          }
          // Skip empty non-error non-loading assistant messages
          if (!msg.content && !msg.error) return null;
          return (
            <MessageBubble
              key={msg.id}
              msg={msg}
              onQuote={msg.id !== 'welcome' ? setQuotedMsg : null}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Quote bar ────────────────────────────────────────────────────── */}
      {quotedMsg && (
        <QuoteBar quoted={quotedMsg} onClear={() => setQuotedMsg(null)} />
      )}

      {/* ── Input area ───────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 dark:border-slate-700 p-3 flex-shrink-0">
        <div className="flex gap-2 items-end relative">
          {/* Slash command menu */}
          {showSlashMenu && (
            <SlashMenu
              items={filteredSlashItems}
              onSelect={selectSlashItem}
              activeIndex={slashMenuIndex}
            />
          )}

          {/* Attachment icon (placeholder) */}
          <button
            title="附件（暂不支持）"
            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg
              text-slate-300 dark:text-slate-600 cursor-default mb-0.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Input wrapper: template tag + textarea */}
          <div className={`flex-1 rounded-lg border text-sm
            ${selectedTemplate
              ? 'border-blue-300 dark:border-blue-600 ring-2 ring-blue-400/30'
              : 'border-slate-200 dark:border-slate-600'
            }
            bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent`}
          >
            {/* Template tag row */}
            {selectedTemplate && (
              <div className="flex items-center gap-1.5 px-2 pt-2 pb-0.5">
                <span className="inline-flex items-center gap-1 bg-blue-500 text-white text-[11px] font-medium
                  px-2 py-0.5 rounded-full leading-none">
                  /{selectedTemplate.name}
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="ml-0.5 hover:text-blue-100 transition-colors leading-none"
                    title="移除"
                  >
                    ×
                  </button>
                </span>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextInput}
              onKeyDown={handleKeyDown}
              placeholder={selectedTemplate ? '补充说明（可选）…' : slashItems.length > 0 ? '问点什么… 或输入 / 选择快捷指令' : '问点什么…'}
              rows={1}
              disabled={loading}
              className="w-full px-3 py-2 text-sm bg-transparent text-slate-700 dark:text-slate-200
                placeholder-slate-400 dark:placeholder-slate-500
                focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ resize: 'none', minHeight: 36, overflow: 'hidden' }}
            />
          </div>

          {loading ? (
            <button
              onClick={handleStop}
              title="停止生成"
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg
                bg-red-500 hover:bg-red-600 text-white mb-0.5"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!selectedTemplate && !input.trim()}
              title="发送"
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg
                bg-blue-500 hover:bg-blue-600 text-white
                disabled:opacity-40 disabled:cursor-not-allowed mb-0.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
