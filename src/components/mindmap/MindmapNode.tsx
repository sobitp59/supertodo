import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface MindmapNodeData {
  label: string;
  isRoot: boolean;
  color?: string;
  onLabelChange: (newLabel: string) => void;
  onAddChild: () => void;
  onDelete: () => void;
}

function MindmapNodeComponent({ data, selected }: NodeProps & { data: MindmapNodeData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
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

  return (
    <div
      className={`mindmap-node ${data.isRoot ? 'mindmap-node-root' : ''} ${selected ? 'mindmap-node-selected' : ''}`}
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
        <div className="mindmap-node-label">{data.label}</div>
      )}

      <Handle type="source" position={Position.Bottom} className="mindmap-handle" />

      {selected && !isEditing && (
        <div className="mindmap-node-actions">
          <button
            className="mindmap-node-action-btn"
            onClick={(e) => { e.stopPropagation(); data.onAddChild(); }}
            title="Add child (Tab)"
          >
            +
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
    </div>
  );
}

export default memo(MindmapNodeComponent);
