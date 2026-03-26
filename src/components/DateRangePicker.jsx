import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek,
  isSameMonth, isSameDay, isAfter, isBefore, addMonths, subMonths, parseISO, getDay
} from 'date-fns';

function getDaysView(month) {
  const viewStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const viewEnd   = endOfWeek(endOfMonth(month),   { weekStartsOn: 1 });
  return eachDayOfInterval({ start: viewStart, end: viewEnd });
}

/**
 * DateRangePicker
 * Props:
 *   startDate: 'YYYY-MM-DD' | ''
 *   endDate:   'YYYY-MM-DD' | ''
 *   onChange:  ({ startDate, endDate }) => void
 */
export default function DateRangePicker({ startDate, endDate, onChange }) {
  const today = new Date();

  const parseDate = (s) => {
    if (!s) return null;
    try { return parseISO(s); } catch { return null; }
  };

  const [displayMonth, setDisplayMonth] = useState(() => {
    const d = parseDate(startDate);
    return startOfMonth(d ?? today);
  });
  const [hoverDate, setHoverDate] = useState(null);
  // phase: 'start' = waiting for first click, 'end' = waiting for second click
  const [phase, setPhase] = useState(startDate ? 'end' : 'start');

  const start = parseDate(startDate);
  const end   = parseDate(endDate);

  const handleDayClick = (day) => {
    const s = format(day, 'yyyy-MM-dd');
    if (phase === 'start') {
      onChange({ startDate: s, endDate: '' });
      setPhase('end');
    } else {
      if (start && isBefore(day, start)) {
        onChange({ startDate: s, endDate: startDate });
      } else {
        onChange({ startDate, endDate: s });
      }
      setPhase('start');
    }
  };

  const effectiveEnd = (phase === 'end' && hoverDate) ? hoverDate : end;

  // Ordered range bounds — lo is always earlier date, hi always later
  const rangeExists = !!(start && effectiveEnd && !isSameDay(start, effectiveEnd));
  const lo = rangeExists ? (isBefore(start, effectiveEnd) ? start : effectiveEnd) : null;
  const hi = rangeExists ? (isBefore(start, effectiveEnd) ? effectiveEnd : start) : null;

  // True only for the strictly-between days (exclusive of endpoints)
  const inRange = (day) => {
    if (!lo || !hi) return false;
    return isAfter(day, lo) && isBefore(day, hi);
  };

  const days = getDaysView(displayMonth);

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button type="button"
          onClick={() => setDisplayMonth(m => subMonths(m, 1))}
          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {format(displayMonth, 'yyyy年M月')}
        </span>
        <button type="button"
          onClick={() => setDisplayMonth(m => addMonths(m, 1))}
          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {['一','二','三','四','五','六','日'].map((d, i) => (
          <div key={d} className={`text-center text-xs py-0.5 ${i >= 5 ? 'text-orange-400 dark:text-orange-500' : 'text-slate-400 dark:text-slate-500'}`}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const thisMonth  = isSameMonth(day, displayMonth);
          const tod        = isSameDay(day, today);
          const dayOfWeek  = getDay(day); // 0=Sun, 6=Sat
          const isWeekend  = dayOfWeek === 0 || dayOfWeek === 6;

          // Endpoint circles — shown for start/end regardless of order
          const isSelStart = !!(start && isSameDay(day, start));
          const isSelEnd   = !!(effectiveEnd && isSameDay(day, effectiveEnd));
          const sel        = isSelStart || isSelEnd;

          // Range strip roles
          const isLoDay  = !!(lo && isSameDay(day, lo));   // leftmost endpoint
          const isHiDay  = !!(hi && isSameDay(day, hi));   // rightmost endpoint
          const middle   = inRange(day);

          // Strip: right half on lo, left half on hi, full on middle
          const showStrip = isLoDay || isHiDay || middle;
          const stripL = isLoDay ? '50%' : '0';
          const stripR = isHiDay ? '50%' : '0';

          return (
            <div key={idx} className="relative flex items-center justify-center h-7">

              {/* ── Range background strip ─────────────────────────────────── */}
              {showStrip && (
                <div
                  className="absolute bg-blue-100 dark:bg-blue-900/35"
                  style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '24px',
                    left: stripL,
                    right: stripR,
                  }}
                />
              )}

              {/* ── Day button ─────────────────────────────────────────────── */}
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => phase === 'end' && setHoverDate(day)}
                onMouseLeave={() => phase === 'end' && setHoverDate(null)}
                className={`
                  relative z-10 w-6 h-6 rounded-full text-xs
                  flex items-center justify-center
                  ${sel
                    ? 'bg-blue-500 text-white font-bold'
                    : middle
                      ? 'text-blue-800 dark:text-blue-200'
                      : tod
                        ? 'text-blue-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-600'
                        : thisMonth
                          ? isWeekend
                            ? 'text-orange-500 dark:text-orange-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                          : 'text-slate-300 dark:text-slate-600'
                  }
                `}
              >
                {format(day, 'd')}
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected range summary */}
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <div className={`flex-1 text-center px-2 py-1 rounded-md border bg-transparent
          ${phase === 'end'
            ? 'border-blue-400 text-blue-600 dark:text-blue-400'
            : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'}`}>
          {startDate || '开始日期'}
        </div>
        <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <div className={`flex-1 text-center px-2 py-1 rounded-md border bg-transparent
          ${phase === 'end' && !endDate
            ? 'border-blue-300 text-blue-400 animate-pulse'
            : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'}`}>
          {endDate || (phase === 'end' ? '点击结束...' : '结束日期')}
        </div>
      </div>
    </div>
  );
}
