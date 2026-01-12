/**
 * Weekly Review Engine
 * 
 * Core logic for weekly review calculations including:
 * - Week number calculations (Sunday-Saturday weeks)
 * - Week bounds
 * - Review status determination
 * - Missing review detection
 * - Streak calculations
 * 
 * NOTE: Weeks start on SUNDAY and end on SATURDAY.
 * Week numbering follows the year (Week 1 contains Jan 1).
 */

import type { WeeklyReview, WeeklyReviewStatus } from "./supabase/types";

// ============================================================================
// DATE & WEEK UTILITIES (SUNDAY-START WEEKS)
// ============================================================================

/**
 * Get week number for a given date (Sunday-start weeks)
 * Week 1 is the week containing January 1st
 */
export function getWeekNumber(date: Date): number {
  // Get the first day of the year
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1);
  
  // Find the Sunday of week 1 (on or before Jan 1)
  const jan1DayOfWeek = jan1.getDay(); // 0 = Sunday
  const week1Sunday = new Date(jan1);
  week1Sunday.setDate(jan1.getDate() - jan1DayOfWeek);
  
  // Calculate days since week 1 Sunday
  const daysSinceWeek1 = Math.floor((date.getTime() - week1Sunday.getTime()) / (1000 * 60 * 60 * 24));
  
  // Week number (1-indexed)
  return Math.floor(daysSinceWeek1 / 7) + 1;
}

/**
 * Get the year for week calculations
 * Uses the calendar year of the date
 */
export function getWeekYear(date: Date): number {
  return date.getFullYear();
}

// Keep ISO functions for backward compatibility with database
export function getISOWeekNumber(date: Date): number {
  return getWeekNumber(date);
}

export function getISOWeekYear(date: Date): number {
  return getWeekYear(date);
}

/**
 * Get the Sunday (start) of a given week
 */
export function getWeekStart(year: number, weekNumber: number): Date {
  // Get Jan 1 of the year
  const jan1 = new Date(year, 0, 1);
  
  // Find the Sunday of week 1 (on or before Jan 1)
  const jan1DayOfWeek = jan1.getDay(); // 0 = Sunday
  const week1Sunday = new Date(jan1);
  week1Sunday.setDate(jan1.getDate() - jan1DayOfWeek);
  
  // Add weeks to get to the target week's Sunday
  const targetSunday = new Date(week1Sunday);
  targetSunday.setDate(week1Sunday.getDate() + (weekNumber - 1) * 7);
  
  return targetSunday;
}

/**
 * Get the Saturday (end) of a given week
 */
export function getWeekEnd(year: number, weekNumber: number): Date {
  const sunday = getWeekStart(year, weekNumber);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return saturday;
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
  const year = getWeekYear(now);
  const weekNumber = getWeekNumber(now);
  const { start, end } = getWeekBounds(year, weekNumber);
  return { year, weekNumber, weekStart: start, weekEnd: end };
}

/**
 * Check if a date is within a specific week
 */
export function isDateInWeek(date: Date, year: number, weekNumber: number): boolean {
  const dateYear = getWeekYear(date);
  const dateWeek = getWeekNumber(date);
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
 * - 'complete': Completed within the week or by end of Monday 11:59pm
 * - 'late': Completed after Monday 11:59pm of the next week
 * - 'open': Current week (or within grace period), not yet completed
 * - 'pending': Past week (after grace period), not completed
 * 
 * Grace period: Until Monday 11:59pm after the week ends (Saturday)
 */
export function calculateReviewStatus(
  review: Pick<WeeklyReview, "week_end" | "completed_at">,
  now: Date = new Date()
): WeeklyReviewStatus {
  // Parse week_end as local date (Saturday)
  const [year, month, day] = review.week_end.split("-").map(Number);
  const weekEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
  
  // Grace period ends Monday 11:59pm (2 days after Saturday)
  const gracePeriodEnd = new Date(year, month - 1, day + 2, 23, 59, 59, 999);

  if (review.completed_at) {
    const completedAt = new Date(review.completed_at);
    // Completed by end of Monday grace period = on time
    if (completedAt <= gracePeriodEnd) {
      return "complete";
    }
    // Completed after grace period = late
    return "late";
  }

  // Not completed - check if within week or grace period
  // If we're still within the week (up to Saturday 11:59pm) = open
  if (now <= weekEnd) {
    return "open";
  }
  
  // If we're within the grace period (Sunday through Monday 11:59pm) = still open
  if (now <= gracePeriodEnd) {
    return "open";
  }

  // Past grace period and not completed = pending
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
    const year = getWeekYear(current);
    const weekNumber = getWeekNumber(current);
    
    // Avoid duplicates
    const exists = weeks.some(w => w.year === year && w.weekNumber === weekNumber);
    if (!exists) {
      weeks.push({ year, weekNumber });
    }
    
    // Move to next week
    current.setDate(current.getDate() + 7);
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
  return getWeekYear(now) === year && getWeekNumber(now) === weekNumber;
}

/**
 * Check if a week is in the past (before current week)
 */
export function isPastWeek(year: number, weekNumber: number, now: Date = new Date()): boolean {
  const currentYear = getWeekYear(now);
  const currentWeek = getWeekNumber(now);
  
  if (year < currentYear) return true;
  if (year === currentYear && weekNumber < currentWeek) return true;
  return false;
}

/**
 * Check if a week is in the future (after current week)
 */
export function isFutureWeek(year: number, weekNumber: number, now: Date = new Date()): boolean {
  const currentYear = getWeekYear(now);
  const currentWeek = getWeekNumber(now);
  
  if (year > currentYear) return true;
  if (year === currentYear && weekNumber > currentWeek) return true;
  return false;
}

/**
 * Check if a past week is still within its grace period
 * Grace period: Sunday and Monday after the week ends (Saturday)
 * The grace period ends Monday 11:59pm
 */
export function isWithinGracePeriod(year: number, weekNumber: number, now: Date = new Date()): boolean {
  // If it's not a past week, it's not in grace period (it's current or future)
  if (!isPastWeek(year, weekNumber, now)) {
    return false;
  }
  
  // Get the week end (Saturday)
  const weekEnd = getWeekEnd(year, weekNumber);
  
  // Grace period ends Monday 11:59pm (2 days after Saturday)
  const gracePeriodEnd = new Date(
    weekEnd.getFullYear(),
    weekEnd.getMonth(),
    weekEnd.getDate() + 2, // Saturday + 2 = Monday
    23, 59, 59, 999
  );
  
  // If now is before grace period end, we're still in grace period
  return now <= gracePeriodEnd;
}
