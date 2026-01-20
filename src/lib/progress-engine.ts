/**
 * Progress Engine - Core computation module for OKR tracking
 * 
 * This module provides pure, deterministic functions for computing:
 * - Current values (as-of date)
 * - Progress percentages (0-1)
 * - Expected progress (pace baseline)
 * - Pace status (ahead/on-track/at-risk/off-track)
 * - Forecasts
 * - Daily/weekly series
 * - Rollups (Objective & Plan level)
 * 
 * All functions are pure and testable.
 */

import type {
  AnnualKr,
  QuarterTarget,
  CheckIn,
  Task,
  Objective,
  KrType,
  KrDirection,
} from "./supabase/types";

// ============================================================================
// TYPES
// ============================================================================

export type PaceStatus = "ahead" | "on_track" | "at_risk" | "off_track";

export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface ProgressResult {
  /** Current computed value */
  currentValue: number;
  /** Baseline value (starting point) */
  baseline: number;
  /** Target value */
  target: number;
  /** Progress as decimal (0-1) */
  progress: number;
  /** Expected progress at this point in time (0-1) */
  expectedProgress: number;
  /** Expected value at this point in time */
  expectedValue: number;
  /** Ratio of actual to expected progress */
  paceRatio: number;
  /** Pace status classification */
  paceStatus: PaceStatus;
  /** Delta from target (current - target for increase, target - current for decrease) */
  delta: number;
  /** Forecasted end value */
  forecastValue: number | null;
  /** For milestones: forecasted completion date */
  forecastDate: Date | null;
  /** Days remaining in the period */
  daysRemaining: number;
  /** Days elapsed in the period */
  daysElapsed: number;
  /** Last check-in date */
  lastCheckInDate: Date | null;
}

export interface DailyDataPoint {
  date: Date;
  currentValue: number;
  progress: number;
  expectedProgress: number;
  paceRatio: number;
  paceStatus: PaceStatus;
  checkInCount: number;
}

export interface ObjectiveProgress {
  objectiveId: string;
  progress: number;
  expectedProgress: number;
  paceStatus: PaceStatus;
  krCount: number;
  krProgresses: { krId: string; progress: number; paceStatus: PaceStatus }[];
}

export interface PlanProgress {
  planId: string;
  progress: number;
  expectedProgress: number;
  paceStatus: PaceStatus;
  objectiveCount: number;
  objectiveProgresses: ObjectiveProgress[];
}

// Configuration for qualifier-based counting
export interface QualifierConfig {
  field: string;
  op: ">=" | ">" | "<=" | "<" | "==" | "!=";
  value: number | string | boolean;
}

