"use client";

import { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import {
  Plus,
  Calendar,
  Send,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlatformIcon } from "./platform-icon";
import { cn } from "@/lib/utils";
import type { ContentAccountWithPlatform } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface PendingDistribution {
  id: string;
  accountId: string;
  format: string | null;
  caption: string | null;
  scheduledAt: string | null;
  postedAt: string | null;
  status: "draft" | "scheduled" | "posted";
}

interface PendingDistributionsTabProps {
  accounts: ContentAccountWithPlatform[];
  pendingDistributions: PendingDistribution[];
  onAddDistribution: (distribution: Omit<PendingDistribution, "id">) => void;
  onUpdateDistribution: (id: string, updates: Partial<PendingDistribution>) => void;
  onRemoveDistribution: (id: string) => void;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig = {
  draft: {
    label: "Draft",
    icon: Edit,
    color: "text-text-muted bg-bg-1",
  },
  scheduled: {
    label: "Scheduled",
    icon: Clock,
    color: "text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30",
  },
  posted: {
    label: "Posted",
    icon: CheckCircle,
    color: "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PendingDistributionsTab({
  accounts,
  pendingDistributions,
  onAddDistribution,
  onUpdateDistribution,
  onRemoveDistribution,
}: PendingDistributionsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<PendingDistribution | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Get accounts that haven't been added yet
  const availableAccounts = useMemo(() => {
    const usedAccountIds = pendingDistributions.map((d) => d.accountId);
    return accounts.filter((account) => !usedAccountIds.includes(account.id));
  }, [accounts, pendingDistributions]);

  // Group available accounts by platform
  const accountsByPlatform = useMemo(() => {
    return availableAccounts.reduce((acc, account) => {
      const platformName = account.platform?.display_name || "Other";
      if (!acc[platformName]) {
        acc[platformName] = [];
      }
      acc[platformName].push(account);
      return acc;
    }, {} as Record<string, ContentAccountWithPlatform[]>);
  }, [availableAccounts]);

  // Get account info from ID
  const getAccountInfo = useCallback(
    (accountId: string) => {
      return accounts.find((a) => a.id === accountId);
    },
    [accounts]
  );

  // Toggle account selection
  const toggleAccount = useCallback((accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  }, []);

  // Handle adding distributions
  const handleAddDistributions = useCallback(() => {
    selectedAccountIds.forEach((accountId) => {
      onAddDistribution({
        accountId,
        format: null,
        caption: null,
        scheduledAt: null,
        postedAt: null,
        status: "draft",
      });
    });
    setSelectedAccountIds([]);
    setShowAddDialog(false);
  }, [selectedAccountIds, onAddDistribution]);

  // Handle editing a distribution
  const handleEditDistribution = useCallback((distribution: PendingDistribution) => {
    setSelectedDistribution(distribution);
    setShowDetailDialog(true);
  }, []);

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Distributions</h3>
            <p className="text-small text-text-muted">
              Add platforms where this post will be published
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} disabled={availableAccounts.length === 0}>
            <Plus className="w-4 h-4 mr-2" />
            Add Distribution
          </Button>
        </div>

        {/* Distribution List */}
        {pendingDistributions.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <Send className="w-12 h-12 mx-auto mb-4 text-text-muted" />
            <h4 className="font-medium mb-2">No distributions yet</h4>
            <p className="text-small text-text-muted mb-4">
              Add platforms where this post will be published. The post status will be set automatically based on distributions.
            </p>
            <Button onClick={() => setShowAddDialog(true)} disabled={availableAccounts.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Add Distribution
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDistributions.map((distribution) => {
              const account = getAccountInfo(distribution.accountId);
              const status = statusConfig[distribution.status];
              const StatusIcon = status.icon;

              return (
                <div
                  key={distribution.id}
                  className="flex items-center gap-4 p-4 bg-bg-0 border border-border-soft rounded-lg hover:border-border transition-colors"
                >
                  {/* Platform Icon */}
                  <div className="shrink-0">
                    <PlatformIcon
                      platformName={account?.platform?.name || "blog"}
                      size="md"
                    />
                  </div>

                  {/* Account Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {account?.account_name || "Unknown Account"}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("shrink-0 text-[10px]", status.color)}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-small text-text-muted">
                      <span>{account?.platform?.display_name}</span>
                      {distribution.format && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{distribution.format}</span>
                        </>
                      )}
                      {distribution.scheduledAt && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(distribution.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </>
                      )}
                      {distribution.postedAt && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            Posted {format(new Date(distribution.postedAt), "MMM d, yyyy")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditDistribution(distribution)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveDistribution(distribution.id)}
                      className="text-status-danger hover:text-status-danger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Status info */}
        {pendingDistributions.length > 0 && (
          <div className="bg-bg-1 rounded-lg p-4 text-small text-text-muted">
            <p className="font-medium text-text mb-2">Status will be set automatically:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Backlog:</strong> No distributions</li>
              <li><strong>Tagged:</strong> Has draft distributions only</li>
              <li><strong>Ongoing:</strong> Has scheduled or posted distributions</li>
              <li><strong>Complete:</strong> All distributions posted</li>
            </ul>
          </div>
        )}
      </div>

      {/* Add Distribution Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
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
              onClick={() => {
                setShowAddDialog(false);
                setSelectedAccountIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDistributions}
              disabled={selectedAccountIds.length === 0}
            >
              Add {selectedAccountIds.length > 0 && `(${selectedAccountIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribution Detail Dialog */}
      {selectedDistribution && (
        <DistributionDetailDialog
          distribution={selectedDistribution}
          account={getAccountInfo(selectedDistribution.accountId)}
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          onSave={(updates) => {
            onUpdateDistribution(selectedDistribution.id, updates);
            setShowDetailDialog(false);
          }}
        />
      )}
    </>
  );
}

// ============================================================================
// DISTRIBUTION DETAIL DIALOG
// ============================================================================

interface DistributionDetailDialogProps {
  distribution: PendingDistribution;
  account: ContentAccountWithPlatform | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<PendingDistribution>) => void;
}

function DistributionDetailDialog({
  distribution,
  account,
  open,
  onOpenChange,
  onSave,
}: DistributionDetailDialogProps) {
  const [caption, setCaption] = useState(distribution.caption || "");
  const [format, setFormat] = useState(distribution.format || "");
  const [scheduledAt, setScheduledAt] = useState(distribution.scheduledAt || "");
  const [isPosted, setIsPosted] = useState(distribution.status === "posted");

  // Reset form when dialog opens
  useState(() => {
    if (open) {
      setCaption(distribution.caption || "");
      setFormat(distribution.format || "");
      setScheduledAt(distribution.scheduledAt || "");
      setIsPosted(distribution.status === "posted");
    }
  });

  const handleSave = useCallback(() => {
    let status: "draft" | "scheduled" | "posted" = "draft";
    let postedAt = null;

    if (isPosted) {
      status = "posted";
      postedAt = new Date().toISOString();
    } else if (scheduledAt) {
      status = "scheduled";
    }

    onSave({
      caption: caption.trim() || null,
      format: format.trim() || null,
      scheduledAt: scheduledAt || null,
      postedAt,
      status,
    });
  }, [caption, format, scheduledAt, isPosted, onSave]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Distribution Details</DialogTitle>
          <DialogDescription>
            Configure how this post will be distributed to {account?.account_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Platform info */}
          <div className="flex items-center gap-3 p-3 bg-bg-1 rounded-lg">
            <PlatformIcon
              platformName={account?.platform?.name || "blog"}
              size="md"
            />
            <div>
              <p className="font-medium">{account?.account_name}</p>
              <p className="text-small text-text-muted">
                {account?.platform?.display_name}
              </p>
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="post">Post</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="reel">Reel</SelectItem>
                <SelectItem value="carousel">Carousel</SelectItem>
                <SelectItem value="thread">Thread</SelectItem>
                <SelectItem value="article">Article</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption for this distribution..."
              rows={4}
            />
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Schedule (optional)</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt ? scheduledAt.slice(0, 16) : ""}
              onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : "")}
              disabled={isPosted}
            />
          </div>

          {/* Mark as posted */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="isPosted"
              checked={isPosted}
              onCheckedChange={(checked) => setIsPosted(checked === true)}
            />
            <Label htmlFor="isPosted" className="cursor-pointer">
              Mark as already posted
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
