"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { PlanNode, ObjectiveNode, KrNode, QuarterNode, TaskNode } from "./nodes";
import { transformOkrDataToMindmap } from "./data-transformer";
import type { LayoutConfig, ViewMode, MindmapNode, MindmapEdge } from "./types";
import { DEFAULT_LAYOUT_CONFIG } from "./types";
import type { Plan, ObjectiveWithKrs, Task, CheckIn } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  Circle,
  Eye,
  EyeOff,
  ListTodo,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// NODE TYPES REGISTRATION
// ============================================================================

const nodeTypes: NodeTypes = {
  plan: PlanNode,
  objective: ObjectiveNode,
  kr: KrNode,
  quarter: QuarterNode,
  task: TaskNode,
};

// ============================================================================
// CUSTOM EDGE STYLES
// ============================================================================

const defaultEdgeOptions = {
  style: {
    strokeWidth: 2,
    stroke: "var(--color-border-medium)",
  },
  type: "smoothstep",
};

// ============================================================================
// MINDMAP CANVAS COMPONENT
// ============================================================================

interface MindmapCanvasProps {
  plan: Plan;
  objectives: ObjectiveWithKrs[];
  tasks: Task[];
  checkIns: CheckIn[];
  onNodeClick?: (nodeId: string, entityType: string, entityId: string) => void;
  className?: string;
}

export function MindmapCanvas({
  plan,
  objectives,
  tasks,
  checkIns,
  onNodeClick,
  className,
}: MindmapCanvasProps) {
  // Layout configuration
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [showMinimap, setShowMinimap] = useState(true);

  // Transform data to nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = transformOkrDataToMindmap({
      plan,
      objectives,
      tasks,
      checkIns,
      config: layoutConfig,
    });
    return { initialNodes: nodes, initialEdges: edges };
  }, [plan, objectives, tasks, checkIns, layoutConfig]);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle node click
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: MindmapNode) => {
      if (onNodeClick && node.data) {
        onNodeClick(node.id, node.data.type, node.data.entityId);
      }
    },
    [onNodeClick]
  );

  // Toggle quarters visibility
  const toggleQuarters = useCallback(() => {
    setLayoutConfig((prev) => ({
      ...prev,
      showQuarters: !prev.showQuarters,
    }));
  }, []);

  // Toggle tasks visibility
  const toggleTasks = useCallback(() => {
    setLayoutConfig((prev) => ({
      ...prev,
      showTasks: !prev.showTasks,
    }));
  }, []);

  // Minimap node color
  const minimapNodeColor = useCallback((node: MindmapNode) => {
    const colors = {
      plan: "#3b82f6",
      objective: "#6366f1",
      kr: "#8b5cf6",
      quarter: "#a78bfa",
      task: "#c4b5fd",
    };
    return colors[node.type as keyof typeof colors] || "#94a3b8";
  }, []);

  return (
    <div className={cn("w-full h-full relative", className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        {/* Background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-border-soft)"
        />

        {/* Controls */}
        <Controls
          showZoom={false}
          showFitView={false}
          showInteractive={false}
          className="!bg-bg-0 !border-border-soft !rounded-card !shadow-card"
        />

        {/* Custom Control Panel */}
        <Panel position="top-right" className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  onClick={toggleQuarters}
                  className={cn(!layoutConfig.showQuarters && "opacity-50")}
                >
                  <GitBranch className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {layoutConfig.showQuarters ? "Hide" : "Show"} Quarters
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  onClick={toggleTasks}
                  className={cn(!layoutConfig.showTasks && "opacity-50")}
                >
                  <ListTodo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {layoutConfig.showTasks ? "Hide" : "Show"} Tasks
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  onClick={() => setShowMinimap(!showMinimap)}
                >
                  {showMinimap ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showMinimap ? "Hide" : "Show"} Minimap
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Panel>

        {/* Minimap */}
        {showMinimap && (
          <MiniMap
            nodeColor={minimapNodeColor}
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="!bg-bg-0 !border-border-soft !rounded-card"
          />
        )}

        {/* Legend */}
        <Panel position="bottom-right" className="!mb-12">
          <div className="bg-bg-0 border border-border-soft rounded-card p-3 shadow-card text-xs">
            <div className="font-medium text-text-strong mb-2">Legend</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-status-success" />
                <span className="text-text-muted">Ahead</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-accent" />
                <span className="text-text-muted">On Track</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-status-warning" />
                <span className="text-text-muted">At Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-status-danger" />
                <span className="text-text-muted">Off Track</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
