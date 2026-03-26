import { useState } from 'react';
import { useApp } from '../context/AppContext';

const ACCENT_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f97316', '#f59e0b', '#10b981',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#64748b',
];

const AI_PROVIDERS = ['OpenAI', 'Anthropic', 'Azure OpenAI', 'Ollama', '其他'];
const MODELS = {
  OpenAI: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  Anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  'Azure OpenAI': ['gpt-4o', 'gpt-4-turbo'],
  Ollama: ['llama3', 'mistral', 'gemma2'],
  其他: [],
};

export default function SettingsView() {
  const { state, actions } = useApp();
  const { settings } = state;
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'success' | 'error'

  const set = (updates) => actions.updateSettings(updates);

  const handleTestConnection = () => {
    setTestStatus('testing');
    setTimeout(() => setTestStatus('success'), 1200);
    setTimeout(() => setTestStatus(null), 4000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl px-6 py-6 space-y-8">
          {/* Appearance section */}
          <Section title="外观">
            {/* Theme */}
            <Field label="主题">
              <div className="flex gap-2">
                {[['light', '浅色'], ['dark', '深色']].map(([v, l]) => (
                  <button key={v}
                    onClick={() => set({ theme: v })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all
                      ${settings.theme === v
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                  >
                    {v === 'light' ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            {/* Accent color */}
            <Field label="主题色">
              <div className="flex flex-wrap gap-2">
                {ACCENT_COLORS.map(color => (
                  <button key={color}
                    onClick={() => set({ accentColor: color })}
                    className={`w-7 h-7 rounded-full transition-all hover:scale-110
                      ${settings.accentColor === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800' : ''}`}
                    style={{ background: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ background: settings.accentColor }} />
                <span className="text-xs text-slate-500">{settings.accentColor}</span>
              </div>
            </Field>

            {/* Font size */}
            <Field label="字体大小">
              <div className="flex gap-2">
                {[['small', '小'], ['medium', '中'], ['large', '大']].map(([v, l]) => (
                  <button key={v}
                    onClick={() => set({ fontSize: v })}
                    className={`flex-1 py-1.5 text-sm rounded-lg border-2 font-medium transition-all
                      ${settings.fontSize === v
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                      }`}
                    style={{ fontSize: v === 'small' ? 12 : v === 'large' ? 16 : 14 }}
                  >{l}</button>
                ))}
              </div>
            </Field>
          </Section>

          {/* AI settings */}
          <Section title="AI 设置">
            {/* Provider */}
            <Field label="服务商">
              <select
                value={settings.aiProvider}
                onChange={(e) => set({ aiProvider: e.target.value, model: MODELS[e.target.value]?.[0] ?? '' })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {AI_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>

            {/* API Key */}
            <Field label="API Key">
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => set({ apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
              />
            </Field>

            {/* Model */}
            <Field label="模型">
              {MODELS[settings.aiProvider]?.length > 0 ? (
                <select
                  value={settings.model}
                  onChange={(e) => set({ model: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
                    bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {MODELS[settings.aiProvider].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={settings.model}
                  onChange={(e) => set({ model: e.target.value })}
                  placeholder="输入模型名称..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
                    bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400
                    focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              )}
            </Field>

            {/* Proxy */}
            <Field label="代理地址">
              <input
                type="text"
                value={settings.proxyUrl}
                onChange={(e) => set({ proxyUrl: e.target.value })}
                placeholder="https://api.proxy.example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </Field>

            {/* Test connection */}
            <Field label="">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
                    ${testStatus === 'testing'
                      ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 cursor-wait'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                >
                  {testStatus === 'testing' ? '连接中...' : '测试连接'}
                </button>
                {testStatus === 'success' && (
                  <div className="flex items-center gap-1.5 text-green-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium">连接成功</span>
                  </div>
                )}
                {testStatus === 'error' && (
                  <div className="flex items-center gap-1.5 text-red-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm">连接失败</span>
                  </div>
                )}
              </div>
            </Field>
          </Section>

          {/* About */}
          <Section title="关于">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">TaskFlow</div>
                <div className="text-xs text-slate-400">v1.0.0 · 纯前端 Demo</div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 pb-2
        border-b border-slate-100 dark:border-slate-700">
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex gap-4 items-start">
      <label className="w-20 flex-shrink-0 text-sm text-slate-500 dark:text-slate-400 pt-2">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
