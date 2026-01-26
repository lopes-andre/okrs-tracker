"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { shouldRetryError, toApiError } from "./api-utils";

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

/**
 * Calculate retry delay with exponential backoff and jitter
 */
function calculateRetryDelay(attemptIndex: number, error?: unknown): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds

  // Rate limit errors should wait longer
  const apiError = error ? toApiError(error) : null;
  if (apiError?.category === "rate_limit") {
    return Math.min(5000 * 2 ** attemptIndex, 60000); // 5s, 10s, 20s, up to 60s
  }

  // Exponential backoff with jitter to prevent thundering herd
  const exponentialDelay = baseDelay * 2 ** attemptIndex;
  const jitter = Math.random() * 1000; // 0-1 second jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

// Default query options for the app
const defaultQueryOptions = {
  queries: {
    // Data is considered fresh for 1 minute
    staleTime: 60 * 1000,
    // Cache data for 5 minutes
    gcTime: 5 * 60 * 1000,
    // Smart retry: only retry retryable errors
    retry: (failureCount: number, error: unknown) => shouldRetryError(error, failureCount),
    // Exponential backoff with jitter
    retryDelay: (attemptIndex: number, error: unknown) => calculateRetryDelay(attemptIndex, error),
    // Don't refetch on window focus in development
    refetchOnWindowFocus: process.env.NODE_ENV === "production",
    // Throw errors to error boundary in development for easier debugging
    throwOnError: process.env.NODE_ENV === "development",
  },
  mutations: {
    // Smart retry for mutations too
    retry: (failureCount: number, error: unknown) => {
      // Be more conservative with mutations (only 1 retry)
      if (failureCount >= 1) return false;
      return shouldRetryError(error, failureCount);
    },
    retryDelay: (attemptIndex: number, error: unknown) => calculateRetryDelay(attemptIndex, error),
  },
};

