import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface MindmapNodeData {
  label: string;
  isRoot: boolean;
  color?: string;
  shape?: 'rectangle' | 'rounded' | 'ellipse' | 'pill';
  collapsed?: boolean;
  childCount?: number;
  hasNotes?: boolean;
  highlighted?: boolean;
  onLabelChange: (newLabel: string) => void;
  onAddChild: () => void;
  onAddSibling: () => void;
  onDelete: () => void;
  onToggleCollapse: () => void;
  onColorChange: (color: string) => void;
  onShapeChange: (shape: string) => void;
}

const COLORS = ['#ffffff', '#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#cc5de8', '#ff8787'];

function MindmapNodeComponent({ data, selected }: NodeProps & { data: MindmapNodeData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setEditValue(data.label);
    setIsEditing(true);
  };

  const handleSubmit = () => {
    if (editValue.trim()) {
      data.onLabelChange(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(data.label);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSubmit();
      data.onAddChild();
    }
  };

  const accentColor = data.color || 'var(--accent)';
  const shapeClass = data.shape ? `mindmap-node-shape-${data.shape}` : '';

  return (
    <div
      className={`mindmap-node ${data.isRoot ? 'mindmap-node-root' : ''} ${selected ? 'mindmap-node-selected' : ''} ${shapeClass} ${data.highlighted ? 'mindmap-node-highlighted' : ''}`}
      style={{ '--node-accent': accentColor } as React.CSSProperties}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} className="mindmap-handle" />
      
      {isEditing ? (
        <input
          ref={inputRef}
          className="mindmap-node-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div className="mindmap-node-label">
          {data.label}
          {data.hasNotes && <span className="mindmap-node-notes-indicator" title="Has notes">*</span>}
        </div>
      )}

      {/* Collapse indicator */}
      {data.childCount && data.childCount > 0 && (
        <button
          className={`mindmap-node-collapse-btn ${data.collapsed ? 'collapsed' : ''}`}
          onClick={(e) => { e.stopPropagation(); data.onToggleCollapse(); }}
          title={data.collapsed ? `Expand (${data.childCount} hidden)` : 'Collapse'}
        >
          {data.collapsed ? `+${data.childCount}` : '−'}
        </button>
      )}

      <Handle type="source" position={Position.Bottom} className="mindmap-handle" />

      {/* Actions on selected */}
      {selected && !isEditing && (
        <div className="mindmap-node-actions">
          <button
            className="mindmap-node-action-btn"
            onClick={(e) => { e.stopPropagation(); data.onAddChild(); }}
            title="Add child (Tab)"
          >
            +
          </button>
          <button
            className="mindmap-node-action-btn mindmap-node-action-sibling"
            onClick={(e) => { e.stopPropagation(); data.onAddSibling(); }}
            title="Add sibling (Enter)"
          >
            ↵
          </button>
          <button
            className="mindmap-node-action-btn mindmap-node-action-color"
            onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
            title="Color"
            style={{ background: data.color || 'transparent' }}
          >
            ●
          </button>
          {!data.isRoot && (
            <button
              className="mindmap-node-action-btn mindmap-node-action-delete"
              onClick={(e) => { e.stopPropagation(); data.onDelete(); }}
              title="Delete (Del)"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Color picker dropdown */}
      {showColorPicker && selected && (
        <div className="mindmap-color-picker" onClick={(e) => e.stopPropagation()}>
          {COLORS.map(c => (
            <button
              key={c}
              className={`mindmap-color-swatch ${data.color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => { data.onColorChange(c); setShowColorPicker(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(MindmapNodeComponent);
