"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AnnualKr, QuarterTarget } from "@/lib/supabase/types";

interface QuarterTargetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kr: AnnualKr;
  quarterTargets: QuarterTarget[];
  onSubmit: (targets: { quarter: 1 | 2 | 3 | 4; target_value: number; notes?: string }[]) => Promise<void>;
}

type QuarterData = {
  target_value: string;
  notes: string;
};

export function QuarterTargetsDialog({
  open,
  onOpenChange,
  kr,
  quarterTargets,
  onSubmit,
}: QuarterTargetsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for each quarter
  const [quarters, setQuarters] = useState<Record<1 | 2 | 3 | 4, QuarterData>>({
    1: { target_value: "", notes: "" },
    2: { target_value: "", notes: "" },
    3: { target_value: "", notes: "" },
    4: { target_value: "", notes: "" },
  });

  // Initialize from existing targets
  useEffect(() => {
    if (open) {
      const targetMap = new Map(quarterTargets.map((t) => [t.quarter, t]));
      setQuarters({
        1: {
          target_value: targetMap.get(1)?.target_value?.toString() || "",
          notes: targetMap.get(1)?.notes || "",
        },
        2: {
          target_value: targetMap.get(2)?.target_value?.toString() || "",
          notes: targetMap.get(2)?.notes || "",
        },
        3: {
          target_value: targetMap.get(3)?.target_value?.toString() || "",
          notes: targetMap.get(3)?.notes || "",
        },
        4: {
          target_value: targetMap.get(4)?.target_value?.toString() || "",
          notes: targetMap.get(4)?.notes || "",
        },
      });
    }
  }, [open, quarterTargets]);

  // Update a quarter's data
  function updateQuarter(q: 1 | 2 | 3 | 4, field: keyof QuarterData, value: string) {
    setQuarters((prev) => ({
      ...prev,
      [q]: { ...prev[q], [field]: value },
    }));
  }

  // Auto-distribute target evenly across quarters
  function autoDistribute() {
    const annualTarget = kr.target_value - kr.start_value;
    const perQuarter = annualTarget / 4;

    if (kr.aggregation === "cumulative") {
      // Cumulative: each quarter adds to the total
      setQuarters({
        1: { ...quarters[1], target_value: (kr.start_value + perQuarter).toFixed(0) },
        2: { ...quarters[2], target_value: (kr.start_value + perQuarter * 2).toFixed(0) },
        3: { ...quarters[3], target_value: (kr.start_value + perQuarter * 3).toFixed(0) },
        4: { ...quarters[4], target_value: kr.target_value.toString() },
      });
    } else {
      // Reset quarterly: each quarter has same target
      const quarterTarget = perQuarter.toFixed(0);
      setQuarters({
        1: { ...quarters[1], target_value: quarterTarget },
        2: { ...quarters[2], target_value: quarterTarget },
        3: { ...quarters[3], target_value: quarterTarget },
        4: { ...quarters[4], target_value: quarterTarget },
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const targets = ([1, 2, 3, 4] as const)
        .filter((q) => quarters[q].target_value)
        .map((q) => ({
          quarter: q,
          target_value: parseFloat(quarters[q].target_value) || 0,
          notes: quarters[q].notes || undefined,
        }));

      await onSubmit(targets);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  const quarterLabels = ["Q1 (Jan-Mar)", "Q2 (Apr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Dec)"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Set Quarterly Targets</DialogTitle>
          <DialogDescription>
            Define targets for each quarter for <strong>{kr.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="bg-bg-1 rounded-card p-3 flex items-center justify-between text-body-sm">
          <div>
            <span className="text-text-muted">Annual Target:</span>{" "}
            <span className="font-semibold">
              {kr.target_value.toLocaleString()}
              {kr.unit && ` ${kr.unit}`}
            </span>
          </div>
          <div>
            <span className="text-text-muted">Start Value:</span>{" "}
            <span className="font-semibold">{kr.start_value.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-text-muted">Mode:</span>{" "}
            <span className="font-semibold">
              {kr.aggregation === "cumulative" ? "Cumulative" : "Reset Quarterly"}
            </span>
          </div>
        </div>

        {/* Auto-distribute Button */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={autoDistribute}
          className="w-fit"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Auto-distribute evenly
        </Button>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quarter Inputs */}
          <div className="grid grid-cols-2 gap-4">
            {([1, 2, 3, 4] as const).map((q) => (
              <div key={q} className="space-y-2 p-3 bg-bg-1/50 rounded-card border border-border-soft">
                <Label className="text-body-sm font-semibold">{quarterLabels[q - 1]}</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={quarters[q].target_value}
                      onChange={(e) => updateQuarter(q, "target_value", e.target.value)}
                      placeholder="Target"
                      className="text-body-sm"
                    />
                  </div>
                  {kr.unit && (
                    <span className="text-body-sm text-text-muted self-center w-16 truncate">
                      {kr.unit}
                    </span>
                  )}
                </div>
                <Input
                  value={quarters[q].notes}
                  onChange={(e) => updateQuarter(q, "notes", e.target.value)}
                  placeholder="Notes (optional)"
                  className="text-small"
                />
              </div>
            ))}
          </div>

          {/* Tip */}
          <p className="text-xs text-text-muted">
            {kr.aggregation === "cumulative"
              ? "💡 Cumulative: Each quarter's target should be the year-to-date total you want to reach."
              : "💡 Reset Quarterly: Each quarter starts fresh. Targets are independent."}
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Targets
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
