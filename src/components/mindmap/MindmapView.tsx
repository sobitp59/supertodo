import { useState, useRef, useEffect } from 'react';
import { Plus, Trash, TreeStructure, PencilSimple, X, MagnifyingGlass, Sparkle } from '@phosphor-icons/react';
import { useStore } from '../../store';
import { MindmapCanvas } from './MindmapCanvas';
import { useAI } from '../../hooks/useAI';

export function MindmapView() {
  const { mindmaps, activeMindmapId, addMindmap, removeMindmap, setActiveMindmap, updateMindmapTitle, updateMindmapNode } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeNotes, setNodeNotes] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ai = useAI();

  const activeMindmap = mindmaps.find(m => m.id === activeMindmapId);
  const selectedNode = activeMindmap?.nodes.find(n => n.id === selectedNodeId);

  // Sync local notes state
  useEffect(() => {
    setNodeNotes(selectedNode?.notes || '');
  }, [selectedNode?.id, selectedNode?.notes]);

  const handleCreate = () => {
    if (newTitle.trim()) {
      addMindmap(newTitle.trim());
      setNewTitle('');
      setIsCreating(false);
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') { setIsCreating(false); setNewTitle(''); }
  };

  const handleRenameSubmit = (id: string) => {
    if (editTitle.trim()) updateMindmapTitle(id, editTitle.trim());
    setEditingId(null);
  };

  const handleSearchToggle = () => {
    setSearchOpen(!searchOpen);
    if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
    else setSearchTerm('');
  };

  const handleNodeNotesChange = (value: string) => {
    setNodeNotes(value);
    if (activeMindmap && selectedNodeId) {
      updateMindmapNode(activeMindmap.id, selectedNodeId, { notes: value });
    }
  };

  return (
    <div className="mindmap-view">
      {/* Sidebar */}
      <div className="mindmap-sidebar">
        <div className="mindmap-sidebar-header">
          <TreeStructure size={18} weight="bold" />
          <span>Mindmaps</span>
          <button className="mindmap-sidebar-add-btn" onClick={() => setIsCreating(true)} title="New mindmap">
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
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={handleCreateKeyDown}
              onBlur={() => { if (!newTitle.trim()) setIsCreating(false); }}
            />
          </div>
        )}

        <div className="mindmap-sidebar-list">
          {mindmaps.length === 0 && !isCreating && (
            <div className="mindmap-empty-hint">Click + to create your first mindmap</div>
          )}
          {mindmaps.map(m => (
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
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(m.id); if (e.key === 'Escape') setEditingId(null); }}
                  onBlur={() => handleRenameSubmit(m.id)}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="mindmap-sidebar-item-title">{m.title}</span>
                  <div className="mindmap-sidebar-item-actions">
                    <button className="mindmap-sidebar-action-btn" onClick={e => { e.stopPropagation(); setEditingId(m.id); setEditTitle(m.title); }} title="Rename">
                      <PencilSimple size={12} />
                    </button>
                    <button className="mindmap-sidebar-action-btn" onClick={e => { e.stopPropagation(); removeMindmap(m.id); }} title="Delete">
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
        {/* Search Bar */}
        {searchOpen && (
          <div className="mindmap-search-bar">
            <MagnifyingGlass size={14} />
            <input
              ref={searchInputRef}
              className="mindmap-search-input"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') handleSearchToggle(); }}
            />
            {searchTerm && (
              <span className="mindmap-search-count">
                {activeMindmap?.nodes.filter(n => n.text.toLowerCase().includes(searchTerm.toLowerCase())).length || 0} matches
              </span>
            )}
            <button className="mindmap-search-close" onClick={handleSearchToggle}><X size={12} /></button>
          </div>
        )}

        {activeMindmap ? (
          <>
            {/* Auto-generate prompt for new mindmaps with only root node */}
            {activeMindmap.nodes.length <= 1 && !ai.isGenerating && (
              <div className="mindmap-autogenerate-hint">
                <button className="mindmap-ai-btn mindmap-ai-btn-large" onClick={() => ai.autoGenerateMindmap(activeMindmap.id)}>
                  <Sparkle size={14} weight="fill" /> Auto-generate from title
                </button>
              </div>
            )}
            {ai.isGenerating && activeMindmap.nodes.length <= 1 && (
              <div className="mindmap-autogenerate-hint">
                <span className="mindmap-ai-loading">Generating mindmap structure...</span>
              </div>
            )}
            <MindmapCanvas
              mindmap={activeMindmap}
              searchTerm={searchTerm}
              onSearchToggle={handleSearchToggle}
              onSelectNodeForPanel={setSelectedNodeId}
            />
          </>
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

      {/* Notes Panel - shown when a node is selected */}
      {selectedNode && activeMindmap && (
        <div className="mindmap-notes-panel">
          <div className="mindmap-notes-panel-header">
            <span className="mindmap-notes-panel-title">{selectedNode.text}</span>
            <button className="mindmap-notes-panel-close" onClick={() => setSelectedNodeId(null)}>
              <X size={14} />
            </button>
          </div>

          {/* AI Actions */}
          <div className="mindmap-ai-actions">
            <button
              className="mindmap-ai-btn"
              disabled={ai.isGenerating}
              onClick={() => ai.generateChildren(activeMindmap.id, selectedNodeId!)}
              title="Generate child ideas with AI"
            >
              <Sparkle size={12} weight="fill" /> {ai.isGenerating ? 'Thinking...' : 'Generate Ideas'}
            </button>
            <button
              className="mindmap-ai-btn"
              disabled={ai.isGenerating}
              onClick={() => ai.expandNode(activeMindmap.id, selectedNodeId!)}
              title="Expand with more detail"
            >
              <Plus size={12} /> Expand
            </button>
            {activeMindmap.nodes.filter(n => n.parentId === selectedNodeId).length > 0 && (
              <button
                className="mindmap-ai-btn"
                disabled={ai.isGenerating}
                onClick={async () => {
                  const summary = await ai.summarizeBranch(activeMindmap.id, selectedNodeId!);
                  if (summary) updateMindmapNode(activeMindmap.id, selectedNodeId!, { text: summary });
                }}
                title="Summarize children into this node"
              >
                Summarize
              </button>
            )}
          </div>

          {ai.error && (
            <div className="mindmap-ai-error" onClick={ai.clearError}>
              {ai.error}
            </div>
          )}

          <textarea
            className="mindmap-notes-textarea"
            placeholder="Add notes for this node (markdown supported)..."
            value={nodeNotes}
            onChange={e => handleNodeNotesChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
