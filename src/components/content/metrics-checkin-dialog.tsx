"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Loader2, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlatformIcon } from "./platform-icon";
import {
  getPlatformMetrics,
  formatMetricValue,
  type MetricField,
} from "./platform-metrics-config";
import { useAddDistributionMetrics } from "@/features/content/hooks";
import type { ContentDistributionWithAccount } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface MetricsCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  distribution: ContentDistributionWithAccount;
  planId: string;
  previousMetrics?: Record<string, number> | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MetricsCheckInDialog({
  open,
  onOpenChange,
  distribution,
  planId,
  previousMetrics,
}: MetricsCheckInDialogProps) {
  const addMetrics = useAddDistributionMetrics(planId);

  const platformName = distribution.account.platform.name;
  const { common, specific } = useMemo(
    () => getPlatformMetrics(platformName),
    [platformName]
  );

  // Initialize form state
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Pre-fill with previous values if available
      const initialMetrics: Record<string, string> = {};
      if (previousMetrics) {
        Object.entries(previousMetrics).forEach(([key, value]) => {
          initialMetrics[key] = value?.toString() || "";
        });
      }
      setMetrics(initialMetrics);
      setNotes("");
    }
  }, [open, previousMetrics]);

  // Handle input change
  const handleMetricChange = (key: string, value: string) => {
    // Allow empty or valid numbers
    if (value === "" || !isNaN(parseFloat(value))) {
      setMetrics((prev) => ({ ...prev, [key]: value }));
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Convert string values to numbers, filtering out empty values
      const numericMetrics: Record<string, number> = {};
      Object.entries(metrics).forEach(([key, value]) => {
        if (value !== "" && !isNaN(parseFloat(value))) {
          numericMetrics[key] = parseFloat(value);
        }
      });

      await addMetrics.mutateAsync({
        distribution_id: distribution.id,
        metrics: numericMetrics,
        checked_at: new Date().toISOString(),
      });

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render metric field
  const renderMetricField = (field: MetricField) => {
    const value = metrics[field.key] || "";
    const prevValue = previousMetrics?.[field.key];

    return (
      <div key={field.key} className="space-y-1">
        <Label htmlFor={field.key} className="text-small">
          {field.label}
          {field.required && <span className="text-status-danger ml-1">*</span>}
        </Label>
        <div className="relative">
          <Input
            id={field.key}
            type="number"
            value={value}
            onChange={(e) => handleMetricChange(field.key, e.target.value)}
            placeholder={field.placeholder || "0"}
            className="pr-16"
          />
          {prevValue !== undefined && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">
              prev: {formatMetricValue(prevValue, field.type)}
            </span>
          )}
        </div>
        {field.description && (
          <p className="text-[10px] text-text-muted">{field.description}</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Add Metrics Check-in
          </DialogTitle>
        </DialogHeader>

        {/* Distribution Info */}
        <div className="flex items-center gap-3 p-3 bg-bg-1 rounded-lg">
          <PlatformIcon platformName={platformName} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {distribution.account.account_name}
            </p>
            <p className="text-small text-text-muted">
              Posted {distribution.posted_at && format(new Date(distribution.posted_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Metrics Form */}
        <div className="space-y-6">
          {/* Common Metrics */}
          <div className="space-y-3">
            <h4 className="text-small font-medium text-text-muted">
              Core Metrics
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {common.map(renderMetricField)}
            </div>
          </div>

          {/* Platform-Specific Metrics */}
          {specific.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-small font-medium text-text-muted">
                {platformName} Metrics
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {specific.map(renderMetricField)}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any observations or context..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Check-in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
