import { describe, it, expect } from "vitest";
import { calculateTreeLayout, calculateRadialLayout, applyLayout } from "../layout";
import type { MindmapNode, MindmapEdge, LayoutConfig } from "../types";

const DEFAULT_CONFIG: LayoutConfig = {
  direction: "TB",
  nodeSpacing: 40,
  levelSpacing: 120,
  showTasks: false,
  showQuarters: true,
};

describe("Mindmap Layout", () => {
  describe("calculateTreeLayout", () => {
    it("should return empty map for empty nodes", () => {
      const result = calculateTreeLayout([], [], DEFAULT_CONFIG);
      expect(result.size).toBe(0);
    });

    it("should position single node at center", () => {
      const nodes: MindmapNode[] = [
        {
          id: "node-1",
          type: "plan",
          position: { x: 0, y: 0 },
          data: {
            type: "plan",
            entityId: "1",
            label: "Test Plan",
            year: 2026,
            progress: 0.5,
            paceStatus: "on_track",
            objectivesCount: 2,
            krsCount: 4,
          },
        },
      ];

      const result = calculateTreeLayout(nodes, [], DEFAULT_CONFIG);
      expect(result.size).toBe(1);
      expect(result.has("node-1")).toBe(true);
    });

    it("should position children below parent", () => {
      const nodes: MindmapNode[] = [
        {
          id: "parent",
          type: "plan",
          position: { x: 0, y: 0 },
          data: {
            type: "plan",
            entityId: "1",
            label: "Plan",
            year: 2026,
            progress: 0.5,
            paceStatus: "on_track",
            objectivesCount: 1,
            krsCount: 0,
          },
        },
        {
          id: "child",
          type: "objective",
          position: { x: 0, y: 0 },
          data: {
            type: "objective",
            entityId: "2",
            label: "Objective",
            code: "O1",
            progress: 0.5,
            paceStatus: "on_track",
            krsCount: 0,
            krsCompleted: 0,
          },
        },
      ];

      const edges: MindmapEdge[] = [
        { id: "e1", source: "parent", target: "child" },
      ];

      const result = calculateTreeLayout(nodes, edges, DEFAULT_CONFIG);
      
      const parentPos = result.get("parent");
      const childPos = result.get("child");
      
      expect(parentPos).toBeDefined();
      expect(childPos).toBeDefined();
      expect(childPos!.y).toBeGreaterThan(parentPos!.y);
    });

    it("should spread siblings horizontally", () => {
      const nodes: MindmapNode[] = [
        {
          id: "parent",
          type: "plan",
          position: { x: 0, y: 0 },
          data: {
            type: "plan",
            entityId: "1",
            label: "Plan",
            year: 2026,
            progress: 0.5,
            paceStatus: "on_track",
            objectivesCount: 2,
            krsCount: 0,
          },
        },
        {
          id: "child1",
          type: "objective",
          position: { x: 0, y: 0 },
          data: {
            type: "objective",
            entityId: "2",
            label: "Objective 1",
            code: "O1",
            progress: 0.5,
            paceStatus: "on_track",
            krsCount: 0,
            krsCompleted: 0,
          },
        },
        {
          id: "child2",
          type: "objective",
          position: { x: 0, y: 0 },
          data: {
            type: "objective",
            entityId: "3",
            label: "Objective 2",
            code: "O2",
            progress: 0.5,
            paceStatus: "on_track",
            krsCount: 0,
            krsCompleted: 0,
          },
        },
      ];

      const edges: MindmapEdge[] = [
        { id: "e1", source: "parent", target: "child1" },
        { id: "e2", source: "parent", target: "child2" },
      ];

      const result = calculateTreeLayout(nodes, edges, DEFAULT_CONFIG);
      
      const child1Pos = result.get("child1");
      const child2Pos = result.get("child2");
      
      expect(child1Pos).toBeDefined();
      expect(child2Pos).toBeDefined();
      expect(child1Pos!.x).not.toBe(child2Pos!.x);
    });
  });

  describe("calculateRadialLayout", () => {
    it("should position root at center", () => {
      const nodes: MindmapNode[] = [
        {
          id: "root",
          type: "plan",
          position: { x: 0, y: 0 },
          data: {
            type: "plan",
            entityId: "1",
            label: "Plan",
            year: 2026,
            progress: 0.5,
            paceStatus: "on_track",
            objectivesCount: 0,
            krsCount: 0,
          },
        },
      ];

      const result = calculateRadialLayout(nodes, [], DEFAULT_CONFIG);
      
      const rootPos = result.get("root");
      expect(rootPos).toEqual({ x: 0, y: 0 });
    });

    it("should position children in a ring around root", () => {
      const nodes: MindmapNode[] = [
        {
          id: "root",
          type: "plan",
          position: { x: 0, y: 0 },
          data: {
            type: "plan",
            entityId: "1",
            label: "Plan",
            year: 2026,
            progress: 0.5,
            paceStatus: "on_track",
            objectivesCount: 2,
            krsCount: 0,
          },
        },
        {
          id: "child1",
          type: "objective",
          position: { x: 0, y: 0 },
          data: {
            type: "objective",
            entityId: "2",
            label: "Objective 1",
            code: "O1",
            progress: 0.5,
            paceStatus: "on_track",
            krsCount: 0,
            krsCompleted: 0,
          },
        },
        {
          id: "child2",
          type: "objective",
          position: { x: 0, y: 0 },
          data: {
            type: "objective",
            entityId: "3",
            label: "Objective 2",
            code: "O2",
            progress: 0.5,
            paceStatus: "on_track",
            krsCount: 0,
            krsCompleted: 0,
          },
        },
      ];

      const edges: MindmapEdge[] = [
        { id: "e1", source: "root", target: "child1" },
        { id: "e2", source: "root", target: "child2" },
      ];

      const result = calculateRadialLayout(nodes, edges, DEFAULT_CONFIG);
      
      const rootPos = result.get("root");
      const child1Pos = result.get("child1");
      const child2Pos = result.get("child2");
      
      expect(rootPos).toEqual({ x: 0, y: 0 });
      
      // Children should be at same distance from center
      const dist1 = Math.sqrt(child1Pos!.x ** 2 + child1Pos!.y ** 2);
      const dist2 = Math.sqrt(child2Pos!.x ** 2 + child2Pos!.y ** 2);
      expect(dist1).toBeCloseTo(dist2, 1);
    });
  });

  describe("applyLayout", () => {
    it("should apply positions from map to nodes", () => {
      const nodes: MindmapNode[] = [
        {
          id: "node-1",
          type: "plan",
          position: { x: 0, y: 0 },
          data: {
            type: "plan",
            entityId: "1",
            label: "Plan",
            year: 2026,
            progress: 0.5,
            paceStatus: "on_track",
            objectivesCount: 0,
            krsCount: 0,
          },
        },
      ];

      const positions = new Map([["node-1", { x: 100, y: 200 }]]);

      const result = applyLayout(nodes, positions);
      
      expect(result[0].position).toEqual({ x: 100, y: 200 });
    });

    it("should keep original position if not in map", () => {
      const nodes: MindmapNode[] = [
        {
          id: "node-1",
          type: "plan",
          position: { x: 50, y: 50 },
          data: {
            type: "plan",
            entityId: "1",
            label: "Plan",
            year: 2026,
            progress: 0.5,
            paceStatus: "on_track",
            objectivesCount: 0,
            krsCount: 0,
          },
        },
      ];

      const positions = new Map<string, { x: number; y: number }>();

      const result = applyLayout(nodes, positions);
      
      expect(result[0].position).toEqual({ x: 50, y: 50 });
    });
  });
});
