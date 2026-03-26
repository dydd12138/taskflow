import { useState } from 'react';
import { useApp } from '../store';
import TaskItem from '../components/TaskItem';
import KanbanBoard from '../components/KanbanBoard';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '../data/mockData';

export default function AllTasksView() {
  const { state } = useApp();
  const [viewMode, setViewMode] = useState('list');
  const [expandedId, setExpandedId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCompleted, setShowCompleted] = useState(true);

  const activeTasks = state.tasks.filter(t => !t.deletedAt);

  // 分类筛选：找出属于该分类的所有项目 id
  const projectIdsInCategory = filterCategory === 'all'
    ? null
    : filterCategory === '__uncategorized__'
      ? state.projects.filter(p => p.categoryId === null).map(p => p.id)
      : state.projects.filter(p => p.categoryId === Number(filterCategory)).map(p => p.id);

  const filtered = activeTasks.filter(t => {
    if (!showCompleted && t.completed) return false;
    if (projectIdsInCategory !== null && !projectIdsInCategory.includes(t.projectId)) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => {
    // Sort by project, then order
    if (a.projectId !== b.projectId) {
      const projOrder = state.projects.findIndex(p => p.id === a.projectId) -
                       state.projects.findIndex(p => p.id === b.projectId);
      if (projOrder !== 0) return projOrder;
    }
    return a.order - b.order;
  });

  const getProjectName = (id) => state.projects.find(p => p.id === id)?.name ?? '';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">所有任务</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">{filtered.length} 条任务</span>
            {/* View toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              <button onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}>
                <svg className={`w-3.5 h-3.5 ${viewMode === 'list' ? 'text-blue-500' : 'text-slate-400'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button onClick={() => setViewMode('kanban')}
                className={`px-2.5 py-1 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}>
                <svg className={`w-3.5 h-3.5 ${viewMode === 'kanban' ? 'text-blue-500' : 'text-slate-400'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Category filter */}
          <Select
            value={filterCategory}
            onChange={setFilterCategory}
            options={[
              { value: 'all', label: '所有分类' },
              ...[...state.categories].sort((a, b) => a.order - b.order).map(c => ({ value: String(c.id), label: c.name })),
              { value: '__uncategorized__', label: '未分类' },
            ]}
          />

          {/* Priority filter */}
          <Select
            value={filterPriority}
            onChange={setFilterPriority}
            options={[
              { value: 'all', label: '所有优先级' },
              ...Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({ value: k, label: v.label + '优先级' })),
            ]}
          />

          {/* Status filter */}
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: 'all', label: '所有状态' },
              ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
            ]}
          />

          {/* Completed toggle */}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
              ${showCompleted
                ? 'border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
          >
            {showCompleted ? '隐藏已完成' : '显示已完成'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'kanban' ? (
          <KanbanBoard tasks={filtered} showProject />
        ) : (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">没有匹配的任务</p>
            </div>
          ) : (
            // Group by project
            state.projects
              .map(proj => ({
                project: proj,
                tasks: filtered.filter(t => t.projectId === proj.id),
              }))
              .filter(g => g.tasks.length > 0)
              .map(({ project, tasks }) => (
                <div key={project.id}>
                  <div className="px-6 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700
                    flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: project.color }} />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{project.name}</span>
                    <span className="text-xs text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                      {tasks.length}
                    </span>
                  </div>
                  {tasks.map((task, idx) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      showProject={false}
                      projectName={getProjectName(task.projectId)}
                      isFirst={idx === 0}
                      isLast={idx === tasks.length - 1}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                    />
                  ))}
                </div>
              ))
          )
        )}
      </div>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600
        bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300
        focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
