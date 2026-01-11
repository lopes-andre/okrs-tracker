/**
 * Weekly Review Engine
 * 
 * Core logic for weekly review calculations including:
 * - ISO week number calculations
 * - Week bounds (Monday-Sunday)
 * - Review status determination
 * - Missing review detection
 * - Streak calculations
 */

import type { WeeklyReview, WeeklyReviewStatus } from "./supabase/types";

// ============================================================================
// DATE & WEEK UTILITIES
// ============================================================================

/**
 * Get ISO week number for a given date
 * ISO weeks start on Monday and the first week contains January 4th
 */
export function getISOWeekNumber(date: Date): number {
  // Use UTC methods to avoid timezone issues
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get ISO week year (can differ from calendar year at year boundaries)
 */
export function getISOWeekYear(date: Date): number {
  // Use UTC methods to avoid timezone issues
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/**
 * Get the Monday (start) of a given ISO week
 */
export function getWeekStart(year: number, weekNumber: number): Date {
  // Find January 4th of the year (always in week 1)
  const jan4 = new Date(Date.UTC(year, 0, 4));
  // Find the Monday of week 1
  const dayOfWeek = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1));
  // Add weeks to get to the target week
  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (weekNumber - 1) * 7);
  return targetMonday;
}

/**
 * Get the Sunday (end) of a given ISO week
 */
export function getWeekEnd(year: number, weekNumber: number): Date {
  const monday = getWeekStart(year, weekNumber);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return sunday;
}

/**
 * Get week bounds as {start, end} dates
 */
export function getWeekBounds(year: number, weekNumber: number): { start: Date; end: Date } {
  return {
    start: getWeekStart(year, weekNumber),
    end: getWeekEnd(year, weekNumber),
  };
}

/**
 * Format date as YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Get current week info
 */
export function getCurrentWeekInfo(now: Date = new Date()): {
  year: number;
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
} {
  const year = getISOWeekYear(now);
  const weekNumber = getISOWeekNumber(now);
  const { start, end } = getWeekBounds(year, weekNumber);
  return { year, weekNumber, weekStart: start, weekEnd: end };
}

/**
 * Check if a date is within a specific week
 */
export function isDateInWeek(date: Date, year: number, weekNumber: number): boolean {
  const dateYear = getISOWeekYear(date);
  const dateWeek = getISOWeekNumber(date);
  return dateYear === year && dateWeek === weekNumber;
}

/**
 * Get the day name for reminder settings
 */
export function getDayName(dayNumber: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayNumber] || "Unknown";
}

// ============================================================================
// REVIEW STATUS CALCULATION
// ============================================================================

/**
 * Calculate the status of a weekly review based on completion time
 * 
 * Status rules:
 * - 'complete': Completed within the week or by end of Monday
 * - 'late': Completed after Monday of the next week
 * - 'open': Current week, not yet completed
 * - 'pending': Past week, not completed
 */
export function calculateReviewStatus(
  review: Pick<WeeklyReview, "week_end" | "completed_at">,
  now: Date = new Date()
): WeeklyReviewStatus {
  const weekEnd = parseDateString(review.week_end);
  const mondayAfter = new Date(weekEnd);
  mondayAfter.setUTCDate(weekEnd.getUTCDate() + 1);
  mondayAfter.setUTCHours(23, 59, 59, 999); // End of Monday

  if (review.completed_at) {
    const completedAt = new Date(review.completed_at);
    // Completed by end of Monday after the week = on time
    if (completedAt <= mondayAfter) {
      return "complete";
    }
    // Completed after Monday = late
    return "late";
  }

  // Not completed - check if current or past week
  const nowDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  if (nowDate <= weekEnd) {
    return "open";
  }

  return "pending";
}

/**
 * Check if a review is overdue (pending and past deadline)
 */
