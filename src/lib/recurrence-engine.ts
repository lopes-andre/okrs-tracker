/**
 * Recurrence Engine
 *
 * Pure functions for generating and parsing iCal RRULE strings.
 * Uses the rrule library for recurrence calculations.
 */

import { RRule, Weekday, rrulestr } from "rrule";
import { format, parseISO, startOfDay, addDays } from "date-fns";
import type {
  RecurrenceFrequency,
  RecurrenceEndType,
  TaskRecurrenceRule,
  TaskRecurrenceRuleInsert,
} from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

/**
 * User-facing recurrence configuration (from the UI)
 */
export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  interval: number;

  // Weekly options
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday

  // Monthly options
  dayOfMonth?: number; // 1-31, or null if using relative day
  weekOfMonth?: number; // -1=last, 1=first, 2=second, 3=third, 4=fourth
  dayOfWeekForMonth?: number; // 0-6, which day of week for relative positioning

  // Yearly options
  monthOfYear?: number; // 1-12

  // End conditions
  endType: RecurrenceEndType;
  endCount?: number;
  endDate?: string; // ISO date string

  // Timezone
  timezone: string;
}

/**
 * Human-readable summary of recurrence
 */
export interface RecurrenceSummary {
  short: string; // e.g., "Weekly"
  long: string; // e.g., "Every 2 weeks on Monday and Friday"
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const ORDINAL_NAMES: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  [-1]: "last",
};

// Map JS day of week (0=Sun) to rrule Weekday
const RRULE_WEEKDAYS: Weekday[] = [
  RRule.SU,
  RRule.MO,
  RRule.TU,
  RRule.WE,
  RRule.TH,
  RRule.FR,
  RRule.SA,
];

// Map RecurrenceFrequency to RRule frequency
const FREQ_MAP: Record<RecurrenceFrequency, number> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
};

// ============================================================================
// RRULE GENERATION
// ============================================================================

/**
 * Convert a RecurrenceConfig to an RRULE string
 */
export function generateRRule(config: RecurrenceConfig, startDate: Date): string {
  const options: Partial<ConstructorParameters<typeof RRule>[0]> = {
    freq: FREQ_MAP[config.frequency],
    interval: config.interval,
    dtstart: startOfDay(startDate),
    wkst: RRule.SU, // Week starts on Sunday
  };

  // Weekly: specific days of week
  if (config.frequency === "weekly" && config.daysOfWeek && config.daysOfWeek.length > 0) {
    options.byweekday = config.daysOfWeek.map((d) => RRULE_WEEKDAYS[d]);
  }

  // Monthly: day of month OR relative day
  if (config.frequency === "monthly") {
    if (config.dayOfMonth !== undefined && config.dayOfMonth !== null) {
      options.bymonthday = [config.dayOfMonth];
    } else if (
      config.weekOfMonth !== undefined &&
      config.weekOfMonth !== null &&
      config.dayOfWeekForMonth !== undefined &&
      config.dayOfWeekForMonth !== null
    ) {
      // e.g., "first Monday" = MO.nth(1), "last Friday" = FR.nth(-1)
      const weekday = RRULE_WEEKDAYS[config.dayOfWeekForMonth];
      options.byweekday = [weekday.nth(config.weekOfMonth)];
    }
  }

  // Yearly: month and day
  if (config.frequency === "yearly") {
    if (config.monthOfYear) {
      options.bymonth = [config.monthOfYear];
    }
    if (config.dayOfMonth !== undefined && config.dayOfMonth !== null) {
      options.bymonthday = [config.dayOfMonth];
    } else if (
      config.weekOfMonth !== undefined &&
      config.weekOfMonth !== null &&
      config.dayOfWeekForMonth !== undefined &&
      config.dayOfWeekForMonth !== null
    ) {
      const weekday = RRULE_WEEKDAYS[config.dayOfWeekForMonth];
      options.byweekday = [weekday.nth(config.weekOfMonth)];
    }
  }

  // End conditions
  if (config.endType === "count" && config.endCount) {
    options.count = config.endCount;
  } else if (config.endType === "until" && config.endDate) {
    options.until = startOfDay(parseISO(config.endDate));
  }

  const rule = new RRule(options);
  return rule.toString();
}

/**
 * Parse an RRULE string back to a RecurrenceConfig
 */
