import { Timer, Lightning as Zap } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import type { Todo } from '../../store';
import type { PomodoroState, PomodoroControls } from '../../hooks/usePomodoro';

interface ModeBarProps {
  activeTodos: Todo[];
  pomodoro: PomodoroState & PomodoroControls;
  setIsAddingTodo: (adding: boolean) => void;
}

export function ModeBar({ activeTodos, pomodoro, setIsAddingTodo }: ModeBarProps) {
  const { appMode, setAppMode, activeNoteCategoryId, activeCategoryId, activeBookmarkCategoryId, settings } = useStore();
  const { activePomodoroId, startFocus } = pomodoro;

  return (
    <div className="action-row">
      <div className="mode-toggle-wrapper">
        {([
          { id: 'todos', label: 'Todos' },
          { id: 'bookmarks', label: 'Bookmarks' },
          { id: 'notes', label: 'Notes' },
          { id: 'challenges', label: 'Challenges' },
          { id: 'goals', label: 'Goals' },
          { id: 'jobs', label: 'Jobs' },
          { id: 'time-canvas', label: 'Planner' },
        ] as const).map((mode) => (
          <button
            key={mode.id}
            className={`mode-btn ${appMode === mode.id ? 'active' : ''}`}
            onClick={() => setAppMode(mode.id)}
            style={{ position: 'relative' }}
          >
            {appMode === mode.id && (
              <motion.div
                layoutId="modeActiveIndicator"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 16,
                  background: 'rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  zIndex: -1,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            {mode.label}
          </button>
        ))}
      </div>

      <span data-tauri-drag-region style={{ flex: 1 }} />
      {appMode !== 'challenges' && appMode !== 'goals' && appMode !== 'jobs' && appMode !== 'time-canvas' && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {appMode === 'todos' && !activePomodoroId && activeTodos.length > 0 && (
          <button
            className="create-btn"
            style={{ background: 'transparent', boxShadow: '4px 4px 0px var(--text-secondary)', borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }}
            onClick={() => {
              // Start focus on the first incomplete task
              const firstIncomplete = activeTodos.find(t => !t.completed);
              if (firstIncomplete) {
                startFocus(firstIncomplete.id);
              }
            }}
            title={`Start ${settings.pomodoroDuration}min focus session`}
          >
            <Timer size={16} /> focus
          </button>
        )}
        <button
          className="create-btn"
          onClick={() => {
            if (appMode === 'notes') {
              if (activeNoteCategoryId) useStore.getState().addNote(activeNoteCategoryId, 'Untitled Note');
            } else {
              setIsAddingTodo(true);
            }
          }}
          disabled={appMode === 'todos' ? !activeCategoryId : appMode === 'bookmarks' ? !activeBookmarkCategoryId : false}
        >
          create <Zap size={16} weight="fill" color="var(--bg-color)" />
        </button>
      </div>
      )}
    </div>
  );
}
