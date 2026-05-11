import { TreeStructure, ArrowsOutSimple, Plus, MagnifyingGlassPlus, MagnifyingGlassMinus } from '@phosphor-icons/react';

interface MindmapToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAutoLayout: () => void;
  onAddNode: () => void;
}

export function MindmapToolbar({ onZoomIn, onZoomOut, onFitView, onAutoLayout, onAddNode }: MindmapToolbarProps) {
  return (
    <div className="mindmap-toolbar">
      <button className="mindmap-toolbar-btn" onClick={onAddNode} title="Add child to selected node">
        <Plus size={16} weight="bold" />
      </button>
      <div className="mindmap-toolbar-divider" />
      <button className="mindmap-toolbar-btn" onClick={onZoomIn} title="Zoom in">
        <MagnifyingGlassPlus size={16} />
      </button>
      <button className="mindmap-toolbar-btn" onClick={onZoomOut} title="Zoom out">
        <MagnifyingGlassMinus size={16} />
      </button>
      <button className="mindmap-toolbar-btn" onClick={onFitView} title="Fit to view">
        <ArrowsOutSimple size={16} />
      </button>
      <div className="mindmap-toolbar-divider" />
      <button className="mindmap-toolbar-btn" onClick={onAutoLayout} title="Auto-layout (tree)">
        <TreeStructure size={16} />
      </button>
    </div>
  );
}