export function isReviewOverdue(
  review: Pick<WeeklyReview, "status" | "week_end">,
  now: Date = new Date()
): boolean {
  if (review.status === "complete" || review.status === "late") {
    return false;
  }
  const weekEnd = parseDateString(review.week_end);
  const mondayAfter = new Date(weekEnd);
  mondayAfter.setUTCDate(weekEnd.getUTCDate() + 1);
  mondayAfter.setUTCHours(23, 59, 59, 999);
  return now > mondayAfter;
}

/**
 * Calculate days overdue for a pending review
 */
export function getDaysOverdue(
  review: Pick<WeeklyReview, "status" | "week_end">,
  now: Date = new Date()
): number {
  if (!isReviewOverdue(review, now)) {
    return 0;
  }
  const weekEnd = parseDateString(review.week_end);
  const daysDiff = Math.floor((now.getTime() - weekEnd.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysDiff);
}

// ============================================================================
// MISSING REVIEWS & GAPS
// ============================================================================

/**
 * Get all weeks between two dates
 */
export function getWeeksBetween(
  startDate: Date,
  endDate: Date
): Array<{ year: number; weekNumber: number }> {
  const weeks: Array<{ year: number; weekNumber: number }> = [];
  
  const current = new Date(startDate);
  while (current <= endDate) {
    const year = getISOWeekYear(current);
    const weekNumber = getISOWeekNumber(current);
    
    // Avoid duplicates
    const exists = weeks.some(w => w.year === year && w.weekNumber === weekNumber);
    if (!exists) {
      weeks.push({ year, weekNumber });
    }
    
    // Move to next week
    current.setUTCDate(current.getUTCDate() + 7);
  }
  
  return weeks;
}

/**
 * Find missing reviews for a plan
 */
export function findMissingReviews(
  existingReviews: Array<Pick<WeeklyReview, "year" | "week_number">>,
  planCreatedAt: Date,
  now: Date = new Date()
): Array<{ year: number; weekNumber: number; weekStart: Date; weekEnd: Date }> {
  const existingSet = new Set(
    existingReviews.map(r => `${r.year}-${r.week_number}`)
  );
  
  const allWeeks = getWeeksBetween(planCreatedAt, now);
  
  return allWeeks
    .filter(w => !existingSet.has(`${w.year}-${w.weekNumber}`))
    .map(w => ({
      ...w,
      weekStart: getWeekStart(w.year, w.weekNumber),
      weekEnd: getWeekEnd(w.year, w.weekNumber),
    }));
}

// ============================================================================
// STREAK CALCULATIONS
// ============================================================================

/**
 * Calculate current streak of consecutive completed reviews
 * A streak counts backwards from the most recent complete review
 */
export function calculateStreak(
  reviews: Array<Pick<WeeklyReview, "year" | "week_number" | "status">>
): number {
  if (reviews.length === 0) return 0;

  // Sort by year and week descending
  const sorted = [...reviews].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.week_number - a.week_number;
  });

  let streak = 0;
  let expectedYear = sorted[0].year;
  let expectedWeek = sorted[0].week_number;

  for (const review of sorted) {
    // Check if this review matches the expected week
    if (review.year !== expectedYear || review.week_number !== expectedWeek) {
      break; // Gap found, streak ends
    }

    // Only count complete or late reviews
    if (review.status === "complete" || review.status === "late") {
      streak++;
    } else {
      break; // Non-completed review breaks the streak
    }

    // Calculate previous week
    if (expectedWeek === 1) {
      // Go to last week of previous year
      expectedYear--;
      // Get the last week number of the previous year
      const dec31 = new Date(Date.UTC(expectedYear, 11, 31));
      expectedWeek = getISOWeekNumber(dec31);
      // Handle edge case where Dec 31 might be in week 1 of next year
      if (expectedWeek === 1) {
        const dec24 = new Date(Date.UTC(expectedYear, 11, 24));
        expectedWeek = getISOWeekNumber(dec24);
      }
    } else {
      expectedWeek--;
    }
  }

  return streak;
}

