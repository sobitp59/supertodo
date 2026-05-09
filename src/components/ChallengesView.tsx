import { useState } from 'react';
import { useStore } from '../store';
import { Plus, Trash, Trophy, Fire, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJI_OPTIONS = ['🔥', '💪', '🧘', '📚', '🏃', '💧', '🚫', '✨', '🎯', '🧠', '💤', '🥗'];

export function ChallengesView() {
  const challenges = useStore((state) => state.challenges);
  const activeChallengeId = useStore((state) => state.activeChallengeId);
  const addChallenge = useStore((state) => state.addChallenge);
  const removeChallenge = useStore((state) => state.removeChallenge);
  const toggleChallengeDay = useStore((state) => state.toggleChallengeDay);
  const setActiveChallenge = useStore((state) => state.setActiveChallenge);
  const archiveChallenge = useStore((state) => state.archiveChallenge);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🔥');
  const [newTargetDays, setNewTargetDays] = useState(30);
  const [viewMonth, setViewMonth] = useState(new Date());

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
                    {activeChallenge.targetDays > 0 && ` · ${activeChallenge.targetDays} day challenge`}
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
                  onClick={() => removeChallenge(activeChallenge.id)}
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

            {/* Today's Quick Action */}
            {!activeChallenge.entries[todayStr] && (
              <motion.div
                className="challenge-today-action"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <span style={{ fontSize: '0.9rem' }}>today's check-in:</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="challenge-checkin-btn success"
                    onClick={() => toggleChallengeDay(activeChallenge.id, todayStr)}
                  >
                    ✓ success
                  </button>
                  <button
                    className="challenge-checkin-btn fail"
                    onClick={() => {
                      // Toggle twice: unset → success → fail
                      toggleChallengeDay(activeChallenge.id, todayStr);
                      setTimeout(() => toggleChallengeDay(activeChallenge.id, todayStr), 50);
                    }}
                  >
                    ✗ failed
                  </button>
                </div>
              </motion.div>
            )}

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

                  return (
                    <div
                      key={day}
                      className={`challenge-day ${status || ''} ${isToday ? 'today' : ''} ${isFuture || isBeforeStart ? 'disabled' : ''}`}
                      onClick={() => {
                        if (!isFuture && !isBeforeStart) {
                          toggleChallengeDay(activeChallenge.id, dateStr);
                        }
                      }}
                    >
                      <span className="challenge-day-number">{day}</span>
                      {status === 'success' && <span className="challenge-day-mark">✓</span>}
                      {status === 'fail' && <span className="challenge-day-mark fail">✗</span>}
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
