// ─── Backend data model types (snake_case, aligned with FastAPI/SQLite schema) ─

export interface Category {
  id: number
  name: string
  sort_order: number
  created_at: string
}

export interface Project {
  id: number
  name: string
  color: string
  status: 'not_started' | 'in_progress' | 'completed'
  category_id: number | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: number
  project_id: number
  name: string
  /** 'deadline' = single due date, 'range' = start+end span */
  time_type: 'deadline' | 'range'
  deadline: string | null
  start_date: string | null
  end_date: string | null
  is_all_day: boolean
  priority: 'none' | 'low' | 'medium' | 'high'
  /** Manual progress label — separate from computed kanban lane */
  manual_status: 'none' | 'in_progress' | 'blocked'
  is_completed: boolean
  note: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DeletedTask {
  id: number
  task_id: number
  task_snapshot: Task
  original_project_id: number
  original_project_name: string
  deleted_at: string
}

export interface Setting {
  key: string
  value: string
  updated_at: string
}

// ─── API request/response shapes ────────────────────────────────────────────

export type CreateTaskPayload = Omit<Task, 'id' | 'created_at' | 'updated_at'>
export type UpdateTaskPayload = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>
export type CreateCategoryPayload = Pick<Category, 'name' | 'sort_order'>
export type UpdateCategoryPayload = Partial<Pick<Category, 'name' | 'sort_order'>>
export type CreateProjectPayload = Omit<Project, 'id' | 'created_at' | 'updated_at'>
export type UpdateProjectPayload = Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>

// ─── Frontend-only types (not stored in backend) ─────────────────────────────

/** Computed kanban swim-lane derived from dates */
export type KanbanLane = 'not_started' | 'in_progress' | 'overdue' | 'completed'

export interface ProviderConfig {
  api_key: string
  model: string
  base_url: string
  proxy: string
}

/** Frontend settings object (mirror of settings table key→value pairs) */
export interface FrontendSettings {
  theme: string
  accentColor: string
  fontSize: string
  aiProvider: string
  historyLimit: number
  providerConfigs: Record<string, ProviderConfig>
}
