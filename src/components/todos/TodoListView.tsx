import { Check } from '@phosphor-icons/react';
import { AnimatePresence, Reorder } from 'framer-motion';
import { toast } from 'sonner';
import { useStore, type Todo } from '../../store';
import { QUADRANT_COLORS } from '../time-canvas/EisenhowerMatrix';
import { TodoItem } from './TodoItem';
import type { ContextMenuItem } from '../ContextMenu';
import type { PomodoroState, PomodoroControls } from '../../hooks/usePomodoro';

interface TodoListViewProps {
  activeTodos: Todo[];
  overdueTodos: Todo[];
  dateString: string;
  todayString: string;
  pomodoro: PomodoroState & PomodoroControls;
  setContextMenu: (menu: { x: number; y: number; items: ContextMenuItem[] } | null) => void;
}

export function TodoListView({
  activeTodos,
  overdueTodos,
  dateString,
  todayString,
  pomodoro,
  setContextMenu,
}: TodoListViewProps) {
  const {
    todos,
    activeCategoryId,
    toggleTodo,
    editTodo,
    reorderTodos,
  } = useStore();

  return (
    <>
      {/* Today's Schedule - shows time-blocked tasks from the Canvas */}
      {dateString === todayString && (() => {
        const scheduledTodos = todos
          .filter(t => t.categoryId === activeCategoryId && t.date === todayString && t.startTime && !t.parentId)
          .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        if (scheduledTodos.length === 0) return null;
        return (
          <div className="todays-schedule-widget">
            <div className="schedule-widget-header">
              <span className="schedule-widget-title">Today's Schedule</span>
              <span className="schedule-widget-count">{scheduledTodos.length} time-blocked</span>
            </div>
            <div className="schedule-widget-items">
              {scheduledTodos.map(todo => (
                <div
                  key={todo.id}
                  className={`schedule-widget-item ${todo.completed ? 'completed' : ''}`}
                  onClick={() => toggleTodo(todo.id)}
                >
                  <span className="schedule-widget-time">
                    {todo.startTime}{todo.endTime ? `\u2013${todo.endTime}` : ''}
                  </span>
                  {todo.eisenhowerQuadrant && (
                    <div
                      className="schedule-widget-dot"
                      style={{ background: QUADRANT_COLORS[todo.eisenhowerQuadrant] }}
                    />
                  )}
                  <span className="schedule-widget-text">
                    {todo.text.replace('!!', '').trim()}
                  </span>
                  {todo.completed && <Check size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Overdue Tasks Section */}
      {overdueTodos.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', border: '1px solid rgba(255, 74, 74, 0.3)', background: 'rgba(255, 74, 74, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--high-priority)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Overdue ({overdueTodos.length})
            </span>
            <button
              onClick={() => {
                overdueTodos.forEach(t => {
                  editTodo(t.id, t.text);
                  useStore.getState().todos.find(todo => todo.id === t.id)!.date = todayString;
                });
                useStore.setState({ todos: [...useStore.getState().todos] });
                toast.success(`Moved ${overdueTodos.length} tasks to today`);
              }}
              style={{ fontSize: '0.7rem', background: 'transparent', border: '1px solid rgba(255,74,74,0.4)', color: 'var(--high-priority)', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Move all to today
            </button>
          </div>
          {overdueTodos.slice(0, 10).map(todo => (
            <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div
                className="todo-checkbox"
                onClick={() => toggleTodo(todo.id)}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {todo.text.replace('!!', '')}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,74,74,0.7)' }}>{todo.date}</span>
              <button
                onClick={() => {
                  const allTodos = useStore.getState().todos.map(t => t.id === todo.id ? { ...t, date: todayString } : t);
                  useStore.setState({ todos: allTodos });
                  toast.success('Moved to today');
                }}
                style={{ fontSize: '0.6rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '2px 6px', cursor: 'pointer', fontFamily: 'inherit' }}
                title="Move to today"
              >
                &rarr;today
              </button>
            </div>
          ))}
          {overdueTodos.length > 10 && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              +{overdueTodos.length - 10} more overdue tasks
            </div>
          )}
        </div>
      )}

      <Reorder.Group 
        axis="y" 
        values={activeTodos} 
        onReorder={reorderTodos}
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        <AnimatePresence>
          {activeTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              dateString={dateString}
              pomodoro={pomodoro}
              setContextMenu={setContextMenu}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </>
  );
}
