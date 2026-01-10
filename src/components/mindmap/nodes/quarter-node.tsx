"use client";

import { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { Calendar } from "lucide-react";
import { BaseNodeWrapper, NodeProgressBar } from "./base-node";
import type { QuarterNodeData } from "../types";
import { NODE_DIMENSIONS } from "../types";
import { cn } from "@/lib/utils";

function QuarterNodeComponent({ data, selected }: NodeProps<QuarterNodeData>) {
  const statusStyles = {
    upcoming: "bg-bg-1/50 border-border-soft text-text-muted",
    active: "bg-accent/5 border-accent/30 text-text-strong",
    completed: "bg-status-success/5 border-status-success/30 text-status-success",
    failed: "bg-status-danger/5 border-status-danger/30 text-status-danger",
  };

  const quarterLabel = `Q${data.quarter}`;

  return (
    <BaseNodeWrapper
      nodeType="quarter"
      isSelected={selected}
      className={cn("relative", statusStyles[data.status])}
      style={{ width: NODE_DIMENSIONS.quarter.width }}
    >
      <div className="p-2 text-center">
        {/* Quarter Badge */}
        <div className="flex items-center justify-center gap-1 mb-1">
          <span
            className={cn(
              "text-sm font-bold",
              data.status === "active" && "text-accent",
              data.status === "completed" && "text-status-success",
              data.status === "failed" && "text-status-danger",
              data.status === "upcoming" && "text-text-muted"
            )}
          >
            {quarterLabel}
          </span>
          {data.status === "active" && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
          )}
        </div>

        {/* Progress */}
        {data.status !== "upcoming" && (
          <>
            <NodeProgressBar progress={data.progress} paceStatus={data.paceStatus} size="sm" />
            <span className="text-[9px] mt-1 block">
              {Math.round(data.progress * 100)}%
            </span>
          </>
        )}

        {data.status === "upcoming" && (
          <span className="text-[9px] text-text-subtle">Upcoming</span>
        )}
      </div>
    </BaseNodeWrapper>
  );
}

export const QuarterNode = memo(QuarterNodeComponent);
