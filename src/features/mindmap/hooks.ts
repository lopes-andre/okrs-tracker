"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import * as api from "./api";
import type { MindmapEntityType } from "@/lib/supabase/types";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get or create a mindmap view
 */
export function useMindmapView(planId: string) {
  return useQuery({
    queryKey: queryKeys.mindmap.view(planId),
    queryFn: () => api.getMindmapView(planId),
    enabled: !!planId,
  });
}

/**
 * Get mindmap nodes for a view
 */
export function useMindmapNodes(viewId: string) {
  return useQuery({
    queryKey: queryKeys.mindmap.nodes(viewId),
    queryFn: () => api.getMindmapNodes(viewId),
    enabled: !!viewId,
  });
}

/**
 * Get mindmap edges for a view
 */
export function useMindmapEdges(viewId: string) {
  return useQuery({
    queryKey: queryKeys.mindmap.edges(viewId),
    queryFn: () => api.getMindmapEdges(viewId),
    enabled: !!viewId,
  });
}

/**
 * Get complete mindmap data (view + nodes + edges)
 */
export function useMindmapData(planId: string) {
  return useQuery({
    queryKey: [...queryKeys.mindmap.view(planId), "full"],
    queryFn: () => api.getMindmapData(planId),
    enabled: !!planId,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update viewport position/zoom
 */
export function useUpdateMindmapViewport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ viewId, viewport }: { viewId: string; viewport: { x?: number; y?: number; zoom?: number } }) =>
      api.updateMindmapViewport(viewId, viewport),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.mindmap.view(data.plan_id), data);
    },
  });
}

/**
 * Upsert a node position
 */
export function useUpsertMindmapNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      viewId,
      node,
    }: {
      viewId: string;
      node: {
        entity_type: MindmapEntityType;
        entity_id: string;
        position_x: number;
        position_y: number;
        is_collapsed?: boolean;
      };
    }) => api.upsertMindmapNode(viewId, node),
    onSuccess: (_, { viewId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mindmap.nodes(viewId) });
    },
  });
}

/**
 * Update multiple node positions
 */
export function useUpdateMindmapNodePositions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      viewId,
      nodes,
    }: {
      viewId: string;
      nodes: { id: string; position_x: number; position_y: number }[];
    }) => api.updateMindmapNodePositions(nodes),
    onSuccess: (_, { viewId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mindmap.nodes(viewId) });
    },
  });
}

/**
 * Toggle node collapsed state
 */
export function useToggleMindmapNodeCollapsed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nodeId, isCollapsed, viewId }: { nodeId: string; isCollapsed: boolean; viewId: string }) =>
      api.toggleMindmapNodeCollapsed(nodeId, isCollapsed),
    onSuccess: (_, { viewId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mindmap.nodes(viewId) });
    },
  });
}

/**
 * Delete a node
 */
export function useDeleteMindmapNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nodeId, viewId }: { nodeId: string; viewId: string }) =>
      api.deleteMindmapNode(nodeId),
    onSuccess: (_, { viewId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mindmap.nodes(viewId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.mindmap.edges(viewId) });
    },
  });
}

/**
 * Create an edge
 */
export function useCreateMindmapEdge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ viewId, sourceNodeId, targetNodeId }: { viewId: string; sourceNodeId: string; targetNodeId: string }) =>
      api.createMindmapEdge(viewId, sourceNodeId, targetNodeId),
    onSuccess: (_, { viewId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mindmap.edges(viewId) });
    },
  });
}

/**
 * Delete an edge
 */
export function useDeleteMindmapEdge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ edgeId, viewId }: { edgeId: string; viewId: string }) =>
      api.deleteMindmapEdge(edgeId),
    onSuccess: (_, { viewId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mindmap.edges(viewId) });
    },
  });
}

/**
 * Save complete mindmap layout
 */
export function useSaveMindmapLayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      viewId,
      planId,
      nodes,
      viewport,
    }: {
      viewId: string;
      planId: string;
      nodes: { entity_type: MindmapEntityType; entity_id: string; position_x: number; position_y: number; is_collapsed: boolean }[];
      viewport?: { x: number; y: number; zoom: number };
    }) => api.saveMindmapLayout(viewId, nodes, viewport),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mindmap.view(planId) });
      toast(successMessages.layoutSaved);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}
