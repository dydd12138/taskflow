import { createContext, useContext, useReducer } from 'react';
import {
  INITIAL_CATEGORIES, INITIAL_PROJECTS, INITIAL_TASKS, INITIAL_DELETED_TASKS
} from '../data/mockData';

const AppContext = createContext(null);

const initialState = {
  categories: INITIAL_CATEGORIES,
  projects: INITIAL_PROJECTS,
  tasks: INITIAL_TASKS,
  deletedTasks: INITIAL_DELETED_TASKS,
  settings: {
    theme: 'light',
    accentColor: '#3b82f6',
    fontSize: 'medium',
    aiProvider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    proxyUrl: '',
  },
  currentView: 'today',
  pendingExpandTaskId: null,
};

function reorder(list, idx, newIdx) {
  const arr = [...list];
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  return arr.map((item, i) => ({ ...item, order: i }));
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.view };

    case 'NAVIGATE_TO_TASK':
      return { ...state, currentView: `project:${action.projectId}`, pendingExpandTaskId: action.taskId };

    case 'CLEAR_PENDING_EXPAND':
      return { ...state, pendingExpandTaskId: null };

    // ── Tasks ──────────────────────────────────────────────────────────────────
    case 'CREATE_TASK': {
      const task = {
        id: `task-${Date.now()}`,
        projectId: action.projectId,
        title: action.title,
        dueDate: action.dueDate ?? null,
        startDate: action.startDate ?? null,
        endDate: action.endDate ?? null,
        priority: action.priority ?? 'none',
        status: 'not_started',
        completed: false,
        notes: action.notes ?? '',
        order: state.tasks.filter(t => t.projectId === action.projectId).length,
        deletedAt: null,
      };
      return { ...state, tasks: [...state.tasks, task] };
    }

    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.id ? { ...t, ...action.updates } : t) };

    case 'DELETE_TASK': {
      const task = state.tasks.find(t => t.id === action.id);
      if (!task) return state;
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.id),
        deletedTasks: [...state.deletedTasks, { ...task, deletedAt: new Date().toISOString() }],
      };
    }

    case 'RESTORE_TASK': {
      const task = state.deletedTasks.find(t => t.id === action.id);
      if (!task) return state;
      return {
        ...state,
        deletedTasks: state.deletedTasks.filter(t => t.id !== action.id),
        tasks: [...state.tasks, { ...task, deletedAt: null }],
      };
    }

    case 'PURGE_TASK':
      return { ...state, deletedTasks: state.deletedTasks.filter(t => t.id !== action.id) };

    case 'PURGE_ALL_DELETED':
      return { ...state, deletedTasks: [] };

    case 'MOVE_TASK': {
      const list = state.tasks
        .filter(t => t.projectId === action.projectId && !t.deletedAt)
        .sort((a, b) => a.order - b.order);
      const idx = list.findIndex(t => t.id === action.id);
      if (idx === -1) return state;
      const newIdx = action.direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= list.length) return state;
      const reordered = reorder(list, idx, newIdx);
      return { ...state, tasks: state.tasks.map(t => reordered.find(r => r.id === t.id) ?? t) };
    }

    // ── Categories ─────────────────────────────────────────────────────────────
    case 'TOGGLE_CATEGORY_COLLAPSE':
      return { ...state, categories: state.categories.map(c => c.id === action.id ? { ...c, collapsed: !c.collapsed } : c) };

    case 'CREATE_CATEGORY': {
      const category = {
        id: action.id ?? `cat-${Date.now()}`,
        name: action.name,
        color: action.color ?? '#64748b',
        collapsed: false,
        order: state.categories.length,
      };
      return { ...state, categories: [...state.categories, category] };
    }

    case 'UPDATE_CATEGORY':
      return { ...state, categories: state.categories.map(c => c.id === action.id ? { ...c, ...action.updates } : c) };

    case 'MOVE_CATEGORY': {
      const sorted = [...state.categories].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(c => c.id === action.id);
      if (idx === -1) return state;
      const newIdx = action.direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= sorted.length) return state;
      const reordered = reorder(sorted, idx, newIdx);
      return { ...state, categories: state.categories.map(c => reordered.find(r => r.id === c.id) ?? c) };
    }

    case 'DELETE_CATEGORY': {
      // Move all projects in this category to uncategorized
      const projects = state.projects.map(p =>
        p.categoryId === action.id ? { ...p, categoryId: null } : p
      );
      const categories = state.categories.filter(c => c.id !== action.id);
      // Navigate away if viewing a project that was in this category
      const movedProjIds = state.projects.filter(p => p.categoryId === action.id).map(p => p.id);
      const currentView = movedProjIds.some(id => state.currentView === `project:${id}`)
        ? 'today' : state.currentView;
      return { ...state, categories, projects, currentView };
    }

    // ── Projects ───────────────────────────────────────────────────────────────
    case 'CREATE_PROJECT': {
      const project = {
        id: action.id ?? `proj-${Date.now()}`,
        categoryId: action.categoryId ?? null,
        name: action.name,
        color: action.color ?? '#3b82f6',
        order: state.projects.filter(p => p.categoryId === action.categoryId).length,
      };
      return { ...state, projects: [...state.projects, project] };
    }

    case 'UPDATE_PROJECT':
      return { ...state, projects: state.projects.map(p => p.id === action.id ? { ...p, ...action.updates } : p) };

    case 'MOVE_PROJECT': {
      const catId = action.categoryId; // null = uncategorized
      const list = state.projects
        .filter(p => p.categoryId === catId)
        .sort((a, b) => a.order - b.order);
      const idx = list.findIndex(p => p.id === action.id);
      if (idx === -1) return state;
      const newIdx = action.direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= list.length) return state;
      const reordered = reorder(list, idx, newIdx);
      return { ...state, projects: state.projects.map(p => reordered.find(r => r.id === p.id) ?? p) };
    }

    case 'MOVE_PROJECT_TO_CATEGORY': {
      const targetCat = action.targetCategoryId; // null = uncategorized
      const targetCount = state.projects.filter(p => p.categoryId === targetCat).length;
      const projects = state.projects.map(p =>
        p.id === action.id ? { ...p, categoryId: targetCat, order: targetCount } : p
      );
      return { ...state, projects };
    }

    case 'DELETE_PROJECT': {
      // Move tasks to first uncategorized project, or keep them orphaned (hidden)
      const fallback = state.projects.find(p => p.categoryId === null && p.id !== action.id);
      const tasks = fallback
        ? state.tasks.map(t => t.projectId === action.id ? { ...t, projectId: fallback.id } : t)
        : state.tasks;
      const projects = state.projects.filter(p => p.id !== action.id);
      const currentView = state.currentView === `project:${action.id}` ? 'today' : state.currentView;
      return { ...state, projects, tasks, currentView };
    }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.updates } };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = {
    setView: (view) => dispatch({ type: 'SET_VIEW', view }),
    navigateToTask: (taskId, projectId) => dispatch({ type: 'NAVIGATE_TO_TASK', taskId, projectId }),
    clearPendingExpand: () => dispatch({ type: 'CLEAR_PENDING_EXPAND' }),
    // tasks
    createTask: (data) => dispatch({ type: 'CREATE_TASK', ...data }),
    updateTask: (id, updates) => dispatch({ type: 'UPDATE_TASK', id, updates }),
    deleteTask: (id) => dispatch({ type: 'DELETE_TASK', id }),
    restoreTask: (id) => dispatch({ type: 'RESTORE_TASK', id }),
    purgeTask: (id) => dispatch({ type: 'PURGE_TASK', id }),
    purgeAllDeleted: () => dispatch({ type: 'PURGE_ALL_DELETED' }),
    moveTask: (id, projectId, direction) => dispatch({ type: 'MOVE_TASK', id, projectId, direction }),
    // categories
    toggleCategory: (id) => dispatch({ type: 'TOGGLE_CATEGORY_COLLAPSE', id }),
    createCategory: (data) => dispatch({ type: 'CREATE_CATEGORY', ...data }),
    updateCategory: (id, updates) => dispatch({ type: 'UPDATE_CATEGORY', id, updates }),
    moveCategory: (id, direction) => dispatch({ type: 'MOVE_CATEGORY', id, direction }),
    deleteCategory: (id) => dispatch({ type: 'DELETE_CATEGORY', id }),
    // projects
    createProject: (data) => dispatch({ type: 'CREATE_PROJECT', ...data }),
    updateProject: (id, updates) => dispatch({ type: 'UPDATE_PROJECT', id, updates }),
    moveProject: (id, categoryId, direction) => dispatch({ type: 'MOVE_PROJECT', id, categoryId, direction }),
    moveProjectToCategory: (id, targetCategoryId) => dispatch({ type: 'MOVE_PROJECT_TO_CATEGORY', id, targetCategoryId }),
    deleteProject: (id) => dispatch({ type: 'DELETE_PROJECT', id }),
    // settings
    updateSettings: (updates) => dispatch({ type: 'UPDATE_SETTINGS', updates }),
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
