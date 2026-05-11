import type { MindmapNode } from '../../store';

interface LayoutOptions {
  horizontalSpacing: number;
  verticalSpacing: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  horizontalSpacing: 250,
  verticalSpacing: 100,
};

/**
 * Tree layout algorithm - positions nodes in a hierarchical tree structure
 * radiating from the root node.
 */
export function applyTreeLayout(
  nodes: MindmapNode[],
  rootId: string,
  options: Partial<LayoutOptions> = {}
): MindmapNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const childrenMap = new Map<string, string[]>();

  // Build children map
  for (const node of nodes) {
    const parentId = node.parentId || '__root__';
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    if (node.id !== rootId) {
      const pid = node.parentId || '__root__';
      childrenMap.get(pid)?.push(node.id);
    }
  }

  // If root doesn't have an entry yet
  if (!childrenMap.has(rootId)) childrenMap.set(rootId, []);

  // Calculate subtree widths
  const subtreeWidths = new Map<string, number>();

  function getSubtreeWidth(nodeId: string): number {
    if (subtreeWidths.has(nodeId)) return subtreeWidths.get(nodeId)!;
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) {
      subtreeWidths.set(nodeId, 1);
      return 1;
    }
    const width = children.reduce((sum, childId) => sum + getSubtreeWidth(childId), 0);
    subtreeWidths.set(nodeId, width);
    return width;
  }

  getSubtreeWidth(rootId);

  // Position nodes
  const positions = new Map<string, { x: number; y: number }>();

  function positionNode(nodeId: string, x: number, y: number, _availableWidth: number) {
    positions.set(nodeId, { x, y });
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;

    const totalWidth = children.reduce((sum, cid) => sum + getSubtreeWidth(cid), 0);
    let currentX = x - (totalWidth * opts.horizontalSpacing) / 2;

    for (const childId of children) {
      const childWidth = getSubtreeWidth(childId);
      const childX = currentX + (childWidth * opts.horizontalSpacing) / 2;
      positionNode(childId, childX, y + opts.verticalSpacing, childWidth * opts.horizontalSpacing);
      currentX += childWidth * opts.horizontalSpacing;
    }
  }

  const rootNode = nodeMap.get(rootId);
  const startX = rootNode?.position.x ?? 400;
  const startY = rootNode?.position.y ?? 100;
  positionNode(rootId, startX, startY, (getSubtreeWidth(rootId) || 1) * opts.horizontalSpacing);

  // Apply positions to nodes
  return nodes.map((node) => {
    const pos = positions.get(node.id);
    if (pos) {
      return { ...node, position: pos };
    }
    return node;
  });
}

/**
 * Radial layout - positions children in a circle around their parent
 */
export function applyRadialLayout(
  nodes: MindmapNode[],
  rootId: string
): MindmapNode[] {
  const childrenMap = new Map<string, string[]>();

  for (const node of nodes) {
    if (node.id === rootId) continue;
    const pid = node.parentId || rootId;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)?.push(node.id);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const rootNode = nodes.find((n) => n.id === rootId);
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

      // Position sub-children in a narrower arc
      const subArcSize = angleStep * 0.8;
      positionChildren(childId, radius * 0.7, angle - subArcSize / 2, angle + subArcSize / 2);
    });
  }

  positionChildren(rootId, 200, 0, Math.PI * 2);

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    if (pos) return { ...node, position: pos };
    return node;
  });
}
