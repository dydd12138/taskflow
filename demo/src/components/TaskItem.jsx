import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '../data/mockData';
import { formatDateDisplay, isOverdue } from '../utils/dateUtils';
import DateRangePicker from './DateRangePicker';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function buildDateStr(date, allDay, hour, isEnd) {
  if (!date) return null;
  if (allDay) return `${date}T${isEnd ? '23:59' : '00:00'}:00`;
  return `${date}T${String(hour).padStart(2, '0')}:00:00`;
}

function parseHour(isoStr) {
  if (!isoStr) return 9;
  const match = isoStr.match(/T(\d{2}):/);
  return match ? parseInt(match[1], 10) : 9;
}

function isAllDay(isoStr) {
  if (!isoStr) return true;
  return isoStr.includes('T23:59') || isoStr.includes('T00:00');
}

// Priority → checkbox border color (uncompleted state)
const PRIORITY_BORDER = {
  high:   'border-red-400 dark:border-red-500',
  medium: 'border-orange-400 dark:border-orange-500',
  low:    'border-green-400 dark:border-green-500',
  none:   'border-slate-300 dark:border-slate-500',
};

// Priority → dot color for badge
const PRIORITY_DOT = {
  high:   'bg-red-500',
  medium: 'bg-orange-400',
  low:    'bg-green-500',
};

// Priority → selected capsule color in drawer/modal
const PRIORITY_CAPSULE_ON = {
  none:   'bg-slate-500 text-white',
  low:    'bg-green-500 text-white',
  medium: 'bg-orange-500 text-white',
  high:   'bg-red-500 text-white',
};
const PRIORITY_CAPSULE_OFF =
  'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300';

export default function TaskItem({
  task, showProject = false, projectName = '', isFirst = false, isLast = false,
  expandedId, setExpandedId,
}) {
  const { actions } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAbove, setMenuAbove] = useState(false);
  const menuBtnRef = useRef(null);
  const menuRef = useRef(null);

  const isExpanded = expandedId === task.id;
  const overdue = isOverdue(task);
  const dateStr = formatDateDisplay(task);
  const pCfg = PRIORITY_CONFIG[task.priority];

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const openMenu = () => {
    if (menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      setMenuAbove(window.innerHeight - rect.bottom < 220);
    }
    setMenuOpen(true);
  };

  const toggleComplete = (e) => {
    e.stopPropagation();
    actions.updateTask(task.id, { completed: !task.completed });
  };

  return (
    <div className={`group border-b border-slate-100 dark:border-slate-700/50 last:border-0
      border-l-[3px] ${isExpanded ? 'border-l-blue-500' : 'border-l-transparent'}`}
    >
      {/* Task row */}
      <div
        onClick={() => setExpandedId(isExpanded ? null : task.id)}
        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer
          transition-colors select-none
          ${isExpanded
            ? 'bg-[#F8F9FA] dark:bg-slate-700/50'
            : 'hover:bg-[#F8F9FA] dark:hover:bg-slate-700/40'}`}
      >
        {/* Checkbox — border color tracks priority */}
        <button
          onClick={toggleComplete}
          style={{ width: 18, height: 18 }}
          className={`flex-shrink-0 rounded-full border-2 flex items-center justify-center
            transition-all hover:scale-110
            ${task.completed
              ? 'bg-green-500 border-green-500'
              : PRIORITY_BORDER[task.priority] ?? PRIORITY_BORDER.none}`}
        >
          {task.completed && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2 6l3 3 5-5" />
            </svg>
          )}
        </button>

        {/* Title */}
        <span className={`flex-1 text-sm truncate
          ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
          {task.title}
        </span>

        {/* Project badge */}
        {showProject && projectName && (
          <span className="hidden sm:block text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700
            px-2 py-0.5 rounded-md truncate max-w-24">
            {projectName}
          </span>
        )}

        {/* Date badge */}
        {dateStr && (
          <span className={`text-xs px-2 py-0.5 rounded-md whitespace-nowrap
            ${overdue && !task.completed
              ? 'text-red-500 bg-red-50 dark:bg-red-900/30 font-semibold'
              : 'text-slate-400 dark:text-slate-500'}`}>
            {dateStr}
          </span>
        )}

        {/* Priority badge: dot + label */}
        {task.priority !== 'none' && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${pCfg.color} ${pCfg.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
            {pCfg.label}
          </span>
        )}

        {/* ⋯ menu */}
        <div className="relative flex-shrink-0" ref={menuRef} onClick={e => e.stopPropagation()}>
          <button
            ref={menuBtnRef}
            onClick={openMenu}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-300 dark:text-slate-600
              hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700
              opacity-0 group-hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>

          {menuOpen && (
            <div className={`absolute right-0 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-lg
              border border-slate-100 dark:border-slate-700 z-50 py-1 text-sm
              ${menuAbove ? 'bottom-7' : 'top-7'}`}>
              <div className="px-3 py-1">
                <span className="text-xs text-slate-400 font-medium">状态</span>
              </div>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <MenuItem key={k}
                  active={task.status === k}
                  onClick={() => { actions.updateTask(task.id, { status: k }); setMenuOpen(false); }}
                >{v.label}</MenuItem>
              ))}
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
              <MenuItem disabled={isFirst}
                onClick={() => { actions.moveTask(task.id, task.projectId, 'up'); setMenuOpen(false); }}
              >↑ 上移</MenuItem>
              <MenuItem disabled={isLast}
                onClick={() => { actions.moveTask(task.id, task.projectId, 'down'); setMenuOpen(false); }}
              >↓ 下移</MenuItem>
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
              <MenuItem danger onClick={() => { actions.deleteTask(task.id); setMenuOpen(false); }}>
                删除
              </MenuItem>
            </div>
          )}
        </div>
      </div>

      {/* Expanded drawer */}
      {isExpanded && (
        <TaskDrawer task={task} />
      )}
    </div>
  );
}

