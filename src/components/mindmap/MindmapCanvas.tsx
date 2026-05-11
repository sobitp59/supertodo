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
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MindmapNodeComponent from './MindmapNode';
import { MindmapToolbar } from './MindmapToolbar';
import { applyTreeLayout } from './layouts';
import { useStore, type Mindmap } from '../../store';
import { useEffect, useState } from 'react';

const nodeTypes = { mindmapNode: MindmapNodeComponent };

interface MindmapCanvasProps {
  mindmap: Mindmap;
}

function buildNodesAndEdges(
  mindmap: Mindmap,
  onLabelChange: (nodeId: string, label: string) => void,
  onAddChild: (nodeId: string) => void,
  onDeleteNode: (nodeId: string) => void
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = mindmap.nodes.map((n) => ({
    id: n.id,
    type: 'mindmapNode',
    position: n.position,
    data: {
      label: n.text,
      isRoot: n.id === mindmap.rootNodeId,
      color: n.color,
      onLabelChange: (newLabel: string) => onLabelChange(n.id, newLabel),
      onAddChild: () => onAddChild(n.id),
      onDelete: () => onDeleteNode(n.id),
    },
  }));

  const edges: Edge[] = mindmap.nodes
    .filter((n) => n.parentId)
    .map((n) => ({
      id: `edge-${n.parentId}-${n.id}`,
      source: n.parentId!,
      target: n.id,
      type: 'smoothstep',
      animated: false,
      style: { stroke: 'var(--accent)', strokeWidth: 2, opacity: 0.6 },
    }));

  return { nodes, edges };
}

export function MindmapCanvas({ mindmap }: MindmapCanvasProps) {
  const { updateMindmapNode, addMindmapNode, removeMindmapNode } = useStore();
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleLabelChange = useCallback(
    (nodeId: string, label: string) => {
      updateMindmapNode(mindmap.id, nodeId, { text: label });
    },
    [mindmap.id, updateMindmapNode]
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      const parentNode = mindmap.nodes.find((n) => n.id === parentId);
      if (!parentNode) return;
      const offset = (mindmap.nodes.filter((n) => n.parentId === parentId).length) * 60;
      addMindmapNode(
        mindmap.id,
        'New idea',
        parentId,
        { x: parentNode.position.x + offset - 30, y: parentNode.position.y + 120 }
      );
    },
    [mindmap.id, mindmap.nodes, addMindmapNode]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (nodeId === mindmap.rootNodeId) return; // Can't delete root
      removeMindmapNode(mindmap.id, nodeId);
    },
    [mindmap.id, mindmap.rootNodeId, removeMindmapNode]
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildNodesAndEdges(mindmap, handleLabelChange, handleAddChild, handleDeleteNode),
    [mindmap, handleLabelChange, handleAddChild, handleDeleteNode]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync external state changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildNodesAndEdges(
      mindmap, handleLabelChange, handleAddChild, handleDeleteNode
    );
    setNodes(newNodes);
    setEdges(newEdges);
  }, [mindmap, handleLabelChange, handleAddChild, handleDeleteNode, setNodes, setEdges]);

  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      updateMindmapNode(mindmap.id, node.id, { position: node.position });
    },
    [mindmap.id, updateMindmapNode]
  );

  const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Node[] }) => {
    setSelectedNodeId(selectedNodes.length > 0 ? selectedNodes[0].id : null);
  }, []);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.current?.zoomOut();
  }, []);

  const handleFitView = useCallback(() => {
    reactFlowInstance.current?.fitView({ padding: 0.2 });
  }, []);

  const handleAutoLayout = useCallback(() => {
    const layoutedNodes = applyTreeLayout(mindmap.nodes, mindmap.rootNodeId);
    for (const node of layoutedNodes) {
      updateMindmapNode(mindmap.id, node.id, { position: node.position });
    }
  }, [mindmap, updateMindmapNode]);

  const handleAddNodeFromToolbar = useCallback(() => {
    const targetId = selectedNodeId || mindmap.rootNodeId;
    handleAddChild(targetId);
  }, [selectedNodeId, mindmap.rootNodeId, handleAddChild]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedNodeId) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        handleAddChild(selectedNodeId);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId !== mindmap.rootNodeId) {
          handleDeleteNode(selectedNodeId);
        }
      }
    },
    [selectedNodeId, mindmap.rootNodeId, handleAddChild, handleDeleteNode]
  );

  return (
    <div className="mindmap-canvas-wrapper" onKeyDown={handleKeyDown} tabIndex={0}>
      <MindmapToolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onAutoLayout={handleAutoLayout}
        onAddNode={handleAddNodeFromToolbar}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        onInit={(instance) => { reactFlowInstance.current = instance; }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: 'var(--accent)', strokeWidth: 2, opacity: 0.6 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--border)" />
        <MiniMap
          nodeColor={() => 'var(--accent)'}
          maskColor="rgba(0, 0, 0, 0.6)"
          style={{ background: 'var(--surface)' }}
        />
      </ReactFlow>
    </div>
  );
}