/**
 * Calculate longest streak ever achieved
 */
export function calculateLongestStreak(
  reviews: Array<Pick<WeeklyReview, "year" | "week_number" | "status">>
): number {
  if (reviews.length === 0) return 0;

  const completedReviews = reviews.filter(
    r => r.status === "complete" || r.status === "late"
  );

  if (completedReviews.length === 0) return 0;

  // Sort by year and week ascending
  const sorted = [...completedReviews].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.week_number - b.week_number;
  });

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    // Check if consecutive (curr should be exactly 1 week after prev)
    let isConsecutive = false;
    
    if (curr.year === prev.year && curr.week_number === prev.week_number + 1) {
      // Same year, next week
      isConsecutive = true;
    } else if (curr.year === prev.year + 1 && curr.week_number === 1) {
      // Year boundary: check if prev was the last week of its year
      const dec31 = new Date(Date.UTC(prev.year, 11, 31));
      const lastWeekOfYear = getISOWeekNumber(dec31);
      // Handle edge case where Dec 31 might be in week 1 of next year
      const actualLastWeek = lastWeekOfYear === 1 ? getISOWeekNumber(new Date(Date.UTC(prev.year, 11, 24))) : lastWeekOfYear;
      if (prev.week_number === actualLastWeek) {
        isConsecutive = true;
      }
    }

    if (isConsecutive) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

// ============================================================================
// REVIEW STATS
// ============================================================================

export interface ReviewStats {
  totalReviews: number;
  completedOnTime: number;
  completedLate: number;
  pending: number;
  completionRate: number;
  averageRating: number | null;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Calculate comprehensive review statistics
 */
export function calculateReviewStats(
  reviews: Array<Pick<WeeklyReview, "year" | "week_number" | "status" | "week_rating">>
): ReviewStats {
  const total = reviews.length;
  const completedOnTime = reviews.filter(r => r.status === "complete").length;
  const completedLate = reviews.filter(r => r.status === "late").length;
  const pending = reviews.filter(r => r.status === "pending" || r.status === "open").length;

  const ratings = reviews
    .filter(r => r.week_rating !== null)
    .map(r => r.week_rating as number);
  
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
    : null;

  return {
    totalReviews: total,
    completedOnTime,
    completedLate,
    pending,
    completionRate: total > 0 ? (completedOnTime + completedLate) / total : 0,
    averageRating: avgRating,
    currentStreak: calculateStreak(reviews),
    longestStreak: calculateLongestStreak(reviews),
  };
}

// ============================================================================
// WEEK LABEL FORMATTING
// ============================================================================

/**
 * Format a week as a readable label
 * e.g., "Week 2, Jan 6-12, 2026"
 */
export function formatWeekLabel(year: number, weekNumber: number): string {
  const { start, end } = getWeekBounds(year, weekNumber);
  
  const startMonth = start.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const endMonth = end.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  
  if (startMonth === endMonth) {
    return `Week ${weekNumber}, ${startMonth} ${startDay}-${endDay}, ${year}`;
  }
  
  return `Week ${weekNumber}, ${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Get a short week label
 * e.g., "W2 2026"
 */
export function formatWeekLabelShort(year: number, weekNumber: number): string {
  return `W${weekNumber} ${year}`;
}

/**
 * Check if a week is the current week
 */
export function isCurrentWeek(year: number, weekNumber: number, now: Date = new Date()): boolean {
  return getISOWeekYear(now) === year && getISOWeekNumber(now) === weekNumber;
}

/**
 * Check if a week is in the past
 */
export function isPastWeek(year: number, weekNumber: number, now: Date = new Date()): boolean {
  const currentYear = getISOWeekYear(now);
  const currentWeek = getISOWeekNumber(now);
  
  if (year < currentYear) return true;
  if (year === currentYear && weekNumber < currentWeek) return true;
  return false;
}