// Extended KR config for advanced features
export interface KrConfig {
  qualifier?: QualifierConfig;
  trackingSource?: "check_ins" | "tasks" | "mixed";
  toleranceBand?: number; // For "maintain" direction
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clamp a value between 0 and 1
 */
export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Get days between two dates (can be negative)
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

/**
 * Get start of day (midnight) for a date
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get quarter dates for a given year and quarter
 */
export function getQuarterDates(year: number, quarter: 1 | 2 | 3 | 4): TimeWindow {
  const quarterStartMonth = (quarter - 1) * 3;
  const start = new Date(year, quarterStartMonth, 1);
  const end = new Date(year, quarterStartMonth + 3, 0); // Last day of quarter
  return { start, end };
}

/**
 * Get current quarter (1-4)
 */
export function getCurrentQuarter(date: Date = new Date()): 1 | 2 | 3 | 4 {
  return (Math.floor(date.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

/**
 * Get year dates (Jan 1 - Dec 31)
 */
export function getYearDates(year: number): TimeWindow {
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31),
  };
}

/**
 * Parse a date string or Date to Date object
 */
export function parseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// ============================================================================
// TIME WINDOW COMPUTATION
// ============================================================================

/**
 * Get the effective time window for an Annual KR
 */
export function getAnnualKrWindow(
  kr: AnnualKr,
  planYear: number,
  asOfDate: Date = new Date()
): TimeWindow {
  const yearDates = getYearDates(planYear);
  const start = yearDates.start;
  const end = new Date(Math.min(asOfDate.getTime(), yearDates.end.getTime()));
  return { start, end };
}

/**
 * Get the effective time window for a Quarter Target
 */
export function getQuarterTargetWindow(
  quarterTarget: QuarterTarget,
  kr: AnnualKr,
  planYear: number,
  asOfDate: Date = new Date()
): TimeWindow {
  const quarterDates = getQuarterDates(planYear, quarterTarget.quarter);
  
  // If cumulative, start from year start
  const isCumulative = kr.aggregation === "cumulative";
  const start = isCumulative ? new Date(planYear, 0, 1) : quarterDates.start;
  const end = new Date(Math.min(asOfDate.getTime(), quarterDates.end.getTime()));
  
  return { start, end };
}

// ============================================================================
// CURRENT VALUE COMPUTATION
// ============================================================================

/**
 * Filter check-ins within a time window
 */
export function filterCheckInsInWindow(
  checkIns: CheckIn[],
  window: TimeWindow
): CheckIn[] {
  return checkIns.filter((ci) => {
    const recordedAt = parseDate(ci.recorded_at);
    if (!recordedAt) return false;
    return recordedAt >= window.start && recordedAt <= window.end;
  });
}

/**
 * Filter tasks within a time window (by completed_at)
 */
export function filterCompletedTasksInWindow(
  tasks: Task[],
  window: TimeWindow
): Task[] {
  return tasks.filter((task) => {
    if (task.status !== "completed") return false;
    const completedAt = parseDate(task.completed_at);
    if (!completedAt) return false;
    return completedAt >= window.start && completedAt <= window.end;
  });
}

/**
 * Check if a check-in passes a qualifier condition
 */
export function checkQualifier(
  _checkIn: CheckIn,
  _qualifier: QualifierConfig
): boolean {
  // For now, we don't have evidence_meta in the check-in schema
  // This is a placeholder for future extension
  // You could add evidence_meta as a JSONB column to check_ins
  return true;
}

/**
 * Compute current value for a KR based on its type and aggregation
 */
export function computeCurrentValue(
  kr: AnnualKr,
  checkIns: CheckIn[],
  tasks: Task[],
  window: TimeWindow,
  config?: KrConfig
): number {
  const filteredCheckIns = filterCheckInsInWindow(checkIns, window);
  const filteredTasks = filterCompletedTasksInWindow(tasks, window);
  
  // Apply qualifier filter if configured
  const qualifiedCheckIns = config?.qualifier
    ? filteredCheckIns.filter((ci) => checkQualifier(ci, config.qualifier!))
    : filteredCheckIns;
  
  // Determine tracking source
  const trackingSource = config?.trackingSource || "check_ins";
  
  // Handle different KR types
  switch (kr.kr_type) {
    case "milestone":
      return computeMilestoneValue(kr, qualifiedCheckIns, filteredTasks, trackingSource);
    
    case "count":
      return computeCountValue(kr, qualifiedCheckIns, filteredTasks, trackingSource);
    
    case "rate":
      return computeRateValue(kr, qualifiedCheckIns);
    
    case "average":
      return computeAverageValue(kr, qualifiedCheckIns);
    
    case "metric":
    default:
      return computeMetricValue(kr, qualifiedCheckIns);
  }
}

/**
 * Compute value for Metric/Numeric KRs
 * Uses "last" aggregation - most recent check-in value
 */
function computeMetricValue(kr: AnnualKr, checkIns: CheckIn[]): number {
  if (checkIns.length === 0) return kr.start_value;
  
  // Sort by recorded_at descending to get the most recent
  const sorted = [...checkIns].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );
  
  return sorted[0].value;
}

/**
 * Compute value for Count KRs
 * Can use check-ins or tasks based on tracking source
 */
function computeCountValue(
  kr: AnnualKr,
  checkIns: CheckIn[],
  tasks: Task[],
  trackingSource: "check_ins" | "tasks" | "mixed"
): number {
  if (trackingSource === "tasks") {
    return tasks.length;
  }
  
  if (trackingSource === "mixed") {
    // Sum check-in values + task count
    const checkInSum = checkIns.reduce((sum, ci) => sum + ci.value, 0);
    return checkInSum + tasks.length;
  }
  
  // Default: sum check-in values (each check-in represents a count)
  if (checkIns.length === 0) return kr.start_value;
  return checkIns.reduce((sum, ci) => sum + ci.value, 0);
}

/**
 * Compute value for Rate KRs
 * Computes cumulative rate from check-ins
 */
function computeRateValue(kr: AnnualKr, checkIns: CheckIn[]): number {
  if (checkIns.length === 0) return kr.start_value;
  
  // For rate, we take the most recent value as the current rate
  // Alternatively, we could compute weighted average
  const sorted = [...checkIns].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );
  
  return sorted[0].value;
}

/**
 * Compute value for Average KRs
 * Computes average of all check-in values
 */
function computeAverageValue(kr: AnnualKr, checkIns: CheckIn[]): number {
  if (checkIns.length === 0) return kr.start_value;
  
  const sum = checkIns.reduce((acc, ci) => acc + ci.value, 0);
  return sum / checkIns.length;
}

/**
 * Compute value for Milestone KRs
 * Returns 1 if completed, 0 otherwise (or task-based proxy)
 * Uses the LATEST check-in to determine current status (can toggle complete/incomplete)
 */
function computeMilestoneValue(
  kr: AnnualKr,
  checkIns: CheckIn[],
  tasks: Task[],
  trackingSource: "check_ins" | "tasks" | "mixed"
): number {
  // If there are check-ins, use the LATEST one to determine current status
  // This allows toggling a milestone back to incomplete
  if (checkIns.length > 0) {
    const sorted = [...checkIns].sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );
    return sorted[0].value >= 1 ? 1 : 0;
  }
  
  // For task-based tracking, compute proxy progress
  if (trackingSource !== "check_ins" && tasks.length > 0) {
    // Return task completion ratio (will be handled in progress calculation)
    return tasks.length; // Number of completed tasks
  }
  
  return 0;
}

// ============================================================================
// BASELINE COMPUTATION
// ============================================================================

/**
 * Determine the effective baseline for progress calculation
 */
export function computeBaseline(
  kr: AnnualKr
): number {
  // If start_value is explicitly set and non-zero, use it
  if (kr.start_value !== 0 || kr.direction === "decrease") {
    return kr.start_value;
  }
  
  // For "increase" direction, default to 0
  if (kr.direction === "increase") {
    return 0;
  }
  
  // For "maintain" direction, use target as baseline
  return kr.target_value;
}

// ============================================================================
// PROGRESS PERCENTAGE COMPUTATION
// ============================================================================

