import apiClient from './client'
import type { Setting, FrontendSettings } from '../types'

function parse(s: Setting): [string, unknown] {
  try { return [s.key, JSON.parse(s.value)] } catch { return [s.key, s.value] }
}

export const settingsApi = {
  list: async (): Promise<Setting[]> => {
    return (await apiClient.get<Setting[]>('/settings')).data
  },

  toFrontend: (rows: Setting[]): FrontendSettings => {
    const m = Object.fromEntries(rows.map(parse))

    const defaultConfigs: Record<string, { api_key: string; model: string; base_url: string; proxy: string }> = {
      'Anthropic': { api_key: '', model: 'claude-sonnet-4-6', base_url: '', proxy: '' },
      'OpenAI':    { api_key: '', model: 'gpt-4o',            base_url: '', proxy: '' },
      '阿里百炼':  { api_key: '', model: 'qwen-plus',         base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', proxy: '' },
      'Ollama':    { api_key: 'ollama', model: 'llama3',      base_url: 'http://localhost:11434/v1', proxy: '' },
      '其他':      { api_key: '', model: '',                   base_url: '', proxy: '' },
    }

    const savedConfigs = (m.ai_providers_config as Record<string, any>) ?? {}
    const providerConfigs: Record<string, { api_key: string; model: string; base_url: string; proxy: string }> = {}
    for (const name of Object.keys(defaultConfigs)) {
      providerConfigs[name] = { ...defaultConfigs[name], ...(savedConfigs[name] ?? {}) }
    }

    return {
      theme:          (m.theme as string)       ?? 'light',
      accentColor:    (m.theme_color as string) ?? '#3b82f6',
      fontSize:       (m.font_size as string)   ?? 'medium',
      aiProvider:     (m.ai_provider as string) ?? 'Anthropic',
      historyLimit:   (m.conversation_history_limit as number) ?? 3,
      providerConfigs,
    } as FrontendSettings
  },

  update: async (key: string, value: unknown): Promise<Setting> => {
    return (await apiClient.patch<Setting>(`/settings/${key}`, {
      value: JSON.stringify(value),
    })).data
  },

  testConnection: async (): Promise<{ success: boolean; message: string }> => {
    return (await apiClient.post<{ success: boolean; message: string }>(
      '/settings/test-connection', {}, { timeout: 30_000 }
    )).data
  },

  fetchModels: async (provider: string): Promise<string[]> => {
    const res = await apiClient.get<{ models: string[] }>('/settings/models', { params: { provider } })
    return res.data.models
  },
}
