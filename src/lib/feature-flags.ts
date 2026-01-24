/**
 * Feature Flag System
 *
 * A simple, runtime-configurable feature flag system for controlling
 * feature rollouts and A/B testing.
 *
 * Features:
 * - Type-safe flag access
 * - Default values with environment variable overrides
 * - Support for boolean, string, and number flags
 * - React hook for component usage
 *
 * Usage:
 *   import { isFeatureEnabled, getFeatureValue } from '@/lib/feature-flags';
 *
 *   if (isFeatureEnabled('ENABLE_TEAM_FEATURES')) {
 *     // Show team features
 *   }
 *
 *   // In React components:
 *   const teamFeaturesEnabled = useFeatureFlag('ENABLE_TEAM_FEATURES');
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Available feature flags
 * Add new flags here with their default values
 */
export interface FeatureFlags {
  /**
   * Enable the new analytics dashboard (Phase 3)
   * Default: false
   */
  ENABLE_ANALYTICS_V2: boolean;

  /**
   * Enable team collaboration features (Phase 3)
   * Default: false
   */
  ENABLE_TEAM_FEATURES: boolean;

  /**
   * Enable debug mode for development
   * Shows additional logging and UI indicators
   * Default: false (true in development)
   */
  ENABLE_DEBUG_MODE: boolean;

  /**
   * Enable performance profiling
   * Logs detailed timing information
   * Default: false
   */
  ENABLE_PERFORMANCE_PROFILING: boolean;

  /**
   * Enable experimental task features
   * Default: false
   */
  ENABLE_TASK_EXPERIMENTS: boolean;

  /**
   * Maximum number of check-ins to show in lists
   * Default: 10
   */
  MAX_CHECKINS_DISPLAY: number;

  /**
   * Default dashboard refresh interval in milliseconds
   * Default: 30000 (30 seconds)
   */
  DASHBOARD_REFRESH_INTERVAL: number;
}

export type FeatureFlagKey = keyof FeatureFlags;
export type FeatureFlagValue = FeatureFlags[FeatureFlagKey];

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const isProduction = process.env.NODE_ENV === "production";

/**
 * Default values for all feature flags
 * These can be overridden via environment variables
 */
const DEFAULT_FLAGS: FeatureFlags = {
  ENABLE_ANALYTICS_V2: false,
  ENABLE_TEAM_FEATURES: false,
  ENABLE_DEBUG_MODE: !isProduction,
  ENABLE_PERFORMANCE_PROFILING: false,
  ENABLE_TASK_EXPERIMENTS: false,
  MAX_CHECKINS_DISPLAY: 10,
  DASHBOARD_REFRESH_INTERVAL: 30000,
};

// ============================================================================
// ENVIRONMENT VARIABLE PARSING
// ============================================================================

/**
 * Parse an environment variable value to the appropriate type
 */
