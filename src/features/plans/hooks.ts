"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import * as api from "./api";
import type { PlanInsert, PlanUpdate, OkrRole } from "@/lib/supabase/types";

// ============================================================================
// PLAN QUERIES
// ============================================================================

/**
 * Get all plans the user has access to
 */
export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans.list(),
    queryFn: api.getPlans,
  });
}

/**
 * Get a single plan
 */
export function usePlan(planId: string) {
  return useQuery({
    queryKey: queryKeys.plans.detail(planId),
    queryFn: () => api.getPlan(planId),
    enabled: !!planId,
  });
}

/**
 * Get the current user's role for a plan
 */
export function usePlanRole(planId: string) {
  return useQuery({
    queryKey: queryKeys.plans.role(planId),
    queryFn: () => api.getPlanRole(planId),
    enabled: !!planId,
  });
}

/**
 * Get plan statistics
 */
export function usePlanStats(planId: string) {
  return useQuery({
    queryKey: queryKeys.plans.stats(planId),
    queryFn: () => api.getPlanStats(planId),
    enabled: !!planId,
  });
}

// ============================================================================
// PLAN MUTATIONS
// ============================================================================

/**
 * Create a new plan
 */
export function useCreatePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (plan: Omit<PlanInsert, "created_by">) => api.createPlan(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
      toast(successMessages.planCreated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Update a plan
 */
export function useUpdatePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ planId, updates }: { planId: string; updates: PlanUpdate }) =>
      api.updatePlan(planId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.list() });
      toast(successMessages.planUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete a plan
 */
export function useDeletePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (planId: string) => api.deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
      toast(successMessages.planDeleted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// PLAN MEMBERS QUERIES & MUTATIONS
// ============================================================================

/**
 * Get members of a plan
 */
export function usePlanMembers(planId: string) {
  return useQuery({
    queryKey: queryKeys.plans.members(planId),
    queryFn: () => api.getPlanMembers(planId),
    enabled: !!planId,
  });
}

/**
 * Update a member's role
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ planId, userId, role }: { planId: string; userId: string; role: OkrRole }) =>
      api.updateMemberRole(planId, userId, role),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.members(planId) });
      toast(successMessages.roleUpdated);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Remove a member from a plan
 */
export function useRemovePlanMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ planId, userId }: { planId: string; userId: string }) =>
      api.removePlanMember(planId, userId),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.members(planId) });
      toast(successMessages.memberRemoved);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Leave a plan
 */
export function useLeavePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => api.leavePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
    },
  });
}

// ============================================================================
// PLAN INVITES QUERIES & MUTATIONS
// ============================================================================

/**
 * Get pending invites for a plan
 */
export function usePlanInvites(planId: string) {
  return useQuery({
    queryKey: queryKeys.plans.invites(planId),
    queryFn: () => api.getPlanInvites(planId),
    enabled: !!planId,
  });
}

/**
 * Create an invite
 */
export function useCreatePlanInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ planId, email, role }: { planId: string; email: string; role?: OkrRole }) =>
      api.createPlanInvite(planId, email, role),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.invites(planId) });
      toast(successMessages.memberInvited);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete an invite
 */
export function useDeletePlanInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inviteId, planId }: { inviteId: string; planId: string }) =>
      api.deletePlanInvite(inviteId),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.invites(planId) });
    },
  });
}

// ============================================================================
// MY PENDING INVITES (FOR ACCEPTING INVITES)
// ============================================================================

/**
 * Get pending invites for the current user
 */
export function useMyPendingInvites() {
  return useQuery({
    queryKey: queryKeys.plans.myInvites(),
    queryFn: api.getMyPendingInvites,
  });
}

/**
 * Accept an invite
 */
export function useAcceptPlanInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (inviteId: string) => api.acceptPlanInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.myInvites() });
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.list() });
      toast(successMessages.inviteAccepted);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Decline an invite
 */
export function useDeclinePlanInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (inviteId: string) => api.declinePlanInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.myInvites() });
      toast(successMessages.inviteDeclined);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// CURRENT USER
// ============================================================================

/**
 * Get the current authenticated user's ID
 */
export function useCurrentUserId() {
  return useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: api.getCurrentUserId,
    staleTime: 5 * 60 * 1000, // User ID doesn't change often
  });
}