/**
 * Compute progress percentage (0-1) based on KR type and direction
 */
export function computeProgress(
  krType: KrType,
  direction: KrDirection,
  currentValue: number,
  baseline: number,
  target: number,
  config?: KrConfig
): number {
  // Handle milestone separately
  if (krType === "milestone") {
    return computeMilestoneProgress(currentValue, target);
  }
  
  // Handle numeric-like types based on direction
  switch (direction) {
    case "increase":
      return computeIncreaseProgress(currentValue, baseline, target);
    
    case "decrease":
      return computeDecreaseProgress(currentValue, baseline, target);
    
    case "maintain":
      return computeMaintainProgress(currentValue, target, config?.toleranceBand);
    
    default:
      return computeIncreaseProgress(currentValue, baseline, target);
  }
}

/**
 * Progress for "increase" direction
 * Higher is better: (current - baseline) / (target - baseline)
 */
function computeIncreaseProgress(
  current: number,
  baseline: number,
  target: number
): number {
  const range = target - baseline;
  if (range === 0) {
    return current >= target ? 1 : 0;
  }
  return clamp01((current - baseline) / range);
}

/**
 * Progress for "decrease" direction
 * Lower is better: (baseline - current) / (baseline - target)
 */
function computeDecreaseProgress(
  current: number,
  baseline: number,
  target: number
): number {
  const range = baseline - target;
  if (range === 0) {
    return current <= target ? 1 : 0;
  }
  return clamp01((baseline - current) / range);
}

/**
 * Progress for "maintain" direction
 * Closest to target is best, with tolerance band
 */
function computeMaintainProgress(
  current: number,
  target: number,
  toleranceBand?: number
): number {
  // Default tolerance: 5% of target or minimum of 0.5
  const tolerance = toleranceBand ?? Math.max(Math.abs(target) * 0.05, 0.5);
  const deviation = Math.abs(current - target);
  return clamp01(1 - deviation / tolerance);
}

/**
 * Progress for milestone KRs
 * Can be binary (0/1) or task-based proxy (0-0.95)
 */
function computeMilestoneProgress(
  currentValue: number,
  _target: number
): number {
  // If explicitly marked complete
  if (currentValue >= 1) return 1;
  
  // If value is between 0 and 1, treat as manual progress
  if (currentValue > 0 && currentValue < 1) {
    return clamp01(currentValue);
  }
  
  // Binary: not complete
  return 0;
}

/**
 * Compute milestone progress with task proxy
 */
export function computeMilestoneProgressWithTasks(
  currentValue: number,
  completedTasks: number,
  totalTasks: number,
  isExplicitlyComplete: boolean
): number {
  // If explicitly marked complete via check-in
  if (isExplicitlyComplete || currentValue >= 1) return 1;
  
  // If we have tasks, use task ratio capped at 0.95
  if (totalTasks > 0) {
    const taskProgress = completedTasks / totalTasks;
    return Math.min(0.95, taskProgress);
  }
  
  // Manual progress via check-in value
  if (currentValue > 0 && currentValue < 1) {
    return currentValue;
  }
  
  return 0;
}

// ============================================================================
// PACE & EXPECTED VALUE COMPUTATION
// ============================================================================

/**
 * Compute expected progress at a given point in time
 * Linear interpolation: time_ratio = (now - start) / (end - start)
 */
export function computeExpectedProgress(
  asOfDate: Date,
  window: TimeWindow
): number {
  const totalDays = daysBetween(window.start, window.end);
  if (totalDays <= 0) return 1;
  
  const elapsedDays = daysBetween(window.start, asOfDate);
  return clamp01(elapsedDays / totalDays);
}

/**
 * Compute expected value at a given point in time
 */
export function computeExpectedValue(
  expectedProgress: number,
  baseline: number,
  target: number,
  direction: KrDirection
): number {
  if (direction === "maintain") {
    return target; // Expected to always be at target
  }
  
  // Linear interpolation from baseline to target
  return baseline + (target - baseline) * expectedProgress;
}

/**
 * Compute pace ratio (actual / expected)
 */
export function computePaceRatio(
  progress: number,
  expectedProgress: number
): number {
  if (expectedProgress < 0.01) {
    // Early in period, avoid division issues
    return progress > 0 ? 1.5 : 1; // Slightly ahead if any progress
  }
  return progress / expectedProgress;
}

/**
 * Classify pace status based on pace ratio
 */
export function classifyPaceStatus(paceRatio: number): PaceStatus {
  if (paceRatio >= 1.10) return "ahead";
  if (paceRatio >= 0.90) return "on_track";
  if (paceRatio >= 0.75) return "at_risk";
  return "off_track";
}

// ============================================================================
// FORECAST COMPUTATION
// ============================================================================

/**
 * Compute forecast end value based on current trajectory
 */
export function computeForecast(
  krType: KrType,
  baseline: number,
  currentValue: number,
  window: TimeWindow,
  asOfDate: Date
): { value: number | null; date: Date | null } {
  const elapsedDays = Math.max(1, daysBetween(window.start, asOfDate));
  const remainingDays = Math.max(0, daysBetween(asOfDate, window.end));
  
  // For milestone, we can't really forecast a value
  if (krType === "milestone") {
    return { value: null, date: null };
  }
  
  // Rate of change per day
  const ratePerDay = (currentValue - baseline) / elapsedDays;
  
  // Projected end value
  const forecastValue = currentValue + ratePerDay * remainingDays;
  
  return { value: forecastValue, date: null };
}

