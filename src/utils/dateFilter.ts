/**
 * Date-based task filter utilities.
 * Extracts logic from TodayView and WeekView into pure, reusable functions.
 */
import {
  parseISO, isToday, isBefore, isAfter,
  startOfDay, endOfDay, isWithinInterval,
  startOfWeek, addDays, format,
} from 'date-fns'
import type { FETask } from '../store'
import { parseTaskDate, isExecutingToday } from './time'

// ── Today ────────────────────────────────────────────────────────────────────

export interface TodayGroups {
  dueTodayTasks:   FETask[]
  overdueTasks:    FETask[]
  inProgressTasks: FETask[]
}

/**
 * Split active tasks into today/overdue/in-progress groups.
 * A task cannot appear in more than one group (earlier groups take priority).
 */
export function filterTodayTasks(tasks: FETask[], today?: Date): TodayGroups {
  const ref = startOfDay(today ?? new Date())

  const dueTodayTasks = tasks.filter(t => {
    if (t.dueDate) {
      const d = parseTaskDate(t.dueDate)
      return d ? isToday(d) : false
    }
    if (t.endDate) {
      const d = parseTaskDate(t.endDate)
      return d ? isToday(d) : false
    }
    return false
  })

  const overdueTasks = tasks.filter(t => {
    if (t.completed) return false
    if (t.dueDate) {
      const d = parseTaskDate(t.dueDate)
      return d && isBefore(d, ref)
    }
    if (t.endDate) {
      const d = parseTaskDate(t.endDate)
      return d && isBefore(d, ref)
    }
    return false
  })

  const inProgressTasks = tasks.filter(t => {
    if (!t.startDate || !t.endDate) return false
    if (dueTodayTasks.includes(t)) return false
    if (overdueTasks.includes(t)) return false
    return isExecutingToday(t)
  })

  return { dueTodayTasks, overdueTasks, inProgressTasks }
}

// ── Week ─────────────────────────────────────────────────────────────────────

export function getWeekDays(weekOffset = 0): Date[] {
  const now = addDays(new Date(), weekOffset * 7)
  const start = startOfWeek(now, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function taskOverlapsWeek(task: FETask, weekDays: Date[]): boolean {
  const weekStart = startOfDay(weekDays[0])
  const weekEnd   = endOfDay(weekDays[6])

  if (task.startDate && task.endDate) {
    const s = parseTaskDate(task.startDate)
    const e = parseTaskDate(task.endDate)
    if (!s || !e) return false
    return !isAfter(s, weekEnd) && !isBefore(e, weekStart)
  }
  if (task.dueDate) {
    const d = parseTaskDate(task.dueDate)
    if (!d) return false
    return isWithinInterval(startOfDay(d), { start: weekStart, end: weekEnd })
  }
  return false
}

export interface DaySpan { startIdx: number; endIdx: number }

export function getTaskDaySpan(task: FETask, weekDays: Date[]): DaySpan {
  const weekStart = startOfDay(weekDays[0])
  const weekEnd   = endOfDay(weekDays[6])

  if (task.startDate && task.endDate) {
    const s = parseTaskDate(task.startDate)
    const e = parseTaskDate(task.endDate)
    if (!s || !e) return { startIdx: 0, endIdx: 0 }
    const clampedStart = isAfter(s, weekStart) ? s : weekStart
    const clampedEnd   = isBefore(e, weekEnd)  ? e : weekEnd
    const startIdx = weekDays.findIndex(d =>
      format(d, 'yyyy-MM-dd') === format(startOfDay(clampedStart), 'yyyy-MM-dd')
    )
    const endIdx = weekDays.findIndex(d =>
      format(d, 'yyyy-MM-dd') === format(startOfDay(clampedEnd), 'yyyy-MM-dd')
    )
    return { startIdx: Math.max(0, startIdx), endIdx: Math.max(0, endIdx) }
  }
  if (task.dueDate) {
    const d = parseTaskDate(task.dueDate)
    if (!d) return { startIdx: 0, endIdx: 0 }
    const idx = weekDays.findIndex(day =>
      format(day, 'yyyy-MM-dd') === format(startOfDay(d), 'yyyy-MM-dd')
    )
    return { startIdx: Math.max(0, idx), endIdx: Math.max(0, idx) }
  }
  return { startIdx: 0, endIdx: 0 }
}

export function filterWeekTasks(tasks: FETask[], weekDays: Date[]): FETask[] {
  return tasks.filter(t => taskOverlapsWeek(t, weekDays))
}

export function formatWeekRange(weekDays: Date[]): string {
  if (!weekDays.length) return ''
  return `${format(weekDays[0], 'yyyy年M月d日')} - ${format(weekDays[6], 'M月d日')}`
}
