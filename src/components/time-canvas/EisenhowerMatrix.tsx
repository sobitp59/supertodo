import { useMemo } from 'react';
import { useStore, EisenhowerQuadrant } from '../../store';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const QUADRANTS: { id: EisenhowerQuadrant; label: string; color: string }[] = [
  { id: 'urgent-important', label: 'Urgent & Important (Do)', color: '#ff4d4f' },
  { id: 'not-urgent-important', label: 'Important, Not Urgent (Schedule)', color: '#faad14' },
  { id: 'urgent-not-important', label: 'Urgent, Not Important (Delegate)', color: '#1890ff' },
  { id: 'not-urgent-not-important', label: 'Not Urgent & Not Important (Delete)', color: '#8c8c8c' },
];

function SortableTodoItem({ id, text }: { id: string; text: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '8px 12px',
    background: 'var(--surface-light, rgba(255,255,255,0.08))',
    borderRadius: '6px',
    marginBottom: '8px',
    cursor: 'grab',
    border: '1px solid var(--border)',
    fontSize: '0.9rem',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {text.replace('!!', '')}
    </div>
  );
}

function DroppableZone({ id, label, color, items }: { id: string; label: string; color: string; items: any[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`quadrant-box ${isOver ? 'is-over' : ''}`} 
      style={{ 
        border: `2px ${isOver ? 'dashed' : 'solid'} ${color}`, 
        borderRadius: '8px', 
        padding: '12px', 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '150px',
        backgroundColor: isOver ? `${color}11` : 'transparent',
        transition: 'all 0.2s ease'
      }}
    >
      <h3 style={{ fontSize: '0.9rem', color: color, margin: '0 0 12px 0' }}>{label}</h3>
      <SortableContext id={id} items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div style={{ flex: 1 }}>
          {items.map(t => (
            <SortableTodoItem key={t.id} id={t.id} text={t.text} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function EisenhowerMatrix() {
  const { todos, timeCanvasSelectedDate, activeCategoryId } = useStore();

  const activeTodos = useMemo(() => {
    return todos.filter(t => t.date === timeCanvasSelectedDate && t.categoryId === activeCategoryId && !t.parentId);
  }, [todos, timeCanvasSelectedDate, activeCategoryId]);

  const unclassifiedTodos = activeTodos.filter(t => !t.eisenhowerQuadrant);

  return (
    <div className="matrix-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto', paddingRight: '8px' }}>
      <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Eisenhower Matrix</h2>
        
        <div className="matrix-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {QUADRANTS.map(quad => {
            const quadrantTodos = activeTodos.filter(t => t.eisenhowerQuadrant === quad.id);
            return (
              <DroppableZone 
                key={quad.id} 
                id={quad.id} 
                label={quad.label} 
                color={quad.color} 
                items={quadrantTodos} 
              />
            );
          })}
        </div>
        
        <DroppableZone 
          id="unclassified" 
          label="Unclassified Todos" 
          color="var(--border)" 
          items={unclassifiedTodos} 
        />
      </div>
  );
}
