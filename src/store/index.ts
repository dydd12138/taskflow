/**
 * Zustand store — single source of truth, replaces AppContext / useReducer.
 *
 * Public API: useApp() returns { state, actions } — identical shape to the old
 * AppContext so existing JSX components only need one import-path change:
 *   import { useApp } from '../context/AppContext'  →  import { useApp } from '../store'
 */
import { create } from 'zustand'
import { categoriesApi } from '../api/categories'
import { projectsApi }   from '../api/projects'
import { tasksApi }      from '../api/tasks'
import { deletedTasksApi } from '../api/deletedTasks'
import { settingsApi }   from '../api/settings'
import { notesApi }      from '../api/notes'

// ── Types mirrored in camelCase for component compatibility ───────────────────
// (The canonical snake_case backend types live in src/types/index.ts)

export interface FECategory {
  id: number | string
  name: string
  color: string
  collapsed: boolean
  order: number
}

export interface FEProject {
  id: number | string
  categoryId: number | string | null
  name: string
  color: string
  order: number
}

export interface FETask {
  id: number | string
  projectId: number | string
  title: string
  dueDate: string | null
  startDate: string | null
  endDate: string | null
  priority: 'none' | 'low' | 'medium' | 'high'
  status: 'none' | 'in_progress' | 'blocked'
  completed: boolean
  notes: string
  order: number
  deletedAt: string | null
}

export interface FESettings {
  theme: string
  accentColor: string
  fontSize: string
  aiProvider: string
  providerConfigs: Record<string, { api_key: string; model: string; base_url: string }>
}

// ── Adapters: backend → frontend ─────────────────────────────────────────────
import type {
  Task as APITask,
  Category as APICat,
  Project as APIProj,
  DeletedTask as APIDel,
  CreateTaskPayload,
  UpdateTaskPayload,
} from '../types'

function adaptCategory(c: APICat, idx: number): FECategory {
  const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981']
  return {
    id: c.id,
    name: c.name,
    color: colors[idx % colors.length],
    collapsed: false,
    order: c.sort_order,
  }
}

function adaptProject(p: APIProj): FEProject {
  return {
    id: p.id,
    categoryId: p.category_id,
    name: p.name,
    color: p.color,
    order: p.sort_order,
  }
}

function adaptTask(t: APITask): FETask {
  return {
    id: t.id,
    projectId: t.project_id,
    title: t.name,
    dueDate: t.deadline,
    startDate: t.start_date,
    endDate: t.end_date,
    priority: t.priority,
    status: t.manual_status,
    completed: t.is_completed,
    notes: t.note ?? '',
    order: t.sort_order,
    deletedAt: null,
  }
}

function adaptDeletedTask(d: APIDel): FETask {
  return {
    ...adaptTask(d.task_snapshot),
    id: `del-${d.id}`,
    deletedAt: d.deleted_at,
  }
}

// ── Reorder helper ────────────────────────────────────────────────────────────
function reorder<T extends { order: number }>(list: T[], idx: number, newIdx: number): T[] {
  const arr = [...list]
  ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
  return arr.map((item, i) => ({ ...item, order: i }))
}

// ── Store definition ──────────────────────────────────────────────────────────
interface AppStoreState {
  categories: FECategory[]
  projects: FEProject[]
  tasks: FETask[]
  deletedTasks: FETask[]
  settings: FESettings
  currentView: string
  pendingExpandTaskId: string | number | null
  noteContent: string
  noteLoading: boolean
  noteSaving: boolean
  _initialized: boolean
  initError: string | null
}

interface AppStoreActions {
  _init: () => Promise<void>

  setView: (view: string) => void
  navigateToTask: (taskId: string | number, projectId: string | number) => void
  clearPendingExpand: () => void

  createTask: (data: Partial<FETask> & { projectId: string | number; title: string }) => Promise<void>
  updateTask: (id: string | number, updates: Partial<FETask>) => Promise<void>
  deleteTask: (id: string | number) => Promise<void>
  restoreTask: (id: string | number, projectId?: string | number) => Promise<void>
  purgeTask: (id: string | number) => Promise<void>
  purgeAllDeleted: () => Promise<void>
  moveTask: (id: string | number, projectId: string | number, direction: 'up' | 'down') => void

  toggleCategory: (id: string | number) => void
  expandAllCategories: () => void
  createCategory: (data: { name: string; color?: string; id?: string | number }) => Promise<FECategory>
  updateCategory: (id: string | number, updates: Partial<FECategory>) => Promise<void>
  moveCategory: (id: string | number, direction: 'up' | 'down') => void
  deleteCategory: (id: string | number) => Promise<void>

