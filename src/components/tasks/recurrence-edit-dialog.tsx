"use client";

import { useState } from "react";
import { Repeat, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type RecurrenceEditScope = "this" | "future" | "all";

interface RecurrenceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "edit" | "delete";
  onConfirm: (scope: RecurrenceEditScope) => void;
  isLoading?: boolean;
}

const scopeOptions: {
  value: RecurrenceEditScope;
  label: string;
  description: string;
}[] = [
  {
    value: "this",
    label: "Only this task",
    description: "Changes will only affect this single occurrence",
  },
  {
    value: "future",
    label: "This and future tasks",
    description: "Changes will affect this and all future occurrences",
  },
  {
    value: "all",
    label: "All tasks in series",
    description: "Changes will affect all occurrences, past and future",
  },
];

export function RecurrenceEditDialog({
  open,
  onOpenChange,
  action,
  onConfirm,
  isLoading = false,
}: RecurrenceEditDialogProps) {
  const [selectedScope, setSelectedScope] = useState<RecurrenceEditScope>("this");

  const isDelete = action === "delete";

  function handleConfirm() {
    onConfirm(selectedScope);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Repeat className="w-5 h-5 text-accent" />
            {isDelete ? "Delete Recurring Task" : "Edit Recurring Task"}
          </DialogTitle>
          <DialogDescription>
            This task is part of a recurring series. How would you like to{" "}
            {isDelete ? "delete" : "edit"} it?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {scopeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedScope(option.value)}
              className={cn(
                "w-full p-3 rounded-card border text-left transition-all",
                selectedScope === option.value
                  ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                  : "border-border-soft hover:border-border hover:bg-bg-1/50"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    selectedScope === option.value
                      ? "border-accent"
                      : "border-border"
                  )}
                >
                  {selectedScope === option.value && (
                    <div className="w-2 h-2 rounded-full bg-accent" />
                  )}
                </div>
                <div>
                  <Label className="font-medium text-text-strong cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-xs text-text-muted mt-0.5">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {isDelete && selectedScope === "all" && (
          <div className="flex items-start gap-2 p-3 rounded-card bg-status-danger/10 border border-status-danger/20">
            <AlertCircle className="w-4 h-4 text-status-danger shrink-0 mt-0.5" />
            <p className="text-xs text-status-danger">
              This will permanently delete all tasks in this recurring series.
              This action cannot be undone.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isDelete ? "danger" : "default"}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              "Processing..."
            ) : isDelete ? (
              "Delete"
            ) : (
              "Continue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
