import type { Node, Edge } from "@xyflow/react";
import type { PaceStatus } from "@/lib/progress-engine";

// ============================================================================
// NODE DATA TYPES
// ============================================================================

export type MindmapNodeType = "plan" | "objective" | "kr" | "quarter" | "task";

export interface BaseNodeData {
  label: string;
  description?: string;
  progress: number; // 0-1
  paceStatus: PaceStatus;
  isCollapsed?: boolean;
  childCount?: number; // Number of direct children
  entityId: string;
}

export interface PlanNodeData extends BaseNodeData {
  type: "plan";
  year: number;
  objectivesCount: number;
  krsCount: number;
}

export interface ObjectiveNodeData extends BaseNodeData {
  type: "objective";
  code: string;
  krsCount: number;
  krsCompleted: number;
}

export interface KrNodeData extends BaseNodeData {
  type: "kr";
  krType: "metric" | "count" | "milestone" | "rate" | "average" | "boolean";
  currentValue: number;
  targetValue: number;
  unit?: string;
  direction: "increase" | "decrease" | "maintain";
  quarterTargetsCount: number;
}

export interface QuarterNodeData extends BaseNodeData {
  type: "quarter";
  quarter: 1 | 2 | 3 | 4;
  targetValue: number;
  currentValue: number;
  status: "upcoming" | "active" | "completed" | "failed";
}

export interface TaskNodeData extends BaseNodeData {
  type: "task";
  status: "not_started" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
}

export type MindmapNodeData =
  | PlanNodeData
  | ObjectiveNodeData
  | KrNodeData
  | QuarterNodeData
  | TaskNodeData;

// ============================================================================
// REACT FLOW NODE/EDGE TYPES
// ============================================================================

export type MindmapNode = Node<MindmapNodeData, MindmapNodeType>;
export type MindmapEdge = Edge;

// ============================================================================
// LAYOUT TYPES
// ============================================================================

export interface LayoutConfig {
  direction: "TB" | "LR"; // Top-to-bottom or Left-to-right
  nodeSpacing: number;
  levelSpacing: number;
  showTasks: boolean;
  showQuarters: boolean;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  direction: "TB",
  nodeSpacing: 40,
  levelSpacing: 120,
  showTasks: false,
  showQuarters: true,
};

// ============================================================================
// VIEW MODE
// ============================================================================

export type ViewMode = "tree" | "radial" | "focus";

// ============================================================================
// NODE DIMENSIONS
// ============================================================================

export const NODE_DIMENSIONS = {
  plan: { width: 280, height: 100 },
  objective: { width: 240, height: 90 },
  kr: { width: 220, height: 80 },
  quarter: { width: 120, height: 50 },
  task: { width: 160, height: 40 },
} as const;