export function parseRRule(rruleString: string, timezone: string): RecurrenceConfig {
  const rule = rrulestr(rruleString);
  const options = rule.origOptions;

  // Map RRule frequency to our type
  const freqMap: Record<number, RecurrenceFrequency> = {
    [RRule.DAILY]: "daily",
    [RRule.WEEKLY]: "weekly",
    [RRule.MONTHLY]: "monthly",
    [RRule.YEARLY]: "yearly",
  };

  const config: RecurrenceConfig = {
    frequency: freqMap[options.freq || RRule.DAILY] || "daily",
    interval: options.interval || 1,
    endType: "never",
    timezone,
  };

  // Parse days of week
  if (options.byweekday && Array.isArray(options.byweekday)) {
    const days: number[] = [];
    let weekOfMonth: number | undefined;
    let dayOfWeekForMonth: number | undefined;

    for (const wd of options.byweekday) {
      if (typeof wd === "number") {
        // Simple weekday number
        const dayIndex = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA].indexOf(wd);
        if (dayIndex >= 0) days.push(dayIndex);
      } else if (wd && typeof wd === "object" && "weekday" in wd) {
        // Weekday with nth
        const weekdayObj = wd as Weekday;
        dayOfWeekForMonth = weekdayObj.weekday;
        weekOfMonth = weekdayObj.n || 1;
      }
    }

    if (days.length > 0) {
      config.daysOfWeek = days;
    }
    if (weekOfMonth !== undefined) {
      config.weekOfMonth = weekOfMonth;
      config.dayOfWeekForMonth = dayOfWeekForMonth;
    }
  }

  // Parse day of month
  if (options.bymonthday) {
    const bymonthday = Array.isArray(options.bymonthday)
      ? options.bymonthday[0]
      : options.bymonthday;
    config.dayOfMonth = bymonthday;
  }

  // Parse month of year
  if (options.bymonth) {
    const bymonth = Array.isArray(options.bymonth)
      ? options.bymonth[0]
      : options.bymonth;
    config.monthOfYear = bymonth;
  }

  // Parse end conditions
  if (options.count) {
    config.endType = "count";
    config.endCount = options.count;
  } else if (options.until) {
    config.endType = "until";
    config.endDate = format(options.until, "yyyy-MM-dd");
  }

  return config;
}

// ============================================================================
// OCCURRENCE GENERATION
// ============================================================================

/**
 * Generate the next N occurrences from an RRULE
 */
export function getNextOccurrences(
  rruleString: string,
  fromDate: Date,
  count: number,
  excludeDates?: Date[]
): Date[] {
  const rule = rrulestr(rruleString);

  // Get occurrences after fromDate
  const endDate = addDays(fromDate, 365 * 2); // Look up to 2 years ahead
  const occurrences = rule.between(fromDate, endDate, true);

  // Filter out excluded dates
  let filtered = occurrences;
  if (excludeDates && excludeDates.length > 0) {
    const excludeSet = new Set(excludeDates.map((d) => format(d, "yyyy-MM-dd")));
    filtered = occurrences.filter((d) => !excludeSet.has(format(d, "yyyy-MM-dd")));
  }

  return filtered.slice(0, count);
}

/**
 * Get the next single occurrence after a given date
 */
export function getNextOccurrence(
  rruleString: string,
  afterDate: Date,
  excludeDates?: Date[]
): Date | null {
  const occurrences = getNextOccurrences(rruleString, afterDate, 1, excludeDates);
  return occurrences.length > 0 ? occurrences[0] : null;
}

/**
 * Check if a date is a valid occurrence in the recurrence pattern
 */
export function isValidOccurrence(rruleString: string, date: Date): boolean {
  const rule = rrulestr(rruleString);
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);

  const occurrences = rule.between(dayStart, dayEnd, true);
  return occurrences.length > 0;
}

// ============================================================================
// HUMAN-READABLE SUMMARIES
// ============================================================================

/**
 * Generate a human-readable summary of the recurrence pattern
 */
