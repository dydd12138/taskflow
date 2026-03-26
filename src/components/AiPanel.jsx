import { useState, useRef, useEffect } from 'react';
import { useApp } from '../store';

// ─── In-memory conversation store (keyed by currentView) ─────────────────────
const chatStore = new Map();

const WELCOME_TEXT = '你好，我是你的任务助手，有什么可以帮你的？';

function makeWelcome() {
  return [{ id: 'welcome', role: 'assistant', content: WELCOME_TEXT, welcome: true }];
}

function loadMessages(key) {
  return chatStore.has(key) ? chatStore.get(key) : makeWelcome();
}

// ─── AiPanel ──────────────────────────────────────────────────────────────────
export default function AiPanel() {
  const { state } = useApp();
  const { settings, currentView } = state;

  const [messages, setMessages] = useState(() => loadMessages(currentView));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const bottomRef   = useRef(null);
  const messagesRef = useRef(messages); // always-current snapshot for async closures
  const abortRef    = useRef(null);
  const textareaRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Persist messages to store on every change
  useEffect(() => { chatStore.set(currentView, messages); }, [messages, currentView]);

  // Reload when the active view changes
  useEffect(() => {
    abortRef.current?.abort();
    setMessages(loadMessages(currentView));
    setInput('');
    setLoading(false);
  }, [currentView]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── API config derived from settings ───────────────────────────────────────
  const apiKey    = settings.apiKey?.trim() ?? '';
  const hasApiKey = apiKey.length > 0;
  const baseUrl   = (settings.proxyUrl?.trim() || 'https://api.anthropic.com').replace(/\/$/, '');
  const model     = (settings.aiProvider === 'Anthropic' && settings.model)
    ? settings.model
    : 'claude-sonnet-4-6';

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !hasApiKey || loading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg = { id: `u-${Date.now()}`, role: 'user',      content: text };
    const asstMsg = { id: `a-${Date.now()}`, role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, asstMsg]);
    setLoading(true);

    // Build history for API: exclude the welcome placeholder, append current user message
    const history = [
      ...messagesRef.current.filter(m => !m.welcome),
      userMsg,
    ].map(m => ({ role: m.role, content: m.content }));

    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model, max_tokens: 2048, stream: true, messages: history }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              const chunk = evt.delta.text;
              setMessages(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === 'assistant') {
                  copy[copy.length - 1] = { ...last, content: last.content + chunk };
                }
                return copy;
              });
            }
          } catch { /* skip malformed SSE events */ }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      // Replace the empty assistant placeholder with an error message
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          copy[copy.length - 1] = {
            ...last,
            content: '请求失败，请检查 API Key 或网络设置',
            error: true,
          };
        }
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    // Auto-grow textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
  };

  const clearChat = () => {
    abortRef.current?.abort();
    const fresh = makeWelcome();
    setMessages(fresh);
    chatStore.set(currentView, fresh);
    setLoading(false);
  };

  return (
    <div
      className="flex-shrink-0 border-l border-slate-200 dark:border-slate-700
        bg-white dark:bg-slate-900 flex flex-col"
      style={{ width: 360 }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700
        flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">AI 对话</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{model}</span>
        </div>
        <button
          onClick={clearChat}
          title="清空对话"
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
            hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.map(msg => {
          // While the last assistant message is still empty → show loading dots
          if (
            loading &&
            msg.role === 'assistant' &&
            !msg.content &&
            !msg.error &&
            msg === messages[messages.length - 1]
          ) {
            return <LoadingDots key={msg.id} />;
          }
          // Don't render an empty non-error message
          if (!msg.content && !msg.error) return null;
          return <MessageBubble key={msg.id} msg={msg} />;
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ───────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 dark:border-slate-700 p-3 flex-shrink-0">
        {!hasApiKey && (
          <div className="flex items-start gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-px"
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
              请先在设置中配置 API Key
            </span>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={!hasApiKey}
            placeholder={hasApiKey ? 'Enter 发送，Shift+Enter 换行…' : '请先配置 API Key'}
            rows={1}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
              bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
              placeholder-slate-400 dark:placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
              disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
            style={{ resize: 'none', minHeight: 36, overflow: 'hidden' }}
          />
          <button
            onClick={sendMessage}
            disabled={!hasApiKey || !input.trim() || loading}
            title={loading ? '生成中…' : '发送'}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg
              bg-blue-500 hover:bg-blue-600 text-white
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl
          ${isUser
            ? 'bg-blue-500 text-white rounded-br-md'
            : msg.error
              ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-bl-md border border-red-100 dark:border-red-800/50'
              : 'bg-slate-100 dark:bg-slate-700/80 text-slate-800 dark:text-slate-100 rounded-bl-md'
          }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

// ─── Loading dots ─────────────────────────────────────────────────────────────
function LoadingDots() {
  return (
    <div className="flex justify-start">
      <div className="bg-slate-100 dark:bg-slate-700/80 px-4 py-3 rounded-2xl rounded-bl-md
        flex items-center gap-1">
        {[0, 150, 300].map(delay => (
          <span
            key={delay}
            className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400 animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
