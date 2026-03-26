/**
 * Time utility functions — pure, testable.
 * Works with the frontend task shape (camelCase field names).
 */
import {
  parseISO, isToday as dateFnsIsToday, isBefore, isAfter,
  startOfDay, endOfDay, isWithinInterval, format,
} from 'date-fns'
import type { FETask } from '../store'

export function parseTaskDate(str: string | null | undefined): Date | null {
  if (!str) return null
  try { return parseISO(str) } catch { return null }
}

export function getTaskEffectiveDate(task: FETask): Date | null {
  if (task.dueDate)   return parseTaskDate(task.dueDate)
  if (task.endDate)   return parseTaskDate(task.endDate)
  if (task.startDate) return parseTaskDate(task.startDate)
  return null
}

export function isOverdue(task: FETask, today?: Date): boolean {
  if (task.completed) return false
  const ref = startOfDay(today ?? new Date())
  if (task.dueDate) {
    const d = parseTaskDate(task.dueDate)
    return !!d && isBefore(d, ref)
  }
  if (task.endDate) {
    const d = parseTaskDate(task.endDate)
    return !!d && isBefore(d, ref)
  }
  return false
}

export function isToday(dateStr: string, today?: Date): boolean {
  const d = parseTaskDate(dateStr)
  if (!d) return false
  return today ? format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') : dateFnsIsToday(d)
}

/** Computed kanban status derived from dates (not manual_status) */
export function getComputedStatus(task: FETask): 'not_started' | 'in_progress' | 'overdue' | 'completed' {
  if (task.completed) return 'completed'
  const now = new Date()
  const today = startOfDay(now)

  if (task.dueDate) {
    const due = parseTaskDate(task.dueDate)
    if (!due) return 'not_started'
    if (isBefore(due, today)) return 'overdue'
    if (dateFnsIsToday(due)) return 'in_progress'
    return 'not_started'
  }

  if (task.startDate && task.endDate) {
    const start = parseTaskDate(task.startDate)
    const end   = parseTaskDate(task.endDate)
    if (!start || !end) return 'not_started'
    if (isBefore(end, today)) return 'overdue'
    if (isAfter(start, now)) return 'not_started'
    return 'in_progress'
  }

  return 'not_started'
}

/** Human-readable date display for a task */
export function formatTaskTime(task: FETask): string {
  if (task.startDate && task.endDate) {
    const s = parseTaskDate(task.startDate)
    const e = parseTaskDate(task.endDate)
    if (!s || !e) return ''
    return `${format(s, 'M/d')} - ${format(e, 'M/d')}`
  }
  if (task.dueDate) {
    const d = parseTaskDate(task.dueDate)
    if (!d) return ''
    if (dateFnsIsToday(d)) return '今天'
    return format(d, 'M/d')
  }
  return ''
}

export function isExecutingToday(task: FETask): boolean {
  if (task.completed) return false
  if (!task.startDate || !task.endDate) return false
  const today = startOfDay(new Date())
  const s = parseTaskDate(task.startDate)
  const e = parseTaskDate(task.endDate)
  if (!s || !e) return false
  // startDate <= 今天 且 endDate > 今天（即结束于明天或更晚）
  return !isAfter(startOfDay(s), today) && isAfter(startOfDay(e), today)
}
