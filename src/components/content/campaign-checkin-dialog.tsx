"use client";

import { useState, useEffect, useCallback } from "react";
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
import type {
  ContentCampaign,
  ContentCampaignCheckin,
  ContentCampaignCheckinInsert,
} from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface CampaignCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: ContentCampaign;
  previousCheckin?: ContentCampaignCheckin | null;
  onSubmit: (data: ContentCampaignCheckinInsert) => Promise<void>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CampaignCheckinDialog({
  open,
  onOpenChange,
  campaign,
  previousCheckin,
  onSubmit,
}: CampaignCheckinDialogProps) {
  // Form state
  const [impressions, setImpressions] = useState("");
  const [clicks, setClicks] = useState("");
  const [conversions, setConversions] = useState("");
  const [amountSpent, setAmountSpent] = useState("");
  const [costPerResult, setCostPerResult] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Pre-fill with previous values if available
      setImpressions(previousCheckin?.impressions?.toString() || "");
      setClicks(previousCheckin?.clicks?.toString() || "");
      setConversions(previousCheckin?.conversions?.toString() || "");
      setAmountSpent(previousCheckin?.amount_spent?.toString() || "");
      setCostPerResult(previousCheckin?.cost_per_result?.toString() || "");
      setNotes("");
    }
  }, [open, previousCheckin]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        campaign_id: campaign.id,
        checked_at: new Date().toISOString(),
        checked_by: "", // Will be set by the API using auth.uid()
        amount_spent: amountSpent ? parseFloat(amountSpent) : 0,
        impressions: impressions ? parseInt(impressions, 10) : null,
        clicks: clicks ? parseInt(clicks, 10) : null,
        conversions: conversions ? parseInt(conversions, 10) : null,
        cost_per_result: costPerResult ? parseFloat(costPerResult) : null,
        notes: notes.trim() || null,
      });

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [campaign.id, impressions, clicks, conversions, amountSpent, costPerResult, notes, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Campaign Check-in
          </DialogTitle>
        </DialogHeader>

        {/* Campaign Info */}
        <div className="p-3 bg-bg-1 rounded-lg">
          <p className="font-medium">{campaign.name}</p>
          {campaign.description && (
            <p className="text-small text-text-muted line-clamp-2">
              {campaign.description}
            </p>
          )}
        </div>

        {/* Metrics Form */}
        <div className="space-y-4">
          <h4 className="text-small font-medium text-text-muted">
            Campaign Metrics
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {/* Impressions */}
            <div className="space-y-1">
              <Label htmlFor="impressions" className="text-small">
                Total Impressions
              </Label>
              <div className="relative">
                <Input
                  id="impressions"
                  type="number"
                  value={impressions}
                  onChange={(e) => setImpressions(e.target.value)}
                  placeholder="0"
                  className="pr-16"
                />
                {previousCheckin?.impressions != null && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">
                    prev: {previousCheckin.impressions.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-text-muted">Total impressions across all posts</p>
            </div>

            {/* Clicks */}
            <div className="space-y-1">
              <Label htmlFor="clicks" className="text-small">
                Link Clicks
              </Label>
              <div className="relative">
                <Input
                  id="clicks"
                  type="number"
                  value={clicks}
                  onChange={(e) => setClicks(e.target.value)}
                  placeholder="0"
                  className="pr-16"
                />
                {previousCheckin?.clicks != null && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">
                    prev: {previousCheckin.clicks.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-text-muted">Clicks on links in posts</p>
            </div>

            {/* Conversions */}
            <div className="space-y-1">
              <Label htmlFor="conversions" className="text-small">
                Conversions
              </Label>
              <div className="relative">
                <Input
                  id="conversions"
                  type="number"
                  value={conversions}
                  onChange={(e) => setConversions(e.target.value)}
                  placeholder="0"
                  className="pr-16"
                />
                {previousCheckin?.conversions != null && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">
                    prev: {previousCheckin.conversions.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-text-muted">Sign-ups, purchases, etc.</p>
            </div>

            {/* Amount Spent */}
            <div className="space-y-1">
              <Label htmlFor="amountSpent" className="text-small">
                Amount Spent
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                <Input
                  id="amountSpent"
                  type="number"
                  step="0.01"
                  value={amountSpent}
                  onChange={(e) => setAmountSpent(e.target.value)}
                  placeholder="0.00"
                  className="pl-7 pr-16"
                />
                {previousCheckin?.amount_spent != null && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">
                    prev: ${previousCheckin.amount_spent.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-text-muted">Budget spent to date</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add observations, wins, learnings..."
            rows={3}
          />
        </div>

        <DialogFooter>
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
