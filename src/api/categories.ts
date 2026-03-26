import apiClient from './client'
import type { Category, CreateCategoryPayload, UpdateCategoryPayload } from '../types'

export const categoriesApi = {
  list: async (): Promise<Category[]> => {
    return (await apiClient.get<Category[]>('/categories')).data
  },

  create: async (payload: CreateCategoryPayload): Promise<Category> => {
    return (await apiClient.post<Category>('/categories', payload)).data
  },

  update: async (id: number, payload: UpdateCategoryPayload): Promise<Category> => {
    return (await apiClient.patch<Category>(`/categories/${id}`, payload)).data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/categories/${id}`)
  },
}
