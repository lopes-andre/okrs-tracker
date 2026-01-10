"use client";

import { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { Bullseye, Crosshair } from "lucide-react";
import { BaseNodeWrapper, PaceBadge, NodeProgressBar, ExpandButton } from "./base-node";
import type { ObjectiveNodeData } from "../types";
import { NODE_DIMENSIONS } from "../types";

interface ObjectiveNodeProps extends NodeProps<ObjectiveNodeData> {
  onToggleCollapse?: () => void;
}

function ObjectiveNodeComponent({ data, selected }: ObjectiveNodeProps) {
  return (
    <BaseNodeWrapper
      nodeType="objective"
      isSelected={selected}
      className="relative"
      style={{ width: NODE_DIMENSIONS.objective.width }}
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <div className="w-8 h-8 rounded-card bg-accent/5 flex items-center justify-center shrink-0">
            <Bullseye className="w-4 h-4 text-accent" />
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

      {/* Expand/Collapse button */}
      {data.krsCount > 0 && !data.isCollapsed && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10">
          <span className="text-[9px] px-2 py-0.5 bg-bg-0 border border-border-soft rounded-full text-text-muted">
            {data.krsCount} KRs
          </span>
        </div>
      )}
    </BaseNodeWrapper>
  );
}

export const ObjectiveNode = memo(ObjectiveNodeComponent);
