import apiClient from './client'

export interface PromptTemplate {
  id: number
  name: string
  prompt: string
  scope: string[]
  is_preset: boolean
  enabled: boolean
  sort_order: number
  created_at: string
}

export const promptTemplatesApi = {
  list: async (): Promise<PromptTemplate[]> => {
    return (await apiClient.get<PromptTemplate[]>('/prompt-templates')).data
  },

  create: async (data: { name: string; prompt: string; scope: string[] }): Promise<PromptTemplate> => {
    return (await apiClient.post<PromptTemplate>('/prompt-templates', data)).data
  },

  update: async (
    id: number,
    data: Partial<{ name: string; prompt: string; scope: string[]; enabled: boolean; sort_order: number }>
  ): Promise<PromptTemplate> => {
    return (await apiClient.patch<PromptTemplate>(`/prompt-templates/${id}`, data)).data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/prompt-templates/${id}`)
  },
}