export function QueryProvider({ children }: { children: ReactNode }) {
  // Create a new QueryClient instance for each session
  // This ensures data isn't shared between users/requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: defaultQueryOptions,
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Query key factories for consistent cache key management
export const queryKeys = {
  // Plans
  plans: {
    all: ["plans"] as const,
    list: () => [...queryKeys.plans.all, "list"] as const,
    detail: (planId: string) => [...queryKeys.plans.all, "detail", planId] as const,
    role: (planId: string) => [...queryKeys.plans.all, "role", planId] as const,
    members: (planId: string) => [...queryKeys.plans.all, "members", planId] as const,
    invites: (planId: string) => [...queryKeys.plans.all, "invites", planId] as const,
    stats: (planId: string) => [...queryKeys.plans.all, "stats", planId] as const,
    myInvites: () => [...queryKeys.plans.all, "myInvites"] as const,
  },

  // Objectives
  objectives: {
    all: ["objectives"] as const,
    list: (planId: string) => [...queryKeys.objectives.all, "list", planId] as const,
    detail: (objectiveId: string) => [...queryKeys.objectives.all, "detail", objectiveId] as const,
    withKrs: (planId: string) => [...queryKeys.objectives.all, "withKrs", planId] as const,
  },

  // Key Results
  annualKrs: {
    all: ["annualKrs"] as const,
    list: (planId: string) => [...queryKeys.annualKrs.all, "list", planId] as const,
    byObjective: (objectiveId: string) => [...queryKeys.annualKrs.all, "byObjective", objectiveId] as const,
    detail: (krId: string) => [...queryKeys.annualKrs.all, "detail", krId] as const,
    withDetails: (krId: string) => [...queryKeys.annualKrs.all, "withDetails", krId] as const,
    tags: (krId: string) => [...queryKeys.annualKrs.all, "tags", krId] as const,
  },

  // Quarter Targets
  quarterTargets: {
    all: ["quarterTargets"] as const,
    list: (planId: string) => [...queryKeys.quarterTargets.all, "list", planId] as const,
    byKr: (annualKrId: string) => [...queryKeys.quarterTargets.all, "byKr", annualKrId] as const,
    byQuarter: (planId: string, quarter: number) => 
      [...queryKeys.quarterTargets.all, "byQuarter", planId, quarter] as const,
  },

  // Tasks
  tasks: {
    all: ["tasks"] as const,
    list: (planId: string, filters?: object) =>
      [...queryKeys.tasks.all, "list", planId, filters] as const,
    detail: (taskId: string) => [...queryKeys.tasks.all, "detail", taskId] as const,
    byObjective: (objectiveId: string) => [...queryKeys.tasks.all, "byObjective", objectiveId] as const,
    byQuarterTarget: (quarterTargetId: string) =>
      [...queryKeys.tasks.all, "byQuarterTarget", quarterTargetId] as const,
    assignees: (taskId: string) => [...queryKeys.tasks.all, "assignees", taskId] as const,
  },

  // Check-ins
  checkIns: {
    all: ["checkIns"] as const,
    list: (planId: string, filters?: object) => 
      [...queryKeys.checkIns.all, "list", planId, filters] as const,
    byKr: (annualKrId: string) => [...queryKeys.checkIns.all, "byKr", annualKrId] as const,
    recent: (planId: string, limit?: number) => 
      [...queryKeys.checkIns.all, "recent", planId, limit] as const,
  },

  // Tags & Groups
  tags: {
    all: ["tags"] as const,
    list: (planId: string) => [...queryKeys.tags.all, "list", planId] as const,
    byKind: (planId: string, kind: string) => [...queryKeys.tags.all, "byKind", planId, kind] as const,
    withUsage: (planId: string) => [...queryKeys.tags.all, "withUsage", planId] as const,
  },

  groups: {
    all: ["groups"] as const,
    list: (planId: string) => [...queryKeys.groups.all, "list", planId] as const,
  },

  // Timeline / Activity Events
  timeline: {
    all: ["timeline"] as const,
    list: (planId: string, filters?: object) => 
      [...queryKeys.timeline.all, "list", planId, filters] as const,
    recent: (planId: string, limit?: number) => 
      [...queryKeys.timeline.all, "recent", planId, limit] as const,
  },

  // Dashboards
  dashboards: {
    all: ["dashboards"] as const,
    list: (planId: string) => [...queryKeys.dashboards.all, "list", planId] as const,
    detail: (dashboardId: string) => [...queryKeys.dashboards.all, "detail", dashboardId] as const,
    widgets: (dashboardId: string) => [...queryKeys.dashboards.all, "widgets", dashboardId] as const,
  },

  // Saved Views
  savedViews: {
    all: ["savedViews"] as const,
    list: (planId: string) => [...queryKeys.savedViews.all, "list", planId] as const,
    byType: (planId: string, viewType: string) => 
      [...queryKeys.savedViews.all, "byType", planId, viewType] as const,
  },

  // User Profile
  profile: {
    current: ["profile", "current"] as const,
    byId: (userId: string) => ["profile", userId] as const,
  },

  // Comments
  comments: {
    all: ["comments"] as const,
    byTask: (taskId: string) => [...queryKeys.comments.all, "byTask", taskId] as const,
    count: (taskId: string) => [...queryKeys.comments.all, "count", taskId] as const,
    unreadCount: (taskId: string, userId: string) =>
      [...queryKeys.comments.all, "unreadCount", taskId, userId] as const,
    unreadCounts: (userId: string) =>
      [...queryKeys.comments.all, "unreadCounts", userId] as const,
  },

  // Notifications
  notifications: {
    all: ["notifications"] as const,
    list: (userId: string) => [...queryKeys.notifications.all, "list", userId] as const,
    unreadCount: (userId: string) => [...queryKeys.notifications.all, "unreadCount", userId] as const,
  },

  // Team Analytics
  teamAnalytics: {
    all: ["teamAnalytics"] as const,
    workload: (planId: string) => [...queryKeys.teamAnalytics.all, "workload", planId] as const,
    contributions: (planId: string, dateFrom?: string, dateTo?: string) =>
      [...queryKeys.teamAnalytics.all, "contributions", planId, dateFrom, dateTo] as const,
  },

  // Content Planner
  content: {
    all: ["content"] as const,
    platforms: {
      all: ["content", "platforms"] as const,
      list: () => [...queryKeys.content.platforms.all, "list"] as const,
    },
    accounts: {
      all: ["content", "accounts"] as const,
      list: (planId: string) => [...queryKeys.content.accounts.all, "list", planId] as const,
      detail: (accountId: string) => [...queryKeys.content.accounts.all, "detail", accountId] as const,
    },
    goals: {
      all: ["content", "goals"] as const,
      list: (planId: string) => [...queryKeys.content.goals.all, "list", planId] as const,
    },
    posts: {
      all: ["content", "posts"] as const,
      list: (planId: string, filters?: object) =>
        [...queryKeys.content.posts.all, "list", planId, filters] as const,
      detail: (postId: string) => [...queryKeys.content.posts.all, "detail", postId] as const,
      withDetails: (planId: string) => [...queryKeys.content.posts.all, "withDetails", planId] as const,
    },
    distributions: {
      all: ["content", "distributions"] as const,
      byPost: (postId: string) => [...queryKeys.content.distributions.all, "byPost", postId] as const,
      calendar: (planId: string, startDate: string, endDate: string) =>
        [...queryKeys.content.distributions.all, "calendar", planId, startDate, endDate] as const,
    },
    campaigns: {
      all: ["content", "campaigns"] as const,
      list: (planId: string, filters?: object) =>
        [...queryKeys.content.campaigns.all, "list", planId, filters] as const,
      detail: (campaignId: string) => [...queryKeys.content.campaigns.all, "detail", campaignId] as const,
      distributions: (campaignId: string) =>
        [...queryKeys.content.campaigns.all, "distributions", campaignId] as const,
      availableDistributions: (planId: string, campaignId?: string, platformId?: string) =>
        [...queryKeys.content.campaigns.all, "availableDistributions", planId, campaignId, platformId] as const,
    },
    campaignDistributions: {
      all: ["content", "campaignDistributions"] as const,
      byCampaign: (campaignId: string) =>
        [...queryKeys.content.campaignDistributions.all, "byCampaign", campaignId] as const,
      byDistribution: (distributionId: string) =>
        [...queryKeys.content.campaignDistributions.all, "byDistribution", distributionId] as const,
    },
    stats: (planId: string) => [...queryKeys.content.all, "stats", planId] as const,
  },
} as const;