  createProject: (data: Partial<FEProject> & { name: string }) => Promise<FEProject>
  updateProject: (id: string | number, updates: Partial<FEProject>) => Promise<void>
  moveProject: (id: string | number, categoryId: string | number | null, direction: 'up' | 'down') => Promise<void>
  moveProjectToCategory: (id: string | number, targetCategoryId: string | number | null) => Promise<void>
  deleteProject: (id: string | number) => Promise<void>

  updateSettings: (updates: Partial<FESettings>) => Promise<void>

  fetchNote: (projectId: number) => Promise<void>
  saveNote: (projectId: number, content: string) => Promise<void>

  refreshTasks: () => Promise<void>
}

const DEFAULT_SETTINGS: FESettings = {
  theme: 'light',
  accentColor: '#3b82f6',
  fontSize: 'medium',
  aiProvider: 'Anthropic',
  historyLimit: 3,
  providerConfigs: {
    'Anthropic': { api_key: '', model: 'claude-sonnet-4-6', base_url: '', proxy: '' },
    'OpenAI':    { api_key: '', model: 'gpt-4o',            base_url: '', proxy: '' },
    '阿里百炼':  { api_key: '', model: 'qwen-plus',         base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', proxy: '' },
    'Ollama':    { api_key: 'ollama', model: 'llama3',      base_url: 'http://localhost:11434/v1', proxy: '' },
    '其他':      { api_key: '', model: '',                   base_url: '', proxy: '' },
  },
}

let _deletedTaskApiIds = new Map<string | number, number>() // FETask id → APIDel id

const useAppStore = create<AppStoreState & AppStoreActions>()((set, get) => ({
  categories: [],
  projects: [],
  tasks: [],
  deletedTasks: [],
  settings: DEFAULT_SETTINGS,
  currentView: 'today',
  pendingExpandTaskId: null,
  noteContent: '',
  noteLoading: false,
  noteSaving: false,
  _initialized: false,
  initError: null,

  // ── Init: load all data from API layer ──────────────────────────────────────
  _init: async () => {
    if (get()._initialized) return
    try {
      const [cats, projs, tasks, deleted, settingRows] = await Promise.all([
        categoriesApi.list(),
        projectsApi.list(),
        tasksApi.list(),
        deletedTasksApi.list(),
        settingsApi.list(),
      ])
      const feDeleted = deleted.map(adaptDeletedTask)
      _deletedTaskApiIds = new Map(deleted.map(d => [`del-${d.id}`, d.id]))
      const feSettings = settingsApi.toFrontend(settingRows)
      set({
        categories: cats.map(adaptCategory),
        projects: projs.map(adaptProject),
        tasks: tasks.map(adaptTask),
        deletedTasks: feDeleted,
        settings: feSettings,
        _initialized: true,
        initError: null,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('TaskFlow init error:', err)
      set({ initError: msg })
    }
  },

  // ── Navigation ──────────────────────────────────────────────────────────────
  setView: (view) => set({ currentView: view }),
  navigateToTask: (taskId, projectId) =>
    set({ currentView: `project:${projectId}`, pendingExpandTaskId: taskId }),
  clearPendingExpand: () => set({ pendingExpandTaskId: null }),

  // ── Tasks ───────────────────────────────────────────────────────────────────
  createTask: async (data) => {
    const projectId = data.projectId as number
    const payload: CreateTaskPayload = {
      project_id: projectId,
      name: data.title ?? '',
      time_type: 'deadline',
      deadline: data.dueDate ?? null,
      start_date: data.startDate ?? null,
      end_date: data.endDate ?? null,
      is_all_day: true,
      priority: data.priority ?? 'none',
      manual_status: 'none',
      is_completed: false,
      note: data.notes ?? null,
      sort_order: 0,
    }
    const created = await tasksApi.create(payload)
    set(s => ({ tasks: [...s.tasks, adaptTask(created)] }))
  },

  updateTask: async (id, updates) => {
    // Optimistic UI update
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t) }))
    const apiUpdates: UpdateTaskPayload = {}
    if (updates.title !== undefined)     apiUpdates.name = updates.title
    if (updates.completed !== undefined) apiUpdates.is_completed = updates.completed
    if (updates.notes !== undefined)     apiUpdates.note = updates.notes
    if (updates.dueDate !== undefined)   apiUpdates.deadline = updates.dueDate
    if (updates.startDate !== undefined) apiUpdates.start_date = updates.startDate
    if (updates.endDate !== undefined)   apiUpdates.end_date = updates.endDate
    if (updates.priority !== undefined)  apiUpdates.priority = updates.priority
    if (updates.status !== undefined)    apiUpdates.manual_status = updates.status
    if (updates.order !== undefined)     apiUpdates.sort_order = updates.order
    await tasksApi.update(id as number, apiUpdates)
  },

  deleteTask: async (id) => {
    await tasksApi.delete(id as number)
    const deleted = await deletedTasksApi.list()
    const feDeleted = deleted.map(adaptDeletedTask)
    _deletedTaskApiIds = new Map(deleted.map(d => [`del-${d.id}`, d.id]))
    set(s => ({
      tasks: s.tasks.filter(t => t.id !== id),
      deletedTasks: feDeleted,
    }))
  },

  restoreTask: async (id, projectId?) => {
    const apiId = _deletedTaskApiIds.get(id)
    if (!apiId) return
    const { deletedTasks } = get()
    const entry = deletedTasks.find(t => t.id === id)
    const targetProjectId = (projectId ?? entry?.projectId ?? 1) as number
    const restored = await deletedTasksApi.restore(apiId, targetProjectId)
    const feRestored = adaptTask(restored)
    set(s => ({
      deletedTasks: s.deletedTasks.filter(t => t.id !== id),
      tasks: [...s.tasks, feRestored],
    }))
  },

  purgeTask: async (id) => {
    const apiId = _deletedTaskApiIds.get(id)
    if (!apiId) return
    await deletedTasksApi.purge(apiId)
    set(s => ({ deletedTasks: s.deletedTasks.filter(t => t.id !== id) }))
  },

  purgeAllDeleted: async () => {
    await deletedTasksApi.purgeAll()
    set({ deletedTasks: [] })
  },

  moveTask: (id, projectId, direction) => {
    const { tasks } = get()
    const list = tasks.filter(t => t.projectId === projectId && !t.deletedAt).sort((a, b) => a.order - b.order)
    const idx = list.findIndex(t => t.id === id)
    if (idx === -1) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= list.length) return
    const reordered = reorder(list, idx, newIdx)
    set({ tasks: tasks.map(t => reordered.find(r => r.id === t.id) ?? t) })
  },

  // ── Categories ──────────────────────────────────────────────────────────────
  toggleCategory: (id) =>
    set(s => ({ categories: s.categories.map(c => c.id === id ? { ...c, collapsed: !c.collapsed } : c) })),

  expandAllCategories: () =>
    set(s => ({ categories: s.categories.map(c => ({ ...c, collapsed: false })) })),

  createCategory: async (data) => {
    const { categories } = get()
    const created = await categoriesApi.create({
      name: data.name,
      sort_order: categories.length,
    })
    const feCat = adaptCategory(created, categories.length)
    set(s => ({ categories: [...s.categories, feCat] }))
    return feCat
  },

  updateCategory: async (id, updates) => {
    set(s => ({ categories: s.categories.map(c => c.id === id ? { ...c, ...updates } : c) }))
    const apiPayload: { name?: string; sort_order?: number } = {}
    if (updates.name !== undefined)  apiPayload.name = updates.name
    if (updates.order !== undefined) apiPayload.sort_order = updates.order
    if (Object.keys(apiPayload).length > 0) {
      await categoriesApi.update(id as number, apiPayload)
    }
  },

  moveCategory: (id, direction) => {
    const { categories } = get()
    const sorted = [...categories].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex(c => c.id === id)
    if (idx === -1) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= sorted.length) return
    const reordered = reorder(sorted, idx, newIdx)
    set({ categories: categories.map(c => reordered.find(r => r.id === c.id) ?? c) })
  },

  deleteCategory: async (id) => {
    await categoriesApi.delete(id as number)
    const { categories, projects, currentView } = get()
    const updatedProjects = projects.map(p => p.categoryId === id ? { ...p, categoryId: null } : p)
    const newCategories = categories.filter(c => c.id !== id)
    const movedProjIds = projects.filter(p => p.categoryId === id).map(p => p.id)
    const newView = movedProjIds.some(pid => currentView === `project:${pid}`) ? 'today' : currentView
    set({ categories: newCategories, projects: updatedProjects, currentView: newView })
  },

  // ── Projects ─────────────────────────────────────────────────────────────────
  createProject: async (data) => {
    const created = await projectsApi.create({
      name: data.name,
      color: data.color ?? '#3b82f6',
      category_id: (data.categoryId as number) ?? null,
      status: 'not_started',
      sort_order: 0,
    })
    const feProj = adaptProject(created)
    set(s => ({ projects: [...s.projects, feProj] }))
    return feProj
  },

  updateProject: async (id, updates) => {
    set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, ...updates } : p) }))
    const payload: Record<string, unknown> = {}
    if (updates.name      !== undefined) payload.name       = updates.name
    if (updates.color     !== undefined) payload.color      = updates.color
    if (updates.categoryId !== undefined) payload.category_id = updates.categoryId
    if (Object.keys(payload).length > 0) {
      await projectsApi.update(id as number, payload as any)
    }
  },

  moveProject: async (id, categoryId, direction) => {
    const { projects } = get()
    const list = projects.filter(p => p.categoryId === categoryId).sort((a, b) => a.order - b.order)
    const idx = list.findIndex(p => p.id === id)
    if (idx === -1) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= list.length) return
    const reordered = reorder(list, idx, newIdx)
    set({ projects: projects.map(p => reordered.find(r => r.id === p.id) ?? p) })
    // Persist sort_order for the two swapped projects
    const affected = reordered.filter(r => r.id === list[idx].id || r.id === list[newIdx].id)
    await Promise.all(affected.map(p => projectsApi.update(p.id as number, { sort_order: p.order })))
  },

  moveProjectToCategory: async (id, targetCategoryId) => {
    await projectsApi.update(id as number, {
      category_id: targetCategoryId as number | null,
    })
    const { projects } = get()
    const targetCount = projects.filter(p => p.categoryId === targetCategoryId).length
    set({ projects: projects.map(p =>
      p.id === id ? { ...p, categoryId: targetCategoryId, order: targetCount } : p
    )})
  },

  deleteProject: async (id) => {
    await projectsApi.delete(id as number)
    const { projects, currentView } = get()
    const allTasks = await tasksApi.list()
    const newView = currentView === `project:${id}` ? 'today' : currentView
    set({
      projects: projects.filter(p => p.id !== id),
      tasks: allTasks.map(adaptTask),
      currentView: newView,
    })
  },

  // ── Notes ────────────────────────────────────────────────────────────────────
  fetchNote: async (projectId) => {
    set({ noteLoading: true })
    try {
      const content = await notesApi.get(projectId)
      set({ noteContent: content, noteLoading: false })
    } catch {
      set({ noteContent: '', noteLoading: false })
    }
  },

  saveNote: async (projectId, content) => {
    set({ noteSaving: true })
    try {
      await notesApi.save(projectId, content)
      set({ noteSaving: false })
      // 不更新 noteContent：编辑器挂载后自身管理内容，反写会导致
      // initialContent prop 变化 → useEditor 重建 → 光标丢失
    } catch {
      set({ noteSaving: false })
    }
  },

  refreshTasks: async () => {
    const tasks = await tasksApi.list()
    set({ tasks: tasks.map(adaptTask) })
  },

  // ── Settings ─────────────────────────────────────────────────────────────────
  updateSettings: async (updates) => {
    const simpleKeyMap: Record<string, string> = {
      theme:        'theme',
      accentColor:  'theme_color',
      fontSize:     'font_size',
      aiProvider:   'ai_provider',
      historyLimit: 'conversation_history_limit',
    }
    const promises: Promise<any>[] = []
    for (const [feKey, value] of Object.entries(updates)) {
      const beKey = simpleKeyMap[feKey]
      if (beKey) {
        promises.push(settingsApi.update(beKey, value))
      } else if (feKey === 'providerConfigs') {
        promises.push(settingsApi.update('ai_providers_config', value))
      }
    }
    set(s => ({ settings: { ...s.settings, ...updates } }))
    await Promise.all(promises)
  },
}))

