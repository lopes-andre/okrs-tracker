"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Loader2, 
  TrendingUp, 
  Link as LinkIcon, 
  FileText,
  Calendar,
  Target,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnnualKr, QuarterTarget, CheckInInsert } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { getCurrentQuarter } from "@/lib/progress-engine";

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kr: (AnnualKr & { quarter_targets?: QuarterTarget[] }) | null;
  onSubmit: (checkIn: Omit<CheckInInsert, "recorded_by">) => Promise<void>;
}

export function CheckInDialog({
  open,
  onOpenChange,
  kr,
  onSubmit,
}: CheckInDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [value, setValue] = useState<string>("");
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [quarterTargetId, setQuarterTargetId] = useState<string>("");
  const [recordedAt, setRecordedAt] = useState<string>("");

  // Calculate derived values (must be before any early returns to follow hooks rules)
  const numValue = kr ? (parseFloat(value) || kr.current_value) : 0;
  const range = kr ? kr.target_value - kr.start_value : 0;
  const delta = kr ? numValue - kr.current_value : 0;
  const currentQuarter = getCurrentQuarter();
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open && kr) {
      setValue(kr.current_value.toString());
      setNote("");
      setEvidenceUrl("");
      setQuarterTargetId("");
      // Default to now (use local time for datetime-local input)
      const now = new Date();
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setRecordedAt(localDateTime);
    }
  }, [open, kr]);

  // Calculate quarter impact preview (must be before early return)
  const currentQuarterTarget = kr?.quarter_targets?.find(qt => qt.quarter === currentQuarter);
  const selectedQuarterTarget = kr?.quarter_targets?.find(
    qt => qt.id === (quarterTargetId || currentQuarterTarget?.id)
  );
  
  const quarterImpact = useMemo(() => {
    if (!selectedQuarterTarget || !kr) return null;
    
    // Current quarter progress
    const qtCurrent = selectedQuarterTarget.current_value;
    const qtTarget = selectedQuarterTarget.target_value;
    const currentQtProgress = qtTarget > 0 
      ? Math.min(Math.max((qtCurrent / qtTarget) * 100, 0), 100) 
      : 0;
    
    // New value impact on quarter (for cumulative, the delta goes to quarter)
    // For non-cumulative, the new value replaces
    const isCumulative = kr.aggregation === "cumulative";
    const newQtValue = isCumulative 
      ? qtCurrent + delta
      : numValue;
    
    const newQtProgress = qtTarget > 0 
      ? Math.min(Math.max((newQtValue / qtTarget) * 100, 0), 100) 
      : 0;
    
    return {
      current: qtCurrent,
      target: qtTarget,
      newValue: newQtValue,
      currentProgress: currentQtProgress,
      newProgress: newQtProgress,
      willComplete: newQtProgress >= 100,
    };
  }, [selectedQuarterTarget, delta, numValue, kr]);

  // Early return AFTER all hooks
  if (!kr) return null;

  // Calculate preview progress
  const newProgress = range > 0 
    ? Math.min(Math.max(((numValue - kr.start_value) / range) * 100, 0), 100)
    : numValue >= kr.target_value ? 100 : 0;
  const currentProgress = range > 0 
    ? Math.min(Math.max(((kr.current_value - kr.start_value) / range) * 100, 0), 100)
    : kr.current_value >= kr.target_value ? 100 : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || !kr) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        annual_kr_id: kr.id,
        value: parseFloat(value),
        note: note.trim() || null,
        evidence_url: evidenceUrl.trim() || null,
        quarter_target_id: quarterTargetId || currentQuarterTarget?.id || null,
        recorded_at: recordedAt ? new Date(recordedAt).toISOString() : new Date().toISOString(),
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  const formatValue = (val: number) => {
    if (kr.kr_type === "rate") return `${val.toFixed(1)}%`;
    return val.toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="font-heading flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-accent" />
            Check-in: {kr.name}
          </DialogTitle>
          <p className="text-xs text-text-muted">
            Current: {formatValue(kr.current_value)} → Target: {formatValue(kr.target_value)}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* New Value + Progress in one section */}
          <div className="space-y-2">
            <Label htmlFor="checkin-value" className="text-xs">
              New Value {kr.unit && <span className="text-text-muted">({kr.unit})</span>}
            </Label>
            <div className="relative">
              <Input
                id="checkin-value"
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`Enter new value...`}
                className="pr-16 h-9"
                required
              />
              {delta !== 0 && (
                <Badge 
                  variant={delta > 0 ? "success" : "warning"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5"
                >
                  {delta > 0 ? "+" : ""}{formatValue(delta)}
                </Badge>
              )}
            </div>
            {/* Progress inline */}
            <div className="flex items-center gap-2">
              <Progress value={newProgress} className="h-1.5 flex-1" />
              <span className={cn(
                "text-xs font-medium shrink-0",
                newProgress > currentProgress ? "text-status-success" : "text-text-muted"
              )}>
                {Math.round(currentProgress)}% → {Math.round(newProgress)}%
              </span>
            </div>
          </div>

          {/* Quarter Target - compact */}
          {kr.quarter_targets && kr.quarter_targets.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Select 
                  value={quarterTargetId || currentQuarterTarget?.id || ""} 
                  onValueChange={setQuarterTargetId}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Select quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    {kr.quarter_targets.map((qt) => (
                      <SelectItem key={qt.id} value={qt.id} className="text-xs">
                        Q{qt.quarter} (Target: {formatValue(qt.target_value)})
                        {qt.quarter === currentQuarter && " - Current"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {quarterImpact?.willComplete && delta > 0 && (
                  <Badge variant="success" className="text-[10px] gap-0.5 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    Goal!
                  </Badge>
                )}
              </div>
              
              {/* Quarter Impact - super compact */}
              {quarterImpact && selectedQuarterTarget && (
                <div className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded text-xs",
                  quarterImpact.willComplete ? "bg-status-success/10" : "bg-bg-1"
                )}>
                  <span className="text-text-muted">Q{selectedQuarterTarget.quarter}:</span>
                  <span className="flex items-center gap-1">
                    <span>{formatValue(quarterImpact.current)}</span>
                    <ArrowRight className="w-3 h-3 text-text-subtle" />
                    <span className={delta > 0 ? "text-status-success font-medium" : ""}>
                      {formatValue(quarterImpact.newValue)}
                    </span>
                    <span className="text-text-subtle">/ {formatValue(quarterImpact.target)}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Note - single line */}
          <div>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="h-8 text-xs"
            />
          </div>

          {/* Evidence + Date in one row */}
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="Evidence URL"
              className="h-8 text-xs"
            />
            <Input
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting || !value.trim()}>
              {isSubmitting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
