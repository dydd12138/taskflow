import apiClient from './client'
import type { Project, CreateProjectPayload, UpdateProjectPayload } from '../types'

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    return (await apiClient.get<Project[]>('/projects')).data
  },

  create: async (payload: CreateProjectPayload): Promise<Project> => {
    return (await apiClient.post<Project>('/projects', payload)).data
  },

  update: async (id: number, payload: UpdateProjectPayload): Promise<Project> => {
    return (await apiClient.patch<Project>(`/projects/${id}`, payload)).data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/projects/${id}`)
  },
}