// ── Compatibility hook: same { state, actions } shape as old AppContext ────────
export function useApp() {
  const store = useAppStore()

  const state = {
    categories:          store.categories,
    projects:            store.projects,
    tasks:               store.tasks,
    deletedTasks:        store.deletedTasks,
    settings:            store.settings,
    currentView:         store.currentView,
    pendingExpandTaskId: store.pendingExpandTaskId,
    noteContent:         store.noteContent,
    noteLoading:         store.noteLoading,
    noteSaving:          store.noteSaving,
  }

  const actions = {
    setView:              store.setView,
    navigateToTask:       store.navigateToTask,
    clearPendingExpand:   store.clearPendingExpand,
    createTask:           store.createTask,
    updateTask:           store.updateTask,
    deleteTask:           store.deleteTask,
    restoreTask:          store.restoreTask,
    purgeTask:            store.purgeTask,
    purgeAllDeleted:      store.purgeAllDeleted,
    moveTask:             store.moveTask,
    toggleCategory:       store.toggleCategory,
    expandAllCategories:  store.expandAllCategories,
    createCategory:       store.createCategory,
    updateCategory:       store.updateCategory,
    moveCategory:         store.moveCategory,
    deleteCategory:       store.deleteCategory,
    createProject:        store.createProject,
    updateProject:        store.updateProject,
    moveProject:          store.moveProject,
    moveProjectToCategory: store.moveProjectToCategory,
    deleteProject:        store.deleteProject,
    updateSettings:       store.updateSettings,
    fetchNote:            store.fetchNote,
    saveNote:             store.saveNote,
    refreshTasks:         store.refreshTasks,
  }

  return { state, actions }
}

export { useAppStore }
export default useAppStore
