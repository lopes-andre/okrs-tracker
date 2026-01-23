import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Tables that support real-time subscriptions
export type RealtimeTable =
  | "objectives"
  | "annual_krs"
  | "quarter_targets"
  | "tasks"
  | "check_ins"
  | "plan_members"
  | "activity_events"
  | "dashboards"
  | "dashboard_widgets"
  | "tags"
  | "weekly_reviews";

// Event types from Supabase Realtime
export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE";

// Generic payload type for realtime events
export interface RealtimeEvent<T = Record<string, unknown>> {
  table: RealtimeTable;
  eventType: RealtimeEventType;
  new: T | null;
  old: T | null;
  schema: string;
  commit_timestamp: string;
}

// Presence state for online users
export interface PresenceState {
  oduserId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  onlineAt: string;
  currentPage?: string;
}

// Subscription options
export interface RealtimeSubscriptionOptions {
  planId: string;
  tables?: RealtimeTable[];
  onEvent?: (event: RealtimeEvent) => void;
  onPresenceSync?: (presences: PresenceState[]) => void;
  onPresenceJoin?: (presence: PresenceState) => void;
  onPresenceLeave?: (presence: PresenceState) => void;
  onConnectionChange?: (status: "connected" | "disconnected" | "reconnecting") => void;
}

// Channel reference for cleanup
export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => Promise<void>;
}

// Map table events to query keys that need invalidation
export interface QueryInvalidationMap {
  table: RealtimeTable;
  eventType: RealtimeEventType;
  getQueryKeys: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>, planId: string) => string[][];
}
