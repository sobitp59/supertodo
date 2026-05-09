import { useState, useCallback } from 'react';
import { useStore } from '../store';
import { Plus, Trash, Trophy, Fire, CaretLeft, CaretRight, Warning } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const EMOJI_OPTIONS = ['🔥', '💪', '🧘', '📚', '🏃', '💧', '🚫', '✨', '🎯', '🧠', '💤', '🥗'];

export function ChallengesView() {
  const challenges = useStore((state) => state.challenges);
  const activeChallengeId = useStore((state) => state.activeChallengeId);
  const addChallenge = useStore((state) => state.addChallenge);
  const removeChallenge = useStore((state) => state.removeChallenge);
  const setChallengeDay = useStore((state) => state.setChallengeDay);
  const setActiveChallenge = useStore((state) => state.setActiveChallenge);
  const archiveChallenge = useStore((state) => state.archiveChallenge);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🔥');
  const [newTargetDays, setNewTargetDays] = useState(30);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [streakWarning, setStreakWarning] = useState<{ date: string; streak: number } | null>(null);

  const activeChallenge = challenges.find((c) => c.id === activeChallengeId);
  const activeChallenges = challenges.filter((c) => !c.isArchived);

  // Calendar helpers
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const monthName = viewMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  const handleCreate = () => {
    if (newName.trim()) {
      addChallenge(newName.trim(), newEmoji, newTargetDays);
      setNewName('');
      setNewEmoji('🔥');
      setNewTargetDays(30);
      setIsCreating(false);
    }
  };

  // Calculate streak ending at a given date (looking backward)
  const getStreakEndingAt = useCallback((entries: Record<string, 'success' | 'fail'>, beforeDate: string): number => {
    let streak = 0;
    const d = new Date(beforeDate);
    d.setDate(d.getDate() - 1); // start from the day before
    while (true) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (entries[dateStr] === 'success') {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, []);

  // Handle marking a day - with streak warning for 'fail'
  const handleMarkDay = useCallback((challengeId: string, date: string, status: 'success' | 'fail') => {
    if (!activeChallenge) return;

    if (status === 'fail') {
      // Check if this would break a streak
      const currentStreak = getStreakEndingAt(activeChallenge.entries, date);
      // Also check if the day before had a success (meaning we're breaking a streak)
      if (currentStreak >= 3) {
        setStreakWarning({ date, streak: currentStreak });
        return; // Don't mark yet, show warning first
      }
    }

    setChallengeDay(challengeId, date, status);
    setHoveredDay(null);
    toast.success(status === 'success' ? '✓ Marked as success!' : '✗ Marked as failed', { duration: 1500 });
  }, [activeChallenge, setChallengeDay, getStreakEndingAt]);

  // Confirm streak break
  const confirmStreakBreak = useCallback(() => {
    if (!streakWarning || !activeChallenge) return;
    setChallengeDay(activeChallenge.id, streakWarning.date, 'fail');
    setStreakWarning(null);
    setHoveredDay(null);
    toast('✗ Marked as failed — streak broken', { duration: 2000 });
  }, [streakWarning, activeChallenge, setChallengeDay]);

  // Handle right-click to clear a day
  const handleClearDay = useCallback((e: React.MouseEvent, challengeId: string, date: string) => {
    e.preventDefault();
    e.stopPropagation();
    setChallengeDay(challengeId, date, null);
    toast('Day cleared', { duration: 1500 });
  }, [setChallengeDay]);

  // Stats for active challenge
  const getStats = () => {
    if (!activeChallenge) return { streak: 0, total: 0, successRate: 0 };

    const entries = activeChallenge.entries;
    const successDays = Object.values(entries).filter((v) => v === 'success').length;
    const totalDays = Object.keys(entries).length;

    // Current streak
    let streak = 0;
    const d = new Date(today);
    while (true) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (entries[dateStr] === 'success') {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      streak,
      total: successDays,
      successRate: totalDays > 0 ? Math.round((successDays / totalDays) * 100) : 0,
    };
  };

  const stats = getStats();

  return (
    <div className="challenges-view">
      {/* Streak Break Warning Modal */}
      <AnimatePresence>
        {streakWarning && (
          <motion.div
            className="streak-warning-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setStreakWarning(null)}
          >
            <motion.div
              className="streak-warning-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Warning size={32} weight="fill" style={{ color: '#f59e0b' }} />
              <h3 style={{ margin: '8px 0 4px', fontSize: '1.1rem' }}>Break your streak?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 16px' }}>
                You have a <strong>{streakWarning.streak}-day streak</strong> going. Marking this day as failed will break it.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="challenge-action-btn" onClick={() => setStreakWarning(null)}>
                  keep streak
                </button>
                <button
                  className="challenge-action-btn secondary"
                  style={{ borderColor: '#ef4444', color: '#ef4444' }}
                  onClick={confirmStreakBreak}
                >
                  mark as failed
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar: Challenge List */}
      <div className="challenges-sidebar">
        <div className="challenges-sidebar-header">
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>challenges</h3>
          <button
            className="icon-btn"
            onClick={() => setIsCreating(true)}
            title="New Challenge"
          >
            <Plus size={18} />
          </button>
        </div>

        <AnimatePresence>
          {isCreating && (
            <motion.div
              className="challenge-create-form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    className={`emoji-btn ${newEmoji === e ? 'active' : ''}`}
                    onClick={() => setNewEmoji(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <input
                autoFocus
                className="challenge-input"
                placeholder="challenge name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>target:</label>
                <select
                  value={newTargetDays}
                  onChange={(e) => setNewTargetDays(parseInt(e.target.value))}
                  className="challenge-select"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={21}>21 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>365 days</option>
                  <option value={0}>indefinite</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="challenge-action-btn" onClick={handleCreate}>create</button>
                <button className="challenge-action-btn secondary" onClick={() => setIsCreating(false)}>cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="challenges-list">
          {activeChallenges.length === 0 && !isCreating && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              no active challenges. create one to start tracking!
            </div>
          )}
          {activeChallenges.map((challenge) => {
            const successCount = Object.values(challenge.entries).filter((v) => v === 'success').length;
            const progress = challenge.targetDays > 0 ? Math.min((successCount / challenge.targetDays) * 100, 100) : 0;

            return (
              <div
                key={challenge.id}
                className={`challenge-item ${activeChallengeId === challenge.id ? 'active' : ''}`}
                onClick={() => setActiveChallenge(challenge.id)}
              >
                <span className="challenge-item-emoji">{challenge.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="challenge-item-name">{challenge.name}</div>
                  <div className="challenge-item-meta">
                    {successCount}{challenge.targetDays > 0 ? `/${challenge.targetDays}` : ''} days
                  </div>
                  {challenge.targetDays > 0 && (
                    <div className="challenge-progress-bar">
                      <div className="challenge-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main: Calendar View */}
      <div className="challenges-main">
        {activeChallenge ? (
          <>
            {/* Challenge Header */}
            <div className="challenge-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.8rem' }}>{activeChallenge.emoji}</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>{activeChallenge.name}</h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    started {activeChallenge.startDate}
                    {activeChallenge.targetDays > 0 && ` \u00b7 ${activeChallenge.targetDays} day challenge`}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="icon-btn"
                  onClick={() => archiveChallenge(activeChallenge.id)}
                  title="Archive"
                >
                  <Trophy size={18} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => {
                    const challengeData = challenges.find(c => c.id === activeChallenge.id);
                    removeChallenge(activeChallenge.id);
                    toast('Challenge deleted', {
                      action: {
                        label: 'Undo',
                        onClick: () => {
                          if (challengeData) {
                            useStore.setState((s) => ({ challenges: [...s.challenges, challengeData], activeChallengeId: challengeData.id }));
                          }
                        },
                      },
                    });
                  }}
                  title="Delete"
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="challenge-stats">
              <div className="challenge-stat">
                <Fire size={20} weight="fill" style={{ color: 'var(--accent)' }} />
                <div className="challenge-stat-value">{stats.streak}</div>
                <div className="challenge-stat-label">streak</div>
              </div>
              <div className="challenge-stat">
                <Trophy size={20} weight="fill" style={{ color: 'var(--accent)' }} />
                <div className="challenge-stat-value">{stats.total}</div>
                <div className="challenge-stat-label">total</div>
              </div>
              <div className="challenge-stat">
                <span style={{ fontSize: '1.2rem' }}>%</span>
                <div className="challenge-stat-value">{stats.successRate}</div>
                <div className="challenge-stat-label">rate</div>
              </div>
            </div>

            {/* Today's Quick Action - always shows for today, even if already marked (for corrections) */}
            <motion.div
              className="challenge-today-action"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <span style={{ fontSize: '0.9rem' }}>
                today's check-in:
                {activeChallenge.entries[todayStr] && (
                  <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    (currently: {activeChallenge.entries[todayStr] === 'success' ? '✓ success' : '✗ failed'})
                  </span>
                )}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`challenge-checkin-btn success ${activeChallenge.entries[todayStr] === 'success' ? 'active' : ''}`}
                  onClick={() => setChallengeDay(activeChallenge.id, todayStr, 'success')}
                >
                  ✓ success
                </button>
                <button
                  className={`challenge-checkin-btn fail ${activeChallenge.entries[todayStr] === 'fail' ? 'active' : ''}`}
                  onClick={() => handleMarkDay(activeChallenge.id, todayStr, 'fail')}
                >
                  ✗ failed
                </button>
                {activeChallenge.entries[todayStr] && (
                  <button
                    className="challenge-checkin-btn clear"
                    onClick={() => {
                      setChallengeDay(activeChallenge.id, todayStr, null);
                      toast('Today cleared', { duration: 1500 });
                    }}
                  >
                    clear
                  </button>
                )}
              </div>
            </motion.div>

            {/* Calendar */}
            <div className="challenge-calendar">
              <div className="challenge-calendar-nav">
                <button className="icon-btn" onClick={prevMonth}>
                  <CaretLeft size={18} />
                </button>
                <span className="challenge-month-label">{monthName}</span>
                <button className="icon-btn" onClick={nextMonth}>
                  <CaretRight size={18} />
                </button>
              </div>

              <div className="challenge-calendar-grid">
                {['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'].map((d) => (
                  <div key={d} className="challenge-day-header">{d}</div>
                ))}

                {/* Empty cells before first day */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="challenge-day empty" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const status = activeChallenge.entries[dateStr];
                  const isToday = dateStr === todayStr;
                  const isFuture = new Date(dateStr) > today;
                  const isBeforeStart = dateStr < activeChallenge.startDate;
                  const isDisabled = isFuture || isBeforeStart;
                  const isHovered = hoveredDay === dateStr && !isDisabled;

                  return (
                    <div
                      key={day}
                      className={`challenge-day ${status || ''} ${isToday ? 'today' : ''} ${isDisabled ? 'disabled' : ''} ${isHovered ? 'hovered' : ''}`}
                      onMouseEnter={() => !isDisabled && setHoveredDay(dateStr)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onContextMenu={(e) => {
                        if (!isDisabled && status) {
                          handleClearDay(e, activeChallenge.id, dateStr);
                        } else {
                          e.preventDefault();
                        }
                      }}
                    >
                      <span className="challenge-day-number">{day}</span>
                      
                      {/* Show status mark when not hovered */}
                      {!isHovered && status === 'success' && <span className="challenge-day-mark">✓</span>}
                      {!isHovered && status === 'fail' && <span className="challenge-day-mark fail">✗</span>}
                      
                      {/* Show explicit ✓/✗ buttons on hover */}
                      {isHovered && (
                        <div className="challenge-day-actions">
                          <button
                            className={`challenge-day-btn success ${status === 'success' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setChallengeDay(activeChallenge.id, dateStr, 'success');
                              setHoveredDay(null);
                            }}
                            title="Mark as success"
                          >
                            ✓
                          </button>
                          <button
                            className={`challenge-day-btn fail ${status === 'fail' ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkDay(activeChallenge.id, dateStr, 'fail');
                            }}
                            title="Mark as failed"
                          >
                            ✗
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="challenge-legend">
              <div className="challenge-legend-item">
                <div className="challenge-legend-dot success" /> success
              </div>
              <div className="challenge-legend-item">
                <div className="challenge-legend-dot fail" /> failed
              </div>
              <div className="challenge-legend-item">
                <div className="challenge-legend-dot" /> unmarked
              </div>
              <div className="challenge-legend-hint">
                right-click to clear a day
              </div>
            </div>
          </>
        ) : (
          <div className="challenges-empty">
            <Fire size={48} weight="thin" style={{ color: 'var(--text-secondary)', marginBottom: 16 }} />
            <h3 style={{ margin: '0 0 8px', fontWeight: 600 }}>no challenge selected</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              select a challenge from the sidebar or create a new one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
