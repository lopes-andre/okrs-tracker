/**
 * Weekly Review Engine Tests
 * 
 * Comprehensive tests for:
 * - ISO week calculations
 * - Week bounds
 * - Review status determination
 * - Missing review detection
 * - Streak calculations
 */

import { describe, it, expect } from "vitest";
import {
  getISOWeekNumber,
  getISOWeekYear,
  getWeekStart,
  getWeekEnd,
  getWeekBounds,
  formatDateString,
  parseDateString,
  getCurrentWeekInfo,
  isDateInWeek,
  getDayName,
  calculateReviewStatus,
  isReviewOverdue,
  getDaysOverdue,
  getWeeksBetween,
  findMissingReviews,
  calculateStreak,
  calculateLongestStreak,
  calculateReviewStats,
  formatWeekLabel,
  formatWeekLabelShort,
  isCurrentWeek,
  isPastWeek,
} from "./weekly-review-engine";

// ============================================================================
// DATE & WEEK UTILITIES
// ============================================================================

describe("getISOWeekNumber", () => {
  it("should return week 1 for January 4th (always in week 1)", () => {
    expect(getISOWeekNumber(new Date("2026-01-04"))).toBe(1);
  });

  it("should handle January 1st correctly (may be week 52/53 of previous year)", () => {
    // Jan 1, 2026 is a Thursday - should be week 1
    expect(getISOWeekNumber(new Date("2026-01-01"))).toBe(1);
  });

  it("should return correct week for mid-year date", () => {
    // July 15, 2026 is a Wednesday in week 29
    expect(getISOWeekNumber(new Date("2026-07-15"))).toBe(29);
  });

  it("should handle December 31st correctly", () => {
    // Dec 31, 2026 is a Thursday - should be week 53
    expect(getISOWeekNumber(new Date("2026-12-31"))).toBe(53);
  });

  it("should return week 2 for January 11, 2026", () => {
    expect(getISOWeekNumber(new Date("2026-01-11"))).toBe(2);
  });
});

describe("getISOWeekYear", () => {
  it("should return correct year for regular dates", () => {
    expect(getISOWeekYear(new Date("2026-06-15"))).toBe(2026);
  });

  it("should handle year boundary - Jan 1 that belongs to previous year week", () => {
    // Jan 1, 2027 is a Friday - still week 53 of 2026
    expect(getISOWeekYear(new Date("2027-01-01"))).toBe(2026);
  });
});

describe("getWeekStart and getWeekEnd", () => {
  it("should return Monday for week start", () => {
    const monday = getWeekStart(2026, 2);
    expect(monday.getUTCDay()).toBe(1); // Monday
    expect(formatDateString(monday)).toBe("2026-01-05");
  });

  it("should return Sunday for week end", () => {
    const sunday = getWeekEnd(2026, 2);
    expect(sunday.getUTCDay()).toBe(0); // Sunday
    expect(formatDateString(sunday)).toBe("2026-01-11");
  });

  it("should handle week 1 correctly", () => {
    const { start, end } = getWeekBounds(2026, 1);
    expect(formatDateString(start)).toBe("2025-12-29");
    expect(formatDateString(end)).toBe("2026-01-04");
  });

  it("should handle last week of year", () => {
    // 2026 has 53 weeks
    const { start, end } = getWeekBounds(2026, 53);
    expect(formatDateString(start)).toBe("2026-12-28");
    expect(formatDateString(end)).toBe("2027-01-03");
  });
});

describe("formatDateString and parseDateString", () => {
  it("should format date as YYYY-MM-DD", () => {
    const date = new Date(Date.UTC(2026, 0, 15));
    expect(formatDateString(date)).toBe("2026-01-15");
  });

  it("should parse YYYY-MM-DD to Date", () => {
    const date = parseDateString("2026-01-15");
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(0);
    expect(date.getUTCDate()).toBe(15);
  });

  it("should round-trip correctly", () => {
    const original = "2026-06-30";
    const date = parseDateString(original);
    expect(formatDateString(date)).toBe(original);
  });
});

describe("getCurrentWeekInfo", () => {
  it("should return correct info for a specific date", () => {
    const testDate = new Date("2026-01-11T12:00:00Z");
    const info = getCurrentWeekInfo(testDate);
    
    expect(info.year).toBe(2026);
    expect(info.weekNumber).toBe(2);
    expect(formatDateString(info.weekStart)).toBe("2026-01-05");
    expect(formatDateString(info.weekEnd)).toBe("2026-01-11");
  });
});

describe("isDateInWeek", () => {
  it("should return true for date within week", () => {
    expect(isDateInWeek(new Date("2026-01-07"), 2026, 2)).toBe(true);
  });

  it("should return false for date outside week", () => {
    expect(isDateInWeek(new Date("2026-01-04"), 2026, 2)).toBe(false);
  });
});

