import { useState, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { settingsApi } from '../api/settings';
import { promptTemplatesApi } from '../api/promptTemplates';

// ── Constants ─────────────────────────────────────────────────────────────────

const MODELS = {
  Anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  OpenAI: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  '阿里百炼': ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
  Ollama: ['llama3', 'llama3.1', 'mistral', 'gemma2', 'qwen2.5'],
  '其他': [],
};

const BASE_URL_PLACEHOLDERS = {
  Anthropic:  '留空使用默认（https://api.anthropic.com）',
  OpenAI:     '留空使用默认（https://api.openai.com/v1）',
  '阿里百炼': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  Ollama:     'http://localhost:11434/v1',
  '其他':     'https://your-api-endpoint/v1',
};

// 与 backend/app/main.py DEFAULT_SETTINGS 保持同步
const DEFAULT_PROMPTS = {
  global:  '你是 TaskFlow 的 AI 助手，帮助用户管理所有项目和任务。',
  project: '你是 TaskFlow 的 AI 助手，专注于当前项目的任务管理和规划。',
  today:   '你是 TaskFlow 的 AI 助手，帮助用户专注于今日任务，提高当天工作效率。',
  week:    '你是 TaskFlow 的 AI 助手，帮助用户规划和管理本周任务。',
};

const BUILTIN_CONFIGS = [
  { key: 'global',  label: '全局对话', desc: '系统自动追加：所有未完成任务（含项目名）+ 当前日期' },
  { key: 'project', label: '项目对话', desc: '系统自动追加：项目名称、未完成任务列表、项目笔记 + 当前日期' },
  { key: 'today',   label: '今天对话', desc: '系统自动追加：今日截止 / 进行中的任务列表 + 当前日期' },
  { key: 'week',    label: '本周对话', desc: '系统自动追加：本周内相关任务列表 + 当前日期' },
];

const SCOPE_OPTIONS = [
  { key: 'global',  label: '全局对话' },
  { key: 'project', label: '项目对话' },
  { key: 'today',   label: '今天对话' },
  { key: 'week',    label: '本周对话' },
];

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'appearance', label: '外观', group: null },
  { id: 'ai-basic',   label: '基础配置', group: 'AI 设置' },
  { id: 'ai-prompts', label: '对话 Prompt', group: 'AI 设置' },
  { id: 'ai-skills',  label: 'Skills 管理', group: 'AI 设置' },
  { id: 'ai-mcp',     label: 'MCP 配置', group: 'AI 设置' },
];

// ── Root component ────────────────────────────────────────────────────────────

