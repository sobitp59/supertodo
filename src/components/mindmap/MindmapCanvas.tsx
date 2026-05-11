import { useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type ReactFlowInstance,
  type Connection,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MindmapNodeComponent from './MindmapNode';
import { MindmapToolbar } from './MindmapToolbar';
import { applyLayout, getVisibleNodes, type LayoutType } from './layouts';
import { useStore, type Mindmap } from '../../store';
import { useEffect, useState } from 'react';
import { toPng } from 'html-to-image';

const nodeTypes = { mindmapNode: MindmapNodeComponent };

interface MindmapCanvasProps {
  mindmap: Mindmap;
  searchTerm: string;
  onSearchToggle: () => void;
  onSelectNodeForPanel: (nodeId: string | null) => void;
}

export function MindmapCanvas({ mindmap, searchTerm, onSearchToggle, onSelectNodeForPanel }: MindmapCanvasProps) {
  const { updateMindmapNode, addMindmapNode, removeMindmapNode } = useStore();
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('tree');

  const visibleNodes = useMemo(() => getVisibleNodes(mindmap.nodes, mindmap.rootNodeId), [mindmap.nodes, mindmap.rootNodeId]);

  const handleLabelChange = useCallback((nodeId: string, label: string) => {
    updateMindmapNode(mindmap.id, nodeId, { text: label });
  }, [mindmap.id, updateMindmapNode]);

  const handleAddChild = useCallback((parentId: string) => {
    const parentNode = mindmap.nodes.find(n => n.id === parentId);
    if (!parentNode) return;
    const siblings = mindmap.nodes.filter(n => n.parentId === parentId);
    const offset = siblings.length * 60;
    addMindmapNode(mindmap.id, 'New idea', parentId, { x: parentNode.position.x + offset - 30, y: parentNode.position.y + 120 });
  }, [mindmap.id, mindmap.nodes, addMindmapNode]);

  const handleAddSibling = useCallback((nodeId: string) => {
    const node = mindmap.nodes.find(n => n.id === nodeId);
    if (!node || !node.parentId) return; // Can't add sibling to root
    handleAddChild(node.parentId);
  }, [mindmap.nodes, handleAddChild]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (nodeId === mindmap.rootNodeId) return;
    removeMindmapNode(mindmap.id, nodeId);
  }, [mindmap.id, mindmap.rootNodeId, removeMindmapNode]);

  const handleToggleCollapse = useCallback((nodeId: string) => {
    const node = mindmap.nodes.find(n => n.id === nodeId);
    if (node) updateMindmapNode(mindmap.id, nodeId, { collapsed: !node.collapsed });
  }, [mindmap.id, mindmap.nodes, updateMindmapNode]);

  const handleColorChange = useCallback((nodeId: string, color: string) => {
    updateMindmapNode(mindmap.id, nodeId, { color });
  }, [mindmap.id, updateMindmapNode]);

  const handleShapeChange = useCallback((nodeId: string, shape: string) => {
    updateMindmapNode(mindmap.id, nodeId, { shape: shape as any });
  }, [mindmap.id, updateMindmapNode]);

  // Build nodes & edges from visible nodes
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    const nodes: Node[] = visibleNodes.map(n => {
      const childCount = mindmap.nodes.filter(c => c.parentId === n.id).length;
      return {
        id: n.id,
        type: 'mindmapNode',
        position: n.position,
        data: {
          label: n.text,
          isRoot: n.id === mindmap.rootNodeId,
          color: n.color,
          shape: n.shape,
          collapsed: n.collapsed,
          childCount,
          hasNotes: !!n.notes,
          highlighted: searchTerm ? n.text.toLowerCase().includes(searchLower) : false,
          onLabelChange: (newLabel: string) => handleLabelChange(n.id, newLabel),
          onAddChild: () => handleAddChild(n.id),
          onAddSibling: () => handleAddSibling(n.id),
          onDelete: () => handleDeleteNode(n.id),
          onToggleCollapse: () => handleToggleCollapse(n.id),
          onColorChange: (color: string) => handleColorChange(n.id, color),
          onShapeChange: (shape: string) => handleShapeChange(n.id, shape),
        },
      };
    });

    const visibleIds = new Set(visibleNodes.map(n => n.id));
    const edges: Edge[] = visibleNodes
      .filter(n => n.parentId && visibleIds.has(n.parentId))
      .map(n => ({
        id: `edge-${n.parentId}-${n.id}`,
        source: n.parentId!,
        target: n.id,
        type: 'smoothstep',
        style: { stroke: n.color || 'var(--accent)', strokeWidth: 2, opacity: 0.6 },
      }));

    return { nodes, edges };
  }, [visibleNodes, mindmap, searchTerm, handleLabelChange, handleAddChild, handleAddSibling, handleDeleteNode, handleToggleCollapse, handleColorChange, handleShapeChange]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { setNodes(initialNodes); setEdges(initialEdges); }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeDragStop = useCallback((_: any, node: Node) => {
    updateMindmapNode(mindmap.id, node.id, { position: node.position });
  }, [mindmap.id, updateMindmapNode]);

  // Drag-to-reparent via edge connection
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.target === mindmap.rootNodeId) return; // can't reparent root
    // Reparent: set target's parentId to source
    updateMindmapNode(mindmap.id, connection.target, { parentId: connection.source });
  }, [mindmap.id, mindmap.rootNodeId, updateMindmapNode]);

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    const id = sel.length > 0 ? sel[0].id : null;
    setSelectedNodeId(id);
    onSelectNodeForPanel(id);
  }, [onSelectNodeForPanel]);

  const handleZoomIn = useCallback(() => { reactFlowInstance.current?.zoomIn(); }, []);
  const handleZoomOut = useCallback(() => { reactFlowInstance.current?.zoomOut(); }, []);
  const handleFitView = useCallback(() => { reactFlowInstance.current?.fitView({ padding: 0.2 }); }, []);

  const handleAutoLayout = useCallback((type: LayoutType) => {
    setCurrentLayout(type);
    const layoutedNodes = applyLayout(mindmap.nodes, mindmap.rootNodeId, type);
    for (const node of layoutedNodes) {
      updateMindmapNode(mindmap.id, node.id, { position: node.position });
    }
    setTimeout(() => reactFlowInstance.current?.fitView({ padding: 0.2 }), 100);
  }, [mindmap, updateMindmapNode]);

  const handleExportPng = useCallback(async () => {
    const el = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { backgroundColor: '#000000', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${mindmap.title || 'mindmap'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [mindmap.title]);

  const handleAddNodeFromToolbar = useCallback(() => {
    const targetId = selectedNodeId || mindmap.rootNodeId;
    handleAddChild(targetId);
  }, [selectedNodeId, mindmap.rootNodeId, handleAddChild]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedNodeId) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      handleAddChild(selectedNodeId);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSibling(selectedNodeId);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedNodeId !== mindmap.rootNodeId) handleDeleteNode(selectedNodeId);
    } else if (e.key === 'F2') {
      e.preventDefault();
      // F2 triggers editing - handled by the node itself via double-click simulation
    } else if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSearchToggle();
    }
  }, [selectedNodeId, mindmap.rootNodeId, handleAddChild, handleAddSibling, handleDeleteNode, onSearchToggle]);

  return (
    <div className="mindmap-canvas-wrapper" onKeyDown={handleKeyDown} tabIndex={0} ref={reactFlowWrapper}>
      <MindmapToolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onAutoLayout={handleAutoLayout}
        onAddNode={handleAddNodeFromToolbar}
        onExportPng={handleExportPng}
        onSearchToggle={onSearchToggle}
        currentLayout={currentLayout}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onInit={(instance) => { reactFlowInstance.current = instance; }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: 'var(--accent)', strokeWidth: 2, opacity: 0.6 } }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--border)" />
        <MiniMap nodeColor={() => 'var(--accent)'} maskColor="rgba(0, 0, 0, 0.6)" style={{ background: 'var(--surface)' }} />
      </ReactFlow>
    </div>
  );
}
