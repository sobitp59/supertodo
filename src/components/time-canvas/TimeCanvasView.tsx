import { useMemo, useRef, useState } from 'react';
import { useStore, EisenhowerQuadrant } from '../../store';
import { EisenhowerMatrix, QUADRANT_COLORS } from './EisenhowerMatrix';
import { CalendarGrid } from './CalendarGrid';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { format, parseISO, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { CaretLeft, CaretRight, CalendarBlank, FloppyDisk, ListBullets, Clock, Fire, Trash } from '@phosphor-icons/react';
import { toast } from 'sonner';

export function TimeCanvasView() {
  const { 
      timeCanvasSelectedDate, 
      setTimeCanvasSelectedDate, 
      todos, 
      updateTodoQuadrant, 
      updateTodoTime,
      activeCategoryId,
      timeBlockTemplates,
      saveTimeBlockTemplate,
      applyTimeBlockTemplate,
      removeTimeBlockTemplate,
  } = useStore();

  const dateInputRef = useRef<HTMLInputElement>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const activeTodos = useMemo(() => {
    return todos.filter(t => t.date === timeCanvasSelectedDate && t.categoryId === activeCategoryId && !t.parentId);
  }, [todos, timeCanvasSelectedDate, activeCategoryId]);

  const activeDragTodo = activeDragId ? activeTodos.find(t => t.id === activeDragId) : null;

  // Summary stats
  const scheduledTodos = useMemo(() => {
    return todos.filter(t => t.date === timeCanvasSelectedDate && t.categoryId === activeCategoryId && !t.parentId && t.startTime);
  }, [todos, timeCanvasSelectedDate, activeCategoryId]);

  const stats = useMemo(() => {
    let totalScheduledMins = 0;
    let focusMins = 0; // urgent-important + not-urgent-important

    scheduledTodos.forEach(t => {
      if (t.startTime && t.endTime) {
        const [sh, sm] = t.startTime.split(':').map(Number);
        const [eh, em] = t.endTime.split(':').map(Number);
        const duration = (eh * 60 + em) - (sh * 60 + sm);
        if (duration > 0) {
          totalScheduledMins += duration;
          if (t.eisenhowerQuadrant === 'urgent-important' || t.eisenhowerQuadrant === 'not-urgent-important') {
            focusMins += duration;
          }
        }
      }
    });

    const freeHours = Math.max(0, 16 - totalScheduledMins / 60); // assume 16 waking hours
    const focusPercent = totalScheduledMins > 0 ? Math.round((focusMins / totalScheduledMins) * 100) : 0;

    return {
      scheduledCount: scheduledTodos.length,
      totalScheduledHrs: (totalScheduledMins / 60).toFixed(1),
      freeHrs: freeHours.toFixed(1),
      focusPercent,
    };
  }, [scheduledTodos]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
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

  const handleSaveTemplate = () => {
    if (newTemplateName.trim()) {
      saveTimeBlockTemplate(newTemplateName.trim(), timeCanvasSelectedDate);
      toast.success(`Template "${newTemplateName.trim()}" saved`);
      setNewTemplateName('');
      setIsSavingTemplate(false);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    applyTimeBlockTemplate(templateId, timeCanvasSelectedDate);
    toast.success('Template applied');
    setShowTemplateMenu(false);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: '24px', height: '100%', overflow: 'hidden', padding: '16px' }}>
          <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', paddingRight: '24px' }}>
            {/* Header with date nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Planner</h2>
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
                  style={{ position: 'absolute', opacity: 0, width: '0', height: '0', pointerEvents: 'none' }}
                />
              </div>
            </div>

            {/* Summary Stats Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ListBullets size={12} color="var(--text-secondary)" />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{stats.scheduledCount} blocks</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={12} color="var(--text-secondary)" />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{stats.totalScheduledHrs}h scheduled</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>{stats.freeHrs}h free</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' }}>
                <Fire size={12} color={stats.focusPercent >= 50 ? 'var(--accent)' : 'var(--text-secondary)'} />
                <span style={{ fontSize: '0.7rem', color: stats.focusPercent >= 50 ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 600 }}>
                  {stats.focusPercent}% focus
                </span>
              </div>
            </div>

            {/* Templates Bar */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
              {/* Save template */}
              {isSavingTemplate ? (
                <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                  <input
                    autoFocus
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTemplate();
                      if (e.key === 'Escape') { setIsSavingTemplate(false); setNewTemplateName(''); }
                    }}
                    placeholder="Template name..."
                    style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', padding: '4px 8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.7rem', outline: 'none' }}
                  />
                  <button onClick={handleSaveTemplate} style={{ background: 'var(--accent)', border: 'none', color: 'var(--bg-color)', padding: '4px 8px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                  <button onClick={() => { setIsSavingTemplate(false); setNewTemplateName(''); }} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '4px 8px', fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setIsSavingTemplate(true)}
                    disabled={scheduledTodos.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px solid var(--border)', color: scheduledTodos.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', padding: '4px 10px', fontSize: '0.65rem', cursor: scheduledTodos.length > 0 ? 'pointer' : 'default', fontFamily: 'inherit', opacity: scheduledTodos.length > 0 ? 1 : 0.5 }}
                    title="Save today's layout as a template"
                  >
                    <FloppyDisk size={12} /> Save Template
                  </button>

                  {/* Apply template dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                      disabled={timeBlockTemplates.length === 0}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px solid var(--border)', color: timeBlockTemplates.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', padding: '4px 10px', fontSize: '0.65rem', cursor: timeBlockTemplates.length > 0 ? 'pointer' : 'default', fontFamily: 'inherit', opacity: timeBlockTemplates.length > 0 ? 1 : 0.5 }}
                      title="Apply a saved template"
                    >
                      <ListBullets size={12} /> Templates ({timeBlockTemplates.length})
                    </button>

                    {showTemplateMenu && timeBlockTemplates.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--surface)', border: '1px solid var(--border)', zIndex: 100, minWidth: '180px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                        {timeBlockTemplates.map(tmpl => (
                          <div key={tmpl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', cursor: 'pointer', transition: 'background 0.15s', fontSize: '0.75rem' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span onClick={() => handleApplyTemplate(tmpl.id)} style={{ flex: 1, color: 'var(--text-primary)' }}>
                              {tmpl.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>({tmpl.blocks.length} blocks)</span>
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeTimeBlockTemplate(tmpl.id); toast.success('Template deleted'); }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                              title="Delete template"
                            >
                              <Trash size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <CalendarGrid />
          </div>
          
          <div style={{ flex: '1', minWidth: 0 }}>
             <EisenhowerMatrix />
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeDragTodo ? (
            <div style={{
              padding: '8px 12px',
              background: 'var(--surface)',
              borderRadius: '6px',
              cursor: 'grabbing',
              border: `1px solid ${activeDragTodo.eisenhowerQuadrant ? QUADRANT_COLORS[activeDragTodo.eisenhowerQuadrant] || 'var(--accent)' : 'var(--accent)'}`,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-primary)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)',
              transform: 'scale(1.05)',
              maxWidth: '280px',
            }}>
              <div style={{ width: '4px', height: '16px', borderRadius: '2px', background: activeDragTodo.eisenhowerQuadrant ? QUADRANT_COLORS[activeDragTodo.eisenhowerQuadrant] || 'var(--accent)' : 'var(--accent)', flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeDragTodo.text.replace('!!', '')}
              </span>
            </div>
          ) : null}
        </DragOverlay>
    </DndContext>
  );
}