/**
 * Compute forecast completion date for milestones based on task velocity
 */
export function computeMilestoneForecastDate(
  completedTasks: number,
  totalTasks: number,
  window: TimeWindow,
  asOfDate: Date
): Date | null {
  if (completedTasks >= totalTasks) {
    return asOfDate; // Already complete
  }
  
  if (completedTasks === 0) {
    return null; // Can't forecast without data
  }
  
  const elapsedDays = Math.max(1, daysBetween(window.start, asOfDate));
  const tasksPerDay = completedTasks / elapsedDays;
  
  if (tasksPerDay <= 0) {
    return null;
  }
  
  const remainingTasks = totalTasks - completedTasks;
  const daysNeeded = Math.ceil(remainingTasks / tasksPerDay);
  
  const forecastDate = new Date(asOfDate);
  forecastDate.setDate(forecastDate.getDate() + daysNeeded);
  
  return forecastDate;
}

// ============================================================================
// DELTA COMPUTATION
// ============================================================================

/**
 * Compute delta (distance from target)
 * Positive means above target, negative means below
 */
export function computeDelta(
  currentValue: number,
  target: number,
  direction: KrDirection
): number {
  if (direction === "decrease") {
    return target - currentValue; // Positive if below target (good)
  }
  return currentValue - target; // Positive if above target (good for increase)
}

// ============================================================================
// COMPLETE PROGRESS RESULT
// ============================================================================

/**
 * Compute complete progress result for a KR
 */
export function computeKrProgress(
  kr: AnnualKr,
  checkIns: CheckIn[],
  tasks: Task[],
  planYear: number,
  asOfDate: Date = new Date(),
  config?: KrConfig
): ProgressResult {
  const window = getAnnualKrWindow(kr, planYear, asOfDate);
  const yearDates = getYearDates(planYear); // Get actual year end for days remaining
  const filteredCheckIns = filterCheckInsInWindow(checkIns, window);
  const filteredTasks = filterCompletedTasksInWindow(tasks, window);
  
  // Get last check-in date
  const lastCheckInDate = filteredCheckIns.length > 0
    ? new Date(Math.max(...filteredCheckIns.map((ci) => new Date(ci.recorded_at).getTime())))
    : null;
  
  // Compute current value
  const currentValue = computeCurrentValue(kr, checkIns, tasks, window, config);
  
  // Compute baseline
  const baseline = computeBaseline(kr);
  
  // Compute progress
  let progress: number;
  if (kr.kr_type === "milestone" && (config?.trackingSource === "tasks" || config?.trackingSource === "mixed")) {
    const totalLinkedTasks = tasks.length;
    // Use latest check-in to determine completion status (allows toggling)
    const sortedCheckIns = [...filteredCheckIns].sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );
    const isComplete = sortedCheckIns.length > 0 && sortedCheckIns[0].value >= 1;
    progress = computeMilestoneProgressWithTasks(currentValue, filteredTasks.length, totalLinkedTasks, isComplete);
  } else {
    progress = computeProgress(kr.kr_type, kr.direction, currentValue, baseline, kr.target_value, config);
  }
  
  // Compute expected progress and value using FULL year window (not capped window)
  // This gives the correct proportional expected value for the current date
  const fullYearWindow: TimeWindow = { start: yearDates.start, end: yearDates.end };
  const expectedProgress = computeExpectedProgress(asOfDate, fullYearWindow);
  const expectedValue = computeExpectedValue(expectedProgress, baseline, kr.target_value, kr.direction);
  
  // Compute pace
  const paceRatio = computePaceRatio(progress, expectedProgress);
  const paceStatus = classifyPaceStatus(paceRatio);
  
  // Compute delta
  const delta = computeDelta(currentValue, kr.target_value, kr.direction);
  
  // Compute forecast
  const forecast = computeForecast(kr.kr_type, baseline, currentValue, window, asOfDate);
  
  // For milestones with tasks, compute forecast date
  let forecastDate: Date | null = null;
  if (kr.kr_type === "milestone" && (config?.trackingSource === "tasks" || config?.trackingSource === "mixed")) {
    forecastDate = computeMilestoneForecastDate(filteredTasks.length, tasks.length, window, asOfDate);
  }
  
  // Time calculations - use actual year end for days remaining, not capped window end
  const daysElapsed = daysBetween(window.start, asOfDate);
  const daysRemaining = daysBetween(asOfDate, yearDates.end);
  
  return {
    currentValue,
    baseline,
    target: kr.target_value,
    progress,
    expectedProgress,
    expectedValue,
    paceRatio,
    paceStatus,
    delta,
    forecastValue: forecast.value,
    forecastDate: forecastDate || forecast.date,
    daysRemaining: Math.max(0, daysRemaining),
    daysElapsed: Math.max(0, daysElapsed),
    lastCheckInDate,
  };
}

/**
 * Compute progress for a Quarter Target
 */
