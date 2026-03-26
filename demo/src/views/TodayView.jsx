import { useState } from 'react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { useApp } from '../context/AppContext';
import TaskItem from '../components/TaskItem';
import KanbanBoard from '../components/KanbanBoard';
import AiPanel from '../components/AiPanel';
import NewTaskModal from '../components/NewTaskModal';
import { parseTaskDate, isExecutingToday } from '../utils/dateUtils';

export default function TodayView() {
  const { state } = useApp();
  const [viewMode, setViewMode] = useState('list');
  const [expandedId, setExpandedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const today = startOfDay(new Date());
  const activeTasks = state.tasks.filter(t => !t.deletedAt);

  const dueTodayTasks = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    const d = parseTaskDate(t.dueDate);
    return d && isToday(d);
  });

  const overdueTasks = activeTasks.filter(t => {
    if (t.completed) return false;
    if (t.dueDate) {
      const d = parseTaskDate(t.dueDate);
      return d && isBefore(d, today);
    }
    if (t.endDate) {
      const d = parseTaskDate(t.endDate);
      return d && isBefore(d, today);
    }
    return false;
  });

  const executingTasks = activeTasks.filter(t => {
    if (!t.startDate || !t.endDate) return false;
    return isExecutingToday(t) && !dueTodayTasks.includes(t) && !overdueTasks.includes(t);
  });

  const getProjectName = (projectId) =>
    state.projects.find(p => p.id === projectId)?.name ?? '';

  const allTodayTasks = [...new Set([...dueTodayTasks, ...overdueTasks, ...executingTasks])];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-slate-800 dark:text-slate-100">今天</h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
              {format(new Date(), 'yyyy年M月d日')}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              <ViewBtn mode="list" current={viewMode} set={setViewMode} />
              <ViewBtn mode="kanban" current={viewMode} set={setViewMode} />
            </div>
          </div>
        </div>
        {/* Stats */}
        <div className="flex gap-4 mt-3">
          <Stat label="今日截止" count={dueTodayTasks.length} color="text-blue-500" />
          <Stat label="已逾期" count={overdueTasks.length} color="text-red-500" />
          <Stat label="执行中" count={executingTasks.length} color="text-amber-500" />
        </div>
      </div>

      {/* Body: content + AI panel */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'kanban' ? (
            <KanbanBoard tasks={allTodayTasks} showProject />
          ) : (
            <div>
              <Section title="今日截止" tasks={dueTodayTasks} accent="blue"
                expandedId={expandedId} setExpandedId={setExpandedId}
                getProjectName={getProjectName} emptyText="今天没有截止的任务" />
              <Section title="已逾期" tasks={overdueTasks} accent="red"
                expandedId={expandedId} setExpandedId={setExpandedId}
                getProjectName={getProjectName} emptyText="没有逾期任务" />
              <Section title="执行中" tasks={executingTasks} accent="amber"
                expandedId={expandedId} setExpandedId={setExpandedId}
                getProjectName={getProjectName} emptyText="没有正在执行的任务" />
            </div>
          )}
        </div>
        <AiPanel />
      </div>

      <NewTaskModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function ViewBtn({ mode, current, set }) {
  const active = current === mode;
  return (
    <button onClick={() => set(mode)}
      className={`px-2.5 py-1 rounded-md transition-colors ${active ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}
    >
      {mode === 'list' ? (
        <svg className={`w-3.5 h-3.5 ${active ? 'text-blue-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ) : (
        <svg className={`w-3.5 h-3.5 ${active ? 'text-blue-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      )}
    </button>
  );
}

function Stat({ label, count, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-lg font-bold ${color}`}>{count}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

function Section({ title, tasks, expandedId, setExpandedId, getProjectName, emptyText, accent }) {
  const labelColors = {
    blue:  'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30',
    red:   'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
    amber: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30',
  };
  const countColors = {
    blue:  'text-blue-500 bg-blue-100 dark:bg-blue-900/50',
    red:   'text-red-500 bg-red-100 dark:bg-red-900/50',
    amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/50',
  };
  const borders = {
    blue: 'border-slate-100 dark:border-slate-700/50',
    red:  'border-slate-100 dark:border-slate-700/50',
    amber:'border-slate-100 dark:border-slate-700/50',
  };
  return (
    <div className="mb-1">
      <div className={`px-6 py-2 flex items-center gap-2 border-b ${borders[accent]} bg-white dark:bg-slate-900`}>
        <span className={`text-[13px] font-semibold px-2 py-0.5 rounded-md ${labelColors[accent]}`}>{title}</span>
        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${countColors[accent]}`}>
          {tasks.length}
        </span>
      </div>
      {tasks.length === 0 ? (
        <div className="px-6 py-4 text-sm text-slate-400">{emptyText}</div>
      ) : (
        tasks.map((task, idx) => (
          <TaskItem key={task.id} task={task} showProject
            projectName={getProjectName(task.projectId)}
            isFirst={idx === 0} isLast={idx === tasks.length - 1}
            expandedId={expandedId} setExpandedId={setExpandedId}
          />
        ))
      )}
    </div>
  );
}
