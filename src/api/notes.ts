import apiClient from './client'

export const notesApi = {
  get: async (projectId: number): Promise<string> => {
    const res = await apiClient.get<{ project_id: number; content: string }>(
      `/projects/${projectId}/note`
    )
    return res.data.content
  },

  save: async (projectId: number, content: string): Promise<string> => {
    const res = await apiClient.put<{ project_id: number; content: string }>(
      `/projects/${projectId}/note`,
      { content }
    )
    return res.data.content
  },
}
