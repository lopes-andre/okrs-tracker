"use client";

import { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { Target, ChevronDown, ChevronRight } from "lucide-react";
import { BaseNodeWrapper, PaceBadge, NodeProgressBar } from "./base-node";
import type { ObjectiveNodeData } from "../types";
import { NODE_DIMENSIONS } from "../types";
import { cn } from "@/lib/utils";

function ObjectiveNodeComponent({ data, selected }: NodeProps<ObjectiveNodeData>) {
  const hasChildren = (data.childCount ?? data.krsCount) > 0;
  
  return (
    <BaseNodeWrapper
      nodeType="objective"
      isSelected={selected}
      className="relative"
    >
      <div className="p-3" style={{ width: NODE_DIMENSIONS.objective.width }}>
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <div className="w-8 h-8 rounded-card bg-accent/5 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-medium text-text-muted bg-bg-1 px-1.5 py-0.5 rounded">
                {data.code}
              </span>
              <PaceBadge status={data.paceStatus} size="sm" />
            </div>
            <h4 className="font-heading font-medium text-small text-text-strong line-clamp-2">
              {data.label}
            </h4>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <NodeProgressBar progress={data.progress} paceStatus={data.paceStatus} />
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-text-muted">
              {data.krsCompleted}/{data.krsCount} KRs complete
            </span>
            <span className="font-medium text-text-strong">
              {Math.round(data.progress * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Collapse/Expand Indicator */}
      {hasChildren && (
        <div 
          className={cn(
            "absolute -bottom-3 left-1/2 -translate-x-1/2 z-10",
            "flex items-center gap-1 px-2 py-0.5",
            "bg-bg-0 border border-border-soft rounded-full",
            "cursor-pointer hover:bg-bg-1 transition-colors",
            "shadow-sm"
          )}
        >
          {data.isCollapsed ? (
            <>
              <ChevronRight className="w-3 h-3 text-text-muted" />
              <span className="text-[9px] text-text-muted font-medium">
                {data.childCount ?? data.krsCount}
              </span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 text-text-muted" />
              <span className="text-[9px] text-text-muted">
                {data.krsCount} KRs
              </span>
            </>
          )}
        </div>
      )}
    </BaseNodeWrapper>
  );
}

export const ObjectiveNode = memo(ObjectiveNodeComponent);
