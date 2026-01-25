"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import {
  Loader2,
  Search,
  Calendar,
  FileText,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  Target,
  X,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PlatformIcon } from "./platform-icon";
import {
  usePlatforms,
  useGoals,
  useAccountsWithPlatform,
  useCampaignDistributions,
  useAvailableDistributionsForCampaign,
  useCampaignCheckins,
} from "@/features/content/hooks";
import { cn } from "@/lib/utils";
import type {
  ContentCampaign,
  ContentCampaignStatus,
  ContentCampaignObjective,
  ContentDistribution,
  ContentDistributionStatus,
  ContentCampaignCheckin,
  ContentAccountWithPlatform,
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
  onAddCheckin?: () => void;
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

// Extended distribution type with post info including goals
interface DistributionWithPost extends ContentDistribution {
  post?: {
    id: string;
    title: string;
    plan_id: string;
    is_favorite?: boolean;
    goals?: Array<{
      goal: {
        id: string;
        name: string;
        color: string | null;
      };
    }>;
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

interface DistributionFilters {
  status: ContentDistributionStatus | "all";
  platformId: string;
  goalIds: string[];
  accountIds: string[];
  isFavorite: boolean | null;
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

const distributionStatusOptions: { value: ContentDistributionStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "posted", label: "Posted" },
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

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

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
        onClick={handleCheckboxClick}
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
// METRICS TAB COMPONENT
// ============================================================================

interface MetricsTabProps {
  campaign: ContentCampaign;
  onAddCheckin?: () => void;
}

function MetricsTab({ campaign, onAddCheckin }: MetricsTabProps) {
  const { data: checkins = [], isLoading } = useCampaignCheckins(campaign.id);

  // Calculate totals from latest checkin
  const latestCheckin = checkins[0];
  const totalSpent = latestCheckin?.amount_spent || campaign.budget_spent || 0;
  const budgetAllocated = campaign.budget_allocated || 0;
  const budgetProgress = budgetAllocated > 0 ? Math.min((totalSpent / budgetAllocated) * 100, 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-bg-1 rounded-lg">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-[11px]">Spent</span>
          </div>
          <p className="text-lg font-semibold">${totalSpent.toLocaleString()}</p>
          {budgetAllocated > 0 && (
            <p className="text-[10px] text-text-muted">of ${budgetAllocated.toLocaleString()}</p>
          )}
        </div>
        <div className="p-3 bg-bg-1 rounded-lg">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <Eye className="w-4 h-4" />
            <span className="text-[11px]">Impressions</span>
          </div>
          <p className="text-lg font-semibold">
            {latestCheckin?.impressions?.toLocaleString() || "—"}
          </p>
        </div>
        <div className="p-3 bg-bg-1 rounded-lg">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <MousePointer className="w-4 h-4" />
            <span className="text-[11px]">Clicks</span>
          </div>
          <p className="text-lg font-semibold">
            {latestCheckin?.clicks?.toLocaleString() || "—"}
          </p>
        </div>
        <div className="p-3 bg-bg-1 rounded-lg">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <Target className="w-4 h-4" />
            <span className="text-[11px]">Conversions</span>
          </div>
          <p className="text-lg font-semibold">
            {latestCheckin?.conversions?.toLocaleString() || "—"}
          </p>
        </div>
      </div>

      {/* Budget Progress */}
      {budgetAllocated > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-small">
            <span className="text-text-muted">Budget Usage</span>
            <span className="font-medium">{budgetProgress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-bg-1 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                budgetProgress > 90 ? "bg-status-danger" : budgetProgress > 70 ? "bg-status-warning" : "bg-accent"
              )}
              style={{ width: `${budgetProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Add Check-in Button */}
      {campaign.status === "active" && onAddCheckin && (
        <Button variant="outline" onClick={onAddCheckin} className="w-full">
          <TrendingUp className="w-4 h-4 mr-2" />
          Add Check-in
        </Button>
      )}

      {/* Check-in History */}
      <div className="space-y-3">
        <h4 className="text-small font-medium text-text-muted">Check-in History</h4>
        {checkins.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-small">No check-ins yet</p>
            <p className="text-[11px]">Add a check-in to track campaign performance</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {checkins.map((checkin) => (
              <CheckinCard key={checkin.id} checkin={checkin} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckinCard({ checkin }: { checkin: ContentCampaignCheckin }) {
  return (
    <div className="p-3 border border-border-soft rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-small font-medium">
          {format(new Date(checkin.checked_at), "MMM d, yyyy 'at' h:mm a")}
        </span>
        <Badge variant="outline" className="text-[10px]">
          ${checkin.amount_spent.toLocaleString()}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        {checkin.impressions !== null && (
          <div>
            <span className="text-text-muted">Impressions: </span>
            <span className="font-medium">{checkin.impressions.toLocaleString()}</span>
          </div>
        )}
        {checkin.clicks !== null && (
          <div>
            <span className="text-text-muted">Clicks: </span>
            <span className="font-medium">{checkin.clicks.toLocaleString()}</span>
          </div>
        )}
        {checkin.conversions !== null && (
          <div>
            <span className="text-text-muted">Conversions: </span>
            <span className="font-medium">{checkin.conversions.toLocaleString()}</span>
          </div>
        )}
      </div>
      {checkin.notes && (
        <p className="mt-2 text-[11px] text-text-muted">{checkin.notes}</p>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CampaignDialog({
  open,
  onOpenChange,
  planId,
  campaign,
  onSubmit,
  onAddCheckin,
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

  // Tab state
  const [activeTab, setActiveTab] = useState("details");

  // Distribution selection state
  const [selectedDistributionIds, setSelectedDistributionIds] = useState<Set<string>>(new Set());
  const [distributionSearch, setDistributionSearch] = useState("");
  const [distributionFilters, setDistributionFilters] = useState<DistributionFilters>({
    status: "all",
    platformId: "",
    goalIds: [],
    accountIds: [],
    isFavorite: null,
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Fetch data
  const { data: platforms = [] } = usePlatforms();
  const { data: goals = [] } = useGoals(planId);
  const { data: accounts = [] } = useAccountsWithPlatform(planId);
  const { data: availableDistributions = [], isLoading: isLoadingDistributions } =
    useAvailableDistributionsForCampaign(
      planId,
      campaign?.id,
      distributionFilters.platformId || undefined
    );
  const { data: linkedDistributions = [] } = useCampaignDistributions(campaign?.id || "");

  // Track if we've initialized distributions for this dialog session
  const hasInitializedDistributions = useRef(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      hasInitializedDistributions.current = false;
      setActiveTab("details");
      if (campaign) {
        setName(campaign.name || "");
        setDescription(campaign.description || "");
        setObjective(campaign.objective);
        setStatus(campaign.status);
        setStartDate(campaign.start_date || "");
        setEndDate(campaign.end_date || "");
        setBudget(campaign.budget_allocated?.toString() || "");
      } else {
        setName("");
        setDescription("");
        setObjective("awareness");
        setStatus("draft");
        setStartDate("");
        setEndDate("");
        setBudget("");
        setSelectedDistributionIds(new Set());
      }
      setDistributionSearch("");
      setDistributionFilters({ status: "all", platformId: "", goalIds: [], accountIds: [], isFavorite: null });
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

  // Group accounts by platform for filter UI
  const accountsByPlatform = useMemo(() => {
    return accounts.reduce((acc, account) => {
      const platformName = account.platform?.display_name || "Other";
      if (!acc[platformName]) {
        acc[platformName] = [];
      }
      acc[platformName].push(account);
      return acc;
    }, {} as Record<string, ContentAccountWithPlatform[]>);
  }, [accounts]);

  // Filter distributions by search and filters
  const filteredDistributions = useMemo(() => {
    return allDistributions.filter((d) => {
      // Search filter
      if (distributionSearch.trim()) {
        const search = distributionSearch.toLowerCase();
        const postTitle = (d.post?.title || "").toLowerCase();
        const accountName = (d.account?.account_name || "").toLowerCase();
        if (!postTitle.includes(search) && !accountName.includes(search)) {
          return false;
        }
      }

      // Status filter
      if (distributionFilters.status !== "all" && d.status !== distributionFilters.status) {
        return false;
      }

      // Favorites filter
      if (distributionFilters.isFavorite === true && !d.post?.is_favorite) {
        return false;
      }

      // Goals filter
      if (distributionFilters.goalIds.length > 0) {
        const postGoalIds = d.post?.goals?.map((g) => g.goal.id) || [];
        const hasMatchingGoal = distributionFilters.goalIds.some((id) => postGoalIds.includes(id));
        if (!hasMatchingGoal) {
          return false;
        }
      }

      // Accounts filter
      if (distributionFilters.accountIds.length > 0) {
        if (!d.account?.id || !distributionFilters.accountIds.includes(d.account.id)) {
          return false;
        }
      }

      return true;
    });
  }, [allDistributions, distributionSearch, distributionFilters]);

  // Count active filters
  const activeFiltersCount =
    (distributionFilters.status !== "all" ? 1 : 0) +
    (distributionFilters.platformId ? 1 : 0) +
    distributionFilters.goalIds.length +
    distributionFilters.accountIds.length +
    (distributionFilters.isFavorite === true ? 1 : 0);

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

  // Toggle goal filter
  const toggleGoal = useCallback((goalId: string) => {
    setDistributionFilters((f) => ({
      ...f,
      goalIds: f.goalIds.includes(goalId)
        ? f.goalIds.filter((id) => id !== goalId)
        : [...f.goalIds, goalId],
    }));
  }, []);

  // Toggle account filter
  const toggleAccount = useCallback((accountId: string) => {
    setDistributionFilters((f) => ({
      ...f,
      accountIds: f.accountIds.includes(accountId)
        ? f.accountIds.filter((id) => id !== accountId)
        : [...f.accountIds, accountId],
    }));
  }, []);

  // Toggle favorites filter
  const toggleFavorites = useCallback((value: boolean | null) => {
    setDistributionFilters((f) => ({ ...f, isFavorite: value }));
  }, []);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setDistributionFilters({ status: "all", platformId: "", goalIds: [], accountIds: [], isFavorite: null });
    setDistributionSearch("");
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Campaign" : "New Campaign"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger
              value="details"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="distributions"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent"
            >
              Distributions
              {selectedDistributionIds.size > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5">
                  {selectedDistributionIds.size}
                </Badge>
              )}
            </TabsTrigger>
            {isEditing && (
              <TabsTrigger
                value="metrics"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent"
              >
                Metrics
              </TabsTrigger>
            )}
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-y-auto mt-4 space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
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
            </div>

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
          </TabsContent>

          {/* Distributions Tab */}
          <TabsContent value="distributions" className="flex-1 overflow-hidden mt-4 flex flex-col">
            {/* Filters Row */}
            <div className="flex items-center gap-3 mb-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input
                  placeholder="Search by post title or account..."
                  value={distributionSearch}
                  onChange={(e) => setDistributionSearch(e.target.value)}
                  className="pl-9"
                />
                {distributionSearch && (
                  <button
                    onClick={() => setDistributionSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Popover */}
              <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "gap-2",
                      activeFiltersCount > 0 && "border-accent text-accent"
                    )}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filters</h4>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={handleClearFilters}
                          className="text-small text-text-muted hover:text-text"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Quick Filters */}
                    <div className="space-y-2">
                      <Label className="text-small font-medium">Quick Filters</Label>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={distributionFilters.isFavorite === true}
                            onCheckedChange={(checked) =>
                              toggleFavorites(checked ? true : null)
                            }
                          />
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-small">Favorites only</span>
                        </label>
                      </div>
                    </div>

                    {/* Distribution Status */}
                    <div className="space-y-2">
                      <Label className="text-small font-medium">Distribution Status</Label>
                      <Select
                        value={distributionFilters.status}
                        onValueChange={(value) => setDistributionFilters((f) => ({ ...f, status: value as ContentDistributionStatus | "all" }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          {distributionStatusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Platform Filter */}
                    <div className="space-y-2">
                      <Label className="text-small font-medium">Platform</Label>
                      <Select
                        value={distributionFilters.platformId || "all"}
                        onValueChange={(value) => setDistributionFilters((f) => ({ ...f, platformId: value === "all" ? "" : value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Platforms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Platforms</SelectItem>
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

                    {/* Goals Filter */}
                    {goals.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-small font-medium">Goals</Label>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto overscroll-contain">
                          {goals.map((goal) => (
                            <label
                              key={goal.id}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Checkbox
                                checked={distributionFilters.goalIds.includes(goal.id)}
                                onCheckedChange={() => toggleGoal(goal.id)}
                              />
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: goal.color || "#888" }}
                              />
                              <span className="text-small truncate">{goal.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Accounts Filter */}
                    {accounts.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-small font-medium">Accounts</Label>
                        <div className="space-y-3 max-h-48 overflow-y-auto overscroll-contain">
                          {Object.entries(accountsByPlatform).map(([platformName, platformAccounts]) => (
                            <div key={platformName}>
                              <p className="text-xs text-text-muted mb-1.5">{platformName}</p>
                              <div className="space-y-1.5">
                                {platformAccounts.map((account) => (
                                  <label
                                    key={account.id}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={distributionFilters.accountIds.includes(account.id)}
                                      onCheckedChange={() => toggleAccount(account.id)}
                                    />
                                    <PlatformIcon
                                      platformName={account.platform?.name || "blog"}
                                      size="sm"
                                    />
                                    <span className="text-small truncate">
                                      {account.account_name}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Active Filter Tags */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {distributionFilters.isFavorite === true && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="w-3 h-3 text-amber-500" />
                    Favorites
                    <button
                      onClick={() => toggleFavorites(null)}
                      className="ml-1 hover:text-status-danger"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {distributionFilters.status !== "all" && (
                  <Badge variant="secondary" className="gap-1 capitalize">
                    {distributionFilters.status}
                    <button
                      onClick={() => setDistributionFilters((f) => ({ ...f, status: "all" }))}
                      className="ml-1 hover:text-status-danger"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {distributionFilters.platformId && (
                  <Badge variant="secondary" className="gap-1">
                    <PlatformIcon
                      platformName={platforms.find((p) => p.id === distributionFilters.platformId)?.name || "blog"}
                      size="sm"
                    />
                    {platforms.find((p) => p.id === distributionFilters.platformId)?.display_name}
                    <button
                      onClick={() => setDistributionFilters((f) => ({ ...f, platformId: "" }))}
                      className="ml-1 hover:text-status-danger"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {distributionFilters.goalIds.map((goalId) => {
                  const goal = goals.find((g) => g.id === goalId);
                  if (!goal) return null;
                  return (
                    <Badge key={goalId} variant="secondary" className="gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: goal.color || "#888" }}
                      />
                      {goal.name}
                      <button
                        onClick={() => toggleGoal(goalId)}
                        className="ml-1 hover:text-status-danger"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
                {distributionFilters.accountIds.map((accountId) => {
                  const account = accounts.find((a) => a.id === accountId);
                  if (!account) return null;
                  return (
                    <Badge key={accountId} variant="secondary" className="gap-1">
                      <PlatformIcon
                        platformName={account.platform?.name || "blog"}
                        size="sm"
                      />
                      {account.account_name}
                      <button
                        onClick={() => toggleAccount(accountId)}
                        className="ml-1 hover:text-status-danger"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Selected Count */}
            <div className="flex items-center justify-between mb-2 text-small">
              <span className="text-text-muted">
                {filteredDistributions.length} distribution{filteredDistributions.length !== 1 ? "s" : ""}
              </span>
              <span className="font-medium">{selectedDistributionIds.size} selected</span>
            </div>

            {/* Distribution List */}
            <div className="flex-1 border rounded-lg p-2 overflow-y-auto min-h-[300px]">
              {isLoadingDistributions ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                </div>
              ) : filteredDistributions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-muted">
                  <FileText className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-small">No distributions found</p>
                  <p className="text-[11px]">
                    {activeFiltersCount > 0 || distributionSearch
                      ? "Try adjusting your filters"
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
          </TabsContent>

          {/* Metrics Tab */}
          {isEditing && campaign && (
            <TabsContent value="metrics" className="flex-1 overflow-y-auto mt-4">
              <MetricsTab campaign={campaign} onAddCheckin={onAddCheckin} />
            </TabsContent>
          )}
        </Tabs>

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
