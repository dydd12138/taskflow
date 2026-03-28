import { useState, useRef } from 'react';
import { format, isToday } from 'date-fns';
import { useApp } from '../store';
import { getWeekDays, taskOverlapsWeek, getTaskDaySpan, formatWeekRange } from '../utils/dateUtils';
import { PRIORITY_CONFIG } from '../data/mockData';
import AiPanel from '../components/AiPanel';

const CN_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export default function WeekView() {
  const { state, actions } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);
  const [tooltip, setTooltip] = useState(null); // { task, project, x, y }

  const weekDays = getWeekDays(weekOffset);
  const weekRange = formatWeekRange(weekDays);
  const activeTasks = state.tasks.filter(t => !t.deletedAt);

  const projectGroups = state.projects
    .map(proj => ({
      project: proj,
      tasks: activeTasks
        .filter(t => t.projectId === proj.id && taskOverlapsWeek(t, weekDays))
        .sort((a, b) => getTaskDaySpan(a, weekDays).startIdx - getTaskDaySpan(b, weekDays).startIdx),
    }))
    .filter(g => g.tasks.length > 0);

  const handleTaskClick = (task) => {
    actions.navigateToTask(task.id, task.projectId);
  };

  const handleTaskMouseEnter = (e, task, project) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ task, project, x: rect.left, y: rect.bottom + 4 });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-slate-800 dark:text-slate-100">本周</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={() => setWeekOffset(0)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors
                ${weekOffset === 0
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
            >本周</button>
            <button onClick={() => setWeekOffset(w => w + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">{weekRange}</span>
          </div>
        </div>
      </div>

      {/* Body: Gantt + AI panel */}
      <div className="flex flex-1 min-h-0">
        {/* Gantt */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-[600px]">
            {/* Day headers */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="w-36 flex-shrink-0 px-4 py-3 border-r border-slate-100 dark:border-slate-700" />
              {weekDays.map((day, idx) => {
                const isWeekend = idx === 5 || idx === 6;
                return (
                  <div key={day.toISOString()}
                    className={`flex-1 px-2 py-3 text-center border-r border-slate-100 dark:border-slate-700 last:border-0
                      ${isToday(day) ? 'bg-blue-50 dark:bg-blue-900/20' : isWeekend ? 'bg-rose-50/60 dark:bg-rose-900/10' : ''}`}
                  >
                    <div className={`text-xs font-semibold
                      ${isToday(day) ? 'text-blue-500' : isWeekend ? 'text-rose-400 dark:text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>
                      {CN_DAYS[idx]}
                    </div>
                    <div className={`text-sm font-bold mt-0.5
                      ${isToday(day) ? 'text-blue-600 dark:text-blue-400' : isWeekend ? 'text-rose-500 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Project groups */}
            {projectGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">本周没有任务</p>
              </div>
            ) : (
              projectGroups.map(({ project, tasks }) => (
                <div key={project.id} className="border-b border-slate-100 dark:border-slate-700">
                  {/* Project header row */}
                  <div className="flex bg-[#F8F9FA] dark:bg-slate-800/70">
                    <div className="w-36 flex-shrink-0 px-4 py-2 border-r border-slate-100 dark:border-slate-700 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{project.name}</span>
                    </div>
                    {weekDays.map((day, idx) => {
                      const isWeekend = idx === 5 || idx === 6;
                      return (
                        <div key={day.toISOString()}
                          className={`flex-1 border-r border-slate-100 dark:border-slate-700 last:border-0
                            ${isToday(day) ? 'bg-blue-50/50 dark:bg-blue-900/10' : isWeekend ? 'bg-rose-50/40 dark:bg-rose-900/10' : ''}`}
                        />
                      );
                    })}
                  </div>

                  {/* Task rows */}
                  {tasks.map((task) => {
                    const { startIdx, endIdx } = getTaskDaySpan(task, weekDays);
                    const span = endIdx - startIdx + 1;

                    return (
                      <div key={task.id} className="flex group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="w-36 flex-shrink-0 px-4 py-1.5 border-r border-slate-100 dark:border-slate-700 flex items-center">
                          <span className={`text-xs truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                            {task.title}
                          </span>
                        </div>
                        <div className="flex-1 flex relative">
                          {weekDays.map((day, dayIdx) => {
                            const isWeekend = dayIdx === 5 || dayIdx === 6;
                            return (
                            <div key={day.toISOString()}
                              className={`flex-1 border-r border-slate-100 dark:border-slate-700 last:border-0 py-1.5 px-0.5 relative
                                ${isToday(day) ? 'bg-blue-50/30 dark:bg-blue-900/10' : isWeekend ? 'bg-rose-50/30 dark:bg-rose-900/8' : ''}`}
                            >
                              {dayIdx === startIdx && (
                                <div
                                  className="absolute inset-y-1 rounded-md flex items-center px-2 overflow-hidden cursor-pointer
                                    hover:brightness-110 hover:shadow-md transition-all"
                                  style={{
                                    left: '2px',
                                    width: `calc(${span * 100}% - 4px)`,
                                    background: task.completed ? '#94a3b8' : project.color,
                                    opacity: task.completed ? 0.5 : 0.85,
                                  }}
                                  onClick={() => handleTaskClick(task)}
                                  onMouseEnter={(e) => handleTaskMouseEnter(e, task, project)}
                                  onMouseLeave={() => setTooltip(null)}
                                >
                                  <span className="text-white text-xs font-medium truncate leading-none">
                                    {task.title}
                                  </span>
                                  {task.priority !== 'none' && (
                                    <span className="ml-1 flex-shrink-0 text-white/70 text-xs">
                                      {task.priority === 'high' ? '!!!' : task.priority === 'medium' ? '!!' : '!'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        <AiPanel
          contextType="week"
          contextId={format(weekDays[0], 'yyyy-MM-dd')}
          contextLabel="本周"
        />
      </div>

      {/* Task tooltip */}
      {tooltip && (
        <TaskTooltip tooltip={tooltip} />
      )}
    </div>
  );
}

function TaskTooltip({ tooltip }) {
  const { task, project, x, y } = tooltip;
  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: Math.min(x, window.innerWidth - 260), top: y }}
    >
      <div className="bg-slate-800 dark:bg-slate-700 text-white rounded-lg shadow-xl p-3 w-56">
        <div className="flex items-start gap-2 mb-2">
          <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: project.color }} />
          <div>
            <div className="text-xs font-semibold leading-snug">{task.title}</div>
            <div className="text-xs text-slate-300 mt-0.5">{project.name}</div>
          </div>
        </div>
        {task.notes && (
          <div className="text-xs text-slate-400 border-t border-slate-600 pt-2 line-clamp-2">
            {task.notes}
          </div>
        )}
        <div className="text-xs text-blue-300 mt-1.5">点击查看详情 →</div>
      </div>
    </div>
  );
}
