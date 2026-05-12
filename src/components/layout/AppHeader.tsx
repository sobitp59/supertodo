import { Gear as Settings } from '@phosphor-icons/react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isToday } from 'date-fns';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { formatDateDisplay } from '../../utils/dateHelpers';
import { ProgressRing } from '../shared/ProgressRing';
import { ClockDisplay, useGreeting } from '../ClockDisplay';
import type { PomodoroState, PomodoroControls } from '../../hooks/usePomodoro';

interface AppHeaderProps {
  currentDate: Date;
  progressPercent: number;
  pomodoro: PomodoroState & PomodoroControls;
  onToday: () => void;
  onOpenSettings: () => void;
}

export function AppHeader({ currentDate, progressPercent, pomodoro, onToday, onOpenSettings }: AppHeaderProps) {
  const { settings } = useStore();
  const greeting = useGreeting();
  const { activePomodoroId, pomodoroTimeLeft, isPomodoroRunning, pomodoroPhase, setIsPomodoroRunning } = pomodoro;

  return (
    <motion.header
      className="header"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Left side: draggable area for moving the window */}
      <div data-tauri-drag-region>
        <span className="header-greeting">{greeting}, {settings.userName}</span>
        <div className="date-container">
          <span className="date-text" onDoubleClick={onToday}>
            {formatDateDisplay(currentDate)}
            {!isToday(currentDate) && (
              <span
                onClick={onToday}
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--accent)',
                  marginLeft: 8,
                  cursor: 'pointer',
                  opacity: 0.8,
                  fontWeight: 500,
                }}
              >
                (go to today)
              </span>
            )}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="time-text" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ClockDisplay />
          <button
            className="icon-btn"
            onClick={onOpenSettings}
            title="Settings"
            style={{ padding: 4 }}
          >
            <Settings size={18} />
          </button>
          <motion.div
            key={progressPercent}
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <ProgressRing radius={16} stroke={3} progress={progressPercent} />
          </motion.div>
          {/* Global Pomodoro indicator in header */}
          {activePomodoroId && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '3px 10px', 
                background: pomodoroPhase === 'break' ? 'rgba(250,173,20,0.1)' : 'rgba(42,221,132,0.1)',
                border: `1px solid ${pomodoroPhase === 'break' ? 'rgba(250,173,20,0.3)' : 'rgba(42,221,132,0.3)'}`,
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
              title={isPomodoroRunning ? 'Click to pause' : 'Click to resume'}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: isPomodoroRunning ? (pomodoroPhase === 'break' ? '#faad14' : 'var(--accent)') : 'var(--text-secondary)', boxShadow: isPomodoroRunning ? `0 0 6px ${pomodoroPhase === 'break' ? '#faad14' : 'var(--accent)'}` : 'none', animation: isPomodoroRunning ? 'pulse 2s infinite' : 'none' }} />
              <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 600, color: pomodoroPhase === 'break' ? '#faad14' : 'var(--accent)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {pomodoroPhase === 'break' ? 'break' : 'focus'}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600, color: pomodoroPhase === 'break' ? '#faad14' : 'var(--accent)', letterSpacing: '0.5px' }}>
                {Math.floor(pomodoroTimeLeft / 60).toString().padStart(2, '0')}:{(pomodoroTimeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
        {/* Window controls — NO drag region here */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={() => getCurrentWindow().minimize()}
            title="Minimize"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #888)',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              padding: '0 6px',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            &#x2212;
          </button>
          <button
            onClick={() => getCurrentWindow().hide()}
            title="Hide to tray"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #888)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: '0 6px',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            &#x2715;
          </button>
        </div>
      </div>
    </motion.header>
  );
}
