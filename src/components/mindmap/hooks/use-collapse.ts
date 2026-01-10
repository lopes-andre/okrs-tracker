import { useCallback, useState, useMemo } from "react";
import type { MindmapNode, MindmapEdge } from "../types";

interface UseCollapseOptions {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
}

interface UseCollapseReturn {
  collapsedNodeIds: Set<string>;
  toggleCollapse: (nodeId: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
  isCollapsed: (nodeId: string) => boolean;
  visibleNodes: MindmapNode[];
  visibleEdges: MindmapEdge[];
}

/**
 * Hook to manage collapsed/expanded state of mindmap nodes
 */
export function useCollapse({ nodes, edges }: UseCollapseOptions): UseCollapseReturn {
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());

  // Build parent -> children map
  const childrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    edges.forEach((edge) => {
      const children = map.get(edge.source) || [];
      children.push(edge.target);
      map.set(edge.source, children);
    });
    return map;
  }, [edges]);

  // Build child -> parent map
  const parentMap = useMemo(() => {
    const map = new Map<string, string>();
    edges.forEach((edge) => {
      map.set(edge.target, edge.source);
    });
    return map;
  }, [edges]);

  // Get all descendants of a node
  const getDescendants = useCallback((nodeId: string): Set<string> => {
    const descendants = new Set<string>();
    const queue = [...(childrenMap.get(nodeId) || [])];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      descendants.add(current);
      const children = childrenMap.get(current) || [];
      queue.push(...children);
    }
    
    return descendants;
  }, [childrenMap]);

  // Get nodes that are hidden due to parent being collapsed
  const hiddenNodeIds = useMemo(() => {
    const hidden = new Set<string>();
    
    collapsedNodeIds.forEach((collapsedId) => {
      const descendants = getDescendants(collapsedId);
      descendants.forEach((d) => hidden.add(d));
    });
    
    return hidden;
  }, [collapsedNodeIds, getDescendants]);

  // Toggle collapse state
  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Collapse all nodes with children
  const collapseAll = useCallback(() => {
    const nodesWithChildren = new Set<string>();
    edges.forEach((edge) => {
      nodesWithChildren.add(edge.source);
    });
    
    // Only collapse the top-level nodes (plan, objectives)
    const topLevelCollapse = new Set<string>();
    nodes.forEach((node) => {
      if (node.type === "objective" && nodesWithChildren.has(node.id)) {
        topLevelCollapse.add(node.id);
      }
    });
    
    setCollapsedNodeIds(topLevelCollapse);
  }, [nodes, edges]);

  // Expand all nodes
  const expandAll = useCallback(() => {
    setCollapsedNodeIds(new Set());
  }, []);

  // Check if a specific node is collapsed
  const isCollapsed = useCallback((nodeId: string) => {
    return collapsedNodeIds.has(nodeId);
  }, [collapsedNodeIds]);

  // Filter visible nodes (exclude hidden ones)
  const visibleNodes = useMemo(() => {
    return nodes
      .filter((node) => !hiddenNodeIds.has(node.id))
      .map((node) => ({
        ...node,
        data: {
          ...node.data,
          isCollapsed: collapsedNodeIds.has(node.id),
          childCount: (childrenMap.get(node.id) || []).length,
        },
      }));
  }, [nodes, hiddenNodeIds, collapsedNodeIds, childrenMap]);

  // Filter visible edges (exclude ones with hidden source or target)
  const visibleEdges = useMemo(() => {
    return edges.filter(
      (edge) => !hiddenNodeIds.has(edge.source) && !hiddenNodeIds.has(edge.target)
    );
  }, [edges, hiddenNodeIds]);

  return {
    collapsedNodeIds,
    toggleCollapse,
    collapseAll,
    expandAll,
    isCollapsed,
    visibleNodes,
    visibleEdges,
  };
}
