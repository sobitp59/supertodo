import type { MindmapNode } from '../../store';

export type LayoutType = 'tree' | 'radial' | 'horizontal';

interface LayoutOptions {
  horizontalSpacing: number;
  verticalSpacing: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  horizontalSpacing: 250,
  verticalSpacing: 100,
};

function buildChildrenMap(nodes: MindmapNode[], rootId: string) {
  const childrenMap = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.id === rootId) continue;
    const pid = node.parentId || rootId;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(node.id);
  }
  if (!childrenMap.has(rootId)) childrenMap.set(rootId, []);
  return childrenMap;
}

/**
 * Get visible nodes (respecting collapsed state)
 */
export function getVisibleNodes(nodes: MindmapNode[], rootId: string): MindmapNode[] {
  const visible = new Set<string>();
  
  function walk(nodeId: string) {
    visible.add(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node?.collapsed) return; // don't walk children of collapsed nodes
    const children = nodes.filter(n => n.parentId === nodeId);
    for (const child of children) {
      walk(child.id);
    }
  }
  
  walk(rootId);
  return nodes.filter(n => visible.has(n.id));
}

/**
 * Tree layout - vertical hierarchy
 */
export function applyTreeLayout(
  nodes: MindmapNode[],
  rootId: string,
  options: Partial<LayoutOptions> = {}
): MindmapNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const childrenMap = buildChildrenMap(nodes, rootId);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const subtreeWidths = new Map<string, number>();
  function getSubtreeWidth(nodeId: string): number {
    if (subtreeWidths.has(nodeId)) return subtreeWidths.get(nodeId)!;
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) { subtreeWidths.set(nodeId, 1); return 1; }
    const width = children.reduce((sum, cid) => sum + getSubtreeWidth(cid), 0);
    subtreeWidths.set(nodeId, width);
    return width;
  }
  getSubtreeWidth(rootId);

  const positions = new Map<string, { x: number; y: number }>();
  function positionNode(nodeId: string, x: number, y: number) {
    positions.set(nodeId, { x, y });
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;
    const totalWidth = children.reduce((sum, cid) => sum + getSubtreeWidth(cid), 0);
    let currentX = x - (totalWidth * opts.horizontalSpacing) / 2;
    for (const childId of children) {
      const childWidth = getSubtreeWidth(childId);
      const childX = currentX + (childWidth * opts.horizontalSpacing) / 2;
      positionNode(childId, childX, y + opts.verticalSpacing);
      currentX += childWidth * opts.horizontalSpacing;
    }
  }

  const rootNode = nodeMap.get(rootId);
  positionNode(rootId, rootNode?.position.x ?? 400, rootNode?.position.y ?? 100);

  return nodes.map(node => {
    const pos = positions.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
}

/**
 * Horizontal layout - left to right tree
 */
export function applyHorizontalLayout(
  nodes: MindmapNode[],
  rootId: string,
  options: Partial<LayoutOptions> = {}
): MindmapNode[] {
  const opts = { horizontalSpacing: options.verticalSpacing || 180, verticalSpacing: options.horizontalSpacing || 80 };
  const childrenMap = buildChildrenMap(nodes, rootId);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const subtreeHeights = new Map<string, number>();
  function getSubtreeHeight(nodeId: string): number {
    if (subtreeHeights.has(nodeId)) return subtreeHeights.get(nodeId)!;
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) { subtreeHeights.set(nodeId, 1); return 1; }
    const height = children.reduce((sum, cid) => sum + getSubtreeHeight(cid), 0);
    subtreeHeights.set(nodeId, height);
    return height;
  }
  getSubtreeHeight(rootId);

  const positions = new Map<string, { x: number; y: number }>();
  function positionNode(nodeId: string, x: number, y: number) {
    positions.set(nodeId, { x, y });
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;
    const totalHeight = children.reduce((sum, cid) => sum + getSubtreeHeight(cid), 0);
    let currentY = y - (totalHeight * opts.verticalSpacing) / 2;
    for (const childId of children) {
      const childHeight = getSubtreeHeight(childId);
      const childY = currentY + (childHeight * opts.verticalSpacing) / 2;
      positionNode(childId, x + opts.horizontalSpacing, childY);
      currentY += childHeight * opts.verticalSpacing;
    }
  }

  const rootNode = nodeMap.get(rootId);
  positionNode(rootId, rootNode?.position.x ?? 100, rootNode?.position.y ?? 300);

  return nodes.map(node => {
    const pos = positions.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
}

/**
 * Radial layout - positions children in a circle around their parent
 */
export function applyRadialLayout(
  nodes: MindmapNode[],
  rootId: string
): MindmapNode[] {
  const childrenMap = buildChildrenMap(nodes, rootId);

  const positions = new Map<string, { x: number; y: number }>();
  const rootNode = nodes.find(n => n.id === rootId);
  const centerX = rootNode?.position.x ?? 400;
  const centerY = rootNode?.position.y ?? 300;
  positions.set(rootId, { x: centerX, y: centerY });

  function positionChildren(parentId: string, radius: number, startAngle: number, endAngle: number) {
    const children = childrenMap.get(parentId) || [];
    if (children.length === 0) return;
    const angleStep = (endAngle - startAngle) / children.length;
    const parentPos = positions.get(parentId)!;
    children.forEach((childId, i) => {
      const angle = startAngle + angleStep * (i + 0.5);
      const x = parentPos.x + radius * Math.cos(angle);
      const y = parentPos.y + radius * Math.sin(angle);
      positions.set(childId, { x, y });
      const subArcSize = angleStep * 0.8;
      positionChildren(childId, radius * 0.7, angle - subArcSize / 2, angle + subArcSize / 2);
    });
  }

  positionChildren(rootId, 220, 0, Math.PI * 2);

  return nodes.map(node => {
    const pos = positions.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
}

/**
 * Apply layout by type
 */
export function applyLayout(nodes: MindmapNode[], rootId: string, type: LayoutType): MindmapNode[] {
  switch (type) {
    case 'tree': return applyTreeLayout(nodes, rootId);
    case 'horizontal': return applyHorizontalLayout(nodes, rootId);
    case 'radial': return applyRadialLayout(nodes, rootId);
    default: return applyTreeLayout(nodes, rootId);
  }
}
