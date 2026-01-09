"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  TrendingUp, 
  Link as LinkIcon, 
  FileText,
  Calendar,
  Target,
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open && kr) {
      setValue(kr.current_value.toString());
      setNote("");
      setEvidenceUrl("");
      setQuarterTargetId("");
      // Default to now
      const now = new Date();
      setRecordedAt(now.toISOString().slice(0, 16)); // Format: YYYY-MM-DDTHH:MM
    }
  }, [open, kr]);

  if (!kr) return null;

  // Calculate preview progress
  const numValue = parseFloat(value) || kr.current_value;
  const range = kr.target_value - kr.start_value;
  const newProgress = range > 0 
    ? Math.min(Math.max(((numValue - kr.start_value) / range) * 100, 0), 100)
    : numValue >= kr.target_value ? 100 : 0;
  const currentProgress = range > 0 
    ? Math.min(Math.max(((kr.current_value - kr.start_value) / range) * 100, 0), 100)
    : kr.current_value >= kr.target_value ? 100 : 0;

  // Delta calculation
  const delta = numValue - kr.current_value;

  // Get current quarter for default selection
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const currentQuarterTarget = kr.quarter_targets?.find(qt => qt.quarter === currentQuarter);

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            Record Check-in
          </DialogTitle>
          <DialogDescription>
            Update progress for this key result
          </DialogDescription>
        </DialogHeader>

        {/* KR Summary */}
        <div className="p-3 rounded-card bg-bg-1 border border-border-soft">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-button bg-white border border-border-soft flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-text-strong">
                {kr.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-small text-text-muted">
                  Current: {formatValue(kr.current_value)}
                </span>
                <span className="text-small text-text-subtle">→</span>
                <span className="text-small text-text-muted">
                  Target: {formatValue(kr.target_value)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Value */}
          <div className="space-y-2">
            <Label htmlFor="checkin-value">
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
                className="pr-20"
                required
              />
              {delta !== 0 && (
                <Badge 
                  variant={delta > 0 ? "success" : "warning"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                >
                  {delta > 0 ? "+" : ""}{formatValue(delta)}
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-small">
              <span className="text-text-muted">Progress</span>
              <span className={cn(
                "font-medium",
                newProgress > currentProgress ? "text-status-success" : "text-text-strong"
              )}>
                {Math.round(currentProgress)}% → {Math.round(newProgress)}%
              </span>
            </div>
            <Progress value={newProgress} className="h-2" />
          </div>

          {/* Quarter Target */}
          {kr.quarter_targets && kr.quarter_targets.length > 0 && (
            <div className="space-y-2">
              <Label>Quarter Target</Label>
              <Select 
                value={quarterTargetId || currentQuarterTarget?.id || ""} 
                onValueChange={setQuarterTargetId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {kr.quarter_targets.map((qt) => (
                    <SelectItem key={qt.id} value={qt.id}>
                      <span className="flex items-center gap-2">
                        Q{qt.quarter}
                        <span className="text-text-muted text-xs">
                          (Target: {formatValue(qt.target_value)})
                        </span>
                        {qt.quarter === currentQuarter && (
                          <Badge variant="info" className="text-[10px] ml-1">Current</Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="checkin-note" className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Note (optional)
            </Label>
            <textarea
              id="checkin-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What contributed to this progress?"
              rows={2}
              className="w-full px-3 py-2 text-body-sm rounded-button border border-border-soft bg-white placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
            />
          </div>

          {/* Evidence URL */}
          <div className="space-y-2">
            <Label htmlFor="checkin-evidence" className="flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              Evidence URL (optional)
            </Label>
            <Input
              id="checkin-evidence"
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-text-subtle">
              Link to screenshot, analytics, post, or other proof
            </p>
          </div>

          {/* Date/Time */}
          <div className="space-y-2">
            <Label htmlFor="checkin-date" className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Recorded At
            </Label>
            <Input
              id="checkin-date"
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border-soft">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !value.trim()}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Check-in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
