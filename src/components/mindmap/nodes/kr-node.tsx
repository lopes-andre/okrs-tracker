"use client";

import { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import {
  TrendingUp,
  Hash,
  CheckCircle2,
  Percent,
  Calculator,
  ToggleLeft,
} from "lucide-react";
import { BaseNodeWrapper, PaceBadge, NodeProgressBar } from "./base-node";
import type { KrNodeData } from "../types";
import { NODE_DIMENSIONS } from "../types";
import { cn } from "@/lib/utils";

const KR_TYPE_ICONS = {
  metric: TrendingUp,
  count: Hash,
  milestone: CheckCircle2,
  rate: Percent,
  average: Calculator,
  boolean: ToggleLeft,
};

function KrNodeComponent({ data, selected }: NodeProps<KrNodeData>) {
  const Icon = KR_TYPE_ICONS[data.krType] || TrendingUp;

  const formatValue = (value: number) => {
    if (data.krType === "milestone" || data.krType === "boolean") {
      return value >= 1 ? "Done" : "Pending";
    }
    return value.toLocaleString();
  };

  return (
    <BaseNodeWrapper
      nodeType="kr"
      isSelected={selected}
      className="relative"
      style={{ width: NODE_DIMENSIONS.kr.width }}
    >
      <div className="p-2.5">
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <div
            className={cn(
              "w-6 h-6 rounded flex items-center justify-center shrink-0",
              data.paceStatus === "ahead" && "bg-status-success/10 text-status-success",
              data.paceStatus === "on_track" && "bg-accent/10 text-accent",
              data.paceStatus === "at_risk" && "bg-status-warning/10 text-status-warning",
              data.paceStatus === "off_track" && "bg-status-danger/10 text-status-danger"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="font-medium text-xs text-text-strong line-clamp-2 leading-tight">
              {data.label}
            </h5>
          </div>
        </div>

        {/* Progress */}
        <NodeProgressBar progress={data.progress} paceStatus={data.paceStatus} size="sm" />

        {/* Stats Row */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-text-muted">
            {formatValue(data.currentValue)}
            {data.unit && ` ${data.unit}`}
            {data.krType !== "milestone" && data.krType !== "boolean" && (
              <span className="text-text-subtle">
                {" / "}
                {formatValue(data.targetValue)}
              </span>
            )}
          </span>
          <PaceBadge status={data.paceStatus} size="sm" />
        </div>
      </div>

      {/* Quarter targets indicator */}
      {data.quarterTargetsCount > 0 && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10">
          <span className="text-[8px] px-1.5 py-0.5 bg-bg-0 border border-border-soft rounded-full text-text-muted">
            Q1-Q4
          </span>
        </div>
      )}
    </BaseNodeWrapper>
  );
}

export const KrNode = memo(KrNodeComponent);