export function computeQuarterTargetProgress(
  quarterTarget: QuarterTarget,
  kr: AnnualKr,
  checkIns: CheckIn[],
  tasks: Task[],
  planYear: number,
  asOfDate: Date = new Date(),
  config?: KrConfig
): ProgressResult {
  const window = getQuarterTargetWindow(quarterTarget, kr, planYear, asOfDate);
  const quarterDates = getQuarterDates(planYear, quarterTarget.quarter); // Get actual quarter end for days remaining
  
  // Filter check-ins and tasks to this quarter target
  const qtCheckIns = checkIns.filter((ci) => ci.quarter_target_id === quarterTarget.id);
  const qtTasks = tasks.filter((t) => t.quarter_target_id === quarterTarget.id);
  
  const filteredCheckIns = filterCheckInsInWindow(qtCheckIns, window);

  // Get last check-in date
  const lastCheckInDate = filteredCheckIns.length > 0
    ? new Date(Math.max(...filteredCheckIns.map((ci) => new Date(ci.recorded_at).getTime())))
    : null;
  
  // Compute current value
  const currentValue = computeCurrentValue(kr, qtCheckIns, qtTasks, window, config);
  
  // Baseline for quarter targets
  const baseline = kr.aggregation === "cumulative" ? kr.start_value : 0;
  
  // Compute progress
  const progress = computeProgress(kr.kr_type, kr.direction, currentValue, baseline, quarterTarget.target_value, config);
  
  // Compute expected progress and value
  const expectedProgress = computeExpectedProgress(asOfDate, window);
  const expectedValue = computeExpectedValue(expectedProgress, baseline, quarterTarget.target_value, kr.direction);
  
  // Compute pace
  const paceRatio = computePaceRatio(progress, expectedProgress);
  const paceStatus = classifyPaceStatus(paceRatio);
  
  // Compute delta
  const delta = computeDelta(currentValue, quarterTarget.target_value, kr.direction);
  
  // Compute forecast
  const forecast = computeForecast(kr.kr_type, baseline, currentValue, window, asOfDate);
  
  // Time calculations - use actual quarter end for days remaining, not capped window end
  const daysElapsed = daysBetween(window.start, asOfDate);
  const daysRemaining = daysBetween(asOfDate, quarterDates.end);
  
  return {
    currentValue,
    baseline,
    target: quarterTarget.target_value,
    progress,
    expectedProgress,
    expectedValue,
    paceRatio,
    paceStatus,
    delta,
    forecastValue: forecast.value,
    forecastDate: forecast.date,
    daysRemaining: Math.max(0, daysRemaining),
    daysElapsed: Math.max(0, daysElapsed),
    lastCheckInDate,
  };
}

// ============================================================================
// DAILY SERIES BUILDER
// ============================================================================

/**
 * Build daily data series for a KR over a date range
 * Efficient computation by processing check-ins chronologically
 */
export function buildDailySeries(
  kr: AnnualKr,
  checkIns: CheckIn[],
  window: TimeWindow
): DailyDataPoint[] {
  const series: DailyDataPoint[] = [];
  
  // Sort check-ins by date
  const sortedCheckIns = [...checkIns]
    .filter((ci) => {
      const date = parseDate(ci.recorded_at);
      return date && date >= window.start && date <= window.end;
    })
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  
  // Group check-ins by day
  const checkInsByDay = new Map<string, CheckIn[]>();
  for (const ci of sortedCheckIns) {
    const dayKey = startOfDay(new Date(ci.recorded_at)).toISOString();
    if (!checkInsByDay.has(dayKey)) {
      checkInsByDay.set(dayKey, []);
    }
    checkInsByDay.get(dayKey)!.push(ci);
  }
  
  // Baseline
  const baseline = kr.start_value;
  
  // Track running state based on KR type
  let runningValue = baseline;
  let runningSum = 0;
  let runningCount = 0;
  
  // Iterate through each day
  const currentDate = new Date(window.start);
  while (currentDate <= window.end) {
    const dayKey = startOfDay(currentDate).toISOString();
    const dayCheckIns = checkInsByDay.get(dayKey) || [];
    
    // Update running value based on KR type
    if (dayCheckIns.length > 0) {
      switch (kr.kr_type) {
        case "metric":
        case "rate":
          // Last value wins
          runningValue = dayCheckIns[dayCheckIns.length - 1].value;
          break;
        
        case "count":
          // Sum values
          for (const ci of dayCheckIns) {
            runningValue += ci.value;
          }
          break;
        
        case "average":
          // Track sum and count
          for (const ci of dayCheckIns) {
            runningSum += ci.value;
            runningCount++;
          }
          runningValue = runningCount > 0 ? runningSum / runningCount : baseline;
          break;
        
        case "milestone":
          // Use the latest check-in value to determine status (allows toggling)
          const latestMilestoneValue = dayCheckIns[dayCheckIns.length - 1].value;
          runningValue = latestMilestoneValue >= 1 ? 1 : 0;
          break;
      }
    }
    
    // Compute progress for this day
    const progress = computeProgress(kr.kr_type, kr.direction, runningValue, baseline, kr.target_value);
    const expectedProgress = computeExpectedProgress(currentDate, window);
    const paceRatio = computePaceRatio(progress, expectedProgress);
    const paceStatus = classifyPaceStatus(paceRatio);
    
    series.push({
      date: new Date(currentDate),
      currentValue: runningValue,
      progress,
      expectedProgress,
      paceRatio,
      paceStatus,
      checkInCount: dayCheckIns.length,
    });
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return series;
}

/**
 * Build weekly aggregated series (for weekly charts)
 */
export function buildWeeklySeries(
  dailySeries: DailyDataPoint[]
): DailyDataPoint[] {
  if (dailySeries.length === 0) return [];
  
  const weeklySeries: DailyDataPoint[] = [];
  
  // Group by week (starting Sunday)
  let weekStart = startOfWeek(dailySeries[0].date);
  let weekPoints: DailyDataPoint[] = [];
  
  for (const point of dailySeries) {
    const pointWeekStart = startOfWeek(point.date);
    
    if (pointWeekStart.getTime() !== weekStart.getTime()) {
      // New week, aggregate previous week
      if (weekPoints.length > 0) {
        weeklySeries.push(aggregateWeeklyPoint(weekPoints, weekStart));
      }
      weekStart = pointWeekStart;
      weekPoints = [];
    }
    
    weekPoints.push(point);
  }
  
  // Don't forget the last week
  if (weekPoints.length > 0) {
    weeklySeries.push(aggregateWeeklyPoint(weekPoints, weekStart));
  }
  
  return weeklySeries;
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay()); // Sunday = 0
  return result;
}

