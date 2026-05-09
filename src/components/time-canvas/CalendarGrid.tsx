import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { format } from 'date-fns';
import { X, Plus, PencilSimple, Check } from '@phosphor-icons/react';
import { useDroppable } from '@dnd-kit/core';
import { QUADRANT_COLORS } from './EisenhowerMatrix';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SNAP_INTERVAL = 15;
const HOUR_HEIGHT = 60;

const QUADRANT_LABELS: Record<string, string> = {
  'urgent-important': 'DO',
  'not-urgent-important': 'SCHEDULE',
  'urgent-not-important': 'DELEGATE',
  'not-urgent-not-important': 'ELIMINATE',
};

function parseTime(timeStr: string | undefined): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 1439));
  const h = Math.floor(clamped / 60);
  const m = Math.floor(clamped % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function formatTimeDisplay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return m === 0 ? `${displayH} ${ampm}` : `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function snapToGrid(y: number): number {
  return Math.round(y / SNAP_INTERVAL) * SNAP_INTERVAL;
}

function getEventColor(quadrant: string | undefined): string {
  if (!quadrant) return 'var(--accent)';
  return QUADRANT_COLORS[quadrant] || 'var(--accent)';
}

function getEventsLayout(events: any[]) {
  const sorted = [...events].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
  const layout = sorted.map(ev => ({ ...ev, colIndex: 0, maxCols: 1 }));
  for (let i = 0; i < layout.length; i++) {
    let col = 0;
    const startI = parseTime(layout[i].startTime);
    const endI = parseTime(layout[i].endTime) || (startI + 60);
    let collision = true;
    while (collision) {
      collision = false;
      for (let j = 0; j < i; j++) {
        if (layout[j].colIndex === col) {
          const startJ = parseTime(layout[j].startTime);
          const endJ = parseTime(layout[j].endTime) || (startJ + 60);
          if (startI < endJ && endI > startJ) { collision = true; break; }
        }
      }
      if (collision) col++;
    }
    layout[i].colIndex = col;
    let groupMaxCol = col + 1;
    for (let j = 0; j <= i; j++) {
      const startJ = parseTime(layout[j].startTime);
      const endJ = parseTime(layout[j].endTime) || (startJ + 60);
      if (startI < endJ && endI > startJ) {
        groupMaxCol = Math.max(layout[j].maxCols, groupMaxCol);
      }
    }
    for (let j = 0; j <= i; j++) {
      const startJ = parseTime(layout[j].startTime);
      const endJ = parseTime(layout[j].endTime) || (startJ + 60);
      if (startI < endJ && endI > startJ) {
        layout[j].maxCols = groupMaxCol;
      }
    }
    layout[i].maxCols = groupMaxCol;
  }
  return layout;
}



// ============ CALENDAR EVENT COMPONENT ============

interface CalendarEventProps {
  todo: any;
  layout: any;
  onDragStart: (todoId: string, e: React.PointerEvent) => void;
  onResizeStart: (todoId: string, e: React.PointerEvent) => void;
  onEditStart: (todoId: string) => void;
  isDragging: boolean;
  isResizing: boolean;
  isEditing: boolean;
  dragOffset: number;
  resizeHeight: number;
  editText: string;
  onEditChange: (text: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
}

function CalendarEvent({ todo, layout, onDragStart, onResizeStart, onEditStart, isDragging, isResizing, isEditing, dragOffset, resizeHeight, editText, onEditChange, onEditSave, onEditCancel }: CalendarEventProps) {
  const { updateTodoTime } = useStore();
  const color = getEventColor(todo.eisenhowerQuadrant);
  const quadrantLabel = todo.eisenhowerQuadrant ? QUADRANT_LABELS[todo.eisenhowerQuadrant] : null;

  const startMins = parseTime(todo.startTime);
  const endMins = parseTime(todo.endTime) || (startMins + 60);
  const baseHeight = endMins - startMins;

  const displayTop = isDragging ? startMins + dragOffset : startMins;
  const displayHeight = isResizing ? resizeHeight : Math.max(SNAP_INTERVAL, baseHeight);

  const leftOffset = layout.maxCols > 1 
    ? `calc(60px + ${(layout.colIndex / layout.maxCols) * 100}% - ${(layout.colIndex / layout.maxCols) * 60}px)` 
    : '60px';
  const width = layout.maxCols > 1 
    ? `calc(${100 / layout.maxCols}% - ${60 / layout.maxCols}px - 4px)` 
    : 'calc(100% - 64px)';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${displayTop}px`,
        height: `${displayHeight}px`,
        left: leftOffset,
        width: width,
        zIndex: (isDragging || isResizing || isEditing) ? 100 : 10 + layout.colIndex,
        padding: '0 2px',
        boxSizing: 'border-box',
        opacity: (isDragging || isResizing) ? 0.85 : 1,
        transition: (isDragging || isResizing) ? 'none' : 'top 0.2s ease, height 0.2s ease',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div
        onPointerDown={(e) => {
          if (isEditing) return;
          const target = e.target as HTMLElement;
          if (target.dataset.resize === 'true' || target.closest('[data-resize="true"]')) return;
          if (target.tagName === 'BUTTON' || target.closest('button')) return;
          if (target.tagName === 'INPUT' || target.closest('input')) return;
          onDragStart(todo.id, e);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEditStart(todo.id);
        }}
        style={{
          background: color,
          color: '#000',
          width: '100%',
          height: '100%',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: (isDragging || isResizing) 
            ? `0 8px 24px rgba(0,0,0,0.5), 0 0 0 2px ${color}` 
            : `0 2px 8px ${color}30`,
          border: `1px solid ${color}60`,
          overflow: 'hidden',
          cursor: isEditing ? 'text' : isDragging ? 'grabbing' : 'grab',
          position: 'relative',
          userSelect: 'none',
        }}
      >
        {/* Top row: title + badge + actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
          {isEditing ? (
            <input
              autoFocus
              value={editText}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEditSave();
                if (e.key === 'Escape') onEditCancel();
              }}
              onBlur={onEditSave}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                flex: 1, background: 'rgba(0,0,0,0.2)', border: 'none', outline: 'none',
                color: '#000', fontWeight: 600, fontSize: '0.85rem', padding: '2px 4px',
                borderRadius: '3px', fontFamily: 'inherit',
              }}
            />
          ) : (
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
              {todo.text.replace('!!', '')}
            </span>
          )}
          
          {/* Eisenhower Badge */}
          {quadrantLabel && !isEditing && (
            <span style={{
              fontSize: '0.55rem', fontWeight: 700, padding: '1px 5px',
              background: 'rgba(0,0,0,0.25)', borderRadius: '3px', color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0,
              lineHeight: '1.4',
            }}>
              {quadrantLabel}
            </span>
          )}

          {/* Action buttons - only visible on hover via CSS class */}
          <div className="calendar-event-actions" style={{ display: 'flex', gap: '2px', flexShrink: 0, opacity: isEditing ? 1 : 0, transition: 'opacity 0.15s' }}>
            {!isEditing && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onEditStart(todo.id); }}
                style={{ background: 'transparent', border: 'none', color: 'rgba(0,0,0,0.6)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                title="Edit"
              >
                <PencilSimple size={12} weight="bold" />
              </button>
            )}
            {isEditing && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onEditSave(); }}
                style={{ background: 'transparent', border: 'none', color: 'rgba(0,0,0,0.6)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                title="Save"
              >
                <Check size={12} weight="bold" />
              </button>
            )}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); updateTodoTime(todo.id, undefined, undefined); }}
              style={{ background: 'transparent', border: 'none', color: 'rgba(0,0,0,0.6)', cursor: 'pointer', padding: '2px', display: 'flex' }}
              title="Remove from Calendar"
            >
              <X size={12} weight="bold" />
            </button>
          </div>
        </div>

        {/* Time label */}
        {displayHeight >= 30 && (
          <span style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '2px' }}>
            {isDragging 
              ? `${formatTime(snapToGrid(displayTop))} - ${formatTime(snapToGrid(displayTop) + baseHeight)}`
              : isResizing 
                ? `${todo.startTime} - ${formatTime(startMins + resizeHeight)}`
                : `${todo.startTime} - ${todo.endTime}`
            }
          </span>
        )}

        {/* Resize Handle */}
        <div
          data-resize="true"
          onPointerDown={(e) => { e.stopPropagation(); onResizeStart(todo.id, e); }}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '8px',
            cursor: 'ns-resize', borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px',
            background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ width: '24px', height: '3px', borderRadius: '2px', background: 'rgba(0,0,0,0.3)' }} />
        </div>
      </div>
    </div>
  );
}



