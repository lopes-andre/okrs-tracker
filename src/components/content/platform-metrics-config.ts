// ============================================================================
// PLATFORM-SPECIFIC METRICS CONFIGURATION
// ============================================================================
// Defines which metrics are available for each platform and how to display them

export interface MetricField {
  key: string;
  label: string;
  type: "count" | "percentage" | "duration" | "currency";
  placeholder?: string;
  description?: string;
  required?: boolean;
}

export interface PlatformMetrics {
  common: MetricField[];
  specific: MetricField[];
}

// Common metrics available for all platforms
const commonMetrics: MetricField[] = [
  { key: "impressions", label: "Impressions", type: "count", required: true },
  { key: "likes", label: "Likes", type: "count" },
  { key: "comments", label: "Comments", type: "count" },
  { key: "shares", label: "Shares", type: "count" },
  { key: "saves", label: "Saves", type: "count" },
];

// Platform-specific additional metrics
const platformSpecificMetrics: Record<string, MetricField[]> = {
  instagram: [
    { key: "reach", label: "Reach", type: "count" },
    { key: "profile_visits", label: "Profile Visits", type: "count" },
    { key: "website_clicks", label: "Website Clicks", type: "count" },
    { key: "follows", label: "Follows", type: "count" },
    { key: "reel_plays", label: "Reel Plays", type: "count" },
  ],
  linkedin: [
    { key: "unique_impressions", label: "Unique Impressions", type: "count" },
    { key: "clicks", label: "Clicks", type: "count" },
    { key: "click_through_rate", label: "Click Through Rate", type: "percentage", placeholder: "e.g., 2.5" },
    { key: "engagement_rate", label: "Engagement Rate", type: "percentage", placeholder: "e.g., 5.2" },
    { key: "reposts", label: "Reposts", type: "count" },
  ],
  youtube: [
    { key: "views", label: "Views", type: "count", required: true },
    { key: "watch_time_minutes", label: "Watch Time (minutes)", type: "duration" },
    { key: "average_view_duration", label: "Avg View Duration (seconds)", type: "duration" },
    { key: "average_view_percentage", label: "Avg View %", type: "percentage" },
    { key: "subscribers_gained", label: "Subscribers Gained", type: "count" },
    { key: "subscribers_lost", label: "Subscribers Lost", type: "count" },
  ],
  tiktok: [
    { key: "video_views", label: "Video Views", type: "count", required: true },
    { key: "profile_views", label: "Profile Views", type: "count" },
    { key: "average_watch_time", label: "Avg Watch Time (seconds)", type: "duration" },
    { key: "full_video_watched_percentage", label: "Full Video Watched %", type: "percentage" },
    { key: "reach", label: "Reach", type: "count" },
  ],
  x: [
    { key: "engagements", label: "Engagements", type: "count" },
    { key: "engagement_rate", label: "Engagement Rate", type: "percentage" },
    { key: "retweets", label: "Retweets", type: "count" },
    { key: "quote_retweets", label: "Quote Retweets", type: "count" },
    { key: "bookmarks", label: "Bookmarks", type: "count" },
  ],
  twitter: [
    { key: "engagements", label: "Engagements", type: "count" },
    { key: "engagement_rate", label: "Engagement Rate", type: "percentage" },
    { key: "retweets", label: "Retweets", type: "count" },
    { key: "quote_retweets", label: "Quote Retweets", type: "count" },
    { key: "bookmarks", label: "Bookmarks", type: "count" },
  ],
  facebook: [
    { key: "reach", label: "Reach", type: "count" },
    { key: "clicks", label: "Clicks", type: "count" },
    { key: "reactions", label: "Reactions", type: "count" },
    { key: "video_views", label: "Video Views", type: "count" },
  ],
  pinterest: [
    { key: "closeups", label: "Closeups", type: "count" },
    { key: "outbound_clicks", label: "Outbound Clicks", type: "count" },
    { key: "pin_clicks", label: "Pin Clicks", type: "count" },
  ],
  threads: [
    { key: "reach", label: "Reach", type: "count" },
    { key: "replies", label: "Replies", type: "count" },
    { key: "reposts", label: "Reposts", type: "count" },
    { key: "quotes", label: "Quotes", type: "count" },
  ],
  blog: [
    { key: "page_views", label: "Page Views", type: "count", required: true },
    { key: "unique_visitors", label: "Unique Visitors", type: "count" },
    { key: "average_time_on_page", label: "Avg Time on Page (seconds)", type: "duration" },
    { key: "bounce_rate", label: "Bounce Rate", type: "percentage" },
    { key: "scroll_depth", label: "Scroll Depth %", type: "percentage" },
  ],
  newsletter: [
    { key: "sends", label: "Sends", type: "count" },
    { key: "opens", label: "Opens", type: "count" },
    { key: "open_rate", label: "Open Rate", type: "percentage" },
    { key: "clicks", label: "Clicks", type: "count" },
    { key: "click_rate", label: "Click Rate", type: "percentage" },
    { key: "unsubscribes", label: "Unsubscribes", type: "count" },
  ],
  substack: [
    { key: "opens", label: "Opens", type: "count" },
    { key: "open_rate", label: "Open Rate", type: "percentage" },
    { key: "clicks", label: "Clicks", type: "count" },
    { key: "new_subscribers", label: "New Subscribers", type: "count" },
  ],
  medium: [
    { key: "views", label: "Views", type: "count", required: true },
    { key: "reads", label: "Reads", type: "count" },
    { key: "read_ratio", label: "Read Ratio", type: "percentage" },
    { key: "fans", label: "Fans", type: "count" },
    { key: "claps", label: "Claps", type: "count" },
  ],
  spotify: [
    { key: "plays", label: "Plays", type: "count", required: true },
    { key: "unique_listeners", label: "Unique Listeners", type: "count" },
    { key: "average_listen_duration", label: "Avg Listen Duration (seconds)", type: "duration" },
    { key: "followers_gained", label: "Followers Gained", type: "count" },
  ],
  podcast: [
    { key: "downloads", label: "Downloads", type: "count", required: true },
    { key: "unique_listeners", label: "Unique Listeners", type: "count" },
    { key: "average_listen_duration", label: "Avg Listen Duration (minutes)", type: "duration" },
    { key: "completion_rate", label: "Completion Rate", type: "percentage" },
  ],
};

