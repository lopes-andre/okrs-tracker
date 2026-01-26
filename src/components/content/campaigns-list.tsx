"use client";

import { useState, useMemo, lazy, Suspense } from "react";
import { Plus, Megaphone, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/layout/empty-state";
import { CampaignCard } from "./campaign-card";
import type { CampaignFormData } from "./campaign-dialog";

// Lazy load heavy dialog component
const CampaignDialog = lazy(() =>
  import("./campaign-dialog").then((mod) => ({ default: mod.CampaignDialog }))
);
import { CampaignCheckinDialog } from "./campaign-checkin-dialog";
import {
  useCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useCampaignCheckins,
  useAddCampaignCheckin,
  useSetCampaignDistributions,
} from "@/features/content/hooks";
import type {
  ContentCampaign,
  ContentCampaignWithCount,
  ContentCampaignStatus,
  ContentCampaignObjective,
  ContentCampaignCheckinInsert,
} from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface CampaignsListProps {
  planId: string;
}

type StatusFilter = ContentCampaignStatus | "all";
type ObjectiveFilter = ContentCampaignObjective | "all";

// ============================================================================
// COMPONENT
// ============================================================================

export function CampaignsList({ planId }: CampaignsListProps) {
  // Data
  const { data: campaigns = [], isLoading } = useCampaigns(planId);
  const createCampaign = useCreateCampaign(planId);
  const updateCampaign = useUpdateCampaign(planId);
  const deleteCampaign = useDeleteCampaign(planId);
  const addCampaignCheckin = useAddCampaignCheckin(planId);
  const setCampaignDistributions = useSetCampaignDistributions(planId);

  // UI state
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [showCheckinDialog, setShowCheckinDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<ContentCampaignWithCount | null>(null);
  const [checkinCampaign, setCheckinCampaign] = useState<ContentCampaignWithCount | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [objectiveFilter, setObjectiveFilter] = useState<ObjectiveFilter>("all");

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = campaign.name.toLowerCase().includes(query);
        const matchesDescription = campaign.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }

      // Status filter
      if (statusFilter !== "all" && campaign.status !== statusFilter) {
        return false;
      }

      // Objective filter
      if (objectiveFilter !== "all" && campaign.objective !== objectiveFilter) {
        return false;
      }

      return true;
    });
  }, [campaigns, searchQuery, statusFilter, objectiveFilter]);

  // Group campaigns by status
  const groupedCampaigns = useMemo(() => {
    const groups: Record<ContentCampaignStatus, ContentCampaignWithCount[]> = {
      active: [],
      paused: [],
      draft: [],
      completed: [],
    };

    filteredCampaigns.forEach((campaign) => {
      groups[campaign.status].push(campaign);
    });

    return groups;
  }, [filteredCampaigns]);

  // Handlers
  const handleCreate = async (data: CampaignFormData) => {
    const campaign = await createCampaign.mutateAsync({
      name: data.name,
      description: data.description,
      objective: data.objective,
      status: data.status,
      start_date: data.start_date,
      end_date: data.end_date,
      budget_allocated: data.budget_allocated,
    });

    // Link distributions to the new campaign
    if (data.distributionIds && data.distributionIds.length > 0) {
      await setCampaignDistributions.mutateAsync({
        campaignId: campaign.id,
        distributionIds: data.distributionIds,
      });
    }
  };

  const handleUpdate = async (data: CampaignFormData) => {
    if (!editingCampaign) return;
    await updateCampaign.mutateAsync({
      campaignId: editingCampaign.id,
      updates: {
        name: data.name,
        description: data.description,
        objective: data.objective,
        status: data.status,
        start_date: data.start_date,
        end_date: data.end_date,
        budget_allocated: data.budget_allocated,
      },
    });

    // Update distribution links
    if (data.distributionIds) {
      await setCampaignDistributions.mutateAsync({
        campaignId: editingCampaign.id,
        distributionIds: data.distributionIds,
      });
    }
  };

  const handleDelete = async (campaignId: string) => {
    await deleteCampaign.mutateAsync(campaignId);
  };

  const handleStatusChange = async (campaignId: string, status: ContentCampaignStatus) => {
    await updateCampaign.mutateAsync({
      campaignId,
      updates: { status },
    });
  };

  const handleAddCheckin = async (data: ContentCampaignCheckinInsert) => {
    await addCampaignCheckin.mutateAsync(data);
  };

  const openEditDialog = (campaign: ContentCampaignWithCount) => {
    setEditingCampaign(campaign);
    setShowCampaignDialog(true);
  };

  const openCheckinDialog = (campaign: ContentCampaignWithCount) => {
    setCheckinCampaign(campaign);
    setShowCheckinDialog(true);
  };

  // Count active filters
  const activeFiltersCount = [
    statusFilter !== "all" ? 1 : 0,
    objectiveFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-bg-1 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // Empty state
  if (campaigns.length === 0) {
    return (
      <>
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create campaigns to organize and track your content initiatives"
          action={{
            label: "Create Campaign",
            onClick: () => setShowCampaignDialog(true),
          }}
        />
        {showCampaignDialog && (
          <Suspense fallback={null}>
            <CampaignDialog
              open={showCampaignDialog}
              onOpenChange={setShowCampaignDialog}
              planId={planId}
              onSubmit={handleCreate}
            />
          </Suspense>
        )}
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCampaignDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Objective Filter */}
            <Select
              value={objectiveFilter}
              onValueChange={(value) => setObjectiveFilter(value as ObjectiveFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Objective" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Objectives</SelectItem>
                <SelectItem value="awareness">Awareness</SelectItem>
                <SelectItem value="traffic">Traffic</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
                <SelectItem value="conversions">Conversions</SelectItem>
              </SelectContent>
            </Select>

            {/* Active Filters Badge */}
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Filter className="w-3 h-3" />
                {activeFiltersCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Results Count */}
        {filteredCampaigns.length !== campaigns.length && (
          <p className="text-small text-text-muted">
            Showing {filteredCampaigns.length} of {campaigns.length} campaigns
          </p>
        )}

        {/* Campaign Groups */}
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-text-muted" />
            <h3 className="font-medium mb-2">No matching campaigns</h3>
            <p className="text-small text-text-muted">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Campaigns */}
            {groupedCampaigns.active.length > 0 && (
              <CampaignGroup
                title="Active"
                campaigns={groupedCampaigns.active}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onAddCheckin={openCheckinDialog}
              />
            )}

            {/* Paused Campaigns */}
            {groupedCampaigns.paused.length > 0 && (
              <CampaignGroup
                title="Paused"
                campaigns={groupedCampaigns.paused}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onAddCheckin={openCheckinDialog}
              />
            )}

            {/* Draft Campaigns */}
            {groupedCampaigns.draft.length > 0 && (
              <CampaignGroup
                title="Drafts"
                campaigns={groupedCampaigns.draft}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onAddCheckin={openCheckinDialog}
              />
            )}

            {/* Completed Campaigns */}
            {groupedCampaigns.completed.length > 0 && (
              <CampaignGroup
                title="Completed"
                campaigns={groupedCampaigns.completed}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onAddCheckin={openCheckinDialog}
              />
            )}
          </div>
        )}
      </div>

      {/* Campaign Dialog - Lazy loaded */}
      {showCampaignDialog && (
        <Suspense fallback={null}>
          <CampaignDialog
            open={showCampaignDialog}
            onOpenChange={(open) => {
              setShowCampaignDialog(open);
              if (!open) setEditingCampaign(null);
            }}
            planId={planId}
            campaign={editingCampaign}
            onSubmit={editingCampaign ? handleUpdate : handleCreate}
          />
        </Suspense>
      )}

      {/* Check-in Dialog */}
      {checkinCampaign && (
        <CampaignCheckinDialogWrapper
          open={showCheckinDialog}
          onOpenChange={(open) => {
            setShowCheckinDialog(open);
            if (!open) setCheckinCampaign(null);
          }}
          campaign={checkinCampaign}
          onSubmit={handleAddCheckin}
        />
      )}
    </>
  );
}

