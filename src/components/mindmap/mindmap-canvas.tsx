"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type OnNodesChange,
  type NodeDragHandler,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { PlanNode, ObjectiveNode, KrNode, QuarterNode, TaskNode } from "./nodes";
import { transformOkrDataToMindmap } from "./data-transformer";
import { NodeDetailPanel } from "./node-detail-panel";
import { ViewModeSwitcher } from "./view-mode-switcher";
import { useCollapse } from "./hooks/use-collapse";
import { usePersistence, applySavedPositions } from "./hooks/use-persistence";
import type { LayoutConfig, MindmapNode, MindmapEdge, MindmapNodeData, ViewMode } from "./types";
import { DEFAULT_LAYOUT_CONFIG } from "./types";
import type { Plan, ObjectiveWithKrs, Task, CheckIn } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  Eye,
  EyeOff,
  ListTodo,
  Expand,
  Shrink,
  Save,
  RotateCcw,
  Loader2,
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
// MINDMAP CANVAS INNER (requires ReactFlowProvider)
// ============================================================================

interface MindmapCanvasInnerProps {
  plan: Plan;
  objectives: ObjectiveWithKrs[];
  tasks: Task[];
  checkIns: CheckIn[];
  onNodeNavigate?: (entityType: string, entityId: string) => void;
  className?: string;
}

