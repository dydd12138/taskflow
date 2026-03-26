import { parseISO, isToday, isThisWeek, isBefore, isAfter, startOfDay, endOfDay,
  startOfWeek, endOfWeek, format, addDays, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function parseTaskDate(str) {
  if (!str) return null;
  try { return parseISO(str); } catch { return null; }
}

export function getTaskEffectiveDate(task) {
  // Returns the primary date for display and sorting
  if (task.dueDate) return parseTaskDate(task.dueDate);
  if (task.endDate) return parseTaskDate(task.endDate);
  if (task.startDate) return parseTaskDate(task.startDate);
  return null;
}

export function isOverdue(task) {
  if (task.completed) return false;
  const today = startOfDay(new Date());
  if (task.dueDate) {
    const d = parseTaskDate(task.dueDate);
    return d && isBefore(d, today);
  }
  if (task.endDate) {
    const d = parseTaskDate(task.endDate);
    return d && isBefore(d, today);
  }
  return false;
}

export function getComputedStatus(task) {
  // Status computed from dates (for kanban)
  if (task.completed) return 'completed';
  const now = new Date();
  const today = startOfDay(now);

  if (task.dueDate) {
    const due = parseTaskDate(task.dueDate);
    if (!due) return 'not_started';
    if (isBefore(due, today)) return 'overdue';
    if (isToday(due)) return 'in_progress';
    return 'not_started';
  }

  if (task.startDate && task.endDate) {
    const start = parseTaskDate(task.startDate);
    const end = parseTaskDate(task.endDate);
    if (!start || !end) return 'not_started';
    if (isBefore(end, today)) return 'overdue';
    if (isAfter(start, now)) return 'not_started';
    return 'in_progress';
  }

  return 'not_started';
}

export function formatDateDisplay(task) {
  if (task.startDate && task.endDate) {
    const s = parseTaskDate(task.startDate);
    const e = parseTaskDate(task.endDate);
    if (!s || !e) return '';
    return `${format(s, 'M/d')} - ${format(e, 'M/d')}`;
  }
  if (task.dueDate) {
    const d = parseTaskDate(task.dueDate);
    if (!d) return '';
    if (isToday(d)) return '今天';
    return format(d, 'M/d');
  }
  return '';
}

export function isTodayTask(task) {
  const today = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  if (task.dueDate) {
    const d = parseTaskDate(task.dueDate);
    return d && isToday(d);
  }
  if (task.startDate && task.endDate) {
    const s = parseTaskDate(task.startDate);
    const e = parseTaskDate(task.endDate);
    if (!s || !e) return false;
    return isWithinInterval(today, { start: startOfDay(s), end: endOfDay(e) });
  }
  return false;
}

export function isExecutingToday(task) {
  if (task.completed) return false;
  if (!task.startDate || !task.endDate) return false;
  const today = new Date();
  const s = parseTaskDate(task.startDate);
  const e = parseTaskDate(task.endDate);
  if (!s || !e) return false;
  return isWithinInterval(startOfDay(today), { start: startOfDay(s), end: endOfDay(e) });
}

export function getWeekDays(weekOffset = 0) {
  const now = addDays(new Date(), weekOffset * 7);
  const start = startOfWeek(now, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function taskOverlapsWeek(task, weekDays) {
  const weekStart = startOfDay(weekDays[0]);
  const weekEnd = endOfDay(weekDays[6]);

  if (task.startDate && task.endDate) {
    const s = parseTaskDate(task.startDate);
    const e = parseTaskDate(task.endDate);
    if (!s || !e) return false;
    return !isAfter(s, weekEnd) && !isBefore(e, weekStart);
  }
  if (task.dueDate) {
    const d = parseTaskDate(task.dueDate);
    if (!d) return false;
    return isWithinInterval(startOfDay(d), { start: weekStart, end: weekEnd });
  }
  return false;
}

export function getTaskDaySpan(task, weekDays) {
  const weekStart = startOfDay(weekDays[0]);
  const weekEnd = endOfDay(weekDays[6]);

  if (task.startDate && task.endDate) {
    const s = parseTaskDate(task.startDate);
    const e = parseTaskDate(task.endDate);
    if (!s || !e) return { startIdx: 0, endIdx: 0 };
    const clampedStart = isAfter(s, weekStart) ? s : weekStart;
    const clampedEnd = isBefore(e, weekEnd) ? e : weekEnd;
    const startIdx = weekDays.findIndex(d =>
      format(d, 'yyyy-MM-dd') === format(startOfDay(clampedStart), 'yyyy-MM-dd')
    );
    const endIdx = weekDays.findIndex(d =>
      format(d, 'yyyy-MM-dd') === format(startOfDay(clampedEnd), 'yyyy-MM-dd')
    );
    return { startIdx: Math.max(0, startIdx), endIdx: Math.max(0, endIdx) };
  }
  if (task.dueDate) {
    const d = parseTaskDate(task.dueDate);
    if (!d) return { startIdx: 0, endIdx: 0 };
    const idx = weekDays.findIndex(day =>
      format(day, 'yyyy-MM-dd') === format(startOfDay(d), 'yyyy-MM-dd')
    );
    return { startIdx: Math.max(0, idx), endIdx: Math.max(0, idx) };
  }
  return { startIdx: 0, endIdx: 0 };
}

export function formatWeekRange(weekDays) {
  if (!weekDays.length) return '';
  const s = weekDays[0];
  const e = weekDays[6];
  return `${format(s, 'yyyy年M月d日')} - ${format(e, 'M月d日')}`;
}
