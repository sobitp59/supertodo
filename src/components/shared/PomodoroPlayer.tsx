import { X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useStore } from '../../store';
import type { PomodoroState, PomodoroControls } from '../../hooks/usePomodoro';

interface PomodoroPlayerProps {
  pomodoro: PomodoroState & PomodoroControls;
}

export function PomodoroPlayer({ pomodoro }: PomodoroPlayerProps) {
  const { todos, setZenMode } = useStore();
  const { activePomodoroId, pomodoroTimeLeft, isPomodoroRunning, pomodoroPhase, setIsPomodoroRunning, stopPomodoro } = pomodoro;

  return (
    <AnimatePresence>
      {activePomodoroId && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="pomodoro-floating-player"
        >
          <div className="pomo-info">
            <div className="pomo-pulse" style={{ background: pomodoroPhase === 'break' ? '#faad14' : 'var(--accent)', boxShadow: `0 0 10px ${pomodoroPhase === 'break' ? '#faad14' : 'var(--accent)'}` }}></div>
            <span className="pomo-task-name">
              {pomodoroPhase === 'break' ? 'Break Time' : (todos.find(t => t.id === activePomodoroId)?.text.replace('!!', '') || 'Focusing...')}
            </span>
          </div>
          
          <div className="pomo-controls">
            <span className="pomo-time">
              {Math.floor(pomodoroTimeLeft / 60).toString().padStart(2, '0')}:
              {(pomodoroTimeLeft % 60).toString().padStart(2, '0')}
            </span>
            
            <button 
              className="pomo-btn play-pause"
              onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
            >
              {isPomodoroRunning ? 'Pause' : 'Resume'}
            </button>
            <button 
              className="pomo-btn zen"
              onClick={async () => {
                setZenMode(true, activePomodoroId);
                try {
                  await getCurrentWindow().setFullscreen(true);
                } catch {}
              }}
              title="Enter Zen Mode"
            >
              Zen
            </button>
            <button 
              className="pomo-btn cancel"
              onClick={stopPomodoro}
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