function MindmapCanvasInner({
  plan,
  objectives,
  tasks,
  checkIns,
  onNodeNavigate,
  className,
}: MindmapCanvasInnerProps) {
  const { fitView, zoomIn, zoomOut, getNodes, getViewport } = useReactFlow();
  
  // Layout configuration
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MindmapNodeData | null>(null);
  const [useSavedLayout, setUseSavedLayout] = useState(true);
  
  // Persistence
  const {
    savedPositions,
    hasSavedLayout,
    saveLayout,
    isSaving,
    isLoading: isPersistenceLoading,
  } = usePersistence({ planId: plan.id });

  // Auto-save timeout ref
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPositionsChanged = useRef(false);

  // Transform data to nodes and edges
  const { allNodes, allEdges } = useMemo(() => {
    const { nodes, edges } = transformOkrDataToMindmap({
      plan,
      objectives,
      tasks,
      checkIns,
      config: layoutConfig,
      viewMode,
      focusNodeId: focusNodeId || undefined,
    });

    // Apply saved positions if available, enabled, and in tree mode
    // (Don't apply saved positions in radial/focus modes as they use dynamic layouts)
    const positionedNodes = useSavedLayout && hasSavedLayout && viewMode === "tree"
      ? applySavedPositions(nodes, savedPositions)
      : nodes;

    return { allNodes: positionedNodes, allEdges: edges };
  }, [plan, objectives, tasks, checkIns, layoutConfig, viewMode, focusNodeId, savedPositions, hasSavedLayout, useSavedLayout]);

  // Collapse/expand management
  const {
    toggleCollapse,
    collapseAll,
    expandAll,
    visibleNodes,
    visibleEdges,
    collapsedNodeIds,
  } = useCollapse({ nodes: allNodes, edges: allEdges });

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(visibleNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(visibleEdges);

  // Update nodes when visibility changes
  useEffect(() => {
    setNodes(visibleNodes);
    setEdges(visibleEdges);
  }, [visibleNodes, visibleEdges, setNodes, setEdges]);

  // Schedule auto-save after position changes
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (hasPositionsChanged.current) {
        saveLayout();
        hasPositionsChanged.current = false;
      }
    }, 2000); // Auto-save 2 seconds after last drag
  }, [saveLayout]);

  // Handle node drag end - schedule auto-save
  const handleNodeDragStop: NodeDragHandler = useCallback((event, node, nodes) => {
    hasPositionsChanged.current = true;
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Handle node click - double click to toggle collapse, single click to select
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: MindmapNode) => {
      // Check if node has children (can be collapsed)
      const hasChildren = allEdges.some((e) => e.source === node.id);
      
      if (hasChildren && node.data) {
        // If clicking the expand button area (bottom of node), toggle collapse
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        const clickY = event.clientY - rect.top;
        const nodeHeight = rect.height;
        
        // If click is in bottom 20% of node, toggle collapse
        if (clickY > nodeHeight * 0.8) {
          toggleCollapse(node.id);
          return;
        }
      }
      
      // Otherwise, select the node
      if (node.data) {
        setSelectedNode(node.data);
      }
    },
    [allEdges, toggleCollapse]
  );

  // Handle node double-click for collapse/expand or focus
  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: MindmapNode) => {
      // In focus mode, double-click focuses on the clicked node
      if (viewMode === "focus") {
        setFocusNodeId(node.id);
        return;
      }
      
      // In other modes, toggle collapse if node has children
      const hasChildren = allEdges.some((e) => e.source === node.id);
      if (hasChildren) {
        toggleCollapse(node.id);
      }
    },
    [allEdges, toggleCollapse, viewMode]
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

  // Reset to auto-layout
  const resetLayout = useCallback(() => {
    setUseSavedLayout(false);
    // Re-enable saved layout on next save
    setTimeout(() => setUseSavedLayout(true), 100);
  }, []);

  // Manual save
  const handleManualSave = useCallback(() => {
    saveLayout();
  }, [saveLayout]);

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

  // Close detail panel
  const handleCloseDetailPanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle navigation from detail panel
  const handleNavigate = useCallback(
    (entityType: string, entityId: string) => {
      if (onNodeNavigate) {
        onNodeNavigate(entityType, entityId);
      }
    },
    [onNodeNavigate]
  );

  // Refit view on layout change
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 100);
    return () => clearTimeout(timer);
  }, [visibleNodes.length, fitView]);

  return (
    <div className={cn("w-full h-full relative", className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        nodesDraggable={true}
        panOnScroll
        selectionOnDrag={false}
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
          {/* View Mode Switcher */}
          <ViewModeSwitcher value={viewMode} onChange={setViewMode} />
          
          <TooltipProvider>
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 ml-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon-sm" onClick={() => zoomOut()}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon-sm" onClick={() => zoomIn()}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="icon-sm" 
                    onClick={() => fitView({ padding: 0.2, duration: 300 })}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fit View</TooltipContent>
              </Tooltip>
            </div>

            {/* Collapse/Expand */}
            <div className="flex items-center gap-1 mr-2 border-l border-border-soft pl-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon-sm" onClick={collapseAll}>
                    <Shrink className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Collapse All</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon-sm" onClick={expandAll}>
                    <Expand className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Expand All</TooltipContent>
              </Tooltip>
            </div>

            {/* Layout Controls */}
            <div className="flex items-center gap-1 mr-2 border-l border-border-soft pl-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="icon-sm" 
                    onClick={handleManualSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save Layout</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon-sm" onClick={resetLayout}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset to Auto-Layout</TooltipContent>
              </Tooltip>
            </div>

            {/* Visibility Toggles */}
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
            <div className="border-t border-border-soft mt-2 pt-2 text-[10px] text-text-subtle">
              {viewMode === "tree" && "Drag nodes • Double-click to collapse"}
              {viewMode === "radial" && "Double-click to collapse"}
              {viewMode === "focus" && "Double-click to focus on branch"}
            </div>
          </div>
        </Panel>

        {/* Status indicators */}
        <Panel position="bottom-left" className="!mb-12 flex flex-col gap-2">
          {/* Collapsed count */}
          {collapsedNodeIds.size > 0 && (
            <div className="bg-bg-0 border border-border-soft rounded-card px-3 py-2 shadow-card text-xs">
              <span className="text-text-muted">
                {collapsedNodeIds.size} branch{collapsedNodeIds.size > 1 ? "es" : ""} collapsed
              </span>
            </div>
          )}
          
          {/* Saved layout indicator */}
          {hasSavedLayout && (
            <div className="bg-bg-0 border border-accent/30 rounded-card px-3 py-2 shadow-card text-xs">
              <span className="text-accent">✓ Custom layout saved</span>
            </div>
          )}
        </Panel>
      </ReactFlow>

      {/* Node Detail Panel */}
      <NodeDetailPanel
        nodeData={selectedNode}
        onClose={handleCloseDetailPanel}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

// ============================================================================
// MINDMAP CANVAS (with Provider)
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
  const handleNodeNavigate = useCallback(
    (entityType: string, entityId: string) => {
      if (onNodeClick) {
        onNodeClick(`${entityType}-${entityId}`, entityType, entityId);
      }
    },
    [onNodeClick]
  );

  return (
    <ReactFlowProvider>
      <MindmapCanvasInner
        plan={plan}
        objectives={objectives}
        tasks={tasks}
        checkIns={checkIns}
        onNodeNavigate={handleNodeNavigate}
        className={className}
      />
    </ReactFlowProvider>
  );
}
