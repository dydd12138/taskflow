import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useApp } from '../store';

export default function DeletedView() {
  const { state, actions } = useApp();
  const [confirmClear, setConfirmClear] = useState(false);

  const getProjectName = (id) => state.projects.find(p => p.id === id)?.name ?? '未知项目';

  const sortedDeleted = [...state.deletedTasks].sort((a, b) => {
    const aTime = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
    const bTime = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
    return bTime - aTime;
  });

  const formatDeleted = (str) => {
    if (!str) return '-';
    try { return format(parseISO(str), 'MM-dd HH:mm'); } catch { return '-'; }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">已删除</h1>
            <p className="text-sm text-slate-400 mt-0.5">{sortedDeleted.length} 条已删除任务</p>
          </div>
          {sortedDeleted.length > 0 && (
            confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">确认清空所有？</span>
                <button
                  onClick={() => { actions.purgeAllDeleted(); setConfirmClear(false); }}
                  className="px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >确认</button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg"
                >取消</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-700
                  text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                清空已删除
              </button>
            )
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {sortedDeleted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <p className="text-sm">暂无已删除任务</p>
          </div>
        ) : (
          <div>
            {sortedDeleted.map((task) => (
              <div key={task.id}
                className="flex items-center gap-4 px-6 py-3 border-b border-slate-100 dark:border-slate-700
                  hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors"
              >
                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400 line-through truncate">
                      {task.title}
                    </span>
                    {task.completed && (
                      <span className="flex-shrink-0 text-xs text-green-500 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                        已完成
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      项目：{getProjectName(task.projectId)}
                    </span>
                    <span className="text-xs text-slate-300 dark:text-slate-600">
                      删除于 {formatDeleted(task.deletedAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => actions.restoreTask(task.id)}
                    className="px-3 py-1 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-700
                      text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    恢复
                  </button>
                  <button
                    onClick={() => actions.purgeTask(task.id)}
                    className="px-3 py-1 text-xs font-medium rounded-lg border border-red-200 dark:border-red-700
                      text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    彻底删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
