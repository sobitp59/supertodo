import { useState } from 'react';
import {
  Check, DotsSixVertical as GripVertical, Timer, Paperclip, PencilSimple as Pencil,
  CaretDown as ChevronDown, Plus, Copy, Trash as Trash2, X
} from '@phosphor-icons/react';
import { motion, Reorder } from 'framer-motion';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import urlRegex from 'url-regex';
import { toast } from 'sonner';
import { useStore, type Todo } from '../../store';
import { QUADRANT_COLORS } from '../time-canvas/EisenhowerMatrix';
import { NativeLinkPreview } from '../shared/NativeLinkPreview';
import type { ContextMenuItem } from '../ContextMenu';
import type { PomodoroState, PomodoroControls } from '../../hooks/usePomodoro';

interface TodoItemProps {
  todo: Todo;
  dateString: string;
  pomodoro: PomodoroState & PomodoroControls;
  setContextMenu: (menu: { x: number; y: number; items: ContextMenuItem[] } | null) => void;
}

export function TodoItem({ todo, dateString, pomodoro, setContextMenu }: TodoItemProps) {
  const {
    todos,
    activeCategoryId,
    toggleTodo,
    removeTodo,
    editTodo,
    addTodo,
    attachFileToTodo,
    removeAttachmentFromTodo,
    toggleSubtasksCollapse,
    setZenMode,
    setHashtagFilter,
  } = useStore();

  const { activePomodoroId, isPomodoroRunning, setIsPomodoroRunning, startFocus } = pomodoro;

  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTodoText, setEditTodoText] = useState('');
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  const isHighPriority = todo.text.includes('!!');
  const displayText = todo.text.replace('!!', '').trim();
  const urls = todo.text.match(urlRegex());
  const firstUrl = urls ? urls[0] : null;
  const formattedText = displayText.replace(/(#\w+)/g, '[$1](#tag-$1)');

  const handleAttachContent = async (todoId: string) => {
    try {
      const selectedPath = await open({
        multiple: false,
        filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
      });
      if (!selectedPath) return;
      attachFileToTodo(todoId, selectedPath);
    } catch (e) {
      console.error(e);
      toast.error("Failed to attach file.");
    }
  };

  const handleEditTodoSave = (id: string) => {
    if (editTodoText.trim()) {
      editTodo(id, editTodoText.trim());
    }
    setEditingTodoId(null);
    setEditTodoText('');
  };

  const handleEditTodoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      handleEditTodoSave(id);
    } else if (e.key === 'Escape') {
      setEditingTodoId(null);
      setEditTodoText('');
    }
  };

  return (
    <Reorder.Item
      key={todo.id}
      value={todo}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="todo-item"
    >
      <div className="drag-handle">
        <GripVertical size={16} />
      </div>

      {/* Eisenhower quadrant color indicator + badge */}
      {todo.eisenhowerQuadrant && (
        <div
          className="eisenhower-indicator"
          title={todo.eisenhowerQuadrant.replace(/-/g, ' ')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
            marginRight: -4,
          }}
        >
          <div
            style={{
              width: 4,
              height: 24,
              borderRadius: 2,
              background: QUADRANT_COLORS[todo.eisenhowerQuadrant] || 'transparent',
            }}
          />
          <span
            className="eisenhower-badge"
            style={{
              fontSize: '0.55rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: QUADRANT_COLORS[todo.eisenhowerQuadrant],
              background: `${QUADRANT_COLORS[todo.eisenhowerQuadrant]}15`,
              border: `1px solid ${QUADRANT_COLORS[todo.eisenhowerQuadrant]}30`,
              padding: '2px 5px',
              whiteSpace: 'nowrap',
            }}
          >
            {todo.eisenhowerQuadrant === 'urgent-important' ? 'DO' :
             todo.eisenhowerQuadrant === 'not-urgent-important' ? 'SCHEDULE' :
             todo.eisenhowerQuadrant === 'urgent-not-important' ? 'DELEGATE' : 'ELIMINATE'}
          </span>
        </div>
      )}
      
      <div
        className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
        onClick={() => toggleTodo(todo.id)}
      >
        {todo.completed && (
          <Check size={14} strokeWidth={3} />
        )}
      </div>

      <div className="todo-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {editingTodoId === todo.id ? (
          <input
            autoFocus
            className="todo-input"
            value={editTodoText}
            onChange={(e) => setEditTodoText(e.target.value)}
            onKeyDown={(e) => handleEditTodoKeyDown(e, todo.id)}
            onBlur={() => handleEditTodoSave(todo.id)}
            style={{ padding: '4px 0', fontSize: '1.15rem' }}
          />
        ) : (
          <div
            className={`todo-text-wrapper ${todo.completed ? 'checked' : ''} ${isHighPriority ? 'high-priority' : ''}`}
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName.toLowerCase() === 'a' || (e.target as HTMLElement).className.includes('hashtag-pill')) return;
              toggleTodo(todo.id);
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, href, ...props }) => {
                  if (href?.startsWith('#tag-')) {
                    const tag = href.replace('#tag-', '');
                    return (
                      <span
                        className="hashtag-pill"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHashtagFilter(tag);
                          toast.info(`Filtering by #${tag}`);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {props.children}
                      </span>
                    );
                  }
                  return (
                    <a
                      {...props}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                    />
                  );
                },
                p: ({ node, ...props }) => <p {...props} style={{ margin: 0 }} />,
              }}
            >
              {formattedText}
            </ReactMarkdown>
            {/* Magical dynamic strikethrough animation */}
            {todo.completed && (
              <motion.div 
                className="strikethrough-line" 
                initial={{ width: 0 }}
                animate={{ width: '104%' }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            )}
          </div>
        )}
        
        {todo.attachment && (
          <div className="todo-attachment" style={{ position: 'relative', width: 'fit-content' }}>
            <img 
              src={convertFileSrc(todo.attachment)} 
              alt="Attachment" 
              style={{ maxWidth: '300px', maxHeight: '200px', borderRadius: '8px', border: '1px solid var(--border)' }} 
            />
            <button 
              className="icon-btn delete" 
              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', padding: 4 }} 
              onClick={(e) => { e.stopPropagation(); removeAttachmentFromTodo(todo.id); }}
            >
              <X size={14} color="#fff" />
            </button>
          </div>
        )}
        
        {firstUrl && <NativeLinkPreview url={firstUrl} />}
      </div>

      <div className="actions-container">
        <button
          className="icon-btn"
          title="Add Subtask"
          onClick={() => {
            setAddingSubtaskFor(todo.id);
            setNewSubtaskText('');
          }}
        >
          <Plus size={16} />
        </button>
        <button
          className="icon-btn"
          title="Edit Task"
          onClick={() => {
            setEditingTodoId(todo.id);
            setEditTodoText(todo.text);
          }}
        >
          <Pencil size={16} />
        </button>
        <button
          className="icon-btn"
          title="Attach Image"
          onClick={() => handleAttachContent(todo.id)}
        >
          <Paperclip size={16} />
        </button>
        <button
          className="icon-btn pomodoro"
          title={activePomodoroId === todo.id ? "Stop Focus" : "Start Focus"}
          onClick={() => {
            if (activePomodoroId === todo.id) {
              setIsPomodoroRunning(!isPomodoroRunning);
            } else {
              startFocus(todo.id);
            }
          }}
        >
          <Timer size={16} color={activePomodoroId === todo.id && isPomodoroRunning ? "var(--accent)" : "currentColor"} />
        </button>
        <button
          className="icon-btn delete"
          title="Remove task"
          onClick={() => {
            const todoData = todos.find(t => t.id === todo.id);
            const subtasks = todos.filter(t => t.parentId === todo.id);
            removeTodo(todo.id);
            toast('Task deleted', {
              action: {
                label: 'Undo',
                onClick: () => {
                  if (todoData) {
                    useStore.setState((s) => ({ todos: [...s.todos, todoData, ...subtasks] }));
                  }
                },
              },
            });
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Right-click context menu handler */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: -1 }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            items: [
              { label: 'Edit', icon: <Pencil size={16} />, onClick: () => { setEditingTodoId(todo.id); setEditTodoText(todo.text); } },
              { label: 'Add Subtask', icon: <Plus size={16} />, onClick: () => { setAddingSubtaskFor(todo.id); setNewSubtaskText(''); } },
              { label: 'Duplicate', icon: <Copy size={16} />, onClick: () => { if (activeCategoryId) addTodo(activeCategoryId, todo.text, dateString); } },
              { label: 'Attach Image', icon: <Paperclip size={16} />, onClick: () => handleAttachContent(todo.id) },
              { label: 'Focus Mode', icon: <Timer size={16} />, onClick: () => { setZenMode(true, todo.id); } },
              { label: 'Delete', icon: <Trash2 size={16} />, onClick: () => removeTodo(todo.id), variant: 'danger' as const },
            ],
          });
        }}
      />

      {/* Subtasks */}
      {todo.subtasks && todo.subtasks.length > 0 && (
        <>
          <button
            className="collapse-btn"
            onClick={() => toggleSubtasksCollapse(todo.id)}
            style={{ position: 'absolute', left: -4, top: 36 }}
            title={todo.isCollapsed ? 'Expand subtasks' : 'Collapse subtasks'}
          >
            <ChevronDown
              size={14}
              style={{ transform: todo.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            />
          </button>

          {!todo.isCollapsed && (
            <div className="subtasks-container" style={{ gridColumn: '1 / -1' }}>
              {todos
                .filter((st) => todo.subtasks?.includes(st.id))
                .map((subtask) => (
                  <div className="subtask-item" key={subtask.id}>
                    <div
                      className={`todo-checkbox ${subtask.completed ? 'checked' : ''}`}
                      onClick={() => toggleTodo(subtask.id)}
                      style={{ width: 20, height: 20 }}
                    >
                      {subtask.completed && <Check size={12} weight="bold" />}
                    </div>
                    <span
                      style={{
                        flex: 1,
                        textDecoration: subtask.completed ? 'line-through' : 'none',
                        color: subtask.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                        fontSize: '0.95rem',
                      }}
                    >
                      {subtask.text}
                    </span>
                    <button
                      className="icon-btn delete"
                      onClick={() => removeTodo(subtask.id)}
                      style={{ opacity: 0.5, padding: 4 }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* Add Subtask Input */}
      {addingSubtaskFor === todo.id && (
        <div className="subtasks-container" style={{ gridColumn: '1 / -1' }}>
          <input
            autoFocus
            className="todo-input"
            placeholder="Add a subtask..."
            value={newSubtaskText}
            style={{ fontSize: '0.95rem', padding: '4px 0' }}
            onChange={(e) => setNewSubtaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSubtaskText.trim() && activeCategoryId) {
                addTodo(activeCategoryId, newSubtaskText.trim(), dateString, todo.id);
                setNewSubtaskText('');
              } else if (e.key === 'Escape') {
                setAddingSubtaskFor(null);
                setNewSubtaskText('');
              }
            }}
            onBlur={() => {
              setAddingSubtaskFor(null);
              setNewSubtaskText('');
            }}
          />
        </div>
      )}
    </Reorder.Item>
  );
}
