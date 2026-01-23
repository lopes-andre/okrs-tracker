/**
 * Weekly Review Engine Tests
 * 
 * Comprehensive tests for:
 * - Week calculations (Sunday-Saturday weeks)
 * - Week bounds
 * - Review status determination
 * - Missing review detection
 * - Streak calculations
 * 
 * NOTE: Weeks start on SUNDAY and end on SATURDAY.
 * Week 1 contains January 1st.
 */

import { describe, it, expect } from "vitest";
import {
  getWeekNumber,
  getWeekYear,
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
  isFutureWeek,
  isWithinGracePeriod,
} from "./weekly-review-engine";

// ============================================================================
// DATE & WEEK UTILITIES (SUNDAY-START WEEKS)
// ============================================================================

describe("getWeekNumber (Sunday-start)", () => {
  it("should return week 1 for January 1st", () => {
    // Jan 1, 2026 is a Thursday - should be week 1
    expect(getWeekNumber(new Date(2026, 0, 1))).toBe(1);
  });

  it("should return week 1 for early January", () => {
    // Jan 3, 2026 is a Saturday - still week 1
    expect(getWeekNumber(new Date(2026, 0, 3))).toBe(1);
  });

  it("should return week 2 for January 4th, 2026 (Sunday)", () => {
    // Jan 4, 2026 is a Sunday - starts week 2
    expect(getWeekNumber(new Date(2026, 0, 4))).toBe(2);
  });

  it("should return correct week for mid-year date", () => {
    // July 15, 2026 is a Wednesday
    const weekNum = getWeekNumber(new Date(2026, 6, 15));
    expect(weekNum).toBeGreaterThan(25);
    expect(weekNum).toBeLessThan(35);
  });

  it("should return week 2 for January 10, 2026 (Saturday)", () => {
    // Jan 10, 2026 is a Saturday - last day of week 2
    expect(getWeekNumber(new Date(2026, 0, 10))).toBe(2);
  });

  it("should return week 3 for January 12, 2026 (Sunday)", () => {
    // Jan 12, 2026 is a Sunday - starts week 3
    expect(getWeekNumber(new Date(2026, 0, 12))).toBe(3);
  });
});

describe("getWeekYear", () => {
  it("should return correct year for regular dates", () => {
    expect(getWeekYear(new Date(2026, 5, 15))).toBe(2026);
  });

  it("should return calendar year for dates", () => {
    expect(getWeekYear(new Date(2027, 0, 1))).toBe(2027);
  });
});

