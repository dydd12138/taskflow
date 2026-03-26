import apiClient from './client'
import type { DeletedTask, Task } from '../types'

export const deletedTasksApi = {
  list: async (): Promise<DeletedTask[]> => {
    return (await apiClient.get<DeletedTask[]>('/deleted-tasks')).data
  },

  restore: async (id: number, targetProjectId: number): Promise<Task> => {
    return (await apiClient.post<Task>(`/deleted-tasks/${id}/restore`, {
      project_id: targetProjectId,
    })).data
  },

  purge: async (id: number): Promise<void> => {
    await apiClient.delete(`/deleted-tasks/${id}`)
  },

  purgeAll: async (): Promise<void> => {
    await apiClient.delete('/deleted-tasks')
  },
}