// ============================================================================
// CAMPAIGN GROUP
// ============================================================================

interface CampaignGroupProps {
  title: string;
  campaigns: ContentCampaignWithCount[];
  onEdit: (campaign: ContentCampaignWithCount) => void;
  onDelete: (campaignId: string) => void;
  onStatusChange: (campaignId: string, status: ContentCampaignStatus) => void;
  onAddCheckin: (campaign: ContentCampaignWithCount) => void;
}

function CampaignGroup({
  title,
  campaigns,
  onEdit,
  onDelete,
  onStatusChange,
  onAddCheckin,
}: CampaignGroupProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-small font-medium text-text-muted">
        {title} ({campaigns.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            postCount={campaign.distribution_count}
            onClick={() => onEdit(campaign)}
            onEdit={() => onEdit(campaign)}
            onDelete={() => onDelete(campaign.id)}
            onStatusChange={(status) => onStatusChange(campaign.id, status)}
            onAddCheckin={() => onAddCheckin(campaign)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CHECK-IN DIALOG WRAPPER (to fetch previous check-in)
// ============================================================================

interface CampaignCheckinDialogWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: ContentCampaign;
  onSubmit: (data: ContentCampaignCheckinInsert) => Promise<void>;
}

function CampaignCheckinDialogWrapper({
  open,
  onOpenChange,
  campaign,
  onSubmit,
}: CampaignCheckinDialogWrapperProps) {
  const { data: checkins = [] } = useCampaignCheckins(campaign.id);
  const previousCheckin = checkins[0] || null;

  return (
    <CampaignCheckinDialog
      open={open}
      onOpenChange={onOpenChange}
      campaign={campaign}
      previousCheckin={previousCheckin}
      onSubmit={onSubmit}
    />
  );
}