function aggregateWeeklyPoint(points: DailyDataPoint[], weekStart: Date): DailyDataPoint {
  const lastPoint = points[points.length - 1];
  const totalCheckIns = points.reduce((sum, p) => sum + p.checkInCount, 0);
  
  return {
    date: weekStart,
    currentValue: lastPoint.currentValue,
    progress: lastPoint.progress,
    expectedProgress: lastPoint.expectedProgress,
    paceRatio: lastPoint.paceRatio,
    paceStatus: lastPoint.paceStatus,
    checkInCount: totalCheckIns,
  };
}

// ============================================================================
// ROLLUP COMPUTATIONS
// ============================================================================

/**
 * Compute Objective progress as simple average of its KRs
 */
export function computeObjectiveProgress(
  objective: Objective,
  krProgresses: { kr: AnnualKr; progress: ProgressResult }[]
): ObjectiveProgress {
  if (krProgresses.length === 0) {
    return {
      objectiveId: objective.id,
      progress: 0,
      expectedProgress: 0,
      paceStatus: "off_track",
      krCount: 0,
      krProgresses: [],
    };
  }
  
  // Simple average
  let totalProgress = 0;
  let totalExpected = 0;
  let worstPaceStatus: PaceStatus = "ahead";
  
  const krResults: ObjectiveProgress["krProgresses"] = [];
  
  for (const { kr, progress } of krProgresses) {
    totalProgress += progress.progress;
    totalExpected += progress.expectedProgress;
    
    // Track worst pace status
    if (isPaceWorse(progress.paceStatus, worstPaceStatus)) {
      worstPaceStatus = progress.paceStatus;
    }
    
    krResults.push({
      krId: kr.id,
      progress: progress.progress,
      paceStatus: progress.paceStatus,
    });
  }
  
  const avgProgress = totalProgress / krProgresses.length;
  const avgExpected = totalExpected / krProgresses.length;
  
  return {
    objectiveId: objective.id,
    progress: avgProgress,
    expectedProgress: avgExpected,
    paceStatus: worstPaceStatus,
    krCount: krProgresses.length,
    krProgresses: krResults,
  };
}

/**
 * Compute Plan progress as simple average of Objectives
 */
export function computePlanProgress(
  planId: string,
  objectiveProgresses: { objective: Objective; progress: ObjectiveProgress }[]
): PlanProgress {
  if (objectiveProgresses.length === 0) {
    return {
      planId,
      progress: 0,
      expectedProgress: 0,
      paceStatus: "off_track",
      objectiveCount: 0,
      objectiveProgresses: [],
    };
  }
  
  let totalProgress = 0;
  let totalExpected = 0;
  let worstPaceStatus: PaceStatus = "ahead";
  
  const results: ObjectiveProgress[] = [];
  
  for (const { objective, progress } of objectiveProgresses) {
    // Suppress unused variable warning - objective is part of the interface
    void objective;
    totalProgress += progress.progress;
    totalExpected += progress.expectedProgress;
    
    if (isPaceWorse(progress.paceStatus, worstPaceStatus)) {
      worstPaceStatus = progress.paceStatus;
    }
    
    results.push(progress);
  }
  
  const avgProgress = totalProgress / objectiveProgresses.length;
  const avgExpected = totalExpected / objectiveProgresses.length;
  
  return {
    planId,
    progress: avgProgress,
    expectedProgress: avgExpected,
    paceStatus: worstPaceStatus,
    objectiveCount: objectiveProgresses.length,
    objectiveProgresses: results,
  };
}

/**
 * Helper to compare pace status severity
 */
function isPaceWorse(a: PaceStatus, b: PaceStatus): boolean {
  const order: Record<PaceStatus, number> = {
    ahead: 0,
    on_track: 1,
    at_risk: 2,
    off_track: 3,
  };
  return order[a] > order[b];
}

// ============================================================================
// QUARTER PROGRESS COMPUTATION
// ============================================================================

export interface QuarterProgressResult {
  quarter: 1 | 2 | 3 | 4;
  target: number;
  currentValue: number;
  progress: number; // 0-1
  expectedProgress: number; // 0-1
  expectedValue: number; // Expected value at this point in time
  paceRatio: number;
  paceStatus: PaceStatus;
  isComplete: boolean;
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
  daysRemaining: number;
  daysElapsed: number;
}

/**
 * Compute progress for a specific quarter target
 */