export default function SettingsView() {
  const { state, actions } = useApp();
  const { settings } = state;

  const [activeSection, setActiveSection] = useState('appearance');

  // Skills state (pure local)
  const [skills, setSkills] = useState([]);

  const set = (updates) => actions.updateSettings(updates);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">设置</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <LeftNav active={activeSection} onSelect={setActiveSection} />

        {/* Right content */}
        <div className="flex-1 overflow-y-auto">
          {activeSection === 'appearance' && (
            <AppearancePanel settings={settings} set={set} />
          )}
          {activeSection === 'ai-basic' && (
            <AiBasicPanel settings={settings} set={set} />
          )}
          {activeSection === 'ai-prompts' && (
            <PromptsPanel />
          )}
          {activeSection === 'ai-skills' && (
            <SkillsPanel skills={skills} setSkills={setSkills} />
          )}
          {activeSection === 'ai-mcp' && (
            <McpPanel />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Left navigation ───────────────────────────────────────────────────────────

function LeftNav({ active, onSelect }) {
  const groups = [];
  const topItems = [];
  NAV_ITEMS.forEach(item => {
    if (item.group === null) topItems.push(item);
    else {
      let g = groups.find(g => g.label === item.group);
      if (!g) { g = { label: item.group, items: [] }; groups.push(g); }
      g.items.push(item);
    }
  });

  const itemCls = (id) =>
    `w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ` +
    (active === id
      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50');

  return (
    <div className="w-44 flex-shrink-0 border-r border-slate-100 dark:border-slate-700 py-4 px-3 space-y-1">
      {topItems.map(item => (
        <button key={item.id} className={itemCls(item.id)} onClick={() => onSelect(item.id)}>
          {item.label}
        </button>
      ))}

      {groups.map(group => (
        <div key={group.label} className="pt-2">
          <div className="px-3 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.items.map(item => (
              <button key={item.id} className={itemCls(item.id)} onClick={() => onSelect(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Appearance panel ──────────────────────────────────────────────────────────

function AppearancePanel({ settings, set }) {
  return (
    <PanelWrap title="外观">
      <Field label="主题">
        <div className="flex gap-2">
          {[['light', '浅色', 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'],
            ['dark',  '深色', 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z']
          ].map(([v, l, path]) => (
            <button key={v}
              onClick={() => set({ theme: v })}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all
                ${settings.theme === v
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
              </svg>
              {l}
            </button>
          ))}
        </div>
      </Field>

      <Field label="字体大小">
        <div className="flex gap-2">
          {[['small', '小', 12], ['medium', '中', 14], ['large', '大', 16]].map(([v, l, size]) => (
            <button key={v}
              onClick={() => set({ fontSize: v })}
              className={`flex-1 py-1.5 text-sm rounded-lg border-2 font-medium transition-all
                ${settings.fontSize === v
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                }`}
              style={{ fontSize: size }}
            >{l}</button>
          ))}
        </div>
      </Field>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">TaskFlow</div>
            <div className="text-xs text-slate-400">v2.0.0</div>
          </div>
        </div>
      </div>
    </PanelWrap>
  );
}

// ── AI Basic panel ────────────────────────────────────────────────────────────

function AiBasicPanel({ settings, set }) {
  const [testStatus, setTestStatus] = useState(null);
  const [testMessage, setTestMessage] = useState('');
  const [fetchedModels, setFetchedModels] = useState({});
  const [fetchingModels, setFetchingModels] = useState(false);

  const handleFetchModels = async (provider) => {
    setFetchingModels(true);
    try {
      const models = await settingsApi.fetchModels(provider);
      setFetchedModels(prev => ({ ...prev, [provider]: models }));
    } catch (err) {
      alert('获取模型失败：' + (err?.response?.data?.detail ?? err.message));
    } finally {
      setFetchingModels(false);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const result = await settingsApi.testConnection();
      setTestStatus(result.success ? 'success' : 'error');
      setTestMessage(result.message);
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err instanceof Error ? err.message : '请求失败');
    }
    setTimeout(() => setTestStatus(null), 6000);
  };

  const p = settings.aiProvider;
  const cfg = settings.providerConfigs[p] ?? { api_key: '', model: '', base_url: '', proxy: '' };
  const updateCfg = (patch) => set({
    providerConfigs: { ...settings.providerConfigs, [p]: { ...cfg, ...patch } }
  });
  const dynamicModels = fetchedModels[p];
  const modelList = dynamicModels ?? MODELS[p] ?? [];

  return (
    <PanelWrap title="基础配置">
      {/* Provider tabs */}
      <Field label="服务商">
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(settings.providerConfigs).map(name => (
            <button key={name}
              onClick={() => set({ aiProvider: name })}
              className={`px-3 py-1.5 text-sm rounded-lg border-2 font-medium transition-all
                ${settings.aiProvider === name
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                }`}
            >{name}</button>
          ))}
        </div>
      </Field>

      {/* API Key */}
      <Field label="API Key">
        <input
          type="password"
          value={cfg.api_key}
          onChange={e => updateCfg({ api_key: e.target.value })}
          placeholder={p === 'Ollama' ? '（Ollama 无需 Key）' : 'sk-...'}
          disabled={p === 'Ollama'}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
            bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </Field>

      {/* Model */}
      <Field label="模型">
        <div className="flex gap-2">
          {modelList.length > 0 ? (
            <select
              value={cfg.model}
              onChange={e => updateCfg({ model: e.target.value })}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
                bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200
                focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {!modelList.includes(cfg.model) && cfg.model && (
                <option value={cfg.model}>{cfg.model}</option>
              )}
              {modelList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <input
              type="text"
              value={cfg.model}
              onChange={e => updateCfg({ model: e.target.value })}
              placeholder="输入模型名称..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
                bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          )}
          <button
            onClick={() => handleFetchModels(p)}
            disabled={fetchingModels}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600
              text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700
              disabled:opacity-50 disabled:cursor-wait transition-colors whitespace-nowrap"
          >
            {fetchingModels ? '获取中…' : '获取模型'}
          </button>
        </div>
        {dynamicModels && (
          <p className="mt-1 text-xs text-slate-400">已从 API 获取 {dynamicModels.length} 个模型</p>
        )}
      </Field>

      {/* API URL */}
      <Field label="API 地址">
        <input
          type="text"
          value={cfg.base_url}
          onChange={e => updateCfg({ base_url: e.target.value })}
          placeholder={BASE_URL_PLACEHOLDERS[p] ?? 'https://...（留空使用默认）'}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
            bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </Field>

      {/* Proxy */}
      <Field label="代理地址">
        <input
          type="text"
          value={cfg.proxy}
          onChange={e => updateCfg({ proxy: e.target.value })}
          placeholder="http://127.0.0.1:7890（留空不使用代理）"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
            bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </Field>

      {/* History limit */}
      <Field label="历史轮数">
        <div className="flex items-center gap-3">
          <select
            value={settings.historyLimit}
            onChange={e => set({ historyLimit: Number(e.target.value) })}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200
              focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {Array.from({ length: 21 }, (_, i) => (
              <option key={i} value={i}>{i === 0 ? '不携带历史' : `${i} 轮`}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400">发送给 AI 的历史对话轮数</span>
        </div>
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
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">{testMessage}</span>
            </div>
          )}
          {testStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-red-500">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm">{testMessage}</span>
            </div>
          )}
        </div>
      </Field>
    </PanelWrap>
  );
}

// ── Prompts panel ─────────────────────────────────────────────────────────────

function PromptTextarea({ value, onChange, disabled, rows = 8 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      rows={rows}
      className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600
        bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200
        focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y leading-relaxed
        disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ minHeight: 120 }}
    />
  );
}

function SaveRow({ onSave, onCancel, saved, error, disabled }) {
  return (
    <div className="flex justify-end items-center gap-2 pt-1">
      {error && <span className="text-xs text-red-500 mr-auto">保存失败，请重试</span>}
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        取消
      </button>
      <button
        onClick={onSave}
        disabled={disabled}
        className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-40"
      >
        {saved ? '已保存 ✓' : '保存'}
      </button>
    </div>
  );
}

function TemplateEditModal({ template, onSave, onClose }) {
  const isNew = !template.id;
  const [name, setName] = useState(template.name ?? '');
  const [prompt, setPrompt] = useState(template.prompt ?? '');
  const [scope, setScope] = useState(template.scope ?? []);
  const [saving, setSaving] = useState(false);

  const toggleScope = (key) => {
    setScope(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSave = async () => {
    if (!name.trim() || !prompt.trim() || scope.length === 0) return;
    setSaving(true);
    await onSave({ name: name.trim(), prompt: prompt.trim(), scope });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          {isNew ? '新增快捷指令' : '编辑快捷指令'}
        </h3>

        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">名称</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="如：周报"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200
              focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            适用范围（可多选）
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SCOPE_OPTIONS.map(opt => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scope.includes(opt.key)}
                  onChange={() => toggleScope(opt.key)}
                  className="w-3.5 h-3.5 accent-blue-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">{opt.label}</span>
              </label>
            ))}
          </div>
          {scope.length === 0 && (
            <p className="text-xs text-amber-500 mt-1">请至少选择一个适用范围</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Prompt 内容</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={7}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200
              focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y leading-relaxed"
            style={{ minHeight: 120 }}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !prompt.trim() || scope.length === 0}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-40"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptsPanel() {
  // Settings-based prompts
  const [basePrompt, setBasePrompt] = useState('');
  const [builtins, setBuiltins] = useState({ global: '', project: '', today: '', week: '' });
  const [loading, setLoading] = useState(true);

  // Which section is currently being edited: null | 'base' | 'global' | 'project' | 'today' | 'week'
  const [editingKey, setEditingKey] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [saved, setSaved] = useState({});
  const [saveError, setSaveError] = useState({});

  // Custom templates
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null); // null | { id?, name, prompt, scope }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // template id

  useEffect(() => {
    const loadSettings = settingsApi.list().then(rows => {
      const m = Object.fromEntries(rows.map(r => {
        try { return [r.key, JSON.parse(r.value)]; } catch { return [r.key, r.value]; }
      }));
      setBasePrompt(m.base_prompt ?? '');
      setBuiltins({
        global:  m.prompt_global  ?? DEFAULT_PROMPTS.global,
        project: m.prompt_project ?? DEFAULT_PROMPTS.project,
        today:   m.prompt_today   ?? DEFAULT_PROMPTS.today,
        week:    m.prompt_week    ?? DEFAULT_PROMPTS.week,
      });
    });
    const loadTemplates = promptTemplatesApi.list().then(setTemplates);
    Promise.all([loadSettings, loadTemplates]).finally(() => setLoading(false));
  }, []);

  const startEdit = (key, value) => {
    setEditingKey(key);
    setEditDraft(value);
    setSaved(prev => ({ ...prev, [key]: false }));
    setSaveError(prev => ({ ...prev, [key]: false }));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditDraft('');
  };

  const saveBuiltin = async (key) => {
    const settingKey = key === 'base' ? 'base_prompt' : `prompt_${key}`;
    try {
      await settingsApi.update(settingKey, editDraft.trim());
      if (key === 'base') setBasePrompt(editDraft.trim());
      else setBuiltins(prev => ({ ...prev, [key]: editDraft.trim() }));
      setSaved(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setSaved(prev => ({ ...prev, [key]: false }));
        setEditingKey(null);
        setEditDraft('');
      }, 1200);
    } catch {
      setSaveError(prev => ({ ...prev, [key]: true }));
    }
  };

  const resetBuiltin = async (key) => {
    const val = DEFAULT_PROMPTS[key];
    setEditDraft(val);
    setBuiltins(prev => ({ ...prev, [key]: val }));
    await settingsApi.update(`prompt_${key}`, val);
  };

  const handleToggleTemplate = async (tpl) => {
    const updated = await promptTemplatesApi.update(tpl.id, { enabled: !tpl.enabled });
    setTemplates(prev => prev.map(t => t.id === tpl.id ? updated : t));
  };

  const handleSaveTemplate = async (data) => {
    if (editingTemplate?.id) {
      const updated = await promptTemplatesApi.update(editingTemplate.id, data);
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? updated : t));
    } else {
      const created = await promptTemplatesApi.create(data);
      setTemplates(prev => [...prev, created]);
    }
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = async (id) => {
    await promptTemplatesApi.delete(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    setDeleteConfirm(null);
  };

  const scopeLabel = (scope) =>
    scope.map(k => SCOPE_OPTIONS.find(o => o.key === k)?.label ?? k).join(' / ');

  return (
    <PanelWrap title="Prompt 配置">
      {loading && (
        <div className="text-xs text-slate-400 text-center py-8">加载中…</div>
      )}

      {!loading && (
        <div className="space-y-5">
          {/* ── Section 1: 基础设定 ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">基础设定</span>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">附加在所有对话前的通用设定</p>
              </div>
              {editingKey !== 'base' && (
                <button
                  onClick={() => startEdit('base', basePrompt)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600
                    text-slate-500 dark:text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
                >
                  编辑
                </button>
              )}
            </div>
            {editingKey === 'base' ? (
              <div className="space-y-2">
                <PromptTextarea value={editDraft} onChange={setEditDraft} rows={5} />
                <SaveRow
                  onSave={() => saveBuiltin('base')}
                  onCancel={cancelEdit}
                  saved={saved.base}
                  error={saveError.base}
                />
              </div>
            ) : (
              <div
                className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700
                  text-xs text-slate-500 dark:text-slate-400 min-h-[40px] whitespace-pre-wrap cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                onClick={() => startEdit('base', basePrompt)}
              >
                {basePrompt || <span className="italic text-slate-300 dark:text-slate-600">（空）所有对话不附加基础设定</span>}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700" />

          {/* ── Section 2: 内置对话配置 ── */}
          <div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">内置对话配置</div>
            <div className="space-y-3">
              {BUILTIN_CONFIGS.map(cfg => (
                <div key={cfg.key} className="rounded-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{cfg.label}</span>
                    </div>
                    {editingKey !== cfg.key && (
                      <button
                        onClick={() => startEdit(cfg.key, builtins[cfg.key])}
                        className="text-[11px] px-2.5 py-1 rounded border border-slate-200 dark:border-slate-600
                          text-slate-500 dark:text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
                      >
                        编辑
                      </button>
                    )}
                  </div>
                  <div className="px-3 py-2">
                    {editingKey === cfg.key ? (
                      <div className="space-y-2">
                        <PromptTextarea value={editDraft} onChange={setEditDraft} rows={5} />
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => resetBuiltin(cfg.key)}
                            className="text-xs text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                          >
                            恢复默认
                          </button>
                          <SaveRow
                            onSave={() => saveBuiltin(cfg.key)}
                            onCancel={cancelEdit}
                            saved={saved[cfg.key]}
                            error={saveError[cfg.key]}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors leading-relaxed"
                          onClick={() => startEdit(cfg.key, builtins[cfg.key])}
                        >
                          {builtins[cfg.key] || <span className="italic text-slate-300 dark:text-slate-600">（空）</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                          <span>🔒</span>
                          <span>{cfg.desc}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700" />

          {/* ── Section 3: 自定义配置 ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">自定义配置</span>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">通过 / 斜杠命令在对话框中调用</p>
              </div>
              <button
                onClick={() => setEditingTemplate({ name: '', prompt: '', scope: [] })}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新增
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                暂无自定义配置，点击「新增」创建
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map(tpl => (
                  <div
                    key={tpl.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors
                      ${tpl.enabled
                        ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/10 opacity-60'
                      }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{tpl.name}</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">{scopeLabel(tpl.scope)}</span>
                        {tpl.is_preset && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500">预置</span>
                        )}
                      </div>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleTemplate(tpl)}
                      className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors
                        ${tpl.enabled ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600'}`}
                      title={tpl.enabled ? '点击禁用' : '点击启用'}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                        ${tpl.enabled ? 'left-4' : 'left-0.5'}`}
                      />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => setEditingTemplate(tpl)}
                      className="text-[11px] px-2 py-1 rounded border border-slate-200 dark:border-slate-600
                        text-slate-500 dark:text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex-shrink-0"
                    >
                      编辑
                    </button>

                    {/* Delete */}
                    {deleteConfirm === tpl.id ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="text-[11px] px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-[11px] px-2 py-1 rounded border border-slate-200 dark:border-slate-600
                            text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(tpl.id)}
                        className="text-[11px] px-2 py-1 rounded border border-slate-200 dark:border-slate-600
                          text-slate-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 transition-colors flex-shrink-0"
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingTemplate && (
        <TemplateEditModal
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </PanelWrap>
  );
}

// ── Skills panel ──────────────────────────────────────────────────────────────

function SkillsPanel({ skills, setSkills }) {
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // skill id
  const fileInputRef = useRef(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (
          typeof data.name !== 'string' || !data.name.trim() ||
          typeof data.trigger !== 'string' || !data.trigger.trim() ||
          typeof data.prompt !== 'string' || !data.prompt.trim()
        ) {
          showToast('error', '格式不正确，请检查 JSON 文件');
          return;
        }
        const newSkill = {
          id: `skill-${Date.now()}`,
          name: data.name.trim(),
          trigger: data.trigger.trim(),
          description: typeof data.description === 'string' ? data.description.trim() : '',
          prompt: data.prompt.trim(),
          enabled: true,
        };
        setSkills(prev => [...prev, newSkill]);
        showToast('success', `已导入 Skill「${newSkill.name}」`);
      } catch {
        showToast('error', '格式不正确，请检查 JSON 文件');
      }
    };
    reader.readAsText(file);
  };

  const toggleEnabled = (id) => {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const deleteSkill = (id) => {
    setSkills(prev => prev.filter(s => s.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <PanelWrap title="Skills 管理">
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {skills.length > 0 ? `共 ${skills.length} 个 Skill` : ''}
        </span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
            bg-blue-500 hover:bg-blue-600 text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          导入 Skill
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium
          ${toast.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Empty state */}
      {skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <p className="text-sm">暂无 Skills，点击右上角导入</p>
        </div>
      ) : (
        <div className="space-y-2">
          {skills.map(skill => (
            <div key={skill.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-800/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${skill.enabled ? 'bg-green-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <span className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate">
                    {skill.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleEnabled(skill.id)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors
                      ${skill.enabled
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                  >
                    {skill.enabled ? '已启用' : '已禁用'}
                  </button>

                  {/* Delete */}
                  {deleteConfirm === skill.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteSkill(skill.id)}
                        className="px-2 py-1 text-xs rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 font-medium"
                      >
                        确认删除
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 text-xs rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(skill.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="删除"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 space-y-0.5 pl-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  触发词：<span className="font-mono text-slate-600 dark:text-slate-300">{skill.trigger}</span>
                </p>
                {skill.description && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2">{skill.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelWrap>
  );
}

// ── MCP panel ─────────────────────────────────────────────────────────────────

function McpPanel() {
  return (
    <PanelWrap title="MCP 配置">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 space-y-3 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50">
          <p>
            MCP（Model Context Protocol）允许 AI 连接外部工具和数据源，扩展 AI 的能力边界。
          </p>
          <p>
            配置后可接入：搜索引擎、数据库、日历、代码仓库等外部服务。
          </p>
          <div className="pt-3 flex items-center gap-2 text-slate-400 dark:text-slate-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm">功能开发中，即将上线</span>
          </div>
        </div>
      </div>
    </PanelWrap>
  );
}

// ── Shared layout components ──────────────────────────────────────────────────

function PanelWrap({ title, children }) {
  return (
    <div className="max-w-2xl px-8 py-6 space-y-5">
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 pb-3
        border-b border-slate-100 dark:border-slate-700">
        {title}
      </h2>
      {children}
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