/**
 * Get metrics configuration for a platform
 */
export function getPlatformMetrics(platformName: string): PlatformMetrics {
  const normalizedName = platformName.toLowerCase();
  const specific = platformSpecificMetrics[normalizedName] || [];

  return {
    common: commonMetrics,
    specific,
  };
}

/**
 * Get all metrics fields for a platform (common + specific)
 */
export function getAllMetricFields(platformName: string): MetricField[] {
  const { common, specific } = getPlatformMetrics(platformName);
  return [...common, ...specific];
}

/**
 * Format metric value for display
 */
export function formatMetricValue(value: number | null | undefined, type: MetricField["type"]): string {
  if (value === null || value === undefined) return "-";

  switch (type) {
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "duration":
      return value.toLocaleString();
    case "currency":
      return `$${value.toFixed(2)}`;
    case "count":
    default:
      return value.toLocaleString();
  }
}

/**
 * Calculate total engagement from metrics
 */
export function calculateTotalEngagement(metrics: Record<string, number>): number {
  const engagementKeys = ["likes", "comments", "shares", "saves", "reactions", "claps", "reposts"];
  return engagementKeys.reduce((total, key) => total + (metrics[key] || 0), 0);
}

/**
 * Calculate engagement rate
 */
export function calculateEngagementRate(metrics: Record<string, number>): number {
  const impressions = metrics.impressions || metrics.views || metrics.reach || 0;
  if (impressions === 0) return 0;

  const engagement = calculateTotalEngagement(metrics);
  return (engagement / impressions) * 100;
}
