"use client";

import { useState, useCallback } from "react";
import { Plus, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddDistributionDialog } from "./add-distribution-dialog";
import { DistributionAccordionItem, type DistributionEditData } from "./distribution-accordion-item";
import { useDistributionsByPost } from "@/features/content/hooks";
import type {
  ContentPostWithDetails,
  ContentAccountWithPlatform,
} from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface PostDistributionsTabProps {
  post: ContentPostWithDetails;
  accounts: ContentAccountWithPlatform[];
  planId: string;
  // Controlled mode props for unified saving
  editedDistributions?: Record<string, DistributionEditData>;
  onDistributionUpdate?: (distributionId: string, updates: DistributionEditData) => void;
  deletedDistributionIds?: string[];
  onDistributionDelete?: (distributionId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PostDistributionsTab({
  post,
  accounts,
  planId,
  editedDistributions,
  onDistributionUpdate,
  deletedDistributionIds,
  onDistributionDelete,
}: PostDistributionsTabProps) {
  const { data: distributions, isLoading } = useDistributionsByPost(post.id);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Check if controlled mode
  const isControlled = !!onDistributionUpdate;

  // Toggle accordion expansion
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  const distList = (distributions || post.distributions || [])
    .filter(d => !deletedDistributionIds?.includes(d.id));

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
            {distList.map((distribution) => (
              <DistributionAccordionItem
                key={distribution.id}
                distribution={distribution}
                planId={planId}
                postTitle={post.title}
                isExpanded={expandedIds.has(distribution.id)}
                onToggle={() => toggleExpanded(distribution.id)}
                // Controlled mode props
                editedValues={isControlled ? editedDistributions?.[distribution.id] : undefined}
                onUpdate={isControlled ? onDistributionUpdate : undefined}
                onDelete={isControlled ? onDistributionDelete : undefined}
              />
            ))}
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
    </>
  );
}
