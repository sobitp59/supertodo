import { Timer, Lightning as Zap } from '@phosphor-icons/react';
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
        <button
          className={`mode-btn ${appMode === 'todos' ? 'active' : ''}`}
          onClick={() => setAppMode('todos')}
        >
          Todos
        </button>
        <button
          className={`mode-btn ${appMode === 'bookmarks' ? 'active' : ''}`}
          onClick={() => setAppMode('bookmarks')}
        >
          Bookmarks
        </button>
        <button
          className={`mode-btn ${appMode === 'notes' ? 'active' : ''}`}
          onClick={() => setAppMode('notes')}
        >
          Notes
        </button>
        <button
          className={`mode-btn ${appMode === 'challenges' ? 'active' : ''}`}
          onClick={() => setAppMode('challenges')}
        >
          Challenges
        </button>
        <button
          className={`mode-btn ${appMode === 'goals' ? 'active' : ''}`}
          onClick={() => setAppMode('goals')}
        >
          Goals
        </button>
        <button
          className={`mode-btn ${appMode === 'jobs' ? 'active' : ''}`}
          onClick={() => setAppMode('jobs')}
        >
          Jobs
        </button>
        <button
          className={`mode-btn ${appMode === 'time-canvas' ? 'active' : ''}`}
          onClick={() => setAppMode('time-canvas')}
        >
          Planner
        </button>
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
