"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  BackgroundVariant,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { PlanNode, ObjectiveNode, KrNode, QuarterNode, TaskNode } from "./nodes";
import { transformOkrDataToMindmap } from "./data-transformer";
import { NodeDetailPanel } from "./node-detail-panel";
import { ViewModeSwitcher } from "./view-mode-switcher";
import { FilterPanel, DEFAULT_FILTERS, nodePassesFilters, type MindmapFilters } from "./filter-panel";
import { ExportButton } from "./export-button";
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

// ============================================================================
// NODE TYPES REGISTRATION
// ============================================================================

// Use 'any' to bypass React Flow's strict generic node type requirements
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: NodeTypes = {
  plan: PlanNode as any,
  objective: ObjectiveNode as any,
  kr: KrNode as any,
  quarter: QuarterNode as any,
  task: TaskNode as any,
};

const defaultEdgeOptions = {
  style: {
    strokeWidth: 2,
    stroke: "var(--color-border-medium)",
  },
  type: "smoothstep",
};

// ============================================================================
// MINDMAP CANVAS INNER
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
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  
  // State
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MindmapNodeData | null>(null);
  const [useSavedLayout, setUseSavedLayout] = useState(true);
  const [filters, setFilters] = useState<MindmapFilters>(DEFAULT_FILTERS);
  
  // Refs
  const flowRef = useRef<HTMLDivElement>(null);
  const initialFitDone = useRef(false);
  
  // Persistence - only load data, don't trigger updates
  const { savedPositions, hasSavedLayout, saveLayout, isSaving } = usePersistence({ planId: plan.id });

  // Transform OKR data to mindmap nodes/edges
  const baseData = useMemo(() => {
    return transformOkrDataToMindmap({
      plan,
      objectives,
      tasks,
      checkIns,
      config: layoutConfig,
      viewMode,
      focusNodeId: focusNodeId || undefined,
    });
  }, [plan, objectives, tasks, checkIns, layoutConfig, viewMode, focusNodeId]);

  // Apply saved positions in tree mode only
  const positionedNodes = useMemo(() => {
    if (useSavedLayout && hasSavedLayout && viewMode === "tree") {
      return applySavedPositions(baseData.nodes, savedPositions);
    }
    return baseData.nodes;
  }, [baseData.nodes, savedPositions, hasSavedLayout, useSavedLayout, viewMode]);

  // Collapse/expand management
  const {
    toggleCollapse,
    collapseAll,
    expandAll,
    visibleNodes: collapsedNodes,
    visibleEdges: collapsedEdges,
    collapsedNodeIds,
  } = useCollapse({ nodes: positionedNodes, edges: baseData.edges });

  // Apply filters
  const displayData = useMemo(() => {
    const filteredNodes = collapsedNodes.filter((node) => {
      const data = node.data as MindmapNodeData;
      if (data.type === "plan") return true;
      return nodePassesFilters(data.progress, data.paceStatus, filters);
    });
    
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = collapsedEdges.filter(
      (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)
    );
    
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [collapsedNodes, collapsedEdges, filters]);

  // Local state for React Flow (allows dragging)
  const [nodes, setNodes] = useState<MindmapNode[]>(displayData.nodes);
  const [edges, setEdges] = useState<MindmapEdge[]>(displayData.edges);

  // Sync display data to local state when it changes
  const prevDisplayRef = useRef(displayData);
  useEffect(() => {
    if (prevDisplayRef.current !== displayData) {
      setNodes(displayData.nodes);
      setEdges(displayData.edges);
      prevDisplayRef.current = displayData;
    }
  }, [displayData]);

  // Handle node changes (dragging)
  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds as unknown as Node[]) as unknown as MindmapNode[]);
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds) as MindmapEdge[]);
  }, []);

  // Handle node drag end - save positions
  const handleNodeDragStop = useCallback(() => {
    // Debounced save could be added here
  }, []);

  // Handle node click
  const handleNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      const hasChildren = baseData.edges.some((e) => e.source === node.id);
      const nodeData = node.data as unknown as MindmapNodeData;
      
      if (hasChildren && nodeData) {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        const clickY = event.clientY - rect.top;
        if (clickY > rect.height * 0.8) {
          toggleCollapse(node.id);
          return;
        }
      }
      
      if (nodeData) {
        setSelectedNode(nodeData);
      }
    },
    [baseData.edges, toggleCollapse]
  );

  // Handle node double-click
  const handleNodeDoubleClick: NodeMouseHandler = useCallback(
    (event, node) => {
      if (viewMode === "focus") {
        setFocusNodeId(node.id);
        return;
      }
      
      const hasChildren = baseData.edges.some((e) => e.source === node.id);
      if (hasChildren) {
        toggleCollapse(node.id);
      }
    },
    [baseData.edges, toggleCollapse, viewMode]
  );

  // Fit view on initial load
  useEffect(() => {
    if (!initialFitDone.current && nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
        initialFitDone.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, fitView]);

  // Minimap color
  const minimapNodeColor = useCallback((node: Node) => {
    const colors: Record<string, string> = {
      plan: "#3b82f6",
      objective: "#6366f1",
      kr: "#8b5cf6",
      quarter: "#a78bfa",
      task: "#c4b5fd",
    };
    return colors[node.type || ""] || "#94a3b8";
  }, []);

  const getFlowElement = useCallback(
    () => flowRef.current?.querySelector(".react-flow") as HTMLElement | null,
    []
  );

  return (
    <div ref={flowRef} className={cn("w-full h-full relative", className)}>
      <ReactFlow
        nodes={nodes as unknown as Node[]}
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
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        nodesDraggable={true}
        panOnScroll
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--color-border-soft)" />
        <Controls showZoom={false} showFitView={false} showInteractive={false} className="!bg-bg-0 !border-border-soft !rounded-card !shadow-card" />

        {/* Top Left: Filters and Export */}
        <Panel position="top-left" className="flex items-center gap-2">
          <FilterPanel filters={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />
          <ExportButton getFlowElement={getFlowElement} fileName={`mindmap-${plan.name.toLowerCase().replace(/\s+/g, "-")}`} />
        </Panel>

        {/* Top Right: Controls */}
        <Panel position="top-right" className="flex items-center gap-2">
          <ViewModeSwitcher value={viewMode} onChange={setViewMode} />
          
          <div className="flex items-center gap-1 ml-2">
            <Button variant="secondary" size="icon-sm" onClick={() => zoomOut()} title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon-sm" onClick={() => zoomIn()} title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon-sm" onClick={() => fitView({ padding: 0.2, duration: 300 })} title="Fit View">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 border-l border-border-soft pl-2">
            <Button variant="secondary" size="icon-sm" onClick={collapseAll} title="Collapse All">
              <Shrink className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon-sm" onClick={expandAll} title="Expand All">
              <Expand className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 border-l border-border-soft pl-2">
            <Button variant="secondary" size="icon-sm" onClick={() => saveLayout()} disabled={isSaving} title="Save Layout">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
            <Button variant="secondary" size="icon-sm" onClick={() => { setUseSavedLayout(false); setTimeout(() => setUseSavedLayout(true), 100); }} title="Reset Layout">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 border-l border-border-soft pl-2">
            <Button variant="secondary" size="icon-sm" onClick={() => setLayoutConfig(c => ({ ...c, showQuarters: !c.showQuarters }))} className={cn(!layoutConfig.showQuarters && "opacity-50")} title="Toggle Quarters">
              <GitBranch className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon-sm" onClick={() => setLayoutConfig(c => ({ ...c, showTasks: !c.showTasks }))} className={cn(!layoutConfig.showTasks && "opacity-50")} title="Toggle Tasks">
              <ListTodo className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon-sm" onClick={() => setShowMinimap(!showMinimap)} title="Toggle Minimap">
              {showMinimap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </Panel>

        {showMinimap && <MiniMap nodeColor={minimapNodeColor} nodeStrokeWidth={3} zoomable pannable className="!bg-bg-0 !border-border-soft !rounded-card" />}

        {/* Legend */}
        <Panel position="bottom-right" className="!mb-12">
          <div className="bg-bg-0 border border-border-soft rounded-card p-3 shadow-card text-xs">
            <div className="font-medium text-text-strong mb-2">Legend</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-status-success" /><span className="text-text-muted">Ahead</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-accent" /><span className="text-text-muted">On Track</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-status-warning" /><span className="text-text-muted">At Risk</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-status-danger" /><span className="text-text-muted">Off Track</span></div>
            </div>
          </div>
        </Panel>

        {/* Status */}
        <Panel position="bottom-left" className="!mb-12 flex flex-col gap-2">
          {collapsedNodes.length !== displayData.nodes.length && (
            <div className="bg-bg-0 border border-status-warning/30 rounded-card px-3 py-2 shadow-card text-xs">
              <span className="text-status-warning">Showing {displayData.nodes.length} of {collapsedNodes.length} nodes</span>
            </div>
          )}
          {collapsedNodeIds.size > 0 && (
            <div className="bg-bg-0 border border-border-soft rounded-card px-3 py-2 shadow-card text-xs">
              <span className="text-text-muted">{collapsedNodeIds.size} collapsed</span>
            </div>
          )}
          {hasSavedLayout && viewMode === "tree" && (
            <div className="bg-bg-0 border border-accent/30 rounded-card px-3 py-2 shadow-card text-xs">
              <span className="text-accent">✓ Layout saved</span>
            </div>
          )}
        </Panel>
      </ReactFlow>

      <NodeDetailPanel nodeData={selectedNode} onClose={() => setSelectedNode(null)} onNavigate={onNodeNavigate} />
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

export function MindmapCanvas({ plan, objectives, tasks, checkIns, onNodeClick, className }: MindmapCanvasProps) {
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
