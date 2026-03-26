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
    return {
      theme:       (m.theme as string)       ?? 'light',
      accentColor: (m.theme_color as string) ?? '#3b82f6',
      fontSize:    (m.font_size as string)   ?? 'medium',
      aiProvider:  (m.ai_provider as string) ?? 'Anthropic',
      apiKey:      (m.ai_api_key as string)  ?? '',
      model:       (m.ai_model as string)    ?? 'claude-sonnet-4-6',
      proxyUrl:    (m.ai_proxy as string)    ?? '',
    } as FrontendSettings
  },

  update: async (key: string, value: unknown): Promise<Setting> => {
    return (await apiClient.patch<Setting>(`/settings/${key}`, {
      value: JSON.stringify(value),
    })).data
  },
}
