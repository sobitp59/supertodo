import { useMemo, useRef } from 'react';
import { useStore, EisenhowerQuadrant } from '../../store';
import { EisenhowerMatrix } from './EisenhowerMatrix';
import { CalendarGrid } from './CalendarGrid';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { format, parseISO, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { CaretLeft, CaretRight, CalendarBlank } from '@phosphor-icons/react';

export function TimeCanvasView() {
  const { 
      timeCanvasSelectedDate, 
      setTimeCanvasSelectedDate, 
      todos, 
      updateTodoQuadrant, 
      updateTodoTime,
      activeCategoryId
  } = useStore();

  const dateInputRef = useRef<HTMLInputElement>(null);

  const activeTodos = useMemo(() => {
    return todos.filter(t => t.date === timeCanvasSelectedDate && t.categoryId === activeCategoryId && !t.parentId);
  }, [todos, timeCanvasSelectedDate, activeCategoryId]);

  // No longer auto-fullscreen — user controls this via the window toggle button

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const todoId = active.id as string;
    let overId = over.id as string;
    
    const isQuadrantDrop = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important', 'unclassified'].includes(overId);
    
    if (!isQuadrantDrop && !overId.startsWith('calendar-')) {
        const overTodo = activeTodos.find(t => t.id === overId);
        if (overTodo) {
            overId = overTodo.eisenhowerQuadrant || 'unclassified';
        }
    }

    if (overId.startsWith('calendar-')) {
        const timeStr = overId.replace('calendar-', '');
        const hour = parseInt(timeStr.split(':')[0], 10);
        const endStr = `${(hour + 1).toString().padStart(2, '0')}:00`;
        updateTodoTime(todoId, timeStr, endStr);
    } else {
        if (overId === 'unclassified') {
           updateTodoQuadrant(todoId, undefined);
        } else {
           updateTodoQuadrant(todoId, overId as EisenhowerQuadrant);
        }
    }
  };

  const handlePrevDay = () => {
    const prev = subDays(parseISO(timeCanvasSelectedDate), 1);
    setTimeCanvasSelectedDate(format(prev, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const next = addDays(parseISO(timeCanvasSelectedDate), 1);
    setTimeCanvasSelectedDate(format(next, 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    setTimeCanvasSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const getDisplayDate = () => {
    const date = parseISO(timeCanvasSelectedDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM do, yyyy');
  };

  return (
    <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: '24px', height: '100%', overflow: 'hidden', padding: '16px' }}>
          <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', paddingRight: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Canvas</h2>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '4px 8px', border: '1px solid var(--border)' }}>
                <button onClick={handlePrevDay} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}>
                  <CaretLeft size={18} />
                </button>
                
                <div 
                  onClick={handleToday}
                  style={{ 
                    fontFamily: 'Space Mono, monospace', 
                    fontSize: '0.9rem', 
                    fontWeight: 600, 
                    color: 'var(--text-primary)',
                    minWidth: '110px',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                  title="Click to jump to Today"
                >
                  {getDisplayDate()}
                </div>
                
                <button onClick={handleNextDay} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}>
                  <CaretRight size={18} />
                </button>

                {/* Date picker button */}
                <button
                  onClick={() => dateInputRef.current?.showPicker()}
                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px 6px', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}
                  title="Pick a date"
                >
                  <CalendarBlank size={16} />
                </button>
                
                <input 
                  ref={dateInputRef}
                  type="date" 
                  value={timeCanvasSelectedDate} 
                  onChange={(e) => { if (e.target.value) setTimeCanvasSelectedDate(e.target.value); }}
                  style={{ 
                    position: 'absolute',
                    opacity: 0,
                    width: '0',
                    height: '0',
                    pointerEvents: 'none'
                  }}
                />
              </div>
            </div>
            
            <CalendarGrid />
          </div>
          
          <div style={{ flex: '1', minWidth: 0 }}>
             <EisenhowerMatrix />
          </div>
        </div>
    </DndContext>
  );
}
