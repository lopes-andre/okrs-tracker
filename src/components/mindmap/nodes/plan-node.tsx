"use client";

import { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { Target, LayoutGrid, Crosshair } from "lucide-react";
import { BaseNodeWrapper, PaceBadge, NodeProgressBar } from "./base-node";
import type { PlanNodeData } from "../types";
import { NODE_DIMENSIONS } from "../types";

function PlanNodeComponent({ data, selected }: NodeProps<PlanNodeData>) {
  return (
    <BaseNodeWrapper
      nodeType="plan"
      isSelected={selected}
      showTargetHandle={false}
      className="relative"
      style={{ width: NODE_DIMENSIONS.plan.width }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-card bg-accent/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-body text-text-strong truncate">
              {data.label}
            </h3>
            <p className="text-xs text-text-muted">{data.year} Plan</p>
          </div>
          <PaceBadge status={data.paceStatus} size="sm" />
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Overall Progress</span>
            <span className="font-medium text-text-strong">
              {Math.round(data.progress * 100)}%
            </span>
          </div>
          <NodeProgressBar progress={data.progress} paceStatus={data.paceStatus} size="md" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border-soft">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <LayoutGrid className="w-3 h-3" />
            <span>{data.objectivesCount} Objectives</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Crosshair className="w-3 h-3" />
            <span>{data.krsCount} KRs</span>
          </div>
        </div>
      </div>
    </BaseNodeWrapper>
  );
}

export const PlanNode = memo(PlanNodeComponent);
