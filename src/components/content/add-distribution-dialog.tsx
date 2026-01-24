"use client";

import { useState, useCallback } from "react";
import { Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformIcon } from "./platform-icon";
import { useCreateDistribution } from "@/features/content/hooks";
import { cn } from "@/lib/utils";
import type { ContentAccountWithPlatform } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface AddDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  planId: string;
  accounts: ContentAccountWithPlatform[];
  existingAccountIds: string[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AddDistributionDialog({
  open,
  onOpenChange,
  postId,
  planId,
  accounts,
  existingAccountIds,
}: AddDistributionDialogProps) {
  const createDistribution = useCreateDistribution(planId);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out accounts that already have distributions
  const availableAccounts = accounts.filter(
    (account) => !existingAccountIds.includes(account.id)
  );

  // Group accounts by platform
  const accountsByPlatform = availableAccounts.reduce((acc, account) => {
    const platformName = account.platform?.display_name || "Other";
    if (!acc[platformName]) {
      acc[platformName] = [];
    }
    acc[platformName].push(account);
    return acc;
  }, {} as Record<string, ContentAccountWithPlatform[]>);

  // Toggle account selection
  const toggleAccount = useCallback((accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (selectedAccountIds.length === 0) return;

    setIsSubmitting(true);
    try {
      // Create a distribution for each selected account
      await Promise.all(
        selectedAccountIds.map((accountId) =>
          createDistribution.mutateAsync({
            post_id: postId,
            account_id: accountId,
            status: "draft",
            format: null,
            caption: null,
            scheduled_at: null,
            posted_at: null,
            platform_post_url: null,
            platform_specific_data: {},
            linked_task_id: null,
          })
        )
      );

      setSelectedAccountIds([]);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedAccountIds, postId, createDistribution, onOpenChange]);

  // Reset selection when dialog opens
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setSelectedAccountIds([]);
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Distribution</DialogTitle>
          <DialogDescription>
            Select the platforms where this post will be published
          </DialogDescription>
        </DialogHeader>

        {availableAccounts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-text-muted">
              All your accounts already have distributions for this post.
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-4 py-4">
            {Object.entries(accountsByPlatform).map(([platformName, platformAccounts]) => (
              <div key={platformName}>
                <h4 className="text-small font-medium text-text-muted mb-2">
                  {platformName}
                </h4>
                <div className="space-y-2">
                  {platformAccounts.map((account) => {
                    const isSelected = selectedAccountIds.includes(account.id);
                    return (
                      <label
                        key={account.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          isSelected
                            ? "border-accent bg-accent/5"
                            : "border-border-soft hover:border-border"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleAccount(account.id)}
                        />
                        <PlatformIcon
                          platformName={account.platform?.name || "blog"}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {account.account_name}
                          </p>
                          <p className="text-small text-text-muted capitalize">
                            {account.account_type}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-accent shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedAccountIds.length === 0}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add {selectedAccountIds.length > 0 && `(${selectedAccountIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
