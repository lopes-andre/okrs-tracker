import { describe, it, expect } from "vitest";
import type { MindmapNode, MindmapEdge } from "../types";

// Pure functions extracted from the hook for testing

function buildChildrenMap(edges: MindmapEdge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  edges.forEach((edge) => {
    const children = map.get(edge.source) || [];
    children.push(edge.target);
    map.set(edge.source, children);
  });
  return map;
}

function getDescendants(nodeId: string, childrenMap: Map<string, string[]>): Set<string> {
  const descendants = new Set<string>();
  const queue = [...(childrenMap.get(nodeId) || [])];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    descendants.add(current);
    const children = childrenMap.get(current) || [];
    queue.push(...children);
  }
  
  return descendants;
}

function getHiddenNodeIds(
  collapsedNodeIds: Set<string>,
  childrenMap: Map<string, string[]>
): Set<string> {
  const hidden = new Set<string>();
  
  collapsedNodeIds.forEach((collapsedId) => {
    const descendants = getDescendants(collapsedId, childrenMap);
    descendants.forEach((d) => hidden.add(d));
  });
  
  return hidden;
}

function filterVisibleNodes(
  nodes: MindmapNode[],
  hiddenNodeIds: Set<string>,
  collapsedNodeIds: Set<string>,
  childrenMap: Map<string, string[]>
): MindmapNode[] {
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
}

function filterVisibleEdges(
  edges: MindmapEdge[],
  hiddenNodeIds: Set<string>
): MindmapEdge[] {
  return edges.filter(
    (edge) => !hiddenNodeIds.has(edge.source) && !hiddenNodeIds.has(edge.target)
  );
}

// Helper to create test nodes
function createNode(id: string, type: string = "objective"): MindmapNode {
  return {
    id,
    type: type as any,
    position: { x: 0, y: 0 },
    data: {
      type: type as any,
      entityId: id,
      label: `Node ${id}`,
      progress: 0.5,
      paceStatus: "on_track",
    } as any,
  };
}

