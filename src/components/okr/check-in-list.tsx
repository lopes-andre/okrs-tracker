"use client";

import {
  TrendingUp,
  TrendingDown,
  Link as LinkIcon,
  Calendar,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CheckInWithDetails } from "@/lib/supabase/types";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface CheckInListProps {
  checkIns: CheckInWithDetails[];
  showKrName?: boolean;
  compact?: boolean;
}

export function CheckInList({ checkIns, showKrName = false, compact = false }: CheckInListProps) {
  if (checkIns.length === 0) {
    return (
      <div className="py-8 text-center">
        <TrendingUp className="w-8 h-8 mx-auto mb-2 text-text-subtle" />
        <p className="text-body-sm text-text-muted">No check-ins yet</p>
        <p className="text-small text-text-subtle">Record progress to see history here</p>
      </div>
    );
  }

  return (
    <div className={cn("divide-y divide-border-soft", compact ? "space-y-0" : "space-y-0")}>
      {checkIns.map((checkIn) => {
        const delta = checkIn.previous_value !== null 
          ? checkIn.value - checkIn.previous_value 
          : null;
        const isPositive = delta !== null && delta > 0;
        const isNegative = delta !== null && delta < 0;

        return (
          <div 
            key={checkIn.id} 
            className={cn(
              "flex items-start gap-3",
              compact ? "py-2.5" : "py-4"
            )}
          >
            {/* Delta Indicator */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              isPositive && "bg-status-success/10 text-status-success",
              isNegative && "bg-status-danger/10 text-status-danger",
              !isPositive && !isNegative && "bg-bg-1 text-text-muted"
            )}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : isNegative ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Value Change */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-body-sm font-medium text-text-strong">
                  {checkIn.value.toLocaleString()}
                </span>
                {delta !== null && (
                  <Badge 
                    variant={isPositive ? "success" : isNegative ? "danger" : "outline"}
                    className="text-xs"
                  >
                    {isPositive ? "+" : ""}{delta.toLocaleString()}
                  </Badge>
                )}
                {checkIn.previous_value !== null && (
                  <span className="text-small text-text-subtle">
                    from {checkIn.previous_value.toLocaleString()}
                  </span>
                )}
              </div>

              {/* KR Name (if showing) */}
              {showKrName && checkIn.annual_kr && (
                <p className="text-small text-text-muted mt-0.5 truncate">
                  {checkIn.annual_kr.name}
                </p>
              )}

              {/* Note */}
              {checkIn.note && (
                <p className="text-small text-text-muted mt-1 flex items-start gap-1.5">
                  <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{checkIn.note}</span>
                </p>
              )}

              {/* Evidence URL */}
              {checkIn.evidence_url && (
                <a 
                  href={checkIn.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-small text-accent hover:underline mt-1 flex items-center gap-1.5"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  View evidence
                </a>
              )}

              {/* Meta */}
              <div className="flex items-center gap-3 mt-2 text-small text-text-subtle">
                {/* User */}
                {checkIn.recorded_by_user && (
                  <span className="flex items-center gap-1.5">
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={checkIn.recorded_by_user.avatar_url || ""} />
                      <AvatarFallback className="text-[8px]">
                        {checkIn.recorded_by_user.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {checkIn.recorded_by_user.full_name || "Unknown"}
                  </span>
                )}

                {/* Date */}
                <span 
                  className="flex items-center gap-1"
                  title={format(new Date(checkIn.recorded_at), "PPpp")}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDistanceToNow(new Date(checkIn.recorded_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
