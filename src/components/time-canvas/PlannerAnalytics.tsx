import { useMemo } from 'react';
import { useStore } from '../../store';
import { format, subDays, parseISO, getDay, startOfWeek, addDays } from 'date-fns';
import { Fire, TrendUp, ArrowsClockwise, CheckCircle, XCircle, Minus } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

// Compute adherence for a single day
function computeDayAdherence(todos: any[], date: string, categoryId: string | null) {
  const scheduled = todos.filter(
    t => t.date === date && t.categoryId === categoryId && !t.parentId && t.startTime
  );
  if (scheduled.length === 0) return null; // no plan for this day
  const completed = scheduled.filter(t => t.completed).length;
  return Math.round((completed / scheduled.length) * 100);
}

// Get color based on score
function getScoreColor(score: number | null): string {
  if (score === null) return 'rgba(255,255,255,0.06)';
  if (score >= 80) return '#2add84';
  if (score >= 50) return '#faad14';
  return '#ff4d4f';
}

function getScoreBg(score: number | null): string {
  if (score === null) return 'rgba(255,255,255,0.03)';
  if (score >= 80) return 'rgba(42, 221, 132, 0.15)';
  if (score >= 50) return 'rgba(250, 173, 20, 0.15)';
  return 'rgba(255, 77, 79, 0.15)';
}

