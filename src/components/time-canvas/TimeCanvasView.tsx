import { useMemo } from 'react';
import { useStore, EisenhowerQuadrant } from '../../store';
import { EisenhowerMatrix } from './EisenhowerMatrix';
import { CalendarGrid } from './CalendarGrid';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { format, parseISO, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

export function TimeCanvasView() {
  const { 
      timeCanvasSelectedDate, 
      setTimeCanvasSelectedDate, 
      todos, 
      updateTodoQuadrant, 
      updateTodoTime,
      activeCategoryId
  } = useStore();

  const activeTodos = useMemo(() => {
    return todos.filter(t => t.date === timeCanvasSelectedDate && t.categoryId === activeCategoryId && !t.parentId);
  }, [todos, timeCanvasSelectedDate, activeCategoryId]);

  // Auto-fullscreen mode for the canvas
  useEffect(() => {
    try {
      const win = getCurrentWindow();
      win.setFullscreen(true).catch(() => {});
      return () => {
        win.setFullscreen(false).catch(() => {});
      };
    } catch (e) {
      // Ignore if not in Tauri
    }
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const todoId = active.id as string;
    let overId = over.id as string;
    
    // Check if dropped directly onto a sortable item instead of the droppable zone
    const isQuadrantDrop = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important', 'unclassified'].includes(overId);
    
    if (!isQuadrantDrop && !overId.startsWith('calendar-')) {
        // find which quadrant this item belongs to
        const overTodo = activeTodos.find(t => t.id === overId);
        if (overTodo) {
            overId = overTodo.eisenhowerQuadrant || 'unclassified';
        }
    }

    if (overId.startsWith('calendar-')) {
        // Handle dropping onto calendar slot
        // ID format: 'calendar-09:00'
        const timeStr = overId.replace('calendar-', '');
        const hour = parseInt(timeStr.split(':')[0], 10);
        const endStr = `${(hour + 1).toString().padStart(2, '0')}:00`;
        
        updateTodoTime(todoId, timeStr, endStr);
    } else {
        // Handle dropping into matrix
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
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface-light)', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <button onClick={handlePrevDay} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}>
                  <CaretLeft size={20} />
                </button>
                
                <div 
                  onClick={handleToday}
                  style={{ 
                    fontFamily: 'Space Mono, monospace', 
                    fontSize: '1rem', 
                    fontWeight: 600, 
                    color: 'var(--text-primary)',
                    minWidth: '120px',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                  title="Click to jump to Today"
                >
                  {getDisplayDate()}
                </div>
                
                <button onClick={handleNextDay} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}>
                  <CaretRight size={20} />
                </button>
                
                <input 
                  type="date" 
                  value={timeCanvasSelectedDate} 
                  onChange={(e) => setTimeCanvasSelectedDate(e.target.value)}
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
