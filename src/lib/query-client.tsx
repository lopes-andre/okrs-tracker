"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

// Default query options for the app
const defaultQueryOptions = {
  queries: {
    // Data is considered fresh for 1 minute
    staleTime: 60 * 1000,
    // Cache data for 5 minutes
    gcTime: 5 * 60 * 1000,
    // Retry failed requests 3 times with exponential backoff
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Don't refetch on window focus in development
    refetchOnWindowFocus: process.env.NODE_ENV === "production",
  },
  mutations: {
    // Retry mutations once
    retry: 1,
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
} as const;
