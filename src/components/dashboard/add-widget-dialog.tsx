"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getWidgetsByCategory,
  type WidgetDefinition,
  type WidgetCategory,
} from "./widget-registry";
import { cn } from "@/lib/utils";

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWidget: (widgetType: string) => Promise<void>;
  existingWidgetTypes: string[];
}

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  overview: "Overview",
  analytics: "Analytics",
  activity: "Activity",
};

const CATEGORY_ORDER: WidgetCategory[] = ["overview", "analytics", "activity"];

export function AddWidgetDialog({
  open,
  onOpenChange,
  onAddWidget,
  existingWidgetTypes,
}: AddWidgetDialogProps) {
  const [isAdding, setIsAdding] = useState<string | null>(null);

  async function handleAddWidget(widget: WidgetDefinition) {
    setIsAdding(widget.type);
    try {
      await onAddWidget(widget.type);
      onOpenChange(false);
    } finally {
      setIsAdding(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget to add to your dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {CATEGORY_ORDER.map((category) => {
            const widgets = getWidgetsByCategory(category);
            if (widgets.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-small font-medium text-text-muted mb-3">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {widgets.map((widget) => {
                    const isExisting = existingWidgetTypes.includes(widget.type);
                    const isCurrentlyAdding = isAdding === widget.type;

                    return (
                      <button
                        key={widget.type}
                        onClick={() => handleAddWidget(widget)}
                        disabled={isAdding !== null}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-card border text-left transition-all",
                          isExisting
                            ? "border-border-soft bg-bg-1/30 opacity-60"
                            : "border-border-soft bg-bg-0 hover:border-border hover:shadow-card-hover",
                          isAdding !== null && "cursor-not-allowed"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-card flex items-center justify-center shrink-0",
                          isExisting ? "bg-bg-1" : "bg-accent/10"
                        )}>
                          {isCurrentlyAdding ? (
                            <Loader2 className="w-5 h-5 animate-spin text-accent" />
                          ) : (
                            <widget.icon className={cn(
                              "w-5 h-5",
                              isExisting ? "text-text-muted" : "text-accent"
                            )} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-body-sm text-text-strong">
                              {widget.name}
                            </p>
                            {isExisting && (
                              <span className="text-[10px] text-text-subtle bg-bg-1 px-1.5 py-0.5 rounded">
                                Added
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                            {widget.description}
                          </p>
                          <p className="text-[10px] text-text-subtle mt-1">
                            {widget.defaultWidth}×{widget.defaultHeight} grid
                          </p>
                        </div>
                        {!isExisting && (
                          <Plus className="w-4 h-4 text-text-muted shrink-0 mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
