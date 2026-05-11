import { useState } from 'react';
import { Plus, Trash, TreeStructure, PencilSimple } from '@phosphor-icons/react';
import { useStore } from '../../store';
import { MindmapCanvas } from './MindmapCanvas';

export function MindmapView() {
  const { mindmaps, activeMindmapId, addMindmap, removeMindmap, setActiveMindmap, updateMindmapTitle } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const activeMindmap = mindmaps.find((m) => m.id === activeMindmapId);

  const handleCreate = () => {
    if (newTitle.trim()) {
      addMindmap(newTitle.trim());
      setNewTitle('');
      setIsCreating(false);
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') {
      setIsCreating(false);
      setNewTitle('');
    }
  };

  const handleRenameSubmit = (id: string) => {
    if (editTitle.trim()) {
      updateMindmapTitle(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="mindmap-view">
      {/* Sidebar */}
      <div className="mindmap-sidebar">
        <div className="mindmap-sidebar-header">
          <TreeStructure size={18} weight="bold" />
          <span>Mindmaps</span>
          <button
            className="mindmap-sidebar-add-btn"
            onClick={() => setIsCreating(true)}
            title="New mindmap"
          >
            <Plus size={14} weight="bold" />
          </button>
        </div>

        {isCreating && (
          <div className="mindmap-sidebar-create">
            <input
              autoFocus
              className="mindmap-sidebar-input"
              placeholder="Mindmap title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleCreateKeyDown}
              onBlur={() => { if (!newTitle.trim()) setIsCreating(false); }}
            />
          </div>
        )}

        <div className="mindmap-sidebar-list">
          {mindmaps.length === 0 && !isCreating && (
            <div className="mindmap-empty-hint">
              Click + to create your first mindmap
            </div>
          )}
          {mindmaps.map((m) => (
            <div
              key={m.id}
              className={`mindmap-sidebar-item ${activeMindmapId === m.id ? 'active' : ''}`}
              onClick={() => setActiveMindmap(m.id)}
            >
              {editingId === m.id ? (
                <input
                  autoFocus
                  className="mindmap-sidebar-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit(m.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={() => handleRenameSubmit(m.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="mindmap-sidebar-item-title">{m.title}</span>
                  <div className="mindmap-sidebar-item-actions">
                    <button
                      className="mindmap-sidebar-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(m.id);
                        setEditTitle(m.title);
                      }}
                      title="Rename"
                    >
                      <PencilSimple size={12} />
                    </button>
                    <button
                      className="mindmap-sidebar-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMindmap(m.id);
                      }}
                      title="Delete"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Canvas */}
      <div className="mindmap-main">
        {activeMindmap ? (
          <MindmapCanvas mindmap={activeMindmap} />
        ) : (
          <div className="mindmap-empty-state">
            <TreeStructure size={64} weight="thin" />
            <h3>No mindmap selected</h3>
            <p>Create a new mindmap or select one from the sidebar to start brainstorming.</p>
            <button className="mindmap-create-btn" onClick={() => setIsCreating(true)}>
              <Plus size={16} /> Create Mindmap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
