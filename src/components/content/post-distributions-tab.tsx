"use client";

import { useState, useCallback } from "react";
import { Plus, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddDistributionDialog } from "./add-distribution-dialog";
import { DistributionAccordionItem } from "./distribution-accordion-item";
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
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PostDistributionsTab({
  post,
  accounts,
  planId,
}: PostDistributionsTabProps) {
  const { data: distributions, isLoading } = useDistributionsByPost(post.id);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
            {distList.map((distribution) => (
              <DistributionAccordionItem
                key={distribution.id}
                distribution={distribution}
                planId={planId}
                postTitle={post.title}
                isExpanded={expandedIds.has(distribution.id)}
                onToggle={() => toggleExpanded(distribution.id)}
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
