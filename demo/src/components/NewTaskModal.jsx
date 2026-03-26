import { useState } from 'react';
import { format } from 'date-fns';
import Modal from './Modal';
import DateRangePicker from './DateRangePicker';
import { useApp } from '../context/AppContext';
import { PRIORITY_CONFIG } from '../data/mockData';

const todayDate = () => format(new Date(), 'yyyy-MM-dd');

const PRIORITY_CAPSULE_ON = {
  none:   'bg-slate-500 text-white',
  low:    'bg-green-500 text-white',
  medium: 'bg-orange-500 text-white',
  high:   'bg-red-500 text-white',
};

// Build ISO string from date + optional hour, allDay flag
function buildDateStr(date, allDay, hour, isEnd) {
  if (!date) return null;
  if (allDay) return `${date}T${isEnd ? '23:59' : '00:00'}:00`;
  return `${date}T${String(hour).padStart(2, '0')}:00:00`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function NewTaskModal({ open, onClose, projectId: projectIdProp }) {
  const { state, actions } = useApp();
  const [title, setTitle] = useState('');
  // When called from TodayView, projectIdProp is undefined — user must pick a project
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [timeType, setTimeType] = useState('due'); // 'due' | 'range'

  // Due date state
  const [dueDate, setDueDate] = useState(todayDate());
  const [dueAllDay, setDueAllDay] = useState(true);
  const [dueHour, setDueHour] = useState(9);

  // Range state
  const [rangeStart, setRangeStart] = useState(todayDate());
  const [rangeEnd, setRangeEnd]     = useState(todayDate());
  const [rangeAllDay, setRangeAllDay] = useState(true);
  const [rangeStartHour, setRangeStartHour] = useState(9);
  const [rangeEndHour, setRangeEndHour]     = useState(18);

  const [priority, setPriority] = useState('none');
  const [notes, setNotes] = useState('');

  const effectiveProjectId = projectIdProp ?? selectedProjectId;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !effectiveProjectId) return;

    if (timeType === 'due') {
      actions.createTask({
        projectId: effectiveProjectId,
        title: title.trim(),
        dueDate: buildDateStr(dueDate, dueAllDay, dueHour, true),
        startDate: null,
        endDate: null,
        priority,
        notes,
      });
    } else {
      actions.createTask({
        projectId: effectiveProjectId,
        title: title.trim(),
        dueDate: null,
        startDate: buildDateStr(rangeStart, rangeAllDay, rangeStartHour, false),
        endDate:   buildDateStr(rangeEnd || rangeStart, rangeAllDay, rangeEndHour, true),
        priority,
        notes,
      });
    }
    handleClose();
  };

  const handleClose = () => {
    setTitle(''); setTimeType('due');
    setDueDate(todayDate()); setDueAllDay(true); setDueHour(9);
    setRangeStart(todayDate()); setRangeEnd(todayDate());
    setRangeAllDay(true); setRangeStartHour(9); setRangeEndHour(18);
    setPriority('none'); setNotes('');
    setSelectedProjectId('');
    onClose();
  };

  // Build grouped project options (only when no projectId prop)
  const sortedCats = [...state.categories].sort((a, b) => a.order - b.order);
  const uncategorizedProjects = state.projects
    .filter(p => p.categoryId === null)
    .sort((a, b) => a.order - b.order);

  return (
    <Modal open={open} onClose={handleClose} title="新建任务" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project selector — only shown when not pre-assigned */}
        {!projectIdProp && (
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              所属项目 <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
                bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">选择项目...</option>
              {sortedCats.map(cat => {
                const catProjects = state.projects
                  .filter(p => p.categoryId === cat.id)
                  .sort((a, b) => a.order - b.order);
                if (catProjects.length === 0) return null;
                return (
                  <optgroup key={cat.id} label={cat.name}>
                    {catProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                );
              })}
              {uncategorizedProjects.length > 0 && (
                <optgroup label="未分类">
                  {uncategorizedProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">任务名称</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入任务名称..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Time type toggle */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">时间类型</label>
          <div className="flex gap-2 mb-3">
            {[['due', '截止时间'], ['range', '起止时间']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setTimeType(v)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors
                  ${timeType === v
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
              >{l}</button>
            ))}
          </div>

          {timeType === 'due' ? (
            <div className="space-y-2">
              {/* All-day toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">截止日期</span>
                <AllDayToggle value={dueAllDay} onChange={setDueAllDay} />
              </div>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {!dueAllDay && (
                <HourPicker label="截止时间" value={dueHour} onChange={setDueHour} />
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* All-day toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">选择日期区间</span>
                <AllDayToggle value={rangeAllDay} onChange={setRangeAllDay} />
              </div>
              {/* DateRangePicker */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700">
                <DateRangePicker
                  startDate={rangeStart}
                  endDate={rangeEnd}
                  onChange={({ startDate, endDate }) => {
                    if (startDate !== undefined) setRangeStart(startDate);
                    if (endDate !== undefined) setRangeEnd(endDate);
                  }}
                />
              </div>
              {!rangeAllDay && (
                <div className="flex gap-3">
                  <HourPicker label="开始时间" value={rangeStartHour} onChange={setRangeStartHour} />
                  <HourPicker label="结束时间" value={rangeEndHour} onChange={setRangeEndHour} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">优先级</label>
          <div className="flex gap-2">
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setPriority(k)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-full
                  ${priority === k
                    ? PRIORITY_CAPSULE_ON[k]
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
              >{k === 'none' ? '无' : v.label}</button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">备注</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="添加备注..." rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={handleClose}
            className="flex-1 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600
              text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            取消
          </button>
          <button type="submit" disabled={!title.trim() || !effectiveProjectId}
            className="flex-1 py-2 text-sm font-medium rounded-lg bg-blue-500 hover:bg-blue-600
              text-white transition-colors disabled:opacity-50">
            创建
          </button>
        </div>
      </form>
    </Modal>
  );
}

// All-day / specific time toggle
function AllDayToggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors
        ${value
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600'}`}
    >
      <span className={`w-3 h-3 rounded-full border transition-colors ${value ? 'bg-blue-500 border-blue-500' : 'border-slate-400'}`} />
      {value ? '全天' : '指定时间'}
    </button>
  );
}

// Hour picker
function HourPicker({ label, value, onChange }) {
  return (
    <div className="flex-1 flex items-center gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600
          bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        {HOURS.map(h => (
          <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
        ))}
      </select>
    </div>
  );
}
