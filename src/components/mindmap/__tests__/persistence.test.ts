import { describe, it, expect } from "vitest";
import { applySavedPositions, getSavedCollapsedIds } from "../hooks/use-persistence";
import type { MindmapNode } from "../types";

// Helper to create test nodes
function createNode(id: string, type: string, entityId: string): MindmapNode {
  return {
    id,
    type: type as any,
    position: { x: 0, y: 0 },
    data: {
      type: type as any,
      entityId,
      label: `Node ${id}`,
      progress: 0.5,
      paceStatus: "on_track",
    } as any,
  };
}

describe("Persistence Helper Functions", () => {
  describe("applySavedPositions", () => {
    it("should return original nodes when no saved positions", () => {
      const nodes: MindmapNode[] = [
        createNode("plan-1", "plan", "1"),
        createNode("objective-2", "objective", "2"),
      ];
      const savedPositions = new Map<string, { x: number; y: number; isCollapsed: boolean }>();

      const result = applySavedPositions(nodes, savedPositions);

      expect(result).toEqual(nodes);
    });

    it("should apply saved positions to matching nodes", () => {
      const nodes: MindmapNode[] = [
        createNode("plan-1", "plan", "1"),
        createNode("objective-2", "objective", "2"),
      ];
      const savedPositions = new Map([
        ["plan-1", { x: 100, y: 200, isCollapsed: false }],
        ["objective-2", { x: 300, y: 400, isCollapsed: true }],
      ]);

      const result = applySavedPositions(nodes, savedPositions);

      expect(result[0].position).toEqual({ x: 100, y: 200 });
      expect(result[1].position).toEqual({ x: 300, y: 400 });
      expect(result[1].data.isCollapsed).toBe(true);
    });

    it("should keep original position for nodes without saved positions", () => {
      const nodes: MindmapNode[] = [
        { ...createNode("plan-1", "plan", "1"), position: { x: 50, y: 50 } },
        createNode("objective-2", "objective", "2"),
      ];
      const savedPositions = new Map([
        ["objective-2", { x: 300, y: 400, isCollapsed: false }],
      ]);

      const result = applySavedPositions(nodes, savedPositions);

      expect(result[0].position).toEqual({ x: 50, y: 50 }); // Unchanged
      expect(result[1].position).toEqual({ x: 300, y: 400 }); // Applied
    });

    it("should preserve other node data when applying positions", () => {
      const node: MindmapNode = {
        id: "plan-1",
        type: "plan",
        position: { x: 0, y: 0 },
        data: {
          type: "plan",
          entityId: "1",
          label: "My Plan",
          description: "Description",
          progress: 0.75,
          paceStatus: "ahead",
          year: 2026,
          objectivesCount: 5,
          krsCount: 10,
        } as any,
      };
      const savedPositions = new Map([
        ["plan-1", { x: 100, y: 200, isCollapsed: false }],
      ]);

      const result = applySavedPositions([node], savedPositions);

      expect(result[0].data.label).toBe("My Plan");
      expect(result[0].data.description).toBe("Description");
      expect(result[0].data.progress).toBe(0.75);
    });
  });

  describe("getSavedCollapsedIds", () => {
    it("should return empty set when no positions are collapsed", () => {
      const savedPositions = new Map([
        ["plan-1", { x: 100, y: 200, isCollapsed: false }],
        ["objective-2", { x: 300, y: 400, isCollapsed: false }],
      ]);

      const result = getSavedCollapsedIds(savedPositions);

      expect(result.size).toBe(0);
    });

    it("should return IDs of collapsed nodes", () => {
      const savedPositions = new Map([
        ["plan-1", { x: 100, y: 200, isCollapsed: false }],
        ["objective-2", { x: 300, y: 400, isCollapsed: true }],
        ["objective-3", { x: 500, y: 600, isCollapsed: true }],
      ]);

      const result = getSavedCollapsedIds(savedPositions);

      expect(result.size).toBe(2);
      expect(result.has("objective-2")).toBe(true);
      expect(result.has("objective-3")).toBe(true);
      expect(result.has("plan-1")).toBe(false);
    });

    it("should return empty set for empty positions map", () => {
      const savedPositions = new Map<string, { x: number; y: number; isCollapsed: boolean }>();

      const result = getSavedCollapsedIds(savedPositions);

      expect(result.size).toBe(0);
    });
  });
});
