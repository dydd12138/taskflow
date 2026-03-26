import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { useApp } from '../store';
import TaskItem from '../components/TaskItem';
import KanbanBoard from '../components/KanbanBoard';
import NewTaskModal from '../components/NewTaskModal';
import AiPanel from '../components/AiPanel';

export default function ProjectView({ projectId }) {
  const { state, actions } = useApp();
  const [showAll, setShowAll] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
  const [expandedId, setExpandedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const quickRef = useRef(null);

  // Auto-expand task when navigating from calendar/week view
  const { pendingExpandTaskId } = state;
  useEffect(() => {
    if (pendingExpandTaskId) {
      setExpandedId(pendingExpandTaskId);
      actions.clearPendingExpand();
    }
  }, [pendingExpandTaskId]);

  const project = state.projects.find(p => p.id === projectId);
  if (!project) return <div className="p-8 text-slate-400">项目不存在</div>;

  const allTasks = state.tasks
    .filter(t => t.projectId === projectId && !t.deletedAt)
    .sort((a, b) => a.order - b.order);

  const visibleTasks = showAll ? allTasks : allTasks.filter(t => !t.completed);

  const handleQuickCreate = (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const dueDate = format(new Date(), "yyyy-MM-dd'T'23:59:00");
    actions.createTask({ projectId, title: quickTitle.trim(), dueDate });
    setQuickTitle('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ background: project.color }} />
            <h1 className="text-[22px] font-bold text-slate-800 dark:text-slate-100">{project.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              <button
                onClick={() => setShowAll(false)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors
                  ${!showAll ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >未完成</button>
              <button
                onClick={() => setShowAll(true)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors
                  ${showAll ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >全部</button>
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-md transition-colors
                  ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}
                title="列表视图"
              >
                <svg className={`w-3.5 h-3.5 ${viewMode === 'list' ? 'text-blue-500' : 'text-slate-400'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-2.5 py-1 rounded-md transition-colors
                  ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}
                title="看板视图"
              >
                <svg className={`w-3.5 h-3.5 ${viewMode === 'kanban' ? 'text-blue-500' : 'text-slate-400'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
            </div>

            {/* New task */}
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建任务
            </button>
          </div>
        </div>

      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* Task list / Kanban */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'list' ? (
            <div className="pb-2">
              {visibleTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <p className="text-sm">暂无任务</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {visibleTasks.map((task, idx) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isFirst={idx === 0}
                      isLast={idx === visibleTasks.length - 1}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                    />
                  ))}
                </div>
              )}

              {/* Quick create — lives below the task list */}
              <form onSubmit={handleQuickCreate} className="px-4 py-2 mt-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-600
                  bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/30 focus-within:border-solid
                  focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent focus-within:bg-white dark:focus-within:bg-slate-800
                  transition-colors">
                  <svg className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <input
                    ref={quickRef}
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="添加任务..."
                    className="flex-1 text-sm bg-transparent text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none"
                  />
                  {quickTitle && (
                    <kbd className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">↵</kbd>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <KanbanBoard tasks={visibleTasks} />
          )}
        </div>

        <AiPanel />
      </div>

      <NewTaskModal open={modalOpen} onClose={() => setModalOpen(false)} projectId={projectId} />
    </div>
  );
}
