"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Loader2, Search, Calendar, FileText } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlatformIcon } from "./platform-icon";
import {
  usePlatforms,
  useCampaignDistributions,
  useAvailableDistributionsForCampaign,
} from "@/features/content/hooks";
import { cn } from "@/lib/utils";
import type {
  ContentCampaign,
  ContentCampaignStatus,
  ContentCampaignObjective,
  ContentDistribution,
} from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  campaign?: ContentCampaign | null;
  onSubmit: (data: CampaignFormData) => Promise<void>;
}

export interface CampaignFormData {
  name: string;
  description: string | null;
  objective: ContentCampaignObjective;
  status: ContentCampaignStatus;
  start_date: string | null;
  end_date: string | null;
  budget_allocated: number | null;
  distributionIds: string[];
}

// Extended distribution type with post info
interface DistributionWithPost extends ContentDistribution {
  post?: {
    id: string;
    title: string;
    plan_id: string;
  };
  account?: {
    id: string;
    account_name: string;
    platform?: {
      id: string;
      name: string;
      display_name: string;
    };
  };
}

// ============================================================================
// OPTIONS
// ============================================================================

const objectiveOptions: { value: ContentCampaignObjective; label: string; description: string }[] = [
  {
    value: "awareness",
    label: "Awareness",
    description: "Increase brand visibility and reach",
  },
  {
    value: "traffic",
    label: "Traffic",
    description: "Drive visitors to your website",
  },
  {
    value: "engagement",
    label: "Engagement",
    description: "Increase likes, comments, and shares",
  },
  {
    value: "conversions",
    label: "Conversions",
    description: "Generate leads or sales",
  },
];

