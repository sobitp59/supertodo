import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { format } from 'date-fns';
import { X } from '@phosphor-icons/react';
import { useDroppable, useDraggable } from '@dnd-kit/core';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

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
              if (startI < endJ && endI > startJ) {
                 collision = true;
                 break;
              }
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
           layout[j].maxCols = Math.max(layout[j].maxCols, groupMaxCol);
           groupMaxCol = Math.max(layout[j].maxCols, groupMaxCol);
        }
     }
     layout[i].maxCols = groupMaxCol;
  }
  return layout;
}

function CalendarEvent({ todo, layout }: { todo: any, layout: any }) {
  const { updateTodoTime } = useStore();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    data: { type: 'calendar-event', originalStartTime: todo.startTime, originalEndTime: todo.endTime }
  });

  const startMins = parseTime(todo.startTime);
  const endMins = parseTime(todo.endTime) || (startMins + 60);
  const height = Math.max(15, endMins - startMins);
  
  const style = {
    position: 'absolute' as const,
    top: `${startMins}px`,
    height: `${height}px`,
    left: `calc(60px + ${(layout.colIndex / layout.maxCols) * calcWidthPercent(layout.maxCols)})`,
    width: `calc(${100 / layout.maxCols}% - ${60 / layout.maxCols}px - 8px)`,
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 100 : 10 + layout.colIndex,
    padding: '2px 4px',
    boxSizing: 'border-box' as const,
    opacity: isDragging ? 0.8 : 1,
    transition: isDragging ? 'none' : 'all 0.2s ease'
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div style={{
          background: 'var(--accent)', 
          color: 'var(--bg-color)', 
          width: '100%',
          height: '100%',
          borderRadius: '6px', 
          padding: '6px 10px', 
          fontSize: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.2)',
          overflow: 'hidden',
          cursor: 'grab'
      }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {todo.text.replace('!!', '')}
            </span>
            <button 
                onPointerDown={(e) => { e.stopPropagation(); updateTodoTime(todo.id, undefined, undefined); }}
                style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7, padding: 0 }}
                title="Remove from Calendar"
            >
                <X size={14} weight="bold" />
            </button>
          </div>
          <span style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px' }}>
            {todo.startTime} - {todo.endTime}
          </span>
      </div>
    </div>
  );
}

function calcWidthPercent(maxCols: number) {
    return '100%';
}

function HourDropZone({ hour, slotId }: { hour: number, slotId: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId });
  return (
    <div 
        ref={setNodeRef} 
        style={{ 
            position: 'absolute', 
            top: `${hour * 60}px`, 
            left: 0, 
            right: 0, 
            height: '60px', 
            borderBottom: '1px solid var(--border)', 
            display: 'flex',
            backgroundColor: isOver ? 'var(--surface-light)' : 'transparent',
            transition: 'background-color 0.2s'
        }}
    >
        <div style={{ width: '60px', padding: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'right', borderRight: '1px solid var(--border)' }}>
            {format(new Date().setHours(hour, 0), 'h a')}
        </div>
    </div>
  );
}

export function CalendarGrid() {
  const { todos, timeCanvasSelectedDate, activeCategoryId, addTodo, updateTodoTime } = useStore();
  const [selection, setSelection] = useState<{ startY: number, endY: number } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeTodos = useMemo(() => {
    return todos.filter(t => t.date === timeCanvasSelectedDate && t.categoryId === activeCategoryId && !t.parentId && t.startTime);
  }, [todos, timeCanvasSelectedDate, activeCategoryId]);

  const layouts = useMemo(() => getEventsLayout(activeTodos), [activeTodos]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only start selection if clicking directly on the background
    const target = e.target as HTMLElement;
    if (target.closest('[data-dnd-kit-draggable]')) return;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON') return;
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const snappedY = Math.floor(y / 15) * 15;
    
    setSelection({ startY: snappedY, endY: snappedY + 30 });
    setIsAdding(false);
    
    const handlePointerMove = (moveEv: PointerEvent) => {
        const currentY = moveEv.clientY - rect.top;
        const snappedCurrent = Math.floor(currentY / 15) * 15;
        setSelection(prev => {
            if (!prev) return null;
            // Allow dragging up or down, but keep startY as the top and endY as the bottom
            const newStartY = Math.min(snappedY, snappedCurrent);
            const newEndY = Math.max(snappedY + 15, snappedCurrent + 15);
            return { startY: newStartY, endY: newEndY };
        });
    };
    
    const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        setIsAdding(true);
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleCreateTask = () => {
    if (!newTaskText.trim() || !activeCategoryId || !selection) return;
    
    addTodo(activeCategoryId, newTaskText.trim(), timeCanvasSelectedDate);
    
    const newStore = useStore.getState();
    const newTodo = newStore.todos[newStore.todos.length - 1];
    
    if (newTodo) {
        const startStr = formatTime(selection.startY);
        const endStr = formatTime(selection.endY);
        useStore.getState().updateTodoTime(newTodo.id, startStr, endStr);
    }
    
    setNewTaskText('');
    setIsAdding(false);
    setSelection(null);
  };

  return (
     <div 
        ref={scrollRef}
        className="calendar-grid-scroll" 
        style={{ overflowY: 'auto', flex: 1, paddingRight: '12px', position: 'relative' }}
        onPointerDown={handlePointerDown}
     >
         <div 
            ref={containerRef}
            className="calendar-grid-inner" 
            style={{ position: 'relative', height: `${24 * 60}px` }}
         >
             {/* Background Grid */}
             {HOURS.map(hour => {
                 const slotId = `calendar-${hour.toString().padStart(2, '0')}:00`;
                 return <HourDropZone key={hour} hour={hour} slotId={slotId} />;
             })}

             {/* Events */}
             {layouts.map(layout => (
                 <CalendarEvent key={layout.id} todo={layout} layout={layout} />
             ))}

             {/* Selection Overlay */}
             {selection && (
                 <div style={{
                     position: 'absolute',
                     top: `${selection.startY}px`,
                     height: `${selection.endY - selection.startY}px`,
                     left: '60px',
                     right: '4px',
                     background: 'rgba(255, 255, 255, 0.1)',
                     border: '2px solid var(--accent)',
                     borderRadius: '6px',
                     zIndex: 50,
                     pointerEvents: 'auto',
                     display: 'flex',
                     padding: '8px',
                     backdropFilter: 'blur(4px)'
                 }} onClick={(e) => e.stopPropagation()}>
                     {isAdding && (
                         <div style={{ width: '100%', display: 'flex', gap: '8px', flexDirection: 'column' }}>
                             <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatTime(selection.startY)} - {formatTime(selection.endY)}</span>
                             <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-color)', padding: '4px', borderRadius: '4px' }}>
                                 <input 
                                     autoFocus
                                     value={newTaskText}
                                     onChange={(e) => setNewTaskText(e.target.value)}
                                     onKeyDown={(e) => {
                                         if (e.key === 'Enter') handleCreateTask();
                                         if (e.key === 'Escape') { setIsAdding(false); setSelection(null); }
                                     }}
                                     placeholder="New event title..."
                                     style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)' }}
                                 />
                                 <button onClick={() => { setIsAdding(false); setSelection(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                     <X size={16} />
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
             )}
         </div>
     </div>
  );
}
