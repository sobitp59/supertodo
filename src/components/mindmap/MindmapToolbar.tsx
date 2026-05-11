import { useState } from 'react';
import {
  TreeStructure, ArrowsOutSimple, Plus, MagnifyingGlassPlus, MagnifyingGlassMinus,
  Export, MagnifyingGlass, ArrowsHorizontal, CircleDashed
} from '@phosphor-icons/react';
import type { LayoutType } from './layouts';

interface MindmapToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAutoLayout: (type: LayoutType) => void;
  onAddNode: () => void;
  onExportPng: () => void;
  onSearchToggle: () => void;
  currentLayout: LayoutType;
}

const layoutOptions: { type: LayoutType; icon: React.ReactNode; label: string }[] = [
  { type: 'tree', icon: <TreeStructure size={14} />, label: 'Tree' },
  { type: 'horizontal', icon: <ArrowsHorizontal size={14} />, label: 'Horizontal' },
  { type: 'radial', icon: <CircleDashed size={14} />, label: 'Radial' },
];

export function MindmapToolbar({
  onZoomIn, onZoomOut, onFitView, onAutoLayout, onAddNode, onExportPng, onSearchToggle, currentLayout
}: MindmapToolbarProps) {
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  return (
    <div className="mindmap-toolbar">
      <button className="mindmap-toolbar-btn" onClick={onAddNode} title="Add child (Tab)">
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
      <div className="mindmap-toolbar-layout-group">
        <button
          className="mindmap-toolbar-btn"
          onClick={() => setShowLayoutMenu(!showLayoutMenu)}
          title="Layout"
        >
          <TreeStructure size={16} />
        </button>
        {showLayoutMenu && (
          <div className="mindmap-layout-menu">
            {layoutOptions.map(opt => (
              <button
                key={opt.type}
                className={`mindmap-layout-option ${currentLayout === opt.type ? 'active' : ''}`}
                onClick={() => { onAutoLayout(opt.type); setShowLayoutMenu(false); }}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mindmap-toolbar-divider" />
      <button className="mindmap-toolbar-btn" onClick={onSearchToggle} title="Search nodes (Ctrl+F)">
        <MagnifyingGlass size={16} />
      </button>
      <button className="mindmap-toolbar-btn" onClick={onExportPng} title="Export as PNG">
        <Export size={16} />
      </button>
    </div>
  );
}