const statusOptions: { value: ContentCampaignStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

// ============================================================================
// DISTRIBUTION ITEM COMPONENT
// ============================================================================

interface DistributionItemProps {
  distribution: DistributionWithPost;
  isSelected: boolean;
  onToggle: () => void;
}

function DistributionItem({ distribution, isSelected, onToggle }: DistributionItemProps) {
  const postTitle = distribution.post?.title || "Untitled Post";
  const accountName = distribution.account?.account_name || "Unknown Account";
  const platformName = distribution.account?.platform?.name || "blog";
  const platformDisplayName = distribution.account?.platform?.display_name || "Platform";

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
        isSelected
          ? "bg-accent/10 border-accent"
          : "bg-bg-0 border-border-soft hover:border-border"
      )}
      onClick={onToggle}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <PlatformIcon platformName={platformName} size="sm" />
          <span className="font-medium text-small truncate">{postTitle}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-text-muted">
          <span>{platformDisplayName}</span>
          <span>•</span>
          <span>{accountName}</span>
          {distribution.format && (
            <>
              <span>•</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">
                {distribution.format}
              </Badge>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
          {distribution.status === "posted" && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-green-600 border-green-300">
              Posted
            </Badge>
          )}
          {distribution.status === "scheduled" && distribution.scheduled_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(distribution.scheduled_at).toLocaleDateString()}
            </span>
          )}
          {distribution.status === "draft" && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              Draft
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CampaignDialog({
  open,
  onOpenChange,
  planId,
  campaign,
  onSubmit,
}: CampaignDialogProps) {
  const isEditing = !!campaign;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState<ContentCampaignObjective>("awareness");
  const [status, setStatus] = useState<ContentCampaignStatus>("draft");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Distribution selection state
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>("");
  const [selectedDistributionIds, setSelectedDistributionIds] = useState<Set<string>>(new Set());
  const [distributionSearch, setDistributionSearch] = useState("");

  // Fetch data
  const { data: platforms = [] } = usePlatforms();
  const { data: availableDistributions = [], isLoading: isLoadingDistributions } =
    useAvailableDistributionsForCampaign(
      planId,
      campaign?.id,
      selectedPlatformId || undefined
    );
  const { data: linkedDistributions = [] } = useCampaignDistributions(campaign?.id || "");

  // Track if we've initialized distributions for this dialog session
  const hasInitializedDistributions = useRef(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      hasInitializedDistributions.current = false;
      if (campaign) {
        setName(campaign.name || "");
        setDescription(campaign.description || "");
        setObjective(campaign.objective);
        setStatus(campaign.status);
        setStartDate(campaign.start_date || "");
        setEndDate(campaign.end_date || "");
        setBudget(campaign.budget_allocated?.toString() || "");
        setSelectedPlatformId(campaign.platform_id || "");
      } else {
        setName("");
        setDescription("");
        setObjective("awareness");
        setStatus("draft");
        setStartDate("");
        setEndDate("");
        setBudget("");
        setSelectedPlatformId("");
        setSelectedDistributionIds(new Set());
      }
      setDistributionSearch("");
    }
  }, [open, campaign]);

  // Initialize selected distributions when linked distributions load (for edit mode)
  useEffect(() => {
    if (open && isEditing && linkedDistributions.length > 0 && !hasInitializedDistributions.current) {
      hasInitializedDistributions.current = true;
      const linkedIds = linkedDistributions.map((d) => d.id);
      setSelectedDistributionIds(new Set(linkedIds));
    }
  }, [open, isEditing, linkedDistributions]);

  // Combine available and linked distributions for display
  const allDistributions = useMemo(() => {
    const map = new Map<string, DistributionWithPost>();

    // Add linked distributions first
    linkedDistributions.forEach((d) => {
      map.set(d.id, d as DistributionWithPost);
    });

    // Add available distributions
    availableDistributions.forEach((d) => {
      if (!map.has(d.id)) {
        map.set(d.id, d as DistributionWithPost);
      }
    });

    return Array.from(map.values());
  }, [availableDistributions, linkedDistributions]);

  // Filter distributions by search
  const filteredDistributions = useMemo(() => {
    if (!distributionSearch.trim()) return allDistributions;

    const search = distributionSearch.toLowerCase();
    return allDistributions.filter((d) => {
      const postTitle = (d.post?.title || "").toLowerCase();
      const accountName = (d.account?.account_name || "").toLowerCase();
      return postTitle.includes(search) || accountName.includes(search);
    });
  }, [allDistributions, distributionSearch]);

  // Handle distribution toggle
  const handleToggleDistribution = useCallback((distributionId: string) => {
    setSelectedDistributionIds((prev) => {
      const next = new Set(prev);
      if (next.has(distributionId)) {
        next.delete(distributionId);
      } else {
        next.add(distributionId);
      }
      return next;
    });
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        objective,
        status,
        start_date: startDate || null,
        end_date: endDate || null,
        budget_allocated: budget ? parseFloat(budget) : null,
        distributionIds: Array.from(selectedDistributionIds),
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    name,
    description,
    objective,
    status,
    startDate,
    endDate,
    budget,
    selectedDistributionIds,
    onSubmit,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Campaign" : "New Campaign"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q1 Product Launch"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Campaign goals and strategy..."
              rows={2}
            />
          </div>

          {/* Objective */}
          <div className="space-y-2">
            <Label htmlFor="objective">Objective</Label>
            <Select
              value={objective}
              onValueChange={(value) => setObjective(value as ContentCampaignObjective)}
            >
              <SelectTrigger id="objective">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {objectiveOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <p className="text-[10px] text-text-muted">{option.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status (only for editing) */}
          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ContentCampaignStatus)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label htmlFor="budget">Budget (optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
              <Input
                id="budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>

          {/* Platform Filter */}
          <div className="space-y-2">
            <Label htmlFor="platform">Filter by Platform (optional)</Label>
            <Select
              value={selectedPlatformId || "all"}
              onValueChange={(value) => setSelectedPlatformId(value === "all" ? "" : value)}
            >
              <SelectTrigger id="platform">
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {platforms.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id}>
                    <div className="flex items-center gap-2">
                      <PlatformIcon platformName={platform.name} size="sm" />
                      <span>{platform.display_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Distribution Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Link Distributions</Label>
              <span className="text-[11px] text-text-muted">
                {selectedDistributionIds.size} selected
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                placeholder="Search distributions..."
                value={distributionSearch}
                onChange={(e) => setDistributionSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Distribution List */}
            <div className="h-[200px] border rounded-lg p-2 overflow-y-auto">
              {isLoadingDistributions ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                </div>
              ) : filteredDistributions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-muted">
                  <FileText className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-small">No distributions found</p>
                  <p className="text-[11px]">
                    {selectedPlatformId
                      ? "Try selecting a different platform"
                      : "Create distributions for your posts first"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDistributions.map((distribution) => (
                    <DistributionItem
                      key={distribution.id}
                      distribution={distribution}
                      isSelected={selectedDistributionIds.has(distribution.id)}
                      onToggle={() => handleToggleDistribution(distribution.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
