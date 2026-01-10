"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow, type Viewport } from "@xyflow/react";
import type { MindmapNode, MindmapNodeData } from "../types";
import { useMindmapData, useSaveMindmapLayout } from "@/features/mindmap/hooks";
import type { MindmapNode as DbMindmapNode, MindmapEntityType } from "@/lib/supabase/types";

interface UsePersistenceOptions {
  planId: string;
  autoSaveDelay?: number; // ms delay before auto-saving (default: 1000)
}

interface UsePersistenceReturn {
  isLoading: boolean;
  viewId: string | null;
  savedPositions: Map<string, { x: number; y: number; isCollapsed: boolean }>;
  hasSavedLayout: boolean;
  saveLayout: () => void;
  resetLayout: () => void;
  isSaving: boolean;
}

/**
 * Hook to persist and restore node positions from the database
 */
export function usePersistence({
  planId,
  autoSaveDelay = 1000,
}: UsePersistenceOptions): UsePersistenceReturn {
  const { getNodes, getViewport } = useReactFlow();
  const { data: mindmapData, isLoading } = useMindmapData(planId);
  const saveMutation = useSaveMindmapLayout();
  
  const [pendingSave, setPendingSave] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Build saved positions map
  const savedPositions = new Map<string, { x: number; y: number; isCollapsed: boolean }>();
  
  if (mindmapData?.nodes) {
    mindmapData.nodes.forEach((node: DbMindmapNode) => {
      const key = `${node.entity_type}-${node.entity_id}`;
      savedPositions.set(key, {
        x: node.position_x,
        y: node.position_y,
        isCollapsed: node.is_collapsed,
      });
    });
  }

  const hasSavedLayout = savedPositions.size > 0;
  const viewId = mindmapData?.view?.id || null;

  // Manual save
  const saveLayout = useCallback(() => {
    if (!viewId) return;
    
    const nodes = getNodes();
    const viewport = getViewport();
    
    const nodesToSave = nodes.map((node: MindmapNode) => {
      const data = node.data as MindmapNodeData;
      return {
        entity_type: data.type as MindmapEntityType,
        entity_id: data.entityId,
        position_x: node.position.x,
        position_y: node.position.y,
        is_collapsed: data.isCollapsed || false,
      };
    });

    saveMutation.mutate({
      viewId,
      planId,
      nodes: nodesToSave,
      viewport: {
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom,
      },
    });
  }, [viewId, planId, getNodes, getViewport, saveMutation]);

  // Reset to auto-layout (clear saved positions)
  const resetLayout = useCallback(() => {
    // This will cause the data transformer to use auto-layout
    // We'll need to delete all saved nodes
    if (!viewId) return;
    
    // For now, just trigger a save with updated positions after re-layout
    // The actual reset happens by not applying saved positions
  }, [viewId]);

  // Schedule auto-save
  const scheduleAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setPendingSave(true);
    
    saveTimeoutRef.current = setTimeout(() => {
      saveLayout();
      setPendingSave(false);
    }, autoSaveDelay);
  }, [saveLayout, autoSaveDelay]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    viewId,
    savedPositions,
    hasSavedLayout,
    saveLayout,
    resetLayout,
    isSaving: saveMutation.isPending || pendingSave,
  };
}

/**
 * Apply saved positions to auto-layout nodes
 */
export function applySavedPositions(
  nodes: MindmapNode[],
  savedPositions: Map<string, { x: number; y: number; isCollapsed: boolean }>
): MindmapNode[] {
  if (savedPositions.size === 0) return nodes;

  return nodes.map((node) => {
    const data = node.data as MindmapNodeData;
    const key = `${data.type}-${data.entityId}`;
    const saved = savedPositions.get(key);

    if (saved) {
      return {
        ...node,
        position: { x: saved.x, y: saved.y },
        data: {
          ...node.data,
          isCollapsed: saved.isCollapsed,
        },
      };
    }

    return node;
  });
}

/**
 * Get saved collapsed node IDs from saved positions
 */
export function getSavedCollapsedIds(
  savedPositions: Map<string, { x: number; y: number; isCollapsed: boolean }>
): Set<string> {
  const collapsedIds = new Set<string>();
  
  savedPositions.forEach((saved, key) => {
    if (saved.isCollapsed) {
      collapsedIds.add(key);
    }
  });

  return collapsedIds;
}