function MenuItem({ children, onClick, disabled, active, danger }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`w-full text-left px-3 py-1.5 text-xs
        ${disabled ? 'text-slate-300 dark:text-slate-600 cursor-default' : ''}
        ${danger && !disabled ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : ''}
        ${active ? 'text-blue-600 dark:text-blue-400' : ''}
        ${!disabled && !danger && !active ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700' : ''}
      `}
    >
      {children}
    </button>
  );
}

// ─── Inline Task Drawer ───────────────────────────────────────────────────────
function TaskDrawer({ task }) {
  const { actions } = useApp();
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [priority, setPriority] = useState(task.priority);

  const [timeType, setTimeType] = useState(task.dueDate ? 'due' : task.startDate ? 'range' : 'due');

  const [dueDate, setDueDate]     = useState(task.dueDate ? task.dueDate.substring(0, 10) : '');
  const [dueAllDay, setDueAllDay] = useState(isAllDay(task.dueDate));
  const [dueHour, setDueHour]     = useState(parseHour(task.dueDate));

  const [rangeStart, setRangeStart]         = useState(task.startDate ? task.startDate.substring(0, 10) : '');
  const [rangeEnd, setRangeEnd]             = useState(task.endDate ? task.endDate.substring(0, 10) : '');
  const [rangeAllDay, setRangeAllDay]       = useState(isAllDay(task.startDate));
  const [rangeStartHour, setRangeStartHour] = useState(parseHour(task.startDate));
  const [rangeEndHour, setRangeEndHour]     = useState(parseHour(task.endDate));

  const save = () => {
    actions.updateTask(task.id, {
      title: title.trim() || task.title,
      notes,
      priority,
      dueDate:   timeType === 'due'   ? buildDateStr(dueDate, dueAllDay, dueHour, true) : null,
      startDate: timeType === 'range' ? buildDateStr(rangeStart, rangeAllDay, rangeStartHour, false) : null,
      endDate:   timeType === 'range' ? buildDateStr(rangeEnd || rangeStart, rangeAllDay, rangeEndHour, true) : null,
    });
  };

  return (
    <div className="drawer-open border-t-2 border-t-blue-500
      bg-[#F8F9FA] dark:bg-slate-800/60
      border-b border-slate-200 dark:border-slate-700
      shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)]"
    >
      {/* Scrollable content */}
      <div className="px-5 py-4 max-h-[50vh] overflow-y-auto space-y-4">

        {/* Title */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">任务名称</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            className="w-full text-sm font-medium px-3 py-2 rounded-lg
              bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600
              text-slate-800 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
        </div>

        {/* Time type + Priority — two columns */}
        <div className="grid grid-cols-2 gap-4">
          {/* Time type */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">时间类型</label>
            <div className="flex gap-1">
              {[['due', '截止时间'], ['range', '起止时间']].map(([v, l]) => (
                <button key={v} type="button"
                  onClick={() => { setTimeType(v); setTimeout(save, 0); }}
                  className={`flex-1 py-1 text-xs rounded-md font-medium
                    ${timeType === v
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
                >{l === '截止时间' ? '截止' : '起止'}</button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">优先级</label>
            <div className="flex gap-1">
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <button key={k} type="button"
                  onClick={() => { setPriority(k); actions.updateTask(task.id, { priority: k }); }}
                  className={`flex-1 py-1 text-xs rounded-md font-medium
                    ${priority === k ? PRIORITY_CAPSULE_ON[k] : PRIORITY_CAPSULE_OFF}`}
                >{k === 'none' ? '无' : v.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Date fields */}
        {timeType === 'due' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-slate-400 dark:text-slate-500">截止日期</label>
              <DrawerAllDayToggle value={dueAllDay} onChange={(v) => { setDueAllDay(v); setTimeout(save, 0); }} />
            </div>
            <input type="date" value={dueDate}
              onChange={(e) => setDueDate(e.target.value)} onBlur={save}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600
                bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300
                focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {!dueAllDay && (
              <DrawerHourPicker label="截止时间" value={dueHour} onChange={(v) => { setDueHour(v); setTimeout(save, 0); }} />
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-slate-400 dark:text-slate-500">日期区间</label>
              <DrawerAllDayToggle value={rangeAllDay} onChange={(v) => { setRangeAllDay(v); setTimeout(save, 0); }} />
            </div>
            <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700">
              <DateRangePicker
                startDate={rangeStart}
                endDate={rangeEnd}
                onChange={({ startDate, endDate }) => {
                  if (startDate !== undefined) setRangeStart(startDate);
                  if (endDate !== undefined) setRangeEnd(endDate);
                  setTimeout(save, 0);
                }}
              />
            </div>
            {!rangeAllDay && (
              <div className="flex gap-2">
                <DrawerHourPicker label="开始" value={rangeStartHour} onChange={(v) => { setRangeStartHour(v); setTimeout(save, 0); }} />
                <DrawerHourPicker label="结束" value={rangeEndHour}   onChange={(v) => { setRangeEndHour(v);   setTimeout(save, 0); }} />
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1.5">备注</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={save}
            placeholder="添加备注..." rows={2}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300
              focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-2.5
        bg-[#F8F9FA] dark:bg-slate-800/60 flex items-center justify-between">
        <button
          onClick={save}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          保存
        </button>
        <button
          onClick={() => actions.deleteTask(task.id)}
          className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400"
        >
          删除任务
        </button>
      </div>
    </div>
  );
}

function DrawerAllDayToggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border
        ${value
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}
    >
      {value ? '全天' : '指定时间'}
    </button>
  );
}

function DrawerHourPicker({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-1.5 flex-1">
      <span className="text-xs text-slate-400 whitespace-nowrap">{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600
          bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300
          focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        {HOURS.map(h => (
          <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
        ))}
      </select>
    </div>
  );
}