describe("getDayName", () => {
  it("should return correct day names", () => {
    expect(getDayName(0)).toBe("Sunday");
    expect(getDayName(1)).toBe("Monday");
    expect(getDayName(5)).toBe("Friday");
    expect(getDayName(6)).toBe("Saturday");
  });
});

// ============================================================================
// REVIEW STATUS CALCULATION
// ============================================================================

describe("calculateReviewStatus", () => {
  const weekEnd = "2026-01-11"; // Sunday of week 2

  it("should return 'complete' when completed within the week", () => {
    const review = { week_end: weekEnd, completed_at: "2026-01-10T15:00:00Z" };
    const now = new Date("2026-01-15");
    expect(calculateReviewStatus(review, now)).toBe("complete");
  });

  it("should return 'complete' when completed on Monday after week end", () => {
    const review = { week_end: weekEnd, completed_at: "2026-01-12T10:00:00Z" };
    const now = new Date("2026-01-15");
    expect(calculateReviewStatus(review, now)).toBe("complete");
  });

  it("should return 'late' when completed after Monday", () => {
    const review = { week_end: weekEnd, completed_at: "2026-01-13T10:00:00Z" };
    const now = new Date("2026-01-15");
    expect(calculateReviewStatus(review, now)).toBe("late");
  });

  it("should return 'open' for current week without completion", () => {
    const review = { week_end: weekEnd, completed_at: null };
    const now = new Date("2026-01-09"); // Friday within the week
    expect(calculateReviewStatus(review, now)).toBe("open");
  });

  it("should return 'pending' for past week without completion", () => {
    const review = { week_end: weekEnd, completed_at: null };
    const now = new Date("2026-01-15"); // After the week
    expect(calculateReviewStatus(review, now)).toBe("pending");
  });
});

describe("isReviewOverdue", () => {
  it("should return false for complete reviews", () => {
    const review = { status: "complete" as const, week_end: "2026-01-11" };
    expect(isReviewOverdue(review)).toBe(false);
  });

  it("should return true for pending review past deadline", () => {
    const review = { status: "pending" as const, week_end: "2026-01-04" };
    const now = new Date("2026-01-15");
    expect(isReviewOverdue(review, now)).toBe(true);
  });

  it("should return false for open review in current week", () => {
    const review = { status: "open" as const, week_end: "2026-01-11" };
    const now = new Date("2026-01-09");
    expect(isReviewOverdue(review, now)).toBe(false);
  });
});

describe("getDaysOverdue", () => {
  it("should return 0 for non-overdue reviews", () => {
    const review = { status: "complete" as const, week_end: "2026-01-11" };
    expect(getDaysOverdue(review)).toBe(0);
  });

  it("should return correct days for overdue review", () => {
    const review = { status: "pending" as const, week_end: "2026-01-04" };
    const now = new Date("2026-01-14");
    expect(getDaysOverdue(review, now)).toBe(10);
  });
});

// ============================================================================
// MISSING REVIEWS & GAPS
// ============================================================================

describe("getWeeksBetween", () => {
  it("should return all weeks between two dates", () => {
    // Use UTC dates to avoid timezone issues
    const start = new Date(Date.UTC(2026, 0, 12)); // Week 3 (Monday Jan 12)
    const end = new Date(Date.UTC(2026, 1, 1)); // Week 5 (Sunday Feb 1)
    const weeks = getWeeksBetween(start, end);
    
    expect(weeks).toHaveLength(3); // Weeks 3, 4, 5
    expect(weeks[0]).toEqual({ year: 2026, weekNumber: 3 });
    expect(weeks[1]).toEqual({ year: 2026, weekNumber: 4 });
    expect(weeks[2]).toEqual({ year: 2026, weekNumber: 5 });
  });

  it("should handle year boundary", () => {
    const start = new Date(Date.UTC(2025, 11, 25)); // Week 52 of 2025
    const end = new Date(Date.UTC(2026, 0, 10)); // Week 2 of 2026
    const weeks = getWeeksBetween(start, end);
    
    expect(weeks.length).toBeGreaterThanOrEqual(3);
  });
});

describe("findMissingReviews", () => {
  it("should find missing weeks", () => {
    const existingReviews = [
      { year: 2026, week_number: 1 },
      { year: 2026, week_number: 3 },
    ];
    const planCreated = new Date("2025-12-29"); // Week 1 start
    const now = new Date("2026-01-20"); // Week 4
    
    const missing = findMissingReviews(existingReviews, planCreated, now);
    
    // Should find week 2 and week 4 as missing
    expect(missing.some(w => w.year === 2026 && w.weekNumber === 2)).toBe(true);
  });

  it("should return empty array when all reviews exist", () => {
    const existingReviews = [
      { year: 2026, week_number: 3 },
      { year: 2026, week_number: 4 },
    ];
    // Start from Monday of week 3 (Jan 12)
    const planCreated = new Date(Date.UTC(2026, 0, 12));
    // End at Sunday of week 4 (Jan 25)
    const now = new Date(Date.UTC(2026, 0, 25));
    
    const missing = findMissingReviews(existingReviews, planCreated, now);
    expect(missing).toHaveLength(0);
  });
});

