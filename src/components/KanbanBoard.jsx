import { useApp } from '../store';
import { getComputedStatus, formatDateDisplay, isOverdue } from '../utils/dateUtils';
import { PRIORITY_CONFIG } from '../data/mockData';

const COLUMNS = [
  { key: 'not_started', label: '未开始', color: 'text-slate-500', border: 'border-slate-200 dark:border-slate-600', dot: 'bg-slate-400' },
  { key: 'in_progress',  label: '进行中', color: 'text-blue-500',  border: 'border-blue-200 dark:border-blue-700',   dot: 'bg-blue-500'  },
  { key: 'overdue',      label: '已逾期', color: 'text-red-500',   border: 'border-red-200 dark:border-red-700',     dot: 'bg-red-500'   },
  { key: 'completed',    label: '已完成', color: 'text-green-500', border: 'border-green-200 dark:border-green-700', dot: 'bg-green-500' },
];

export default function KanbanBoard({ tasks, showProject = false, hideNotStarted = false }) {
  const { state } = useApp();

  const visibleColumns = hideNotStarted ? COLUMNS.filter(c => c.key !== 'not_started') : COLUMNS;

  const grouped = visibleColumns.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => getComputedStatus(t) === col.key);
    return acc;
  }, {});

  const getProjectName = (projectId) => {
    return state.projects.find(p => p.id === projectId)?.name ?? '';
  };

  return (
    <div className="flex gap-4 p-4 overflow-x-auto min-h-0 flex-1">
      {visibleColumns.map((col) => (
        <div key={col.key}
          className="flex-shrink-0 w-64 flex flex-col rounded-xl border border-slate-100 dark:border-slate-700
            bg-slate-50 dark:bg-slate-800/50"
        >
          {/* Column header */}
          <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${col.border}`}>
            <div className={`w-2 h-2 rounded-full ${col.dot}`} />
            <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
            <span className="ml-auto text-xs text-slate-400 bg-slate-200 dark:bg-slate-700
              px-1.5 py-0.5 rounded-full font-medium">
              {grouped[col.key].length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {grouped[col.key].map((task) => (
              <KanbanCard key={task.id} task={task}
                showProject={showProject}
                projectName={getProjectName(task.projectId)}
              />
            ))}
            {grouped[col.key].length === 0 && (
              <div className="text-center text-xs text-slate-300 dark:text-slate-600 py-6">暂无任务</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanCard({ task, showProject, projectName }) {
  const { actions } = useApp();
  const pCfg = PRIORITY_CONFIG[task.priority];
  const dateStr = formatDateDisplay(task);
  const overdue = isOverdue(task);

  return (
    <div className="kanban-card bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm
      border border-slate-100 dark:border-slate-700 cursor-default"
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => actions.updateTask(task.id, { completed: !task.completed })}
          className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center
            transition-all hover:scale-110
            ${task.completed ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-slate-500 hover:border-blue-400'}`}
        >
          {task.completed && (
            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2 6l3 3 5-5" />
            </svg>
          )}
        </button>
        <span className={`text-xs font-medium leading-relaxed
          ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}
        >
          {task.title}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1 items-center">
        {showProject && projectName && (
          <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
            {projectName}
          </span>
        )}
        {dateStr && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full
            ${overdue && !task.completed ? 'text-red-500 bg-red-50 dark:bg-red-900/30' : 'text-slate-400'}`}
          >
            {dateStr}
          </span>
        )}
        {task.priority !== 'none' && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${pCfg.color} ${pCfg.bg}`}>
            {pCfg.label}
          </span>
        )}
      </div>
    </div>
  );
}