export function PlannerAnalytics() {
  const { todos, timeCanvasSelectedDate, activeCategoryId } = useStore();

  // Today's adherence
  const todayScore = useMemo(() => {
    return computeDayAdherence(todos, timeCanvasSelectedDate, activeCategoryId);
  }, [todos, timeCanvasSelectedDate, activeCategoryId]);

  // Scheduled vs completed for today
  const todayStats = useMemo(() => {
    const scheduled = todos.filter(
      t => t.date === timeCanvasSelectedDate && t.categoryId === activeCategoryId && !t.parentId && t.startTime
    );
    const completed = scheduled.filter(t => t.completed).length;
    return { scheduled: scheduled.length, completed };
  }, [todos, timeCanvasSelectedDate, activeCategoryId]);

  // 7-day heatmap (last 7 days including selected date)
  const weekData = useMemo(() => {
    const selectedDate = parseISO(timeCanvasSelectedDate);
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const score = computeDayAdherence(todos, dateStr, activeCategoryId);
      return {
        date: dateStr,
        dayLabel: format(date, 'EEE'),
        dayNum: format(date, 'd'),
        score,
        isSelected: dateStr === timeCanvasSelectedDate,
        isToday: dateStr === format(new Date(), 'yyyy-MM-dd'),
      };
    });
  }, [todos, timeCanvasSelectedDate, activeCategoryId]);

  // Streak: consecutive days with adherence >= 70% going back from today
  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = format(subDays(today, i), 'yyyy-MM-dd');
      const score = computeDayAdherence(todos, date, activeCategoryId);
      if (score === null) continue; // skip unplanned days
      if (score >= 70) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [todos, activeCategoryId]);

  // Recurring event compliance (last 7 days)
  const recurringCompliance = useMemo(() => {
    const recurringTodos = todos.filter(
      t => t.recurrence && t.recurrence !== 'none' && t.startTime && t.categoryId === activeCategoryId && !t.parentId
    );

    // Deduplicate by text (same recurring task)
    const uniqueRecurring = new Map<string, typeof recurringTodos[0]>();
    recurringTodos.forEach(t => {
      if (!uniqueRecurring.has(t.text)) {
        uniqueRecurring.set(t.text, t);
      }
    });

    const today = new Date();
    const results: { text: string; completed: number; expected: number; recurrence: string }[] = [];

    uniqueRecurring.forEach((todo) => {
      let expected = 0;
      let completed = 0;

      for (let i = 0; i < 7; i++) {
        const checkDate = subDays(today, i);
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        const dayOfWeek = getDay(checkDate);

        // Check if this recurrence applies to this day
        let applies = false;
        if (todo.recurrence === 'daily') applies = true;
        else if (todo.recurrence === 'weekdays') applies = dayOfWeek >= 1 && dayOfWeek <= 5;
        else if (todo.recurrence === 'weekly') applies = dayOfWeek === getDay(parseISO(todo.date));

        if (applies && dateStr >= todo.date) {
          expected++;
          // Check if there's a completed instance on this date
          const instance = todos.find(
            t => t.date === dateStr && t.text === todo.text && t.categoryId === activeCategoryId && t.completed && t.startTime
          );
          if (instance) completed++;
        }
      }

      if (expected > 0) {
        results.push({
          text: todo.text.replace('!!', '').trim(),
          completed,
          expected,
          recurrence: todo.recurrence!,
        });
      }
    });

    return results;
  }, [todos, activeCategoryId]);

  // Time distribution for today
  const timeDistribution = useMemo(() => {
    const scheduled = todos.filter(
      t => t.date === timeCanvasSelectedDate && t.categoryId === activeCategoryId && !t.parentId && t.startTime && t.endTime
    );

    let focusMins = 0;
    let delegateMins = 0;
    let otherMins = 0;

    scheduled.forEach(t => {
      const [sh, sm] = t.startTime!.split(':').map(Number);
      const [eh, em] = t.endTime!.split(':').map(Number);
      const duration = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));

      if (t.eisenhowerQuadrant === 'urgent-important' || t.eisenhowerQuadrant === 'not-urgent-important') {
        focusMins += duration;
      } else if (t.eisenhowerQuadrant === 'urgent-not-important') {
        delegateMins += duration;
      } else {
        otherMins += duration;
      }
    });

    const total = focusMins + delegateMins + otherMins;
    return { focusMins, delegateMins, otherMins, total };
  }, [todos, timeCanvasSelectedDate, activeCategoryId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto', paddingRight: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Routine Analytics</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Fire size={14} color={streak >= 3 ? '#2add84' : 'var(--text-secondary)'} weight="fill" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: streak >= 3 ? '#2add84' : 'var(--text-secondary)' }}>
            {streak} day streak
          </span>
        </div>
      </div>

      {/* Today's Score */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '16px',
          border: `1px solid ${todayScore !== null ? getScoreColor(todayScore) + '40' : 'rgba(255,255,255,0.08)'}`,
          background: getScoreBg(todayScore),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            Plan Adherence
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: todayScore !== null ? getScoreColor(todayScore) : 'var(--text-secondary)' }}>
            {todayScore !== null ? `${todayScore}%` : '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {todayStats.completed}/{todayStats.scheduled} blocks done
          </div>
          {todayScore !== null && todayScore >= 80 && (
            <div style={{ fontSize: '0.7rem', color: '#2add84', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <CheckCircle size={12} weight="fill" /> On track
            </div>
          )}
          {todayScore !== null && todayScore < 50 && (
            <div style={{ fontSize: '0.7rem', color: '#ff4d4f', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <XCircle size={12} weight="fill" /> Behind
            </div>
          )}
        </div>
      </motion.div>

      {/* Weekly Heatmap */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          This Week
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {weekData.map((day) => (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: weekData.indexOf(day) * 0.05 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 4px',
                border: day.isSelected ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)',
                background: getScoreBg(day.score),
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => useStore.getState().setTimeCanvasSelectedDate(day.date)}
            >
              <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                {day.dayLabel}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: day.isToday ? 'var(--accent)' : 'var(--text-primary)' }}>
                {day.dayNum}
              </span>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: day.score !== null ? getScoreColor(day.score) : 'rgba(255,255,255,0.1)',
              }} />
              {day.score !== null && (
                <span style={{ fontSize: '0.55rem', color: getScoreColor(day.score), fontWeight: 600 }}>
                  {day.score}%
                </span>
              )}
            </motion.div>
          ))}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2add84' }} /> 80%+
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#faad14' }} /> 50-79%
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4d4f' }} /> &lt;50%
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} /> No plan
          </span>
        </div>
      </div>

      {/* Time Distribution */}
      {timeDistribution.total > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Time Distribution
          </div>
          {/* Bar */}
          <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
            {timeDistribution.focusMins > 0 && (
              <div style={{ flex: timeDistribution.focusMins, background: '#2add84', transition: 'flex 0.3s' }} />
            )}
            {timeDistribution.delegateMins > 0 && (
              <div style={{ flex: timeDistribution.delegateMins, background: '#1890ff', transition: 'flex 0.3s' }} />
            )}
            {timeDistribution.otherMins > 0 && (
              <div style={{ flex: timeDistribution.otherMins, background: '#8c8c8c', transition: 'flex 0.3s' }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.65rem', color: '#2add84', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: 6, height: 6, background: '#2add84' }} />
              Focus {Math.round(timeDistribution.focusMins / 60 * 10) / 10}h ({Math.round(timeDistribution.focusMins / timeDistribution.total * 100)}%)
            </span>
            <span style={{ fontSize: '0.65rem', color: '#1890ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: 6, height: 6, background: '#1890ff' }} />
              Delegate {Math.round(timeDistribution.delegateMins / 60 * 10) / 10}h
            </span>
            <span style={{ fontSize: '0.65rem', color: '#8c8c8c', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: 6, height: 6, background: '#8c8c8c' }} />
              Other {Math.round(timeDistribution.otherMins / 60 * 10) / 10}h
            </span>
          </div>
        </div>
      )}

      {/* Recurring Event Compliance */}
      {recurringCompliance.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowsClockwise size={12} /> Recurring (7 days)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recurringCompliance.map((item, i) => {
              const pct = Math.round((item.completed / item.expected) * 100);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.text}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {item.recurrence} · {item.completed}/{item.expected} days
                    </div>
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ width: '50px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: getScoreColor(pct), transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: getScoreColor(pct), minWidth: '30px', textAlign: 'right' }}>
                    {pct}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state when no data */}
      {todayStats.scheduled === 0 && recurringCompliance.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
          <TrendUp size={36} weight="thin" style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ fontSize: '0.8rem', margin: 0 }}>
            Schedule time blocks in the planner to see your routine analytics here.
          </p>
        </div>
      )}
    </div>
  );
}