describe("getWeekStart and getWeekEnd (Sunday-Saturday)", () => {
  it("should return Sunday for week start", () => {
    const sunday = getWeekStart(2026, 2);
    expect(sunday.getDay()).toBe(0); // Sunday
  });

  it("should return Saturday for week end", () => {
    const saturday = getWeekEnd(2026, 2);
    expect(saturday.getDay()).toBe(6); // Saturday
  });

  it("should handle week 1 correctly", () => {
    const { start, end } = getWeekBounds(2026, 1);
    // Week 1 of 2026: Sunday Dec 28, 2025 to Saturday Jan 3, 2026
    expect(start.getDay()).toBe(0); // Sunday
    expect(end.getDay()).toBe(6); // Saturday
  });

  it("should return correct week 2 bounds", () => {
    const { start, end } = getWeekBounds(2026, 2);
    // Week 2: Sunday Jan 4 to Saturday Jan 10
    expect(start.getDay()).toBe(0);
    expect(end.getDay()).toBe(6);
    expect(start.getMonth()).toBe(0); // January
    expect(start.getDate()).toBe(4);
    expect(end.getDate()).toBe(10);
  });

  it("should return correct week 3 bounds", () => {
    const { start, end } = getWeekBounds(2026, 3);
    // Week 3: Sunday Jan 11 to Saturday Jan 17
    expect(start.getDay()).toBe(0); // Sunday
    expect(end.getDay()).toBe(6); // Saturday
    // Note: getWeekStart returns local dates, not UTC
    expect(start.getMonth()).toBe(0); // January
    expect(end.getMonth()).toBe(0); // January
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
  it("should return correct info for January 12 (Sunday = start of week 3)", () => {
    const testDate = new Date(2026, 0, 12, 12, 0, 0);
    const info = getCurrentWeekInfo(testDate);
    
    expect(info.year).toBe(2026);
    expect(info.weekNumber).toBe(3);
    expect(info.weekStart.getDay()).toBe(0); // Sunday
    expect(info.weekEnd.getDay()).toBe(6); // Saturday
  });

  it("should return correct info for Saturday (last day of week)", () => {
    const testDate = new Date(2026, 0, 10, 12, 0, 0); // Saturday Jan 10
    const info = getCurrentWeekInfo(testDate);
    
    expect(info.year).toBe(2026);
    expect(info.weekNumber).toBe(2);
  });
});

describe("isDateInWeek", () => {
  it("should return true for date within week", () => {
    // Jan 7, 2026 (Wednesday) should be in week 2
    expect(isDateInWeek(new Date(2026, 0, 7), 2026, 2)).toBe(true);
  });

  it("should return false for date outside week", () => {
    // Jan 3, 2026 (Saturday) should be in week 1, not week 2
    expect(isDateInWeek(new Date(2026, 0, 3), 2026, 2)).toBe(false);
  });

  it("should handle Sunday correctly (week start)", () => {
    // Jan 11, 2026 is a Sunday - starts week 3
    expect(isDateInWeek(new Date(2026, 0, 11), 2026, 3)).toBe(true);
    expect(isDateInWeek(new Date(2026, 0, 11), 2026, 2)).toBe(false);
    
    // Jan 4, 2026 is a Sunday - starts week 2
    expect(isDateInWeek(new Date(2026, 0, 4), 2026, 2)).toBe(true);
    expect(isDateInWeek(new Date(2026, 0, 4), 2026, 1)).toBe(false);
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
  // Week 2: Sunday Jan 4 to Saturday Jan 10
  const weekEnd = "2026-01-10"; // Saturday end of week 2

  it("should return 'complete' when completed within the week", () => {
    const review = { week_end: weekEnd, completed_at: "2026-01-09T15:00:00Z" };
    const now = new Date(2026, 0, 15);
    expect(calculateReviewStatus(review, now)).toBe("complete");
  });

  it("should return 'complete' when completed on Sunday after week end", () => {
    // Sunday Jan 11 is within grace period
    const review = { week_end: weekEnd, completed_at: "2026-01-11T10:00:00Z" };
    const now = new Date(2026, 0, 15);
    expect(calculateReviewStatus(review, now)).toBe("complete");
  });

  it("should return 'complete' when completed on Monday before 11:59pm", () => {
    // Monday Jan 12 is still in grace period
    const review = { week_end: weekEnd, completed_at: "2026-01-12T22:00:00Z" };
    const now = new Date(2026, 0, 15);
    expect(calculateReviewStatus(review, now)).toBe("complete");
  });

  it("should return 'late' when completed after Monday 11:59pm", () => {
    // Tuesday Jan 13 is after grace period
    const review = { week_end: weekEnd, completed_at: "2026-01-13T10:00:00Z" };
    const now = new Date(2026, 0, 15);
    expect(calculateReviewStatus(review, now)).toBe("late");
  });

  it("should return 'open' for current week without completion", () => {
    const review = { week_end: weekEnd, completed_at: null };
    const now = new Date(2026, 0, 9); // Friday within the week
    expect(calculateReviewStatus(review, now)).toBe("open");
  });

  it("should return 'open' during grace period (Sunday)", () => {
    const review = { week_end: weekEnd, completed_at: null };
    const now = new Date(2026, 0, 11, 10, 0); // Sunday Jan 11, 10am
    expect(calculateReviewStatus(review, now)).toBe("open");
  });

  it("should return 'open' during grace period (Monday before 11:59pm)", () => {
    const review = { week_end: weekEnd, completed_at: null };
    const now = new Date(2026, 0, 12, 22, 0); // Monday Jan 12, 10pm
    expect(calculateReviewStatus(review, now)).toBe("open");
  });

  it("should return 'pending' after grace period", () => {
    const review = { week_end: weekEnd, completed_at: null };
    const now = new Date(2026, 0, 14); // Wednesday Jan 14
    expect(calculateReviewStatus(review, now)).toBe("pending");
  });
});

describe("isReviewOverdue", () => {
  it("should return false for complete reviews", () => {
    const review = { status: "complete" as const, week_end: "2026-01-10" };
    expect(isReviewOverdue(review)).toBe(false);
  });

  it("should return true for pending review past deadline", () => {
    const review = { status: "pending" as const, week_end: "2026-01-03" };
    const now = new Date(2026, 0, 15);
    expect(isReviewOverdue(review, now)).toBe(true);
  });

  it("should return false for open review in current week", () => {
    const review = { status: "open" as const, week_end: "2026-01-10" };
    const now = new Date(2026, 0, 9);
    expect(isReviewOverdue(review, now)).toBe(false);
  });
});

describe("getDaysOverdue", () => {
  it("should return 0 for non-overdue reviews", () => {
    const review = { status: "complete" as const, week_end: "2026-01-10" };
    expect(getDaysOverdue(review)).toBe(0);
  });

  it("should return correct days for overdue review", () => {
    const review = { status: "pending" as const, week_end: "2026-01-03" };
    const now = new Date(2026, 0, 14);
    expect(getDaysOverdue(review, now)).toBe(11);
  });
});

// ============================================================================
// MISSING REVIEWS & GAPS
// ============================================================================

describe("getWeeksBetween", () => {
  it("should return all weeks between two dates", () => {
    const start = new Date(2026, 0, 12); // Sunday Week 3
    const end = new Date(2026, 1, 1); // Sunday Week 6
    const weeks = getWeeksBetween(start, end);
    
    expect(weeks.length).toBeGreaterThanOrEqual(3);
    expect(weeks[0]).toEqual({ year: 2026, weekNumber: 3 });
  });

  it("should handle same week", () => {
    const start = new Date(2026, 0, 12); // Sunday Week 3
    const end = new Date(2026, 0, 15); // Wednesday Week 3
    const weeks = getWeeksBetween(start, end);
    
    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toEqual({ year: 2026, weekNumber: 3 });
  });
});

describe("findMissingReviews", () => {
  it("should find missing weeks", () => {
    const existingReviews = [
      { year: 2026, week_number: 1 },
      { year: 2026, week_number: 3 },
    ];
    const planCreated = new Date(2026, 0, 1); // Jan 1
    const now = new Date(2026, 0, 20); // Week 4
    
    const missing = findMissingReviews(existingReviews, planCreated, now);
    
    // Should find week 2 as missing
    expect(missing.some(w => w.year === 2026 && w.weekNumber === 2)).toBe(true);
  });

  it("should return empty array when all reviews exist", () => {
    const existingReviews = [
      { year: 2026, week_number: 3 },
      { year: 2026, week_number: 4 },
    ];
    // Start from Sunday of week 3 (Jan 11)
    const planCreated = new Date(2026, 0, 11);
    // End at Saturday of week 4 (Jan 24)
    const now = new Date(2026, 0, 24);
    
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

describe("isCurrentWeek, isPastWeek, isFutureWeek", () => {
  const testNow = new Date(2026, 0, 12); // Sunday Jan 12 = Week 3

  it("should identify current week", () => {
    expect(isCurrentWeek(2026, 3, testNow)).toBe(true);
    expect(isCurrentWeek(2026, 2, testNow)).toBe(false);
    expect(isCurrentWeek(2026, 4, testNow)).toBe(false);
  });

  it("should identify past weeks", () => {
    expect(isPastWeek(2026, 2, testNow)).toBe(true);
    expect(isPastWeek(2026, 1, testNow)).toBe(true);
    expect(isPastWeek(2026, 3, testNow)).toBe(false);
    expect(isPastWeek(2026, 4, testNow)).toBe(false);
  });

  it("should identify future weeks", () => {
    expect(isFutureWeek(2026, 4, testNow)).toBe(true);
    expect(isFutureWeek(2026, 5, testNow)).toBe(true);
    expect(isFutureWeek(2026, 3, testNow)).toBe(false);
    expect(isFutureWeek(2026, 2, testNow)).toBe(false);
  });
});

describe("isWithinGracePeriod", () => {
  // Week 2: Sunday Jan 4 - Saturday Jan 10
  // Grace period: Sunday Jan 11 - Monday Jan 12 11:59pm
  
  it("should return false for current week", () => {
    const now = new Date(2026, 0, 12); // Sunday Jan 12 = Week 3
    expect(isWithinGracePeriod(2026, 3, now)).toBe(false); // Current week
  });

  it("should return false for future week", () => {
    const now = new Date(2026, 0, 12);
    expect(isWithinGracePeriod(2026, 4, now)).toBe(false); // Future week
  });

  it("should return true for past week on Sunday (day after week ends)", () => {
    // Week 2 ends Saturday Jan 10. Sunday Jan 11 is grace period.
    const sundayAfter = new Date(2026, 0, 11, 10, 0); // Sunday Jan 11, 10am
    expect(isWithinGracePeriod(2026, 2, sundayAfter)).toBe(true);
  });

  it("should return true for past week on Monday before 11:59pm", () => {
    const mondayEvening = new Date(2026, 0, 12, 22, 0); // Monday Jan 12, 10pm
    expect(isWithinGracePeriod(2026, 2, mondayEvening)).toBe(true);
  });

  it("should return false for past week after Monday 11:59pm", () => {
    const tuesday = new Date(2026, 0, 13, 10, 0); // Tuesday Jan 13
    expect(isWithinGracePeriod(2026, 2, tuesday)).toBe(false);
  });

  it("should return false for week that is long past", () => {
    const now = new Date(2026, 0, 20); // Jan 20
    expect(isWithinGracePeriod(2026, 1, now)).toBe(false);
  });
});
