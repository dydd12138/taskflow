import { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useApp } from '../store';
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

function CustomToolbar({ label, onNavigate, onView, view }) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onNavigate('PREV')}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400
            hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => onNavigate('TODAY')}
          className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300
            border border-slate-200 dark:border-slate-600
            hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          今天
        </button>
        <button
          onClick={() => onNavigate('NEXT')}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400
            hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="ml-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      </div>
      <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
        {[['month', '月'], ['week', '周'], ['day', '日'], ['agenda', '日程']].map(([v, l]) => (
          <button key={v} onClick={() => onView(v)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors
              ${view === v
                ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >{l}</button>
        ))}
      </div>
    </div>
  );
}

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

  const dayPropGetter = (date) => {
    const d = date.getDay(); // 0=Sunday, 6=Saturday
    if (d === 0 || d === 6) {
      return { style: { backgroundColor: 'rgba(148,163,184,0.07)' } };
    }
    return {};
  };

  // 天/周视图：8-18点为工作时间（较亮），其余时段略暗
  const slotPropGetter = (date) => {
    const h = date.getHours();
    if (h < 8 || h >= 18) {
      return { style: { backgroundColor: 'rgba(148,163,184,0.08)' } };
    }
    return {};
  };

  // 修正时间显示：统一用24小时制，避免 "上午12:00" 误显
  const formats = {
    timeGutterFormat: (date, culture, localizer) =>
      localizer.format(date, 'HH:mm', culture),
    eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
      `${localizer.format(start, 'HH:mm', culture)} – ${localizer.format(end, 'HH:mm', culture)}`,
    agendaTimeFormat: (date, culture, localizer) =>
      localizer.format(date, 'HH:mm', culture),
    agendaTimeRangeFormat: ({ start, end }, culture, localizer) =>
      `${localizer.format(start, 'HH:mm', culture)} – ${localizer.format(end, 'HH:mm', culture)}`,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">日历</h1>
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
          dayPropGetter={dayPropGetter}
          slotPropGetter={slotPropGetter}
          formats={formats}
          components={{ toolbar: CustomToolbar }}
          style={{ height: '100%' }}
          popup
        />
      </div>
    </div>
  );
}
