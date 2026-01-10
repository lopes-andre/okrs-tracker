"use client";

import { GitBranch, Circle, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "./types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ViewModeSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

const VIEW_MODES: { value: ViewMode; label: string; description: string; icon: typeof GitBranch }[] = [
  {
    value: "tree",
    label: "Tree",
    description: "Hierarchical top-to-bottom layout",
    icon: GitBranch,
  },
  {
    value: "radial",
    label: "Radial",
    description: "Circular layout around the center",
    icon: Circle,
  },
  {
    value: "focus",
    label: "Focus",
    description: "Focus on selected node and its branch",
    icon: Target,
  },
];

export function ViewModeSwitcher({ value, onChange, className }: ViewModeSwitcherProps) {
  return (
    <TooltipProvider>
      <div className={cn(
        "inline-flex items-center rounded-card border border-border-soft bg-bg-0 p-0.5",
        className
      )}>
        {VIEW_MODES.map((mode) => (
          <Tooltip key={mode.value}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onChange(mode.value)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors",
                  value === mode.value
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-muted hover:text-text-strong hover:bg-bg-1"
                )}
              >
                <mode.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-medium">{mode.label}</p>
              <p className="text-xs text-text-muted">{mode.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
