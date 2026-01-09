/**
 * Progress Engine Unit Tests
 * 
 * Tests for all core progress computation functions
 */

import {
  // Utilities
  clamp01,
  clamp,
  daysBetween,
  getQuarterDates,
  getCurrentQuarter,
  
  // Progress computation
  computeProgress,
  computeMilestoneProgressWithTasks,
  
  // Pace computation
  computeExpectedProgress,
  computeExpectedValue,
  computePaceRatio,
  classifyPaceStatus,
  
  // Forecast
  computeForecast,
  computeMilestoneForecastDate,
  
  // Full KR progress
  computeKrProgress,
  
  // Rollups
  computeObjectiveProgress,
  computePlanProgress,
  
  // Display helpers
  formatProgress,
  formatPaceStatus,
  getPaceStatusVariant,
  formatValueWithUnit,
  formatDelta,
} from "./progress-engine";

import type { AnnualKr, QuarterTarget, CheckIn, Task, Objective } from "./supabase/types";

// ============================================================================
// TEST UTILITIES
// ============================================================================

const createMockKr = (overrides: Partial<AnnualKr> = {}): AnnualKr => ({
  id: "kr-1",
  objective_id: "obj-1",
  group_id: null,
  name: "Test KR",
  description: null,
  kr_type: "metric",
  direction: "increase",
  aggregation: "cumulative",
  unit: "units",
  start_value: 0,
  target_value: 100,
  current_value: 50,
  weight: 1,
  sort_order: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

const createMockCheckIn = (overrides: Partial<CheckIn> = {}): CheckIn => ({
  id: "ci-1",
  annual_kr_id: "kr-1",
  quarter_target_id: null,
  value: 50,
  previous_value: null,
  note: null,
  evidence_url: null,
  recorded_at: "2026-06-15T12:00:00Z",
  recorded_by: "user-1",
  created_at: "2026-06-15T12:00:00Z",
  ...overrides,
});

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  plan_id: "plan-1",
  objective_id: null,
  annual_kr_id: "kr-1",
  quarter_target_id: null,
  title: "Test Task",
  description: null,
  status: "completed",
  priority: "medium",
  effort: "moderate",
  due_date: null,
  due_time: null,
  completed_at: "2026-06-15T12:00:00Z",
  assigned_to: null,
  sort_order: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

const createMockObjective = (overrides: Partial<Objective> = {}): Objective => ({
  id: "obj-1",
  plan_id: "plan-1",
  code: "O1",
  name: "Test Objective",
  description: null,
  weight: 1,
  sort_order: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe("Utility Functions", () => {
  describe("clamp01", () => {
    it("should clamp values to [0, 1] range", () => {
      expect(clamp01(-0.5)).toBe(0);
      expect(clamp01(0)).toBe(0);
      expect(clamp01(0.5)).toBe(0.5);
      expect(clamp01(1)).toBe(1);
      expect(clamp01(1.5)).toBe(1);
    });
  });

  describe("clamp", () => {
    it("should clamp values to specified range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe("daysBetween", () => {
    it("should calculate days between dates", () => {
      const start = new Date("2026-01-01");
      const end = new Date("2026-01-31");
      expect(daysBetween(start, end)).toBe(30);
    });

    it("should return negative for reversed dates", () => {
      const start = new Date("2026-01-31");
      const end = new Date("2026-01-01");
      expect(daysBetween(start, end)).toBe(-30);
    });
  });

  describe("getQuarterDates", () => {
    it("should return correct Q1 dates", () => {
      const { start, end } = getQuarterDates(2026, 1);
      expect(start.getMonth()).toBe(0); // January
      expect(end.getMonth()).toBe(2); // March
      expect(end.getDate()).toBe(31); // Last day of March
    });

    it("should return correct Q4 dates", () => {
      const { start, end } = getQuarterDates(2026, 4);
      expect(start.getMonth()).toBe(9); // October
      expect(end.getMonth()).toBe(11); // December
      expect(end.getDate()).toBe(31); // Last day of December
    });
  });

  describe("getCurrentQuarter", () => {
    it("should return correct quarter for dates", () => {
      expect(getCurrentQuarter(new Date("2026-02-15"))).toBe(1);
      expect(getCurrentQuarter(new Date("2026-05-15"))).toBe(2);
      expect(getCurrentQuarter(new Date("2026-08-15"))).toBe(3);
      expect(getCurrentQuarter(new Date("2026-11-15"))).toBe(4);
    });
  });
});

// ============================================================================
// PROGRESS COMPUTATION TESTS
// ============================================================================

describe("Progress Computation", () => {
  describe("computeProgress - Increase Direction", () => {
    it("should compute progress for increase metric (0% at baseline)", () => {
      const progress = computeProgress("metric", "increase", 0, 0, 100);
      expect(progress).toBe(0);
    });

    it("should compute progress for increase metric (50%)", () => {
      const progress = computeProgress("metric", "increase", 50, 0, 100);
      expect(progress).toBe(0.5);
    });

    it("should compute progress for increase metric (100% at target)", () => {
      const progress = computeProgress("metric", "increase", 100, 0, 100);
      expect(progress).toBe(1);
    });

    it("should clamp progress above target to 100%", () => {
      const progress = computeProgress("metric", "increase", 150, 0, 100);
      expect(progress).toBe(1);
    });

    it("should handle non-zero baseline", () => {
      const progress = computeProgress("metric", "increase", 75, 50, 100);
      expect(progress).toBe(0.5);
    });
  });

  describe("computeProgress - Decrease Direction", () => {
    it("should compute progress for decrease metric (body fat example)", () => {
      // Start at 25%, target 15%, currently at 20%
      const progress = computeProgress("metric", "decrease", 20, 25, 15);
      expect(progress).toBe(0.5);
    });

    it("should handle at target", () => {
      const progress = computeProgress("metric", "decrease", 15, 25, 15);
      expect(progress).toBe(1);
    });

    it("should handle above baseline (got worse)", () => {
      const progress = computeProgress("metric", "decrease", 27, 25, 15);
      expect(progress).toBe(0);
    });
  });

  describe("computeProgress - Maintain Direction", () => {
    it("should return 1 when exactly at target", () => {
      const progress = computeProgress("metric", "maintain", 100, 100, 100, { toleranceBand: 5 });
      expect(progress).toBe(1);
    });

    it("should decrease as value deviates from target", () => {
      const progress = computeProgress("metric", "maintain", 103, 100, 100, { toleranceBand: 5 });
      expect(progress).toBeCloseTo(0.4, 1);
    });
  });

  describe("computeProgress - Milestone", () => {
    it("should return 0 for incomplete milestone", () => {
      const progress = computeProgress("milestone", "increase", 0, 0, 1);
      expect(progress).toBe(0);
    });

    it("should return 1 for complete milestone", () => {
      const progress = computeProgress("milestone", "increase", 1, 0, 1);
      expect(progress).toBe(1);
    });

    it("should handle partial progress via value", () => {
      const progress = computeProgress("milestone", "increase", 0.5, 0, 1);
      expect(progress).toBe(0.5);
    });
  });

  describe("computeMilestoneProgressWithTasks", () => {
    it("should cap task-based progress at 0.95", () => {
      const progress = computeMilestoneProgressWithTasks(0, 10, 10, false);
      expect(progress).toBe(0.95);
    });

    it("should return 1 when explicitly marked complete", () => {
      const progress = computeMilestoneProgressWithTasks(0, 5, 10, true);
      expect(progress).toBe(1);
    });

    it("should calculate partial task progress", () => {
      const progress = computeMilestoneProgressWithTasks(0, 5, 10, false);
      expect(progress).toBe(0.5);
    });
  });
});

// ============================================================================
// PACE COMPUTATION TESTS
// ============================================================================

describe("Pace Computation", () => {
  describe("computeExpectedProgress", () => {
    it("should return 0.5 at mid-year", () => {
      const window = { start: new Date("2026-01-01"), end: new Date("2026-12-31") };
      const midYear = new Date("2026-07-02");
      const expected = computeExpectedProgress(midYear, window);
      expect(expected).toBeCloseTo(0.5, 1);
    });

    it("should return 0 at start", () => {
      const window = { start: new Date("2026-01-01"), end: new Date("2026-12-31") };
      const expected = computeExpectedProgress(new Date("2026-01-01"), window);
      expect(expected).toBe(0);
    });

    it("should return 1 at end", () => {
      const window = { start: new Date("2026-01-01"), end: new Date("2026-12-31") };
      const expected = computeExpectedProgress(new Date("2026-12-31"), window);
      expect(expected).toBeCloseTo(1, 1);
    });
  });

  describe("computeExpectedValue", () => {
    it("should interpolate expected value for increase", () => {
      const expected = computeExpectedValue(0.5, 0, 100, "increase");
      expect(expected).toBe(50);
    });

    it("should interpolate expected value for decrease", () => {
      const expected = computeExpectedValue(0.5, 25, 15, "decrease");
      expect(expected).toBe(20);
    });

    it("should return target for maintain", () => {
      const expected = computeExpectedValue(0.5, 100, 100, "maintain");
      expect(expected).toBe(100);
    });
  });

  describe("computePaceRatio", () => {
    it("should return 1 when on pace", () => {
      expect(computePaceRatio(0.5, 0.5)).toBe(1);
    });

    it("should return > 1 when ahead", () => {
      expect(computePaceRatio(0.6, 0.5)).toBe(1.2);
    });

    it("should return < 1 when behind", () => {
      expect(computePaceRatio(0.4, 0.5)).toBe(0.8);
    });
  });

  describe("classifyPaceStatus", () => {
    it("should classify ahead (≥1.10)", () => {
      expect(classifyPaceStatus(1.15)).toBe("ahead");
      expect(classifyPaceStatus(1.10)).toBe("ahead");
    });

    it("should classify on_track (0.90-1.10)", () => {
      expect(classifyPaceStatus(1.05)).toBe("on_track");
      expect(classifyPaceStatus(0.95)).toBe("on_track");
      expect(classifyPaceStatus(0.90)).toBe("on_track");
    });

    it("should classify at_risk (0.75-0.90)", () => {
      expect(classifyPaceStatus(0.85)).toBe("at_risk");
      expect(classifyPaceStatus(0.75)).toBe("at_risk");
    });

    it("should classify off_track (<0.75)", () => {
      expect(classifyPaceStatus(0.70)).toBe("off_track");
      expect(classifyPaceStatus(0.50)).toBe("off_track");
    });
  });
});

// ============================================================================
// FORECAST TESTS
// ============================================================================

describe("Forecast Computation", () => {
  describe("computeForecast", () => {
    it("should project end value based on current rate", () => {
      const window = { start: new Date("2026-01-01"), end: new Date("2026-12-31") };
      const midYear = new Date("2026-07-01");
      const { value } = computeForecast("metric", 0, 50, window, midYear);
      
      // After 181 days, at 50. Rate = 50/181 ≈ 0.276/day
      // Remaining ≈ 183 days. Forecast = 50 + 0.276 * 183 ≈ 100
      expect(value).toBeCloseTo(100, -1);
    });

    it("should return null for milestone", () => {
      const window = { start: new Date("2026-01-01"), end: new Date("2026-12-31") };
      const { value } = computeForecast("milestone", 0, 0, window, new Date("2026-07-01"));
      expect(value).toBeNull();
    });
  });

  describe("computeMilestoneForecastDate", () => {
    it("should return current date if already complete", () => {
      const window = { start: new Date("2026-01-01"), end: new Date("2026-12-31") };
      const now = new Date("2026-06-15");
      const date = computeMilestoneForecastDate(10, 10, window, now);
      expect(date).toEqual(now);
    });

    it("should project completion date based on velocity", () => {
      const window = { start: new Date("2026-01-01"), end: new Date("2026-12-31") };
      const now = new Date("2026-06-15"); // ~166 days in
      const date = computeMilestoneForecastDate(5, 10, window, now);
      // 5 tasks in ~166 days = ~0.03 tasks/day
      // 5 remaining / 0.03 = ~166 more days
      expect(date).not.toBeNull();
      expect(date!.getTime()).toBeGreaterThan(now.getTime());
    });

    it("should return null if no progress", () => {
      const window = { start: new Date("2026-01-01"), end: new Date("2026-12-31") };
      const date = computeMilestoneForecastDate(0, 10, window, new Date("2026-06-15"));
      expect(date).toBeNull();
    });
  });
});

// ============================================================================
// FULL KR PROGRESS TESTS
// ============================================================================

describe("Full KR Progress Computation", () => {
  it("should compute complete progress result for increase metric", () => {
    const kr = createMockKr({
      kr_type: "metric",
      direction: "increase",
      start_value: 0,
      target_value: 100,
      current_value: 50,
    });
    
    const checkIns = [
      createMockCheckIn({ value: 50, recorded_at: "2026-06-15T12:00:00Z" }),
    ];
    
    const result = computeKrProgress(kr, checkIns, [], 2026, new Date("2026-06-15"));
    
    expect(result.currentValue).toBe(50);
    expect(result.baseline).toBe(0);
    expect(result.target).toBe(100);
    expect(result.progress).toBe(0.5);
    expect(result.paceStatus).toBeDefined();
    expect(result.daysRemaining).toBeGreaterThan(0);
    expect(result.lastCheckInDate).not.toBeNull();
  });

  it("should compute progress for count KR with multiple check-ins", () => {
    const kr = createMockKr({
      kr_type: "count",
      direction: "increase",
      start_value: 0,
      target_value: 100,
    });
    
    const checkIns = [
      createMockCheckIn({ value: 5, recorded_at: "2026-02-01T12:00:00Z" }),
      createMockCheckIn({ value: 10, recorded_at: "2026-03-01T12:00:00Z" }),
      createMockCheckIn({ value: 15, recorded_at: "2026-04-01T12:00:00Z" }),
    ];
    
    const result = computeKrProgress(kr, checkIns, [], 2026, new Date("2026-04-15"));
    
    // Sum of check-ins: 5 + 10 + 15 = 30
    expect(result.currentValue).toBe(30);
    expect(result.progress).toBe(0.3);
  });

  it("should compute progress for average KR", () => {
    const kr = createMockKr({
      kr_type: "average",
      direction: "increase",
      start_value: 6,
      target_value: 8,
      unit: "hours",
    });
    
    const checkIns = [
      createMockCheckIn({ value: 6.5, recorded_at: "2026-02-01T12:00:00Z" }),
      createMockCheckIn({ value: 7.0, recorded_at: "2026-03-01T12:00:00Z" }),
      createMockCheckIn({ value: 7.5, recorded_at: "2026-04-01T12:00:00Z" }),
    ];
    
    const result = computeKrProgress(kr, checkIns, [], 2026, new Date("2026-04-15"));
    
    // Average: (6.5 + 7.0 + 7.5) / 3 = 7.0
    expect(result.currentValue).toBe(7);
    // Progress: (7 - 6) / (8 - 6) = 0.5
    expect(result.progress).toBe(0.5);
  });
});

// ============================================================================
// ROLLUP TESTS
// ============================================================================

describe("Rollup Computations", () => {
  describe("computeObjectiveProgress", () => {
    it("should compute weighted average of KR progresses", () => {
      const objective = createMockObjective();
      
      const krProgresses = [
        {
          kr: createMockKr({ id: "kr-1", weight: 2 }),
          progress: {
            currentValue: 60,
            baseline: 0,
            target: 100,
            progress: 0.6,
            expectedProgress: 0.5,
            expectedValue: 50,
            paceRatio: 1.2,
            paceStatus: "ahead" as const,
            delta: -40,
            forecastValue: 100,
            forecastDate: null,
            daysRemaining: 180,
            daysElapsed: 185,
            lastCheckInDate: new Date(),
          },
        },
        {
          kr: createMockKr({ id: "kr-2", weight: 1 }),
          progress: {
            currentValue: 30,
            baseline: 0,
            target: 100,
            progress: 0.3,
            expectedProgress: 0.5,
            expectedValue: 50,
            paceRatio: 0.6,
            paceStatus: "off_track" as const,
            delta: -70,
            forecastValue: 60,
            forecastDate: null,
            daysRemaining: 180,
            daysElapsed: 185,
            lastCheckInDate: new Date(),
          },
        },
      ];
      
      const result = computeObjectiveProgress(objective, krProgresses);
      
      // Weighted average: (0.6 * 2 + 0.3 * 1) / 3 = 1.5 / 3 = 0.5
      expect(result.progress).toBe(0.5);
      expect(result.krCount).toBe(2);
      // Worst status is off_track
      expect(result.paceStatus).toBe("off_track");
    });

    it("should handle empty KRs", () => {
      const objective = createMockObjective();
      const result = computeObjectiveProgress(objective, []);
      
      expect(result.progress).toBe(0);
      expect(result.krCount).toBe(0);
      expect(result.paceStatus).toBe("off_track");
    });
  });

  describe("computePlanProgress", () => {
    it("should compute weighted average of objective progresses", () => {
      const objectives = [
        { 
          objective: createMockObjective({ id: "obj-1", weight: 1 }), 
          progress: {
            objectiveId: "obj-1",
            progress: 0.8,
            expectedProgress: 0.5,
            paceStatus: "ahead" as const,
            krCount: 2,
            krProgresses: [],
          },
        },
        { 
          objective: createMockObjective({ id: "obj-2", weight: 1 }), 
          progress: {
            objectiveId: "obj-2",
            progress: 0.4,
            expectedProgress: 0.5,
            paceStatus: "at_risk" as const,
            krCount: 1,
            krProgresses: [],
          },
        },
      ];
      
      const result = computePlanProgress("plan-1", objectives);
      
      // Average: (0.8 + 0.4) / 2 = 0.6
      expect(result.progress).toBe(0.6);
      expect(result.objectiveCount).toBe(2);
      // Worst status is at_risk
      expect(result.paceStatus).toBe("at_risk");
    });
  });
});

// ============================================================================
// DISPLAY HELPER TESTS
// ============================================================================

describe("Display Helpers", () => {
  describe("formatProgress", () => {
    it("should format progress as percentage", () => {
      expect(formatProgress(0.5)).toBe("50%");
      expect(formatProgress(1)).toBe("100%");
      expect(formatProgress(0)).toBe("0%");
    });
  });

  describe("formatPaceStatus", () => {
    it("should format pace status for display", () => {
      expect(formatPaceStatus("ahead")).toBe("Ahead");
      expect(formatPaceStatus("on_track")).toBe("On Track");
      expect(formatPaceStatus("at_risk")).toBe("At Risk");
      expect(formatPaceStatus("off_track")).toBe("Off Track");
    });
  });

  describe("getPaceStatusVariant", () => {
    it("should return correct badge variant", () => {
      expect(getPaceStatusVariant("ahead")).toBe("success");
      expect(getPaceStatusVariant("on_track")).toBe("info");
      expect(getPaceStatusVariant("at_risk")).toBe("warning");
      expect(getPaceStatusVariant("off_track")).toBe("danger");
    });
  });

  describe("formatValueWithUnit", () => {
    it("should format metric values", () => {
      expect(formatValueWithUnit(1000, "users", "metric")).toBe("1,000 users");
      expect(formatValueWithUnit(50, null, "metric")).toBe("50");
    });

    it("should format rate values", () => {
      expect(formatValueWithUnit(75.5, null, "rate")).toBe("75.5%");
      expect(formatValueWithUnit(75.5, "%", "rate")).toBe("75.5%");
    });
  });

  describe("formatDelta", () => {
    it("should format positive delta with plus sign", () => {
      expect(formatDelta(10, "units", "increase")).toBe("+10 units");
    });

    it("should format negative delta", () => {
      expect(formatDelta(-10, "units", "increase")).toBe("-10 units");
    });
  });
});
