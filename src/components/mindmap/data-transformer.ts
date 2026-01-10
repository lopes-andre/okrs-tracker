import type { 
  MindmapNode, 
  MindmapEdge, 
  PlanNodeData,
  ObjectiveNodeData,
  KrNodeData,
  QuarterNodeData,
  TaskNodeData,
  LayoutConfig,
} from "./types";
import type { 
  Plan, 
  ObjectiveWithKrs, 
  AnnualKr, 
  QuarterTarget,
  Task,
  CheckIn,
} from "@/lib/supabase/types";
import { computeKrProgress, computeObjectiveProgress, type PaceStatus } from "@/lib/progress-engine";
import { calculateTreeLayout, applyLayout } from "./layout";

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

export interface TransformInput {
  plan: Plan;
  objectives: ObjectiveWithKrs[];
  tasks: Task[];
  checkIns: CheckIn[];
  config: LayoutConfig;
}

export interface TransformOutput {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
}

/**
 * Transform OKR data into React Flow nodes and edges
 */
export function transformOkrDataToMindmap({
  plan,
  objectives,
  tasks,
  checkIns,
  config,
}: TransformInput): TransformOutput {
  const nodes: MindmapNode[] = [];
  const edges: MindmapEdge[] = [];
  const year = plan.year;
  const asOfDate = new Date();

  // Group check-ins by KR
  const checkInsByKr = new Map<string, CheckIn[]>();
  checkIns.forEach((ci) => {
    const existing = checkInsByKr.get(ci.annual_kr_id) || [];
    existing.push(ci);
    checkInsByKr.set(ci.annual_kr_id, existing);
  });

  // Group tasks by KR
  const tasksByKr = new Map<string, Task[]>();
  tasks.forEach((t) => {
    if (t.annual_kr_id) {
      const existing = tasksByKr.get(t.annual_kr_id) || [];
      existing.push(t);
      tasksByKr.set(t.annual_kr_id, existing);
    }
  });

  // Calculate overall progress
  let totalKrs = 0;
  let totalProgress = 0;

  objectives.forEach((obj) => {
    const krs = obj.annual_krs || [];
    krs.forEach((kr) => {
      const krCheckIns = checkInsByKr.get(kr.id) || [];
      const krTasks = tasksByKr.get(kr.id) || [];
      const progress = computeKrProgress(kr, krCheckIns, krTasks, year, asOfDate);
      totalProgress += progress.progress;
      totalKrs++;
    });
  });

  const overallProgress = totalKrs > 0 ? totalProgress / totalKrs : 0;
  const planPaceStatus = getPaceStatus(overallProgress, year);

  // Create Plan node
  const planNodeId = `plan-${plan.id}`;
  const planNode: MindmapNode = {
    id: planNodeId,
    type: "plan",
    position: { x: 0, y: 0 },
    data: {
      type: "plan",
      entityId: plan.id,
      label: plan.name,
      description: plan.description || undefined,
      year: plan.year,
      progress: overallProgress,
      paceStatus: planPaceStatus,
      objectivesCount: objectives.length,
      krsCount: totalKrs,
    } as PlanNodeData,
  };
  nodes.push(planNode);

  // Create Objective nodes
  objectives.forEach((obj) => {
    const objNodeId = `objective-${obj.id}`;
    const krs = obj.annual_krs || [];
    
    // Calculate objective progress
    let objProgress = 0;
    let krsCompleted = 0;
    
    if (krs.length > 0) {
      krs.forEach((kr) => {
        const krCheckIns = checkInsByKr.get(kr.id) || [];
        const krTasks = tasksByKr.get(kr.id) || [];
        const progress = computeKrProgress(kr, krCheckIns, krTasks, year, asOfDate);
        objProgress += progress.progress;
        if (progress.progress >= 1) krsCompleted++;
      });
      objProgress /= krs.length;
    }

    const objNode: MindmapNode = {
      id: objNodeId,
      type: "objective",
      position: { x: 0, y: 0 },
      data: {
        type: "objective",
        entityId: obj.id,
        label: obj.name,
        description: obj.description || undefined,
        code: obj.code,
        progress: objProgress,
        paceStatus: getPaceStatus(objProgress, year),
        krsCount: krs.length,
        krsCompleted,
      } as ObjectiveNodeData,
    };
    nodes.push(objNode);

    // Edge from plan to objective
    edges.push({
      id: `${planNodeId}-${objNodeId}`,
      source: planNodeId,
      target: objNodeId,
      type: "smoothstep",
    });

    // Create KR nodes
    krs.forEach((kr) => {
      const krNodeId = `kr-${kr.id}`;
      const krCheckIns = checkInsByKr.get(kr.id) || [];
      const krTasks = tasksByKr.get(kr.id) || [];
      const progress = computeKrProgress(kr, krCheckIns, krTasks, year, asOfDate);
      const quarterTargets = kr.quarter_targets || [];

      const krNode: MindmapNode = {
        id: krNodeId,
        type: "kr",
        position: { x: 0, y: 0 },
        data: {
          type: "kr",
          entityId: kr.id,
          label: kr.name,
          description: kr.description || undefined,
          krType: kr.kr_type as KrNodeData["krType"],
          currentValue: progress.currentValue,
          targetValue: kr.target_value,
          unit: kr.unit || undefined,
          direction: kr.direction as KrNodeData["direction"],
          progress: progress.progress,
          paceStatus: progress.paceStatus,
          quarterTargetsCount: quarterTargets.length,
        } as KrNodeData,
      };
      nodes.push(krNode);

      // Edge from objective to KR
      edges.push({
        id: `${objNodeId}-${krNodeId}`,
        source: objNodeId,
        target: krNodeId,
        type: "smoothstep",
      });

      // Create Quarter Target nodes (if enabled)
      if (config.showQuarters && quarterTargets.length > 0) {
        quarterTargets.forEach((qt) => {
          const qtNodeId = `quarter-${qt.id}`;
          const qtStatus = getQuarterStatus(qt.quarter, year);
          
          // Calculate quarter progress
          const qtProgress = qt.target_value > 0 
            ? Math.min(progress.currentValue / qt.target_value, 1)
            : 0;

          const qtNode: MindmapNode = {
            id: qtNodeId,
            type: "quarter",
            position: { x: 0, y: 0 },
            data: {
              type: "quarter",
              entityId: qt.id,
              label: `Q${qt.quarter}`,
              quarter: qt.quarter as 1 | 2 | 3 | 4,
              targetValue: qt.target_value,
              currentValue: progress.currentValue,
              progress: qtProgress,
              paceStatus: qtStatus === "active" ? progress.paceStatus : "on_track",
              status: qtStatus,
            } as QuarterNodeData,
          };
          nodes.push(qtNode);

          // Edge from KR to quarter
          edges.push({
            id: `${krNodeId}-${qtNodeId}`,
            source: krNodeId,
            target: qtNodeId,
            type: "smoothstep",
          });
        });
      }

      // Create Task nodes (if enabled and limited)
      if (config.showTasks) {
        const limitedTasks = krTasks.slice(0, 5); // Limit to 5 tasks per KR
        limitedTasks.forEach((task) => {
          const taskNodeId = `task-${task.id}`;
          const taskProgress = task.status === "completed" ? 1 : 0;

          const taskNode: MindmapNode = {
            id: taskNodeId,
            type: "task",
            position: { x: 0, y: 0 },
            data: {
              type: "task",
              entityId: task.id,
              label: task.title,
              progress: taskProgress,
              paceStatus: "on_track",
              status: task.status as TaskNodeData["status"],
              priority: task.priority as TaskNodeData["priority"],
              dueDate: task.due_date || undefined,
            } as TaskNodeData,
          };
          nodes.push(taskNode);

          // Edge from KR to task
          edges.push({
            id: `${krNodeId}-${taskNodeId}`,
            source: krNodeId,
            target: taskNodeId,
            type: "smoothstep",
          });
        });
      }
    });
  });

  // Apply auto-layout
  const positions = calculateTreeLayout(nodes, edges, config);
  const positionedNodes = applyLayout(nodes, positions);

  return { nodes: positionedNodes, edges };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get pace status based on progress and time of year
 */
function getPaceStatus(progress: number, year: number): PaceStatus {
  const now = new Date();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);
  
  const totalDays = (endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays = (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24);
  const expectedProgress = Math.min(elapsedDays / totalDays, 1);
  
  const paceRatio = expectedProgress > 0 ? progress / expectedProgress : 1;
  
  if (paceRatio >= 1.1) return "ahead";
  if (paceRatio >= 0.9) return "on_track";
  if (paceRatio >= 0.7) return "at_risk";
  return "off_track";
}

/**
 * Get quarter status
 */
function getQuarterStatus(
  quarter: number,
  year: number
): "upcoming" | "active" | "completed" | "failed" {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

  if (year > currentYear) return "upcoming";
  if (year < currentYear) return "completed";
  
  if (quarter < currentQuarter) return "completed";
  if (quarter > currentQuarter) return "upcoming";
  return "active";
}
