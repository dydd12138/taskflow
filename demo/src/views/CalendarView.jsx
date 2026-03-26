import { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useApp } from '../context/AppContext';
import { parseTaskDate } from '../utils/dateUtils';

const locales = { 'zh-CN': zhCN };
const localizer = dateFnsLocalizer({
  format, parse,
  startOfWeek: (d) => startOfWeek(d, { weekStartsOn: 1 }),
  getDay, locales,
});

const messages = {
  allDay: '全天', previous: '上一页', next: '下一页', today: '今天',
  month: '月视图', week: '周视图', day: '日视图', agenda: '日程',
  date: '日期', time: '时间', event: '事件', noEventsInRange: '该时间段内没有任务',
  showMore: (count) => `+ ${count} 更多`,
};

export default function CalendarView() {
  const { state, actions } = useApp();
  const [view, setView] = useState('month');

  const events = useMemo(() => {
    return state.tasks
      .filter(t => !t.deletedAt)
      .map(task => {
        const proj = state.projects.find(p => p.id === task.projectId);
        const color = proj?.color ?? '#3b82f6';

        if (task.startDate && task.endDate) {
          const start = parseTaskDate(task.startDate);
          const end = parseTaskDate(task.endDate);
          if (!start || !end) return null;
          return { id: task.id, title: task.title, start, end, allDay: true, color, task, proj };
        }
        if (task.dueDate) {
          const d = parseTaskDate(task.dueDate);
          if (!d) return null;
          return { id: task.id, title: task.title, start: d, end: d, allDay: true, color, task, proj };
        }
        return null;
      })
      .filter(Boolean);
  }, [state.tasks, state.projects]);

  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: event.task.completed ? '#94a3b8' : event.color,
      opacity: event.task.completed ? 0.6 : 1,
      border: 'none',
      borderRadius: '4px',
      color: 'white',
      fontSize: '12px',
      padding: '1px 6px',
      cursor: 'pointer',
    },
  });

  // Tooltip content: show task name + project + notes
  const tooltipAccessor = (event) => {
    const parts = [event.task.title];
    if (event.proj) parts.push(`项目：${event.proj.name}`);
    if (event.task.notes) parts.push(`备注：${event.task.notes}`);
    return parts.join('\n');
  };

  const handleSelectEvent = (event) => {
    actions.navigateToTask(event.task.id, event.task.projectId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">日历</h1>
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
            {[['month', '月'], ['week', '周']].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors
                  ${view === v ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-4 overflow-hidden">
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          onView={setView}
          culture="zh-CN"
          messages={messages}
          eventPropGetter={eventStyleGetter}
          tooltipAccessor={tooltipAccessor}
          onSelectEvent={handleSelectEvent}
          style={{ height: '100%' }}
          toolbar={true}
          popup
        />
      </div>
    </div>
  );
}
