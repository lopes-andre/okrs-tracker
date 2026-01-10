import { describe, it, expect } from "vitest";
import { nodePassesFilters, DEFAULT_FILTERS, type MindmapFilters } from "../filter-panel";
import type { PaceStatus } from "@/lib/progress-engine";

describe("Filter Logic", () => {
  describe("nodePassesFilters", () => {
    it("should pass all nodes with default filters", () => {
      expect(nodePassesFilters(0, "ahead", DEFAULT_FILTERS)).toBe(true);
      expect(nodePassesFilters(0.5, "on_track", DEFAULT_FILTERS)).toBe(true);
      expect(nodePassesFilters(0.7, "at_risk", DEFAULT_FILTERS)).toBe(true);
      expect(nodePassesFilters(0.3, "off_track", DEFAULT_FILTERS)).toBe(true);
      expect(nodePassesFilters(1, "ahead", DEFAULT_FILTERS)).toBe(true);
    });

    describe("pace status filter", () => {
      it("should filter by single pace status", () => {
        const filters: MindmapFilters = {
          ...DEFAULT_FILTERS,
          paceStatuses: new Set(["ahead"] as PaceStatus[]),
        };

        expect(nodePassesFilters(0.5, "ahead", filters)).toBe(true);
        expect(nodePassesFilters(0.5, "on_track", filters)).toBe(false);
        expect(nodePassesFilters(0.5, "at_risk", filters)).toBe(false);
        expect(nodePassesFilters(0.5, "off_track", filters)).toBe(false);
      });

      it("should filter by multiple pace statuses", () => {
        const filters: MindmapFilters = {
          ...DEFAULT_FILTERS,
          paceStatuses: new Set(["ahead", "on_track"] as PaceStatus[]),
        };

        expect(nodePassesFilters(0.5, "ahead", filters)).toBe(true);
        expect(nodePassesFilters(0.5, "on_track", filters)).toBe(true);
        expect(nodePassesFilters(0.5, "at_risk", filters)).toBe(false);
        expect(nodePassesFilters(0.5, "off_track", filters)).toBe(false);
      });
    });

    describe("progress range filter", () => {
      it("should filter by minimum progress", () => {
        const filters: MindmapFilters = {
          ...DEFAULT_FILTERS,
          minProgress: 50,
        };

        expect(nodePassesFilters(0.3, "on_track", filters)).toBe(false); // 30%
        expect(nodePassesFilters(0.5, "on_track", filters)).toBe(true);  // 50%
        expect(nodePassesFilters(0.7, "on_track", filters)).toBe(true);  // 70%
      });

      it("should filter by maximum progress", () => {
        const filters: MindmapFilters = {
          ...DEFAULT_FILTERS,
          maxProgress: 80,
        };

        expect(nodePassesFilters(0.7, "on_track", filters)).toBe(true);  // 70%
        expect(nodePassesFilters(0.8, "on_track", filters)).toBe(true);  // 80%
        expect(nodePassesFilters(0.9, "on_track", filters)).toBe(false); // 90%
      });

      it("should filter by progress range", () => {
        const filters: MindmapFilters = {
          ...DEFAULT_FILTERS,
          minProgress: 25,
          maxProgress: 75,
        };

        expect(nodePassesFilters(0.2, "on_track", filters)).toBe(false); // 20%
        expect(nodePassesFilters(0.3, "on_track", filters)).toBe(true);  // 30%
        expect(nodePassesFilters(0.5, "on_track", filters)).toBe(true);  // 50%
        expect(nodePassesFilters(0.7, "on_track", filters)).toBe(true);  // 70%
        expect(nodePassesFilters(0.8, "on_track", filters)).toBe(false); // 80%
      });
    });

    describe("show completed filter", () => {
      it("should show completed items by default", () => {
        expect(nodePassesFilters(1, "ahead", DEFAULT_FILTERS)).toBe(true);
      });

      it("should hide completed items when showCompleted is false", () => {
        const filters: MindmapFilters = {
          ...DEFAULT_FILTERS,
          showCompleted: false,
        };

        expect(nodePassesFilters(0.99, "on_track", filters)).toBe(true);
        expect(nodePassesFilters(1, "ahead", filters)).toBe(false);
      });
    });

    describe("combined filters", () => {
      it("should apply all filters together", () => {
        const filters: MindmapFilters = {
          paceStatuses: new Set(["ahead", "on_track"] as PaceStatus[]),
          minProgress: 30,
          maxProgress: 90,
          showCompleted: false,
        };

        // Fails pace status
        expect(nodePassesFilters(0.5, "at_risk", filters)).toBe(false);
        
        // Fails min progress
        expect(nodePassesFilters(0.2, "on_track", filters)).toBe(false);
        
        // Fails max progress
        expect(nodePassesFilters(0.95, "on_track", filters)).toBe(false);
        
        // Fails show completed
        expect(nodePassesFilters(1, "ahead", filters)).toBe(false);
        
        // Passes all
        expect(nodePassesFilters(0.5, "on_track", filters)).toBe(true);
        expect(nodePassesFilters(0.7, "ahead", filters)).toBe(true);
      });
    });
  });

  describe("DEFAULT_FILTERS", () => {
    it("should include all pace statuses", () => {
      expect(DEFAULT_FILTERS.paceStatuses.has("ahead")).toBe(true);
      expect(DEFAULT_FILTERS.paceStatuses.has("on_track")).toBe(true);
      expect(DEFAULT_FILTERS.paceStatuses.has("at_risk")).toBe(true);
      expect(DEFAULT_FILTERS.paceStatuses.has("off_track")).toBe(true);
    });

    it("should have full progress range", () => {
      expect(DEFAULT_FILTERS.minProgress).toBe(0);
      expect(DEFAULT_FILTERS.maxProgress).toBe(100);
    });

    it("should show completed by default", () => {
      expect(DEFAULT_FILTERS.showCompleted).toBe(true);
    });
  });
});