export function getRecurrenceSummary(config: RecurrenceConfig): RecurrenceSummary {
  const { frequency, interval } = config;
  let short = "";
  let long = "";

  switch (frequency) {
    case "daily": {
      short = "Daily";
      if (interval === 1) {
        // Check for weekdays only
        if (
          config.daysOfWeek &&
          config.daysOfWeek.length === 5 &&
          config.daysOfWeek.every((d) => d >= 1 && d <= 5)
        ) {
          long = "Every weekday";
        } else {
          long = "Every day";
        }
      } else {
        long = `Every ${interval} days`;
      }
      break;
    }

    case "weekly": {
      short = "Weekly";
      const days = config.daysOfWeek || [];
      const dayNames = days.map((d) => WEEKDAY_SHORT[d]).join(", ");

      if (interval === 1) {
        if (days.length === 0) {
          long = "Every week";
        } else if (days.length === 1) {
          long = `Every ${WEEKDAY_NAMES[days[0]]}`;
        } else {
          long = `Every week on ${dayNames}`;
        }
      } else {
        if (days.length === 0) {
          long = `Every ${interval} weeks`;
        } else {
          long = `Every ${interval} weeks on ${dayNames}`;
        }
      }
      break;
    }

    case "monthly": {
      short = "Monthly";
      const intervalStr = interval === 1 ? "month" : `${interval} months`;

      if (config.dayOfMonth) {
        const ordinal = getOrdinalSuffix(config.dayOfMonth);
        long = `Every ${intervalStr} on the ${config.dayOfMonth}${ordinal}`;
      } else if (config.weekOfMonth !== undefined && config.dayOfWeekForMonth !== undefined) {
        const ordinal = ORDINAL_NAMES[config.weekOfMonth] || `${config.weekOfMonth}th`;
        const day = WEEKDAY_NAMES[config.dayOfWeekForMonth];
        long = `Every ${intervalStr} on the ${ordinal} ${day}`;
      } else {
        long = `Every ${intervalStr}`;
      }
      break;
    }

    case "yearly": {
      short = "Yearly";
      const intervalStr = interval === 1 ? "year" : `${interval} years`;

      if (config.monthOfYear && config.dayOfMonth) {
        const month = MONTH_NAMES[config.monthOfYear - 1];
        const ordinal = getOrdinalSuffix(config.dayOfMonth);
        long = `Every ${intervalStr} on ${month} ${config.dayOfMonth}${ordinal}`;
      } else if (
        config.monthOfYear &&
        config.weekOfMonth !== undefined &&
        config.dayOfWeekForMonth !== undefined
      ) {
        const month = MONTH_NAMES[config.monthOfYear - 1];
        const ordinal = ORDINAL_NAMES[config.weekOfMonth] || `${config.weekOfMonth}th`;
        const day = WEEKDAY_NAMES[config.dayOfWeekForMonth];
        long = `Every ${intervalStr} on the ${ordinal} ${day} of ${month}`;
      } else {
        long = `Every ${intervalStr}`;
      }
      break;
    }
  }

  // Add end condition to long description
  if (config.endType === "count" && config.endCount) {
    long += `, ${config.endCount} times`;
  } else if (config.endType === "until" && config.endDate) {
    const endDateFormatted = format(parseISO(config.endDate), "MMM d, yyyy");
    long += `, until ${endDateFormatted}`;
  }

  return { short, long };
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert RecurrenceConfig to TaskRecurrenceRuleInsert (for database)
 */
export function configToRuleInsert(
  config: RecurrenceConfig,
  taskId: string,
  startDate: Date
): TaskRecurrenceRuleInsert {
  const rrule = generateRRule(config, startDate);

  return {
    task_id: taskId,
    rrule,
    frequency: config.frequency,
    interval_value: config.interval,
    days_of_week: config.daysOfWeek || null,
    day_of_month: config.dayOfMonth || null,
    week_of_month: config.weekOfMonth || null,
    day_of_week_for_month: config.dayOfWeekForMonth || null,
    month_of_year: config.monthOfYear || null,
    end_type: config.endType,
    end_count: config.endCount || null,
    end_date: config.endDate || null,
    timezone: config.timezone,
    generation_limit: 20,
  };
}

/**
 * Convert TaskRecurrenceRule to RecurrenceConfig (from database)
 */
export function ruleToConfig(rule: TaskRecurrenceRule): RecurrenceConfig {
  return {
    frequency: rule.frequency,
    interval: rule.interval_value,
    daysOfWeek: rule.days_of_week || undefined,
    dayOfMonth: rule.day_of_month || undefined,
    weekOfMonth: rule.week_of_month || undefined,
    dayOfWeekForMonth: rule.day_of_week_for_month || undefined,
    monthOfYear: rule.month_of_year || undefined,
    endType: rule.end_type,
    endCount: rule.end_count || undefined,
    endDate: rule.end_date || undefined,
    timezone: rule.timezone,
  };
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Common recurrence presets for quick selection
 */
export const RECURRENCE_PRESETS = {
  daily: (): RecurrenceConfig => ({
    frequency: "daily",
    interval: 1,
    endType: "never",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }),

  weekdays: (): RecurrenceConfig => ({
    frequency: "weekly",
    interval: 1,
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
    endType: "never",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }),

  weekly: (dayOfWeek: number): RecurrenceConfig => ({
    frequency: "weekly",
    interval: 1,
    daysOfWeek: [dayOfWeek],
    endType: "never",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }),

  biweekly: (dayOfWeek: number): RecurrenceConfig => ({
    frequency: "weekly",
    interval: 2,
    daysOfWeek: [dayOfWeek],
    endType: "never",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }),

  monthly: (dayOfMonth: number): RecurrenceConfig => ({
    frequency: "monthly",
    interval: 1,
    dayOfMonth,
    endType: "never",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }),

  yearly: (month: number, day: number): RecurrenceConfig => ({
    frequency: "yearly",
    interval: 1,
    monthOfYear: month,
    dayOfMonth: day,
    endType: "never",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }),
};

/**
 * Get default recurrence config based on a start date
 */
export function getDefaultRecurrenceConfig(startDate: Date): RecurrenceConfig {
  const dayOfWeek = startDate.getDay(); // 0-6
  return RECURRENCE_PRESETS.weekly(dayOfWeek);
}