export function computeQuarterProgress(
  quarterTarget: QuarterTarget,
  kr: AnnualKr,
  checkIns: CheckIn[],
  planYear: number,
  asOfDate: Date = new Date()
): QuarterProgressResult {
  const quarter = quarterTarget.quarter;
  const currentQuarter = getCurrentQuarter(asOfDate);
  const quarterDates = getQuarterDates(planYear, quarter);
  
  // Determine quarter status
  const isCurrent = quarter === currentQuarter;
  const isPast = quarter < currentQuarter;
  const isFuture = quarter > currentQuarter;
  
  // Get baseline for the quarter
  // For cumulative, start from year start or previous quarter end
  // For reset quarterly, start from 0 or kr.start_value
  const isCumulative = kr.aggregation === "cumulative";
  
  let baseline: number;
  if (isCumulative && quarter > 1) {
    // For cumulative, baseline is cumulative target from previous quarters
    // This means we're measuring total progress towards annual goal
    baseline = kr.start_value;
  } else {
    // For reset quarterly, each quarter starts fresh from 0
    baseline = 0;
  }
  
  // Calculate current value for this quarter
  // Filter check-ins to this quarter's window
  const quarterWindow: TimeWindow = {
    start: quarterDates.start,
    end: new Date(Math.min(asOfDate.getTime(), quarterDates.end.getTime())),
  };
  
  // For quarterly progress, we need to calculate based on the aggregation type
  let currentValue: number;
  let quarterStartValue: number = 0;
  
  if (isCumulative) {
    // For cumulative: use total check-ins from year start up to current date
    // The quarter's "current" is the total progress towards annual goal
    // So we compare against the cumulative target for this quarter
    const yearStart = new Date(planYear, 0, 1);
    const cumulativeWindow: TimeWindow = {
      start: yearStart,
      end: quarterWindow.end,
    };
    const filteredCheckIns = filterCheckInsInWindow(checkIns, cumulativeWindow);
    currentValue = computeCurrentValueFromCheckIns(kr, filteredCheckIns);
  } else {
    // For reset quarterly with metrics (absolute values like follower counts):
    // We need to calculate the DELTA from the quarter start
    // 1. Get the value at the start of the quarter (last check-in before Q started, or kr.start_value)
    // 2. Get the current value (latest check-in in Q)
    // 3. Progress = (current - quarter_start) / quarter_target
    
    const checkInsInQuarter = filterCheckInsInWindow(checkIns, quarterWindow);
    
    if (kr.kr_type === "metric" || kr.kr_type === "rate") {
      // For metrics/rates, we need to calculate delta from quarter start
      // Get value at start of quarter (last check-in before quarter, or kr.start_value)
      const checkInsBeforeQuarter = checkIns.filter((ci) => {
        const recordedAt = parseDate(ci.recorded_at);
        if (!recordedAt) return false;
        return recordedAt < quarterDates.start;
      }).sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      
      if (checkInsBeforeQuarter.length > 0) {
        quarterStartValue = checkInsBeforeQuarter[0].value;
      } else if (quarter === 1) {
        // For Q1, use kr.start_value as the baseline
        quarterStartValue = kr.start_value;
      } else {
        // For Q2+, use kr.start_value if no check-ins exist before
        quarterStartValue = kr.start_value;
      }
      
      // Get latest value in quarter
      if (checkInsInQuarter.length > 0) {
        const latestInQuarter = [...checkInsInQuarter].sort(
          (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        );
        currentValue = latestInQuarter[0].value - quarterStartValue;
      } else {
        currentValue = 0;
      }
    } else {
      // For counts/milestones, sum up check-ins within the quarter
      currentValue = computeCurrentValueFromCheckIns(kr, checkInsInQuarter);
    }
  }
  
  // Also use the stored current_value if no check-ins at all
  if (checkIns.length === 0) {
    currentValue = quarterTarget.current_value;
  }
  
  // Target for this quarter
  const target = quarterTarget.target_value;
  
  // Calculate progress
  let progress: number;
  if (target === 0) {
    progress = currentValue > 0 ? 1 : 0;
  } else if (isCumulative) {
    // For cumulative, progress is how much of the cumulative target we've hit
    // The target is cumulative (e.g., Q2 target might be 10k which includes Q1's 5k)
    progress = clamp01((currentValue - baseline) / target);
  } else {
    // For reset quarterly, currentValue is already the delta for this quarter
    progress = clamp01(currentValue / target);
  }
  
  // Days calculations
  const now = startOfDay(asOfDate);
  const daysElapsed = Math.max(0, daysBetween(quarterDates.start, now));
  const daysRemaining = Math.max(0, daysBetween(now, quarterDates.end));
  const totalDays = daysBetween(quarterDates.start, quarterDates.end);
  const daysUntilStart = Math.max(0, daysBetween(now, quarterDates.start));
  
  // Expected progress based on time
  let expectedProgress: number;
  if (isPast) {
    expectedProgress = 1; // Past quarters should be 100%
  } else if (isFuture) {
    expectedProgress = 0; // Future quarters haven't started
  } else {
    // Current quarter - linear time-based expectation
    expectedProgress = totalDays > 0 ? clamp01(daysElapsed / totalDays) : 0;
  }
  
  // Expected value for this quarter at this point in time
  // For reset quarterly: expectedValue = target * expectedProgress
  // For cumulative: similar logic but using the quarter's target portion
  const expectedValue = target * expectedProgress;
  
  // Pace calculations
  const paceRatio = computePaceRatio(progress, expectedProgress);
  const paceStatus = isPast 
    ? (progress >= 1 ? "ahead" : "off_track")
    : isFuture 
      ? "on_track" 
      : classifyPaceStatus(paceRatio);
  
  // Is complete?
  const isComplete = progress >= 1;
  
  return {
    quarter,
    target,
    currentValue,
    progress,
    expectedProgress,
    expectedValue,
    paceRatio,
    paceStatus,
    isComplete,
    isCurrent,
    isPast,
    isFuture,
    daysRemaining: isFuture ? daysUntilStart : daysRemaining,
    daysElapsed: isFuture ? 0 : daysElapsed,
  };
}

/**
 * Helper to compute current value from check-ins based on KR type
 */
function computeCurrentValueFromCheckIns(kr: AnnualKr, checkIns: CheckIn[]): number {
  if (checkIns.length === 0) return 0;
  
  switch (kr.kr_type) {
    case "count":
      // Sum all check-in values
      return checkIns.reduce((sum, ci) => sum + ci.value, 0);
    
    case "average":
      // Average of all check-ins
      return checkIns.reduce((sum, ci) => sum + ci.value, 0) / checkIns.length;
    
    case "rate":
    case "metric":
    default:
      // Use most recent check-in value (last aggregation)
      const sorted = [...checkIns].sort(
        (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      );
      return sorted[0].value;
  }
}

/**
 * Compute progress for all quarters of a KR
 */
export function computeAllQuartersProgress(
  quarterTargets: QuarterTarget[],
  kr: AnnualKr,
  checkIns: CheckIn[],
  planYear: number,
  asOfDate: Date = new Date()
): QuarterProgressResult[] {
  return quarterTargets
    .sort((a, b) => a.quarter - b.quarter)
    .map((qt) => computeQuarterProgress(qt, kr, checkIns, planYear, asOfDate));
}

/**
 * Get a summary of quarter progress for display
 */
export interface QuarterProgressSummary {
  completedQuarters: number;
  currentQuarter: 1 | 2 | 3 | 4;
  currentQuarterProgress: QuarterProgressResult | null;
  allQuartersProgress: QuarterProgressResult[];
  isOnTrackForYear: boolean;
}

export function getQuarterProgressSummary(
  quarterTargets: QuarterTarget[],
  kr: AnnualKr,
  checkIns: CheckIn[],
  planYear: number,
  asOfDate: Date = new Date()
): QuarterProgressSummary {
  const currentQuarter = getCurrentQuarter(asOfDate);
  const allQuartersProgress = computeAllQuartersProgress(
    quarterTargets,
    kr,
    checkIns,
    planYear,
    asOfDate
  );
  
  const completedQuarters = allQuartersProgress.filter((q) => q.isComplete).length;
  const currentQuarterProgress = allQuartersProgress.find((q) => q.isCurrent) || null;
  
  // On track if all past quarters are complete and current quarter is on track
  const pastQuartersComplete = allQuartersProgress
    .filter((q) => q.isPast)
    .every((q) => q.isComplete);
  
  const currentOnTrack = currentQuarterProgress 
    ? currentQuarterProgress.paceStatus !== "off_track" 
    : true;
  
  return {
    completedQuarters,
    currentQuarter,
    currentQuarterProgress,
    allQuartersProgress,
    isOnTrackForYear: pastQuartersComplete && currentOnTrack,
  };
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Format progress as percentage string
 */
export function formatProgress(progress: number): string {
  return `${Math.round(progress * 100)}%`;
}

/**
 * Format pace status for display
 */
export function formatPaceStatus(status: PaceStatus): string {
  const labels: Record<PaceStatus, string> = {
    ahead: "Ahead",
    on_track: "On Track",
    at_risk: "At Risk",
    off_track: "Off Track",
  };
  return labels[status];
}

/**
 * Get pace status color/variant for badges
 */
export function getPaceStatusVariant(status: PaceStatus): "success" | "info" | "warning" | "danger" {
  const variants: Record<PaceStatus, "success" | "info" | "warning" | "danger"> = {
    ahead: "success",
    on_track: "info",
    at_risk: "warning",
    off_track: "danger",
  };
  return variants[status];
}

/**
 * Format a value with unit
 */
export function formatValueWithUnit(value: number, unit: string | null, krType: KrType): string {
  if (krType === "rate") {
    return `${value.toFixed(1)}${unit || "%"}`;
  }
  
  const formattedValue = Number.isInteger(value) 
    ? value.toLocaleString() 
    : value.toFixed(1);
  
  return unit ? `${formattedValue} ${unit}` : formattedValue;
}

/**
 * Format delta value
 */
export function formatDelta(delta: number, unit: string | null, _direction: KrDirection): string {
  const prefix = delta > 0 ? "+" : "";
  const formattedDelta = Number.isInteger(delta) 
    ? delta.toLocaleString() 
    : delta.toFixed(1);
  
  const suffix = unit ? ` ${unit}` : "";
  return `${prefix}${formattedDelta}${suffix}`;
}

/**
 * Format forecast value
 */
export function formatForecast(
  forecastValue: number | null,
  target: number,
  unit: string | null,
  krType: KrType
): string {
  if (forecastValue === null) return "—";
  
  const formatted = formatValueWithUnit(forecastValue, unit, krType);
  const comparison = forecastValue >= target ? "≥" : "<";
  const targetFormatted = formatValueWithUnit(target, unit, krType);
  
  return `${formatted} (${comparison} ${targetFormatted})`;
}
