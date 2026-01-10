import type { MindmapNode, MindmapEdge, LayoutConfig, NODE_DIMENSIONS } from "./types";

// ============================================================================
// TREE LAYOUT ALGORITHM
// ============================================================================

interface TreeNode {
  id: string;
  children: TreeNode[];
  width: number;
  height: number;
  x: number;
  y: number;
  depth: number;
}

/**
 * Calculate tree layout for mindmap nodes
 * Uses a modified Reingold-Tilford algorithm for nice tree layouts
 */
export function calculateTreeLayout(
  nodes: MindmapNode[],
  edges: MindmapEdge[],
  config: LayoutConfig
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  if (nodes.length === 0) return positions;

  // Build adjacency map
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  
  edges.forEach((edge) => {
    const children = childrenMap.get(edge.source) || [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
    parentMap.set(edge.target, edge.source);
  });

  // Find root node (node with no parent)
  const rootNode = nodes.find((n) => !parentMap.has(n.id));
  if (!rootNode) {
    // If no clear root, use first node
    return calculateSimpleLayout(nodes, config);
  }

  // Build tree structure
  const nodeDimensions = new Map<string, { width: number; height: number }>();
  nodes.forEach((n) => {
    const dims = getNodeDimensions(n.type || "objective");
    nodeDimensions.set(n.id, dims);
  });

  // Calculate subtree widths
  const subtreeWidths = new Map<string, number>();
  
  function calculateSubtreeWidth(nodeId: string): number {
    const children = childrenMap.get(nodeId) || [];
    const dims = nodeDimensions.get(nodeId) || { width: 200 };
    
    if (children.length === 0) {
      subtreeWidths.set(nodeId, dims.width);
      return dims.width;
    }
    
    const childrenWidth = children.reduce((sum, childId) => {
      return sum + calculateSubtreeWidth(childId) + config.nodeSpacing;
    }, -config.nodeSpacing); // Remove extra spacing at end
    
    const width = Math.max(dims.width, childrenWidth);
    subtreeWidths.set(nodeId, width);
    return width;
  }

  calculateSubtreeWidth(rootNode.id);

  // Position nodes
  function positionNode(nodeId: string, x: number, y: number, depth: number) {
    const dims = nodeDimensions.get(nodeId) || { width: 200, height: 100 };
    const subtreeWidth = subtreeWidths.get(nodeId) || dims.width;
    
    // Center node within its subtree
    const nodeX = x + (subtreeWidth - dims.width) / 2;
    positions.set(nodeId, { x: nodeX, y });
    
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;
    
    // Position children
    let childX = x;
    const childY = y + dims.height + config.levelSpacing;
    
    children.forEach((childId) => {
      const childSubtreeWidth = subtreeWidths.get(childId) || 0;
      positionNode(childId, childX, childY, depth + 1);
      childX += childSubtreeWidth + config.nodeSpacing;
    });
  }

  // Start positioning from root
  const rootDims = nodeDimensions.get(rootNode.id) || { width: 280 };
  const totalWidth = subtreeWidths.get(rootNode.id) || rootDims.width;
  positionNode(rootNode.id, -totalWidth / 2, 0, 0);

  return positions;
}

/**
 * Simple grid layout as fallback
 */
function calculateSimpleLayout(
  nodes: MindmapNode[],
  config: LayoutConfig
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  // Group by type
  const nodesByType: Record<string, MindmapNode[]> = {
    plan: [],
    objective: [],
    kr: [],
    quarter: [],
    task: [],
  };
  
  nodes.forEach((n) => {
    const type = n.type || "objective";
    nodesByType[type]?.push(n);
  });
  
  let currentY = 0;
  const typeOrder = ["plan", "objective", "kr", "quarter", "task"];
  
  typeOrder.forEach((type) => {
    const typeNodes = nodesByType[type] || [];
    if (typeNodes.length === 0) return;
    
    const dims = getNodeDimensions(type as any);
    const totalWidth = typeNodes.length * dims.width + (typeNodes.length - 1) * config.nodeSpacing;
    let currentX = -totalWidth / 2;
    
    typeNodes.forEach((node) => {
      positions.set(node.id, { x: currentX, y: currentY });
      currentX += dims.width + config.nodeSpacing;
    });
    
    currentY += dims.height + config.levelSpacing;
  });
  
  return positions;
}

/**
 * Get node dimensions based on type
 */
function getNodeDimensions(type: string): { width: number; height: number } {
  const dimensions: Record<string, { width: number; height: number }> = {
    plan: { width: 280, height: 100 },
    objective: { width: 240, height: 90 },
    kr: { width: 220, height: 80 },
    quarter: { width: 120, height: 50 },
    task: { width: 160, height: 40 },
  };
  return dimensions[type] || { width: 200, height: 80 };
}

// ============================================================================
// RADIAL LAYOUT
// ============================================================================

/**
 * Calculate radial/circular layout
 */
export function calculateRadialLayout(
  nodes: MindmapNode[],
  edges: MindmapEdge[],
  config: LayoutConfig
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  if (nodes.length === 0) return positions;

  // Build adjacency map
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  
  edges.forEach((edge) => {
    const children = childrenMap.get(edge.source) || [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
    parentMap.set(edge.target, edge.source);
  });

  // Find root
  const rootNode = nodes.find((n) => !parentMap.has(n.id));
  if (!rootNode) {
    return calculateSimpleLayout(nodes, config);
  }

  // Position root at center
  positions.set(rootNode.id, { x: 0, y: 0 });

  // BFS to position nodes in rings
  const visited = new Set<string>([rootNode.id]);
  let currentRing = [rootNode.id];
  let ringRadius = config.levelSpacing;

  while (currentRing.length > 0) {
    const nextRing: string[] = [];
    
    currentRing.forEach((nodeId) => {
      const children = childrenMap.get(nodeId) || [];
      children.forEach((childId) => {
        if (!visited.has(childId)) {
          visited.add(childId);
          nextRing.push(childId);
        }
      });
    });

    if (nextRing.length === 0) break;

    // Position nodes in this ring
    const angleStep = (2 * Math.PI) / nextRing.length;
    nextRing.forEach((nodeId, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const x = ringRadius * Math.cos(angle);
      const y = ringRadius * Math.sin(angle);
      positions.set(nodeId, { x, y });
    });

    currentRing = nextRing;
    ringRadius += config.levelSpacing;
  }

  return positions;
}

// ============================================================================
// APPLY LAYOUT
// ============================================================================

/**
 * Apply calculated positions to nodes
 */
export function applyLayout(
  nodes: MindmapNode[],
  positions: Map<string, { x: number; y: number }>
): MindmapNode[] {
  return nodes.map((node) => {
    const pos = positions.get(node.id);
    if (pos) {
      return {
        ...node,
        position: { x: pos.x, y: pos.y },
      };
    }
    return node;
  });
}
