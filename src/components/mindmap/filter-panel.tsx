"use client";

import { useState } from "react";
import { Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PaceStatus } from "@/lib/progress-engine";

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface MindmapFilters {
  paceStatuses: Set<PaceStatus>;
  minProgress: number;
  maxProgress: number;
  showCompleted: boolean;
}

export const DEFAULT_FILTERS: MindmapFilters = {
  paceStatuses: new Set(["ahead", "on_track", "at_risk", "off_track"]),
  minProgress: 0,
  maxProgress: 100,
  showCompleted: true,
};

// ============================================================================
// FILTER PANEL COMPONENT
// ============================================================================

interface FilterPanelProps {
  filters: MindmapFilters;
  onChange: (filters: MindmapFilters) => void;
  onReset: () => void;
  className?: string;
}

export function FilterPanel({ filters, onChange, onReset, className }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters =
    filters.paceStatuses.size < 4 ||
    filters.minProgress > 0 ||
    filters.maxProgress < 100 ||
    !filters.showCompleted;

  const togglePaceStatus = (status: PaceStatus) => {
    const newStatuses = new Set(filters.paceStatuses);
    if (newStatuses.has(status)) {
      // Don't allow removing all statuses
      if (newStatuses.size > 1) {
        newStatuses.delete(status);
      }
    } else {
      newStatuses.add(status);
    }
    onChange({ ...filters, paceStatuses: newStatuses });
  };

  const PACE_STATUS_CONFIG: { value: PaceStatus; label: string; color: string }[] = [
    { value: "ahead", label: "Ahead", color: "bg-status-success" },
    { value: "on_track", label: "On Track", color: "bg-accent" },
    { value: "at_risk", label: "At Risk", color: "bg-status-warning" },
    { value: "off_track", label: "Off Track", color: "bg-status-danger" },
  ];

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "gap-2",
          hasActiveFilters && "border-accent text-accent"
        )}
      >
        <Filter className="w-4 h-4" />
        <span className="hidden sm:inline">Filters</span>
        {hasActiveFilters && (
          <span className="w-2 h-2 rounded-full bg-accent" />
        )}
        {isOpen ? (
          <ChevronUp className="w-3 h-3 ml-1" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-1" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-bg-0 border border-border-soft rounded-card shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border-soft">
            <span className="font-medium text-small text-text-strong">Filters</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-3 space-y-4">
            {/* Pace Status */}
            <div>
              <Label className="text-xs text-text-muted mb-2 block">
                Pace Status
              </Label>
              <div className="flex flex-wrap gap-2">
                {PACE_STATUS_CONFIG.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => togglePaceStatus(status.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
                      filters.paceStatuses.has(status.value)
                        ? "bg-bg-1 border-border-medium text-text-strong"
                        : "bg-bg-0 border-border-soft text-text-muted opacity-50"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full", status.color)} />
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress Range */}
            <div>
              <Label className="text-xs text-text-muted mb-2 block">
                Progress Range
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={filters.minProgress}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      minProgress: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
                    })
                  }
                  className="w-16 px-2 py-1 text-xs rounded border border-border-soft bg-bg-1 text-text-strong focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <span className="text-xs text-text-muted">to</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={filters.maxProgress}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      maxProgress: Math.max(0, Math.min(100, parseInt(e.target.value) || 100)),
                    })
                  }
                  className="w-16 px-2 py-1 text-xs rounded border border-border-soft bg-bg-1 text-text-strong focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <span className="text-xs text-text-muted">%</span>
              </div>
            </div>

            {/* Show Completed */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="showCompleted"
                checked={filters.showCompleted}
                onCheckedChange={(checked) =>
                  onChange({ ...filters, showCompleted: !!checked })
                }
              />
              <Label htmlFor="showCompleted" className="text-xs text-text-muted cursor-pointer">
                Show 100% completed items
              </Label>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border-soft">
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="w-full text-xs"
              disabled={!hasActiveFilters}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FILTER HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a node passes the current filters
 */
export function nodePassesFilters(
  progress: number,
  paceStatus: PaceStatus,
  filters: MindmapFilters
): boolean {
  // Check pace status
  if (!filters.paceStatuses.has(paceStatus)) {
    return false;
  }

  // Check progress range
  const progressPercent = progress * 100;
  if (progressPercent < filters.minProgress || progressPercent > filters.maxProgress) {
    return false;
  }

  // Check completed filter
  if (!filters.showCompleted && progress >= 1) {
    return false;
  }

  return true;
}