function parseEnvValue(value: string | undefined, defaultValue: FeatureFlagValue): FeatureFlagValue {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  // Boolean parsing
  if (typeof defaultValue === "boolean") {
    return value.toLowerCase() === "true" || value === "1";
  }

  // Number parsing
  if (typeof defaultValue === "number") {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  // Fallback to default (should not reach here with current flag types)
  return defaultValue;
}

/**
 * Get the environment variable name for a flag
 * e.g., ENABLE_TEAM_FEATURES -> NEXT_PUBLIC_FF_ENABLE_TEAM_FEATURES
 */
function getEnvVarName(flag: FeatureFlagKey): string {
  return `NEXT_PUBLIC_FF_${flag}`;
}

// ============================================================================
// FLAG ACCESS
// ============================================================================

/**
 * In-memory cache for resolved flag values
 * Reset on each page load
 */
const flagCache = new Map<FeatureFlagKey, FeatureFlagValue>();

/**
 * Get a feature flag value with environment variable override
 *
 * @param flag - The feature flag key
 * @returns The flag value (from env var or default)
 *
 * @example
 * const maxCheckins = getFeatureValue('MAX_CHECKINS_DISPLAY');
 */
export function getFeatureValue<K extends FeatureFlagKey>(flag: K): FeatureFlags[K] {
  // Check cache first
  if (flagCache.has(flag)) {
    return flagCache.get(flag) as FeatureFlags[K];
  }

  const defaultValue = DEFAULT_FLAGS[flag];
  const envVarName = getEnvVarName(flag);

  // Only access env vars in browser if NEXT_PUBLIC_ prefixed
  let envValue: string | undefined;
  if (typeof process !== "undefined" && process.env) {
    envValue = process.env[envVarName];
  }

  const value = parseEnvValue(envValue, defaultValue) as FeatureFlags[K];

  // Cache the resolved value
  flagCache.set(flag, value);

  return value;
}

/**
 * Check if a boolean feature flag is enabled
 *
 * @param flag - The feature flag key (must be a boolean flag)
 * @returns true if the flag is enabled
 *
 * @example
 * if (isFeatureEnabled('ENABLE_TEAM_FEATURES')) {
 *   // Show team tab
 * }
 */
export function isFeatureEnabled(
  flag: {
    [K in FeatureFlagKey]: FeatureFlags[K] extends boolean ? K : never;
  }[FeatureFlagKey]
): boolean {
  return getFeatureValue(flag) === true;
}

/**
 * Get all feature flags with their current values
 * Useful for debugging and admin panels
 *
 * @returns Object with all flag names and values
 */
export function getAllFlags(): FeatureFlags {
  const flags = {} as FeatureFlags;

  for (const key of Object.keys(DEFAULT_FLAGS) as FeatureFlagKey[]) {
    flags[key] = getFeatureValue(key) as never;
  }

  return flags;
}

/**
 * Get flag metadata for debugging/admin UI
 */
export function getFlagMetadata(flag: FeatureFlagKey): {
  key: FeatureFlagKey;
  value: FeatureFlagValue;
  defaultValue: FeatureFlagValue;
  envVar: string;
  type: "boolean" | "number" | "string";
} {
  const defaultValue = DEFAULT_FLAGS[flag];
  return {
    key: flag,
    value: getFeatureValue(flag),
    defaultValue,
    envVar: getEnvVarName(flag),
    type: typeof defaultValue as "boolean" | "number" | "string",
  };
}

// ============================================================================
// RUNTIME OVERRIDES (for testing/development)
// ============================================================================

/**
 * Override a flag value at runtime (for testing/development only)
 * This will persist until page reload
 *
 * @param flag - The feature flag key
 * @param value - The value to set
 *
 * @example
 * // In browser console:
 * window.__setFeatureFlag('ENABLE_TEAM_FEATURES', true);
 */
export function setFeatureFlagOverride<K extends FeatureFlagKey>(
  flag: K,
  value: FeatureFlags[K]
): void {
  if (isProduction) {
    console.warn("[Feature Flags] Runtime overrides are disabled in production");
    return;
  }

  flagCache.set(flag, value);
  console.log(`[Feature Flags] Override set: ${flag} = ${value}`);
}

/**
 * Clear all runtime overrides
 */
export function clearFeatureFlagOverrides(): void {
  flagCache.clear();
  console.log("[Feature Flags] All overrides cleared");
}

// Expose to window for development debugging
if (typeof window !== "undefined" && !isProduction) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__featureFlags = {
    get: getFeatureValue,
    getAll: getAllFlags,
    isEnabled: isFeatureEnabled,
    set: setFeatureFlagOverride,
    clear: clearFeatureFlagOverrides,
    metadata: getFlagMetadata,
  };
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook for accessing feature flags
 *
 * @param flag - The feature flag key
 * @returns The flag value
 *
 * @example
 * function TeamTab() {
 *   const teamFeaturesEnabled = useFeatureFlag('ENABLE_TEAM_FEATURES');
 *
 *   if (!teamFeaturesEnabled) {
 *     return null;
 *   }
 *
 *   return <TeamContent />;
 * }
 */
export function useFeatureFlag<K extends FeatureFlagKey>(flag: K): FeatureFlags[K] {
  // Note: This is a simple implementation that reads the flag value synchronously
  // For more complex use cases (e.g., remote flag updates), this could be
  // enhanced to use useState/useEffect with a subscription pattern
  return getFeatureValue(flag);
}

// ============================================================================
// FEATURE FLAG GUARDS
// ============================================================================

/**
 * Type for boolean feature flags only
 * Use this when you need to restrict to boolean flags
 */
export type BooleanFeatureFlagKey = {
  [K in FeatureFlagKey]: FeatureFlags[K] extends boolean ? K : never;
}[FeatureFlagKey];

/**
 * Helper to conditionally include something based on feature flag
 *
 * @param flag - The boolean feature flag key
 * @param value - The value to return if flag is enabled
 * @param fallback - The value to return if flag is disabled (default: undefined)
 * @returns value if flag is enabled, fallback otherwise
 *
 * @example
 * const tabs = [
 *   { name: 'Dashboard' },
 *   ...whenEnabled('ENABLE_TEAM_FEATURES', [{ name: 'Team' }], []),
 * ];
 */
export function whenEnabled<T>(
  flag: BooleanFeatureFlagKey,
  value: T,
  fallback?: T
): T | undefined {
  return isFeatureEnabled(flag) ? value : fallback;
}
