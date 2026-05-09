import { useMemo } from 'react';
import { useStore, EisenhowerQuadrant } from '../../store';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';

const QUADRANTS: { id: EisenhowerQuadrant; label: string; shortLabel: string; color: string; emoji: string }[] = [
  { id: 'urgent-important', label: 'Do First', shortLabel: 'DO', color: '#ff4d4f', emoji: '🔥' },
  { id: 'not-urgent-important', label: 'Schedule', shortLabel: 'SCHEDULE', color: '#faad14', emoji: '📅' },
  { id: 'urgent-not-important', label: 'Delegate', shortLabel: 'DELEGATE', color: '#1890ff', emoji: '👋' },
  { id: 'not-urgent-not-important', label: 'Eliminate', shortLabel: 'ELIMINATE', color: '#8c8c8c', emoji: '🗑️' },
];

export const QUADRANT_COLORS: Record<string, string> = {
  'urgent-important': '#ff4d4f',
  'not-urgent-important': '#faad14',
  'urgent-not-important': '#1890ff',
  'not-urgent-not-important': '#8c8c8c',
};

function SortableTodoItem({ id, text, color }: { id: string; text: string; color: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  return (
    <motion.div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      layout
    >
      <div style={{
        padding: '8px 12px',
        background: `${color}12`,
        borderRadius: '6px',
        marginBottom: '6px',
        cursor: 'grab',
        border: `1px solid ${color}40`,
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--text-primary)',
        transition: 'box-shadow 0.2s, transform 0.15s',
        boxShadow: `0 2px 6px ${color}15`,
      }}>
        <div style={{ width: '4px', height: '16px', borderRadius: '2px', background: color, flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {text.replace('!!', '')}
        </span>
      </div>
    </motion.div>
  );
}

function QuadrantZone({ id, shortLabel, color, emoji, items, position }: { 
  id: string; shortLabel: string; color: string; emoji: string; items: any[]; position: 'tl' | 'tr' | 'bl' | 'br' 
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const borderStyles: Record<string, string> = {
    tl: '0 2px 2px 0',
    tr: '0 0 2px 2px',
    bl: '2px 2px 0 0',
    br: '2px 0 0 2px',
  };
  
  return (
    <div 
      ref={setNodeRef} 
      style={{ 
        border: `1px solid ${isOver ? color : 'rgba(255,255,255,0.08)'}`,
        borderRadius: borderStyles[position],
        padding: '14px',
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '140px',
        backgroundColor: isOver ? `${color}08` : 'transparent',
        transition: 'all 0.25s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Quadrant header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <span style={{ fontSize: '1rem' }}>{emoji}</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '1px' }}>{shortLabel}</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>{items.length}</span>
      </div>
      
      <SortableContext id={id} items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div style={{ flex: 1, minHeight: '40px' }}>
          <AnimatePresence mode="popLayout">
            {items.map(t => (
              <SortableTodoItem key={t.id} id={t.id} text={t.text} color={color} />
            ))}
          </AnimatePresence>
          {items.length === 0 && (
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              height: '100%', minHeight: '60px',
              border: `1px dashed ${color}30`, borderRadius: '4px',
              color: `${color}60`, fontSize: '0.7rem', textAlign: 'center', padding: '8px'
            }}>
              drop items here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function UnclassifiedZone({ items }: { items: any[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unclassified' });
  
  return (
    <div 
      ref={setNodeRef} 
      style={{ 
        border: `1px solid ${isOver ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '6px',
        padding: '12px',
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: isOver ? 'rgba(255,255,255,0.02)' : 'transparent',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Inbox / Unclassified
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '8px' }}>
          {items.length}
        </span>
      </div>
      <SortableContext id="unclassified" items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <AnimatePresence mode="popLayout">
            {items.map(t => (
              <SortableTodoItem key={t.id} id={t.id} text={t.text} color="var(--border)" />
            ))}
          </AnimatePresence>
        </div>
        {items.length === 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '8px 0', textAlign: 'center' }}>
            all items classified ✓
          </div>
        )}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto', paddingRight: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Priority Matrix</h2>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          {activeTodos.length} tasks
        </span>
      </div>

      {/* Axis labels */}
      <div style={{ position: 'relative' }}>
        {/* Urgency label (top) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            ← urgent &nbsp;&nbsp;&nbsp;&nbsp; not urgent →
          </span>
        </div>

        {/* 2x2 Quadrant Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', position: 'relative' }}>
          {/* Importance label (left side) */}
          <div style={{ 
            position: 'absolute', left: '-24px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)',
            fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap'
          }}>
            important ↑
          </div>

          {QUADRANTS.map((quad, idx) => {
            const positions: ('tl' | 'tr' | 'bl' | 'br')[] = ['tl', 'tr', 'bl', 'br'];
            const quadrantTodos = activeTodos.filter(t => t.eisenhowerQuadrant === quad.id);
            return (
              <QuadrantZone
                key={quad.id}
                id={quad.id}
                shortLabel={quad.shortLabel}
                color={quad.color}
                emoji={quad.emoji}
                items={quadrantTodos}
                position={positions[idx]}
              />
            );
          })}
        </div>
      </div>
        
      {/* Unclassified Inbox */}
      <UnclassifiedZone items={unclassifiedTodos} />
    </div>
  );
}