describe("Collapse/Expand Logic", () => {
  describe("buildChildrenMap", () => {
    it("should build a map of parent -> children", () => {
      const edges: MindmapEdge[] = [
        { id: "e1", source: "A", target: "B" },
        { id: "e2", source: "A", target: "C" },
        { id: "e3", source: "B", target: "D" },
      ];

      const childrenMap = buildChildrenMap(edges);

      expect(childrenMap.get("A")).toEqual(["B", "C"]);
      expect(childrenMap.get("B")).toEqual(["D"]);
      expect(childrenMap.has("C")).toBe(false);
      expect(childrenMap.has("D")).toBe(false);
    });

    it("should return empty map for no edges", () => {
      const childrenMap = buildChildrenMap([]);
      expect(childrenMap.size).toBe(0);
    });
  });

  describe("getDescendants", () => {
    it("should return all descendants of a node", () => {
      const edges: MindmapEdge[] = [
        { id: "e1", source: "root", target: "child1" },
        { id: "e2", source: "root", target: "child2" },
        { id: "e3", source: "child1", target: "grandchild1" },
        { id: "e4", source: "child1", target: "grandchild2" },
      ];
      const childrenMap = buildChildrenMap(edges);

      const descendants = getDescendants("root", childrenMap);

      expect(descendants.size).toBe(4);
      expect(descendants.has("child1")).toBe(true);
      expect(descendants.has("child2")).toBe(true);
      expect(descendants.has("grandchild1")).toBe(true);
      expect(descendants.has("grandchild2")).toBe(true);
    });

    it("should return empty set for leaf nodes", () => {
      const edges: MindmapEdge[] = [
        { id: "e1", source: "parent", target: "child" },
      ];
      const childrenMap = buildChildrenMap(edges);

      const descendants = getDescendants("child", childrenMap);

      expect(descendants.size).toBe(0);
    });
  });

  describe("getHiddenNodeIds", () => {
    it("should return all descendants of collapsed nodes", () => {
      const edges: MindmapEdge[] = [
        { id: "e1", source: "A", target: "B" },
        { id: "e2", source: "B", target: "C" },
      ];
      const childrenMap = buildChildrenMap(edges);
      const collapsedNodeIds = new Set(["A"]);

      const hidden = getHiddenNodeIds(collapsedNodeIds, childrenMap);

      expect(hidden.size).toBe(2);
      expect(hidden.has("B")).toBe(true);
      expect(hidden.has("C")).toBe(true);
      expect(hidden.has("A")).toBe(false);
    });

    it("should handle multiple collapsed nodes", () => {
      const edges: MindmapEdge[] = [
        { id: "e1", source: "root", target: "obj1" },
        { id: "e2", source: "root", target: "obj2" },
        { id: "e3", source: "obj1", target: "kr1" },
        { id: "e4", source: "obj2", target: "kr2" },
      ];
      const childrenMap = buildChildrenMap(edges);
      const collapsedNodeIds = new Set(["obj1", "obj2"]);

      const hidden = getHiddenNodeIds(collapsedNodeIds, childrenMap);

      expect(hidden.size).toBe(2);
      expect(hidden.has("kr1")).toBe(true);
      expect(hidden.has("kr2")).toBe(true);
    });

    it("should return empty set when nothing is collapsed", () => {
      const edges: MindmapEdge[] = [
        { id: "e1", source: "A", target: "B" },
      ];
      const childrenMap = buildChildrenMap(edges);

      const hidden = getHiddenNodeIds(new Set(), childrenMap);

      expect(hidden.size).toBe(0);
    });
  });

  describe("filterVisibleNodes", () => {
    it("should filter out hidden nodes", () => {
      const nodes: MindmapNode[] = [
        createNode("A"),
        createNode("B"),
        createNode("C"),
      ];
      const edges: MindmapEdge[] = [
        { id: "e1", source: "A", target: "B" },
        { id: "e2", source: "B", target: "C" },
      ];
      const childrenMap = buildChildrenMap(edges);
      const collapsedNodeIds = new Set(["A"]);
      const hiddenNodeIds = getHiddenNodeIds(collapsedNodeIds, childrenMap);

      const visible = filterVisibleNodes(nodes, hiddenNodeIds, collapsedNodeIds, childrenMap);

      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe("A");
    });

    it("should add isCollapsed flag to collapsed nodes", () => {
      const nodes: MindmapNode[] = [
        createNode("A"),
        createNode("B"),
      ];
      const edges: MindmapEdge[] = [
        { id: "e1", source: "A", target: "B" },
      ];
      const childrenMap = buildChildrenMap(edges);
      const collapsedNodeIds = new Set(["A"]);
      const hiddenNodeIds = getHiddenNodeIds(collapsedNodeIds, childrenMap);

      const visible = filterVisibleNodes(nodes, hiddenNodeIds, collapsedNodeIds, childrenMap);

      expect(visible[0].data.isCollapsed).toBe(true);
    });

    it("should add childCount to visible nodes", () => {
      const nodes: MindmapNode[] = [
        createNode("parent"),
        createNode("child1"),
        createNode("child2"),
      ];
      const edges: MindmapEdge[] = [
        { id: "e1", source: "parent", target: "child1" },
        { id: "e2", source: "parent", target: "child2" },
      ];
      const childrenMap = buildChildrenMap(edges);
      const hiddenNodeIds = new Set<string>();

      const visible = filterVisibleNodes(nodes, hiddenNodeIds, new Set(), childrenMap);

      const parentNode = visible.find(n => n.id === "parent");
      expect(parentNode?.data.childCount).toBe(2);
    });
  });

  describe("filterVisibleEdges", () => {
    it("should hide edges where target is hidden", () => {
      const edges: MindmapEdge[] = [
        { id: "e1", source: "A", target: "B" },
        { id: "e2", source: "B", target: "C" },
      ];
      const hiddenNodeIds = new Set(["B", "C"]);

      const visible = filterVisibleEdges(edges, hiddenNodeIds);

      expect(visible).toHaveLength(0);
    });

    it("should keep edges where both ends are visible", () => {
      const edges: MindmapEdge[] = [
        { id: "e1", source: "A", target: "B" },
        { id: "e2", source: "B", target: "C" },
      ];
      const hiddenNodeIds = new Set(["C"]);

      const visible = filterVisibleEdges(edges, hiddenNodeIds);

      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe("e1");
    });

    it("should return all edges when nothing is hidden", () => {
      const edges: MindmapEdge[] = [
        { id: "e1", source: "A", target: "B" },
        { id: "e2", source: "B", target: "C" },
      ];

      const visible = filterVisibleEdges(edges, new Set());

      expect(visible).toHaveLength(2);
    });
  });

  describe("integration", () => {
    it("should correctly compute visibility for a complex tree", () => {
      const nodes: MindmapNode[] = [
        createNode("plan", "plan"),
        createNode("obj1", "objective"),
        createNode("obj2", "objective"),
        createNode("kr1", "kr"),
        createNode("kr2", "kr"),
        createNode("kr3", "kr"),
        createNode("q1", "quarter"),
        createNode("q2", "quarter"),
      ];
      const edges: MindmapEdge[] = [
        { id: "e1", source: "plan", target: "obj1" },
        { id: "e2", source: "plan", target: "obj2" },
        { id: "e3", source: "obj1", target: "kr1" },
        { id: "e4", source: "obj1", target: "kr2" },
        { id: "e5", source: "obj2", target: "kr3" },
        { id: "e6", source: "kr1", target: "q1" },
        { id: "e7", source: "kr1", target: "q2" },
      ];
      const childrenMap = buildChildrenMap(edges);
      
      // Collapse obj1
      const collapsedNodeIds = new Set(["obj1"]);
      const hiddenNodeIds = getHiddenNodeIds(collapsedNodeIds, childrenMap);

      // Should hide kr1, kr2, q1, q2
      expect(hiddenNodeIds.size).toBe(4);
      expect(hiddenNodeIds.has("kr1")).toBe(true);
      expect(hiddenNodeIds.has("kr2")).toBe(true);
      expect(hiddenNodeIds.has("q1")).toBe(true);
      expect(hiddenNodeIds.has("q2")).toBe(true);

      // Visible nodes: plan, obj1, obj2, kr3
      const visibleNodes = filterVisibleNodes(nodes, hiddenNodeIds, collapsedNodeIds, childrenMap);
      expect(visibleNodes).toHaveLength(4);
      expect(visibleNodes.map(n => n.id)).toContain("plan");
      expect(visibleNodes.map(n => n.id)).toContain("obj1");
      expect(visibleNodes.map(n => n.id)).toContain("obj2");
      expect(visibleNodes.map(n => n.id)).toContain("kr3");

      // Visible edges: plan->obj1, plan->obj2, obj2->kr3
      const visibleEdges = filterVisibleEdges(edges, hiddenNodeIds);
      expect(visibleEdges).toHaveLength(3);
      expect(visibleEdges.map(e => e.id)).toContain("e1");
      expect(visibleEdges.map(e => e.id)).toContain("e2");
      expect(visibleEdges.map(e => e.id)).toContain("e5");
    });
  });
});
