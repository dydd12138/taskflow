import apiClient from './client'
import type { Task, CreateTaskPayload, UpdateTaskPayload } from '../types'

export const tasksApi = {
  list: async (projectId?: number): Promise<Task[]> => {
    return (await apiClient.get<Task[]>('/tasks', {
      params: projectId !== undefined ? { project_id: projectId } : {},
    })).data
  },

  create: async (payload: CreateTaskPayload): Promise<Task> => {
    return (await apiClient.post<Task>('/tasks', payload)).data
  },

  update: async (id: number, payload: UpdateTaskPayload): Promise<Task> => {
    return (await apiClient.patch<Task>(`/tasks/${id}`, payload)).data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`)
  },
}
