"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Loader2, CheckCircle, ExternalLink } from "lucide-react";
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
import { PlatformIcon } from "./platform-icon";
import { useMarkDistributionPosted } from "@/features/content/hooks";
import type { ContentDistribution } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface MarkPostedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  distribution: ContentDistribution;
  planId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MarkPostedDialog({
  open,
  onOpenChange,
  distribution,
  planId,
}: MarkPostedDialogProps) {
  const markPosted = useMarkDistributionPosted(planId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get account info from distribution
  const dist = distribution as ContentDistribution & {
    account?: {
      account_name: string;
      platform?: { name: string; display_name: string };
    };
  };
  const platformName = dist.account?.platform?.name?.toLowerCase() || "blog";
  const accountName = dist.account?.account_name || "Account";

  // Form state
  const [postedDate, setPostedDate] = useState("");
  const [postedTime, setPostedTime] = useState("");
  const [platformPostUrl, setPlatformPostUrl] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const now = new Date();
      setPostedDate(format(now, "yyyy-MM-dd"));
      setPostedTime(format(now, "HH:mm"));
      setPlatformPostUrl("");
    }
  }, [open]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await markPosted.mutateAsync({
        distributionId: distribution.id,
        platformPostUrl: platformPostUrl || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [distribution.id, platformPostUrl, markPosted, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <DialogTitle>Mark as Posted</DialogTitle>
              <DialogDescription>
                Confirm that this content has been published
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Account info */}
          <div className="flex items-center gap-3 p-3 bg-bg-1 rounded-lg">
            <PlatformIcon platformName={platformName} size="sm" />
            <span className="font-medium">{accountName}</span>
          </div>

          {/* Posted date/time */}
          <div className="space-y-2">
            <Label>Posted Date & Time</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                value={postedDate}
                onChange={(e) => setPostedDate(e.target.value)}
              />
              <Input
                type="time"
                value={postedTime}
                onChange={(e) => setPostedTime(e.target.value)}
              />
            </div>
          </div>

          {/* Post URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Post URL (optional)
            </Label>
            <Input
              type="url"
              value={platformPostUrl}
              onChange={(e) => setPlatformPostUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-small text-text-muted">
              Link to the published post on the platform
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark as Posted
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
