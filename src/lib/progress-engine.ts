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
  KrAggregation 
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
  krProgresses: { krId: string; progress: number; weight: number; paceStatus: PaceStatus }[];
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
  checkIn: CheckIn,
  qualifier: QualifierConfig
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
 */
function computeMilestoneValue(
  kr: AnnualKr,
  checkIns: CheckIn[],
  tasks: Task[],
  trackingSource: "check_ins" | "tasks" | "mixed"
): number {
  // Check if explicitly marked complete via check-in with value >= 1
  const hasCompletionCheckIn = checkIns.some((ci) => ci.value >= 1);
  if (hasCompletionCheckIn) return 1;
  
  // For task-based tracking, compute proxy progress
  if (trackingSource !== "check_ins" && tasks.length > 0) {
    // Return task completion ratio (will be handled in progress calculation)
    return tasks.length; // Number of completed tasks
  }
  
  // If there are check-ins with values between 0 and 1, use the latest
  if (checkIns.length > 0) {
    const sorted = [...checkIns].sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );
    return sorted[0].value;
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
  kr: AnnualKr,
  checkIns: CheckIn[],
  window: TimeWindow
): number {
  // If start_value is explicitly set and non-zero, use it
  if (kr.start_value !== 0 || kr.direction === "decrease") {
    return kr.start_value;
  }
  
  // For "increase" direction, default to 0
  if (kr.direction === "increase") {
    return 0;
  }
  
  // For "decrease" direction, use target as baseline if no start_value
  if (kr.direction === "decrease") {
    return kr.target_value;
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
  target: number
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
  const filteredCheckIns = filterCheckInsInWindow(checkIns, window);
  const filteredTasks = filterCompletedTasksInWindow(tasks, window);
  
  // Get last check-in date
  const lastCheckInDate = filteredCheckIns.length > 0
    ? new Date(Math.max(...filteredCheckIns.map((ci) => new Date(ci.recorded_at).getTime())))
    : null;
  
  // Compute current value
  const currentValue = computeCurrentValue(kr, checkIns, tasks, window, config);
  
  // Compute baseline
  const baseline = computeBaseline(kr, checkIns, window);
  
  // Compute progress
  let progress: number;
  if (kr.kr_type === "milestone" && (config?.trackingSource === "tasks" || config?.trackingSource === "mixed")) {
    const totalLinkedTasks = tasks.length;
    const isComplete = filteredCheckIns.some((ci) => ci.value >= 1);
    progress = computeMilestoneProgressWithTasks(currentValue, filteredTasks.length, totalLinkedTasks, isComplete);
  } else {
    progress = computeProgress(kr.kr_type, kr.direction, currentValue, baseline, kr.target_value, config);
  }
  
  // Compute expected progress and value
  const expectedProgress = computeExpectedProgress(asOfDate, window);
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
  
  // Time calculations
  const daysElapsed = daysBetween(window.start, asOfDate);
  const daysRemaining = daysBetween(asOfDate, window.end);
  
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
  
  // Filter check-ins and tasks to this quarter target
  const qtCheckIns = checkIns.filter((ci) => ci.quarter_target_id === quarterTarget.id);
  const qtTasks = tasks.filter((t) => t.quarter_target_id === quarterTarget.id);
  
  const filteredCheckIns = filterCheckInsInWindow(qtCheckIns, window);
  const filteredTasks = filterCompletedTasksInWindow(qtTasks, window);
  
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
  
  // Time calculations
  const daysElapsed = daysBetween(window.start, asOfDate);
  const daysRemaining = daysBetween(asOfDate, window.end);
  
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
          // Check for completion
          if (dayCheckIns.some((ci) => ci.value >= 1)) {
            runningValue = 1;
          } else {
            runningValue = dayCheckIns[dayCheckIns.length - 1].value;
          }
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
 * Compute Objective progress as weighted average of its KRs
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
  
  // Weighted average
  let totalWeight = 0;
  let weightedProgress = 0;
  let weightedExpected = 0;
  let worstPaceStatus: PaceStatus = "ahead";
  
  const krResults: ObjectiveProgress["krProgresses"] = [];
  
  for (const { kr, progress } of krProgresses) {
    const weight = kr.weight > 0 ? kr.weight : 1;
    totalWeight += weight;
    weightedProgress += progress.progress * weight;
    weightedExpected += progress.expectedProgress * weight;
    
    // Track worst pace status
    if (isPaceWorse(progress.paceStatus, worstPaceStatus)) {
      worstPaceStatus = progress.paceStatus;
    }
    
    krResults.push({
      krId: kr.id,
      progress: progress.progress,
      weight,
      paceStatus: progress.paceStatus,
    });
  }
  
  const avgProgress = totalWeight > 0 ? weightedProgress / totalWeight : 0;
  const avgExpected = totalWeight > 0 ? weightedExpected / totalWeight : 0;
  
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
 * Compute Plan progress as weighted average of Objectives
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
  
  let totalWeight = 0;
  let weightedProgress = 0;
  let weightedExpected = 0;
  let worstPaceStatus: PaceStatus = "ahead";
  
  const results: ObjectiveProgress[] = [];
  
  for (const { objective, progress } of objectiveProgresses) {
    const weight = objective.weight > 0 ? objective.weight : 1;
    totalWeight += weight;
    weightedProgress += progress.progress * weight;
    weightedExpected += progress.expectedProgress * weight;
    
    if (isPaceWorse(progress.paceStatus, worstPaceStatus)) {
      worstPaceStatus = progress.paceStatus;
    }
    
    results.push(progress);
  }
  
  const avgProgress = totalWeight > 0 ? weightedProgress / totalWeight : 0;
  const avgExpected = totalWeight > 0 ? weightedExpected / totalWeight : 0;
  
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
export function formatDelta(delta: number, unit: string | null, direction: KrDirection): string {
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
