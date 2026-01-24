"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Plus,
  Calendar,
  Send,
  MoreHorizontal,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlatformIcon } from "./platform-icon";
import { AddDistributionDialog } from "./add-distribution-dialog";
import { DistributionDetailDialog } from "./distribution-detail-dialog";
import { MarkPostedDialog } from "./mark-posted-dialog";
import {
  useDistributionsByPost,
  useDeleteDistribution,
} from "@/features/content/hooks";
import { cn } from "@/lib/utils";
import type {
  ContentPostWithDetails,
  ContentAccountWithPlatform,
  ContentDistribution,
  ContentDistributionStatus,
} from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface PostDistributionsTabProps {
  post: ContentPostWithDetails;
  accounts: ContentAccountWithPlatform[];
  planId: string;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig: Record<ContentDistributionStatus, { label: string; icon: typeof Clock; color: string }> = {
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

export function PostDistributionsTab({
  post,
  accounts,
  planId,
}: PostDistributionsTabProps) {
  const { data: distributions, isLoading } = useDistributionsByPost(post.id);
  const deleteDistribution = useDeleteDistribution(planId);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<ContentDistribution | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showMarkPostedDialog, setShowMarkPostedDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [distributionToDelete, setDistributionToDelete] = useState<ContentDistribution | null>(null);

  // Handle edit distribution
  const handleEdit = useCallback((distribution: ContentDistribution) => {
    setSelectedDistribution(distribution);
    setShowDetailDialog(true);
  }, []);

  // Handle mark as posted
  const handleMarkPosted = useCallback((distribution: ContentDistribution) => {
    setSelectedDistribution(distribution);
    setShowMarkPostedDialog(true);
  }, []);

  // Handle delete distribution
  const handleDeleteClick = useCallback((distribution: ContentDistribution) => {
    setDistributionToDelete(distribution);
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!distributionToDelete) return;

    await deleteDistribution.mutateAsync(distributionToDelete.id);
    setShowDeleteDialog(false);
    setDistributionToDelete(null);
  }, [distributionToDelete, deleteDistribution]);

  // Get account info for a distribution
  const getAccountInfo = useCallback(
    (distribution: ContentDistribution) => {
      // The distribution already has account info nested
      const dist = distribution as ContentDistribution & {
        account?: ContentAccountWithPlatform;
      };
      return dist.account;
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  const distList = distributions || post.distributions || [];

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Distributions</h3>
            <p className="text-small text-text-muted">
              Manage where this post will be published
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Distribution
          </Button>
        </div>

        {/* Distribution List */}
        {distList.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <Send className="w-12 h-12 mx-auto mb-4 text-text-muted" />
            <h4 className="font-medium mb-2">No distributions yet</h4>
            <p className="text-small text-text-muted mb-4">
              Add platforms where this post will be published
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Distribution
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {distList.map((distribution) => {
              const account = getAccountInfo(distribution);
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
                      {distribution.scheduled_at && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(distribution.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </>
                      )}
                      {distribution.posted_at && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            Posted {format(new Date(distribution.posted_at), "MMM d, yyyy")}
                          </span>
                        </>
                      )}
                    </div>
                    {distribution.platform_post_url && (
                      <a
                        href={distribution.platform_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-small text-accent hover:underline mt-1"
                      >
                        View post
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(distribution)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Details
                      </DropdownMenuItem>
                      {distribution.status !== "posted" && (
                        <DropdownMenuItem onClick={() => handleMarkPosted(distribution)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Posted
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(distribution)}
                        className="text-status-danger focus:text-status-danger"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Distribution Dialog */}
      <AddDistributionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        postId={post.id}
        planId={planId}
        accounts={accounts}
        existingAccountIds={distList.map((d) => d.account_id)}
      />

      {/* Distribution Detail Dialog */}
      {selectedDistribution && (
        <DistributionDetailDialog
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          distribution={selectedDistribution}
          planId={planId}
          postTitle={post.title}
        />
      )}

      {/* Mark Posted Dialog */}
      {selectedDistribution && (
        <MarkPostedDialog
          open={showMarkPostedDialog}
          onOpenChange={setShowMarkPostedDialog}
          distribution={selectedDistribution}
          planId={planId}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Distribution</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this distribution? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-status-danger hover:bg-status-danger/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
