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
 * Calculate radial/circular layout with improved spacing
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

  // Calculate subtree sizes for better angle distribution
  const subtreeSizes = new Map<string, number>();
  
  function calculateSubtreeSize(nodeId: string): number {
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) {
      subtreeSizes.set(nodeId, 1);
      return 1;
    }
    const size = children.reduce((sum, childId) => sum + calculateSubtreeSize(childId), 0);
    subtreeSizes.set(nodeId, size);
    return size;
  }
  
  calculateSubtreeSize(rootNode.id);

  // Position children with proportional angles
  function positionChildren(
    parentId: string,
    startAngle: number,
    endAngle: number,
    radius: number
  ) {
    const children = childrenMap.get(parentId) || [];
    if (children.length === 0) return;

    const totalSubtreeSize = children.reduce(
      (sum, childId) => sum + (subtreeSizes.get(childId) || 1),
      0
    );

    let currentAngle = startAngle;

    children.forEach((childId) => {
      const childSize = subtreeSizes.get(childId) || 1;
      const angleSpan = ((endAngle - startAngle) * childSize) / totalSubtreeSize;
      const childAngle = currentAngle + angleSpan / 2;

      const x = radius * Math.cos(childAngle);
      const y = radius * Math.sin(childAngle);
      positions.set(childId, { x, y });

      // Position grandchildren
      positionChildren(
        childId,
        currentAngle,
        currentAngle + angleSpan,
        radius + config.levelSpacing
      );

      currentAngle += angleSpan;
    });
  }

  // Start positioning from root's children
  positionChildren(
    rootNode.id,
    -Math.PI, // Start from left
    Math.PI,  // End at left (full circle)
    config.levelSpacing * 1.5
  );

  return positions;
}

// ============================================================================
// FOCUS LAYOUT
// ============================================================================

/**
 * Calculate focus layout - centers on a specific node and shows its branch
 */
export function calculateFocusLayout(
  nodes: MindmapNode[],
  edges: MindmapEdge[],
  focusNodeId: string,
  config: LayoutConfig
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  if (nodes.length === 0) return positions;

  // Build adjacency maps
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  
  edges.forEach((edge) => {
    const children = childrenMap.get(edge.source) || [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
    parentMap.set(edge.target, edge.source);
  });

  // Find the focus node, or fallback to root
  const focusNode = nodes.find((n) => n.id === focusNodeId);
  if (!focusNode) {
    return calculateTreeLayout(nodes, edges, config);
  }

  // Get ancestors (path to root)
  const ancestors: string[] = [];
  let current = focusNodeId;
  while (parentMap.has(current)) {
    const parent = parentMap.get(current)!;
    ancestors.unshift(parent);
    current = parent;
  }

  // Get descendants
  const descendants: string[] = [];
  const queue = [focusNodeId];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (nodeId !== focusNodeId) {
      descendants.push(nodeId);
    }
    const children = childrenMap.get(nodeId) || [];
    queue.push(...children);
  }

  // Position focus node at center
  positions.set(focusNodeId, { x: 0, y: 0 });

  // Position ancestors above (root at top, working down to focus)
  // ancestors array is [root, ..., direct_parent]
  // We want root at the top (most negative y), direct parent closest to focus
  const numAncestors = ancestors.length;
  ancestors.forEach((ancestorId, index) => {
    // index 0 (root) should be at -(numAncestors)*spacing (furthest)
    // index numAncestors-1 (direct parent) should be at -1*spacing (closest)
    const yOffset = -(numAncestors - index) * config.levelSpacing;
    positions.set(ancestorId, { x: 0, y: yOffset });
  });

  // Position descendants below using tree layout
  const siblingSpacing = config.nodeSpacing;
  let currentLevel: string[] = [focusNodeId];
  let yOffset = config.levelSpacing;

  while (currentLevel.length > 0) {
    const nextLevel: string[] = [];
    let xPositions: { id: string; width: number }[] = [];

    currentLevel.forEach((nodeId) => {
      const children = childrenMap.get(nodeId) || [];
      children.forEach((childId) => {
        nextLevel.push(childId);
        const dims = getNodeDimensions(
          nodes.find((n) => n.id === childId)?.type || "objective"
        );
        xPositions.push({ id: childId, width: dims.width });
      });
    });

    if (nextLevel.length === 0) break;

    // Calculate total width
    const totalWidth = xPositions.reduce(
      (sum, item, idx) => sum + item.width + (idx > 0 ? siblingSpacing : 0),
      0
    );
    let currentX = -totalWidth / 2;

    xPositions.forEach((item, idx) => {
      if (idx > 0) currentX += siblingSpacing;
      positions.set(item.id, { x: currentX + item.width / 2, y: yOffset });
      currentX += item.width;
    });

    currentLevel = nextLevel;
    yOffset += config.levelSpacing;
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