// ============ HOUR ROW COMPONENT ============

function HourRow({ hour }: { hour: number }) {
  const slotId = `calendar-${hour.toString().padStart(2, '0')}:00`;
  const { setNodeRef, isOver } = useDroppable({ id: slotId });
  return (
    <div ref={setNodeRef} style={{
      position: 'absolute', top: `${hour * HOUR_HEIGHT}px`, left: 0, right: 0,
      height: `${HOUR_HEIGHT}px`, borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', backgroundColor: isOver ? 'rgba(255,255,255,0.03)' : 'transparent',
      transition: 'background-color 0.15s',
    }}>
      <div style={{
        width: '60px', padding: '4px 8px 0 0', color: 'var(--text-secondary)',
        fontSize: '0.75rem', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.08)',
        fontFamily: 'Space Mono, monospace', opacity: 0.7,
      }}>
        {format(new Date(2000, 0, 1, hour, 0), 'h a')}
      </div>
    </div>
  );
}

// ============ CURRENT TIME INDICATOR ============

function CurrentTimeIndicator({ date }: { date: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const today = format(now, 'yyyy-MM-dd');
  if (date !== today) return null;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (
    <div style={{ position: 'absolute', top: `${minutes}px`, left: '56px', right: 0, zIndex: 50, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff4444', marginLeft: '-5px' }} />
      <div style={{ flex: 1, height: '2px', background: '#ff4444' }} />
    </div>
  );
}

// ============ MAIN CALENDAR GRID ============

type InteractionMode = 'idle' | 'selecting' | 'dragging' | 'resizing';

export function CalendarGrid() {
  const { todos, timeCanvasSelectedDate, activeCategoryId, addTodo, editTodo } = useStore();
  
  const [selection, setSelection] = useState<{ startY: number; endY: number } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [dragTodoId, setDragTodoId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [resizeTodoId, setResizeTodoId] = useState<string | null>(null);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [mode, setMode] = useState<InteractionMode>('idle');
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectionAnchorRef = useRef<number>(0);

  const activeTodos = useMemo(() => {
    return todos.filter(t => t.date === timeCanvasSelectedDate && t.categoryId === activeCategoryId && !t.parentId && t.startTime);
  }, [todos, timeCanvasSelectedDate, activeCategoryId]);

  const layouts = useMemo(() => getEventsLayout(activeTodos), [activeTodos]);

  useEffect(() => {
    if (scrollRef.current) { scrollRef.current.scrollTop = 8 * HOUR_HEIGHT - 20; }
  }, [timeCanvasSelectedDate]);

  const getRelativeY = useCallback((clientY: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    return clientY - rect.top;
  }, []);

  // ===== EDIT HANDLERS =====
  const handleEditStart = useCallback((todoId: string) => {
    const todo = activeTodos.find(t => t.id === todoId);
    if (todo) {
      setEditingTodoId(todoId);
      setEditText(todo.text);
    }
  }, [activeTodos]);

  const handleEditSave = useCallback(() => {
    if (editingTodoId && editText.trim()) {
      editTodo(editingTodoId, editText.trim());
    }
    setEditingTodoId(null);
    setEditText('');
  }, [editingTodoId, editText, editTodo]);

  const handleEditCancel = useCallback(() => {
    setEditingTodoId(null);
    setEditText('');
  }, []);

  // ===== DRAG TO SELECT (CREATE) =====
  const handleBackgroundPointerDown = useCallback((e: React.PointerEvent) => {
    if (mode !== 'idle') return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-event="true"]') || target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && (e.clientX - rect.left) < 60) return;

    // Dismiss edit mode
    if (editingTodoId) { handleEditSave(); }

    const y = getRelativeY(e.clientY);
    const snappedY = snapToGrid(y);
    selectionAnchorRef.current = snappedY;
    setSelection({ startY: snappedY, endY: snappedY + SNAP_INTERVAL });
    setIsAdding(false);
    setMode('selecting');

    const handleMove = (moveEv: PointerEvent) => {
      const currentY = getRelativeY(moveEv.clientY);
      const snappedCurrent = snapToGrid(currentY);
      const anchor = selectionAnchorRef.current;
      const newStartY = Math.max(0, Math.min(anchor, snappedCurrent));
      const newEndY = Math.min(24 * 60, Math.max(anchor + SNAP_INTERVAL, snappedCurrent + SNAP_INTERVAL));
      setSelection({ startY: newStartY, endY: newEndY });
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setMode('idle');
      setIsAdding(true);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [mode, getRelativeY, editingTodoId, handleEditSave]);

  // ===== DRAG TO MOVE EVENT =====
  const handleEventDragStart = useCallback((todoId: string, e: React.PointerEvent) => {
    if (mode !== 'idle') return;
    e.stopPropagation(); e.preventDefault();
    const todo = activeTodos.find(t => t.id === todoId);
    if (!todo) return;
    const startMins = parseTime(todo.startTime);
    const clickY = getRelativeY(e.clientY);
    const offsetFromTop = clickY - startMins;
    setDragTodoId(todoId); setDragOffset(0); setMode('dragging');
    setSelection(null); setIsAdding(false);

    const handleMove = (moveEv: PointerEvent) => {
      const currentY = getRelativeY(moveEv.clientY);
      const newTop = snapToGrid(currentY - offsetFromTop);
      setDragOffset(newTop - startMins);
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setDragTodoId(prevId => {
        if (prevId) {
          const currentTodo = useStore.getState().todos.find(t => t.id === prevId);
          if (currentTodo) {
            const currentStart = parseTime(currentTodo.startTime);
            const currentEnd = parseTime(currentTodo.endTime);
            const duration = currentEnd - currentStart;
            setDragOffset(prevOffset => {
              const newStart = Math.max(0, Math.min(24 * 60 - duration, snapToGrid(currentStart + prevOffset)));
              const newEnd = newStart + duration;
              useStore.getState().updateTodoTime(prevId, formatTime(newStart), formatTime(newEnd));
              return 0;
            });
          }
        }
        return null;
      });
      setMode('idle');
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [mode, activeTodos, getRelativeY]);

  // ===== DRAG TO RESIZE EVENT =====
  const handleEventResizeStart = useCallback((todoId: string, e: React.PointerEvent) => {
    if (mode !== 'idle') return;
    e.stopPropagation(); e.preventDefault();
    const todo = activeTodos.find(t => t.id === todoId);
    if (!todo) return;
    const startMins = parseTime(todo.startTime);
    const endMins = parseTime(todo.endTime) || (startMins + 60);
    setResizeTodoId(todoId); setResizeHeight(endMins - startMins); setMode('resizing');
    setSelection(null); setIsAdding(false);

    const handleMove = (moveEv: PointerEvent) => {
      const currentY = getRelativeY(moveEv.clientY);
      setResizeHeight(snapToGrid(Math.max(SNAP_INTERVAL, currentY - startMins)));
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setResizeTodoId(prevId => {
        if (prevId) {
          setResizeHeight(prevHeight => {
            const currentTodo = useStore.getState().todos.find(t => t.id === prevId);
            if (currentTodo) {
              const s = parseTime(currentTodo.startTime);
              const newEnd = Math.min(24 * 60, s + prevHeight);
              useStore.getState().updateTodoTime(prevId, currentTodo.startTime, formatTime(newEnd));
            }
            return 0;
          });
        }
        return null;
      });
      setMode('idle');
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [mode, activeTodos, getRelativeY]);

  // ===== CREATE TASK =====
  const handleCreateTask = useCallback(() => {
    if (!newTaskText.trim() || !activeCategoryId || !selection) return;
    addTodo(activeCategoryId, newTaskText.trim(), timeCanvasSelectedDate);
    const newStore = useStore.getState();
    const newTodo = newStore.todos[newStore.todos.length - 1];
    if (newTodo) {
      useStore.getState().updateTodoTime(newTodo.id, formatTime(selection.startY), formatTime(selection.endY));
    }
    setNewTaskText(''); setIsAdding(false); setSelection(null);
  }, [newTaskText, activeCategoryId, selection, timeCanvasSelectedDate, addTodo]);

  const dismissSelection = useCallback(() => { setSelection(null); setIsAdding(false); setNewTaskText(''); }, []);

  return (
    <div ref={scrollRef} className="calendar-grid-scroll" style={{ overflowY: 'auto', flex: 1, position: 'relative', cursor: mode === 'selecting' ? 'crosshair' : mode === 'dragging' ? 'grabbing' : 'default' }}>
      <div ref={containerRef} className="calendar-grid-inner" style={{ position: 'relative', height: `${24 * HOUR_HEIGHT}px`, minHeight: '100%' }} onPointerDown={handleBackgroundPointerDown}>
        {HOURS.map(hour => (<div key={`half-${hour}`} style={{ position: 'absolute', top: `${hour * HOUR_HEIGHT + 30}px`, left: '60px', right: 0, height: '1px', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />))}
        {HOURS.map(hour => (<HourRow key={hour} hour={hour} />))}
        <CurrentTimeIndicator date={timeCanvasSelectedDate} />

        {layouts.map(layout => (
          <div key={layout.id} data-event="true">
            <CalendarEvent
              todo={layout} layout={layout}
              onDragStart={handleEventDragStart} onResizeStart={handleEventResizeStart}
              onEditStart={handleEditStart}
              isDragging={dragTodoId === layout.id} isResizing={resizeTodoId === layout.id}
              isEditing={editingTodoId === layout.id}
              dragOffset={dragTodoId === layout.id ? dragOffset : 0}
              resizeHeight={resizeTodoId === layout.id ? resizeHeight : 0}
              editText={editingTodoId === layout.id ? editText : ''}
              onEditChange={setEditText} onEditSave={handleEditSave} onEditCancel={handleEditCancel}
            />
          </div>
        ))}

        {/* Selection Overlay */}
        {selection && (
          <div style={{ position: 'absolute', top: `${selection.startY}px`, height: `${Math.max(SNAP_INTERVAL, selection.endY - selection.startY)}px`, left: '60px', right: '4px', background: 'rgba(42, 221, 132, 0.12)', border: '2px solid var(--accent)', borderRadius: '6px', zIndex: 40, pointerEvents: isAdding ? 'auto' : 'none', display: 'flex', flexDirection: 'column', padding: '8px 12px', backdropFilter: 'blur(4px)', transition: isAdding ? 'none' : 'top 0.05s, height 0.05s', boxShadow: '0 4px 16px rgba(42, 221, 132, 0.15)' }} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isAdding ? '8px' : 0 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'Space Mono, monospace' }}>{formatTimeDisplay(selection.startY)} — {formatTimeDisplay(selection.endY)}</span>
              {isAdding && (<button onClick={dismissSelection} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex' }}><X size={14} /></button>)}
            </div>
            {isAdding && (
              <div style={{ display: 'flex', gap: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px 10px', alignItems: 'center' }}>
                <Plus size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <input autoFocus value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTask(); if (e.key === 'Escape') dismissSelection(); }} placeholder="Add event..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.9rem' }} />
                <button onClick={handleCreateTask} disabled={!newTaskText.trim()} style={{ background: newTaskText.trim() ? 'var(--accent)' : 'transparent', border: newTaskText.trim() ? 'none' : '1px solid var(--border)', color: newTaskText.trim() ? 'var(--bg-color)' : 'var(--text-secondary)', padding: '4px 10px', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 600, cursor: newTaskText.trim() ? 'pointer' : 'default', fontFamily: 'inherit', textTransform: 'uppercase' }}>Add</button>
              </div>
            )}
          </div>
        )}

        {/* Ghost preview while dragging */}
        {mode === 'dragging' && dragTodoId && (() => {
          const todo = activeTodos.find(t => t.id === dragTodoId);
          if (!todo) return null;
          const startMins = parseTime(todo.startTime);
          const endMins = parseTime(todo.endTime) || (startMins + 60);
          const duration = endMins - startMins;
          const newStart = snapToGrid(startMins + dragOffset);
          const color = getEventColor(todo.eisenhowerQuadrant);
          return (
            <div style={{ position: 'absolute', top: `${newStart}px`, height: `${duration}px`, left: '60px', right: '4px', background: `${color}15`, border: `2px dashed ${color}`, borderRadius: '6px', zIndex: 5, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
              <span style={{ fontSize: '0.75rem', color, fontWeight: 600 }}>{formatTime(newStart)} - {formatTime(newStart + duration)}</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
