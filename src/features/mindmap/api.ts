import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import { handleSupabaseError, handleSupabaseQuery } from "@/lib/api-utils";
import type {
  MindmapView,
  MindmapNode,
  MindmapEdge,
  MindmapEntityType,
} from "@/lib/supabase/types";

// ============================================================================
// MINDMAP VIEWS API
// ============================================================================

/**
 * Get or create a mindmap view for the current user
 */
export async function getMindmapView(planId: string): Promise<MindmapView> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Try to get existing view
  const { data: existingView, error: fetchError } = await supabase
    .from("mindmap_views")
    .select("*")
    .eq("plan_id", planId)
    .eq("user_id", user.id)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") throw fetchError;
  if (existingView) return existingView;

  // Create new view
  return handleSupabaseError(
    supabase
      .from("mindmap_views")
      .insert({
        plan_id: planId,
        user_id: user.id,
        viewport_x: 0,
        viewport_y: 0,
        viewport_zoom: 1,
      })
      .select()
      .single()
  );
}

/**
 * Update viewport position/zoom
 */
export async function updateMindmapViewport(
  viewId: string,
  viewport: { x?: number; y?: number; zoom?: number }
): Promise<MindmapView> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("mindmap_views")
      .update({
        ...(viewport.x !== undefined && { viewport_x: viewport.x }),
        ...(viewport.y !== undefined && { viewport_y: viewport.y }),
        ...(viewport.zoom !== undefined && { viewport_zoom: viewport.zoom }),
      })
      .eq("id", viewId)
      .select()
      .single()
  );
}

// ============================================================================
// MINDMAP NODES API
// ============================================================================

/**
 * Get all nodes for a mindmap view
 */
export async function getMindmapNodes(viewId: string): Promise<MindmapNode[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("mindmap_nodes")
      .select("*")
      .eq("mindmap_view_id", viewId)
  );
}

/**
 * Get a single node
 */
export async function getMindmapNode(
  viewId: string,
  entityType: MindmapEntityType,
  entityId: string
): Promise<MindmapNode | null> {
  const supabase = createClient();

  return handleSupabaseQuery(
    supabase
      .from("mindmap_nodes")
      .select("*")
      .eq("mindmap_view_id", viewId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .single()
  );
}

/**
 * Create or update a node position
 */
export async function upsertMindmapNode(
  viewId: string,
  node: {
    entity_type: MindmapEntityType;
    entity_id: string;
    position_x: number;
    position_y: number;
    is_collapsed?: boolean;
  }
): Promise<MindmapNode> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("mindmap_nodes")
    .upsert(
      {
        mindmap_view_id: viewId,
        entity_type: node.entity_type,
        entity_id: node.entity_id,
        position_x: node.position_x,
        position_y: node.position_y,
        is_collapsed: node.is_collapsed ?? false,
      },
      { onConflict: "mindmap_view_id,entity_type,entity_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Batch update node positions
 */
export async function updateMindmapNodePositions(
  nodes: { id: string; position_x: number; position_y: number }[]
): Promise<void> {
  const supabase = createClient();

  const updates = nodes.map((node) =>
    supabase
      .from("mindmap_nodes")
      .update({
        position_x: node.position_x,
        position_y: node.position_y,
      })
      .eq("id", node.id)
  );

  await Promise.all(updates);
}

/**
 * Toggle node collapsed state
 */
export async function toggleMindmapNodeCollapsed(
  nodeId: string,
  isCollapsed: boolean
): Promise<MindmapNode> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("mindmap_nodes")
      .update({ is_collapsed: isCollapsed })
      .eq("id", nodeId)
      .select()
      .single()
  );
}

/**
 * Delete a node
 */
export async function deleteMindmapNode(nodeId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("mindmap_nodes")
    .delete()
    .eq("id", nodeId);

  if (error) throw error;
}

// ============================================================================
// MINDMAP EDGES API
// ============================================================================

/**
 * Get all edges for a mindmap view
 */
export async function getMindmapEdges(viewId: string): Promise<MindmapEdge[]> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("mindmap_edges")
      .select("*")
      .eq("mindmap_view_id", viewId)
  );
}

/**
 * Create an edge
 */
export async function createMindmapEdge(
  viewId: string,
  sourceNodeId: string,
  targetNodeId: string
): Promise<MindmapEdge> {
  const supabase = createClient();

  return handleSupabaseError(
    supabase
      .from("mindmap_edges")
      .insert({
        mindmap_view_id: viewId,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
      })
      .select()
      .single()
  );
}

/**
 * Delete an edge
 */
export async function deleteMindmapEdge(edgeId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("mindmap_edges")
    .delete()
    .eq("id", edgeId);

  if (error) throw error;
}

// ============================================================================
// FULL MINDMAP DATA
// ============================================================================

/**
 * Get complete mindmap data (view + nodes + edges)
 */
export async function getMindmapData(planId: string): Promise<{
  view: MindmapView;
  nodes: MindmapNode[];
  edges: MindmapEdge[];
}> {
  const view = await getMindmapView(planId);
  const [nodes, edges] = await Promise.all([
    getMindmapNodes(view.id),
    getMindmapEdges(view.id),
  ]);

  return { view, nodes, edges };
}

/**
 * Save complete mindmap layout
 */
export async function saveMindmapLayout(
  viewId: string,
  nodes: { entity_type: MindmapEntityType; entity_id: string; position_x: number; position_y: number; is_collapsed: boolean }[],
  viewport?: { x: number; y: number; zoom: number }
): Promise<void> {
  const supabase = createClient();

  // Update viewport if provided
  if (viewport) {
    await updateMindmapViewport(viewId, viewport);
  }

  // Upsert all nodes
  if (nodes.length > 0) {
    const { error } = await supabase
      .from("mindmap_nodes")
      .upsert(
        nodes.map((node) => ({
          mindmap_view_id: viewId,
          entity_type: node.entity_type,
          entity_id: node.entity_id,
          position_x: node.position_x,
          position_y: node.position_y,
          is_collapsed: node.is_collapsed,
        })),
        { onConflict: "mindmap_view_id,entity_type,entity_id" }
      );

    if (error) throw error;
  }
}
