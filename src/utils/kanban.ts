/**
 * Kanban swim-lane grouping utility.
 * Extracts logic that was previously inline in KanbanBoard.jsx.
 */
import type { FETask } from '../store'
import { getComputedStatus } from './time'

export interface KanbanGroups {
  not_started: FETask[]
  in_progress:  FETask[]
  overdue:      FETask[]
  completed:    FETask[]
}

/**
 * Group tasks into kanban swim-lanes based on their computed (date-derived) status.
 * Completed tasks always land in the `completed` lane regardless of dates.
 */
export function groupTasksByKanban(tasks: FETask[]): KanbanGroups {
  const groups: KanbanGroups = {
    not_started: [],
    in_progress:  [],
    overdue:      [],
    completed:    [],
  }

  for (const task of tasks) {
    const lane = getComputedStatus(task)
    groups[lane].push(task)
  }

  return groups
}

/** Column metadata for rendering kanban columns */
export interface KanbanColumnMeta {
  key: keyof KanbanGroups
  label: string
  color: string
  emptyText: string
}

export const KANBAN_COLUMNS: KanbanColumnMeta[] = [
  { key: 'not_started', label: '未开始', color: 'text-slate-500',  emptyText: '暂无未开始任务' },
  { key: 'in_progress', label: '进行中', color: 'text-blue-500',   emptyText: '暂无进行中任务' },
  { key: 'overdue',     label: '已逾期', color: 'text-red-500',    emptyText: '暂无逾期任务'   },
  { key: 'completed',   label: '已完成', color: 'text-green-500',  emptyText: '暂无已完成任务' },
]