// ============================================================================
// STREAK CALCULATIONS
// ============================================================================

describe("calculateStreak", () => {
  it("should return 0 for empty reviews", () => {
    expect(calculateStreak([])).toBe(0);
  });

  it("should count consecutive complete reviews", () => {
    const reviews = [
      { year: 2026, week_number: 4, status: "complete" as const },
      { year: 2026, week_number: 3, status: "complete" as const },
      { year: 2026, week_number: 2, status: "complete" as const },
    ];
    expect(calculateStreak(reviews)).toBe(3);
  });

  it("should stop at pending review", () => {
    const reviews = [
      { year: 2026, week_number: 4, status: "complete" as const },
      { year: 2026, week_number: 3, status: "pending" as const },
      { year: 2026, week_number: 2, status: "complete" as const },
    ];
    expect(calculateStreak(reviews)).toBe(1);
  });

  it("should stop at gap in weeks", () => {
    const reviews = [
      { year: 2026, week_number: 4, status: "complete" as const },
      // Week 3 missing
      { year: 2026, week_number: 2, status: "complete" as const },
    ];
    expect(calculateStreak(reviews)).toBe(1);
  });

  it("should count late as part of streak", () => {
    const reviews = [
      { year: 2026, week_number: 3, status: "complete" as const },
      { year: 2026, week_number: 2, status: "late" as const },
      { year: 2026, week_number: 1, status: "complete" as const },
    ];
    expect(calculateStreak(reviews)).toBe(3);
  });
});

describe("calculateLongestStreak", () => {
  it("should find longest streak in history", () => {
    const reviews = [
      { year: 2026, week_number: 10, status: "complete" as const },
      { year: 2026, week_number: 9, status: "complete" as const },
      // Gap
      { year: 2026, week_number: 5, status: "complete" as const },
      { year: 2026, week_number: 4, status: "complete" as const },
      { year: 2026, week_number: 3, status: "complete" as const },
      { year: 2026, week_number: 2, status: "complete" as const },
    ];
    expect(calculateLongestStreak(reviews)).toBe(4);
  });

  it("should return 0 for no completed reviews", () => {
    const reviews = [
      { year: 2026, week_number: 2, status: "pending" as const },
    ];
    expect(calculateLongestStreak(reviews)).toBe(0);
  });
});

// ============================================================================
// REVIEW STATS
// ============================================================================

describe("calculateReviewStats", () => {
  it("should calculate comprehensive stats", () => {
    const reviews = [
      { year: 2026, week_number: 4, status: "complete" as const, week_rating: 4 },
      { year: 2026, week_number: 3, status: "complete" as const, week_rating: 5 },
      { year: 2026, week_number: 2, status: "late" as const, week_rating: 3 },
      { year: 2026, week_number: 1, status: "pending" as const, week_rating: null },
    ];

    const stats = calculateReviewStats(reviews);

    expect(stats.totalReviews).toBe(4);
    expect(stats.completedOnTime).toBe(2);
    expect(stats.completedLate).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.completionRate).toBe(0.75);
    expect(stats.averageRating).toBe(4); // (4+5+3)/3
  });

  it("should handle empty reviews", () => {
    const stats = calculateReviewStats([]);
    
    expect(stats.totalReviews).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.averageRating).toBeNull();
  });
});

// ============================================================================
// WEEK LABEL FORMATTING
// ============================================================================

describe("formatWeekLabel", () => {
  it("should format week within same month", () => {
    const label = formatWeekLabel(2026, 3);
    expect(label).toContain("Week 3");
    expect(label).toContain("Jan");
    expect(label).toContain("2026");
  });

  it("should format week spanning months", () => {
    const label = formatWeekLabel(2026, 5); // Late Jan to early Feb
    expect(label).toContain("Week 5");
  });
});

describe("formatWeekLabelShort", () => {
  it("should return short format", () => {
    expect(formatWeekLabelShort(2026, 2)).toBe("W2 2026");
    expect(formatWeekLabelShort(2026, 52)).toBe("W52 2026");
  });
});

describe("isCurrentWeek and isPastWeek", () => {
  const testNow = new Date("2026-01-11"); // Week 2

  it("should identify current week", () => {
    expect(isCurrentWeek(2026, 2, testNow)).toBe(true);
    expect(isCurrentWeek(2026, 1, testNow)).toBe(false);
  });

  it("should identify past weeks", () => {
    expect(isPastWeek(2026, 1, testNow)).toBe(true);
    expect(isPastWeek(2026, 2, testNow)).toBe(false);
    expect(isPastWeek(2025, 52, testNow)).toBe(true);
  });
});
