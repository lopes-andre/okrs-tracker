"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, SlidersHorizontal, X, Star, Image as ImageIcon, Link2, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PlatformIcon } from "./platform-icon";
import { cn } from "@/lib/utils";
import type { ContentGoal, ContentAccountWithPlatform } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

export interface KanbanFilters {
  search: string;
  goalIds: string[];
  accountIds: string[];
  hasDistributions: boolean | null;
  isFavorite: boolean | null;
  hasMedia: boolean | null;
  hasVideoLinks: boolean | null;
  hasLinks: boolean | null;
}

interface KanbanFiltersProps {
  goals: ContentGoal[];
  accounts: ContentAccountWithPlatform[];
  filters: KanbanFilters;
  onFiltersChange: (filters: KanbanFilters) => void;
}

export const defaultFilters: KanbanFilters = {
  search: "",
  goalIds: [],
  accountIds: [],
  hasDistributions: null,
  isFavorite: null,
  hasMedia: null,
  hasVideoLinks: null,
  hasLinks: null,
};

// ============================================================================
// COMPONENT
// ============================================================================

// Debounce delay in milliseconds
const SEARCH_DEBOUNCE_MS = 300;

export function KanbanFilters({
  goals,
  accounts,
  filters,
  onFiltersChange,
}: KanbanFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Local search state for immediate UI feedback
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Sync local search when filters.search changes externally (e.g., clear filters)
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Debounce search updates to parent
  useEffect(() => {
    // Skip if already in sync
    if (localSearch === filters.search) return;

    const timeoutId = setTimeout(() => {
      onFiltersChange({ ...filters, search: localSearch });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [localSearch, filters, onFiltersChange]);

  // Calculate active filter count
  const activeFilterCount =
    filters.goalIds.length +
    filters.accountIds.length +
    (filters.hasDistributions !== null ? 1 : 0) +
    (filters.isFavorite === true ? 1 : 0) +
    (filters.hasMedia !== null ? 1 : 0) +
    (filters.hasVideoLinks !== null ? 1 : 0) +
    (filters.hasLinks !== null ? 1 : 0);

  // Handle search change (updates local state, debounced to parent)
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
  }, []);

  // Handle immediate clear (bypass debounce)
  const handleClearSearch = useCallback(() => {
    setLocalSearch("");
    onFiltersChange({ ...filters, search: "" });
  }, [filters, onFiltersChange]);

  // Toggle goal filter
  const toggleGoal = useCallback(
    (goalId: string) => {
      const newGoalIds = filters.goalIds.includes(goalId)
        ? filters.goalIds.filter((id) => id !== goalId)
        : [...filters.goalIds, goalId];
      onFiltersChange({ ...filters, goalIds: newGoalIds });
    },
    [filters, onFiltersChange]
  );

  // Toggle account filter
  const toggleAccount = useCallback(
    (accountId: string) => {
      const newAccountIds = filters.accountIds.includes(accountId)
        ? filters.accountIds.filter((id) => id !== accountId)
        : [...filters.accountIds, accountId];
      onFiltersChange({ ...filters, accountIds: newAccountIds });
    },
    [filters, onFiltersChange]
  );

  // Toggle hasDistributions filter
  const toggleHasDistributions = useCallback(
    (value: boolean | null) => {
      onFiltersChange({ ...filters, hasDistributions: value });
    },
    [filters, onFiltersChange]
  );

  // Toggle favorites filter
  const toggleFavorites = useCallback(
    (value: boolean | null) => {
      onFiltersChange({ ...filters, isFavorite: value });
    },
    [filters, onFiltersChange]
  );

  // Toggle hasMedia filter
  const toggleHasMedia = useCallback(
    (value: boolean | null) => {
      onFiltersChange({ ...filters, hasMedia: value });
    },
    [filters, onFiltersChange]
  );

  // Toggle hasVideoLinks filter
  const toggleHasVideoLinks = useCallback(
    (value: boolean | null) => {
      onFiltersChange({ ...filters, hasVideoLinks: value });
    },
    [filters, onFiltersChange]
  );

  // Toggle hasLinks filter
  const toggleHasLinks = useCallback(
    (value: boolean | null) => {
      onFiltersChange({ ...filters, hasLinks: value });
    },
    [filters, onFiltersChange]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    onFiltersChange(defaultFilters);
  }, [onFiltersChange]);

  // Group accounts by platform
  const accountsByPlatform = accounts.reduce((acc, account) => {
    const platformName = account.platform?.display_name || "Other";
    if (!acc[platformName]) {
      acc[platformName] = [];
    }
    acc[platformName].push(account);
    return acc;
  }, {} as Record<string, ContentAccountWithPlatform[]>);

  return (
    <div className="flex items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input
          type="text"
          placeholder="Search posts..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
        {localSearch && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2",
              activeFilterCount > 0 && "border-accent text-accent"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filters</h4>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
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
                    checked={filters.isFavorite === true}
                    onCheckedChange={(checked) =>
                      toggleFavorites(checked ? true : null)
                    }
                  />
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-small">Favorites only</span>
                </label>
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label className="text-small font-medium">Attachments</Label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.hasMedia === true}
                    onCheckedChange={(checked) =>
                      toggleHasMedia(checked ? true : null)
                    }
                  />
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="text-small">Has media files</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.hasVideoLinks === true}
                    onCheckedChange={(checked) =>
                      toggleHasVideoLinks(checked ? true : null)
                    }
                  />
                  <Video className="w-3.5 h-3.5" />
                  <span className="text-small">Has video links</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.hasLinks === true}
                    onCheckedChange={(checked) =>
                      toggleHasLinks(checked ? true : null)
                    }
                  />
                  <Link2 className="w-3.5 h-3.5" />
                  <span className="text-small">Has reference links</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.hasMedia === false && filters.hasVideoLinks === false && filters.hasLinks === false}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onFiltersChange({ ...filters, hasMedia: false, hasVideoLinks: false, hasLinks: false });
                      } else {
                        onFiltersChange({ ...filters, hasMedia: null, hasVideoLinks: null, hasLinks: null });
                      }
                    }}
                  />
                  <span className="text-small">No attachments</span>
                </label>
              </div>
            </div>

            {/* Distribution Status */}
            <div className="space-y-2">
              <Label className="text-small font-medium">Distribution Status</Label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.hasDistributions === true}
                    onCheckedChange={(checked) =>
                      toggleHasDistributions(checked ? true : null)
                    }
                  />
                  <span className="text-small">Has distributions</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.hasDistributions === false}
                    onCheckedChange={(checked) =>
                      toggleHasDistributions(checked ? false : null)
                    }
                  />
                  <span className="text-small">No distributions</span>
                </label>
              </div>
            </div>

            {/* Goals Filter */}
            {goals.length > 0 && (
              <div className="space-y-2">
                <Label className="text-small font-medium">Goals</Label>
                <div
                  className="space-y-1.5 max-h-32 overflow-y-auto overscroll-contain"
                  onWheel={(e) => e.stopPropagation()}
                >
                  {goals.map((goal) => (
                    <label
                      key={goal.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={filters.goalIds.includes(goal.id)}
                        onCheckedChange={() => toggleGoal(goal.id)}
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
                <div
                  className="space-y-3 max-h-48 overflow-y-auto overscroll-contain"
                  onWheel={(e) => e.stopPropagation()}
                >
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
                              checked={filters.accountIds.includes(account.id)}
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

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.isFavorite === true && (
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
          {filters.hasMedia === true && (
            <Badge variant="secondary" className="gap-1">
              <ImageIcon className="w-3 h-3" />
              Has media
              <button
                onClick={() => toggleHasMedia(null)}
                className="ml-1 hover:text-status-danger"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.hasVideoLinks === true && (
            <Badge variant="secondary" className="gap-1">
              <Video className="w-3 h-3" />
              Has video links
              <button
                onClick={() => toggleHasVideoLinks(null)}
                className="ml-1 hover:text-status-danger"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.hasLinks === true && (
            <Badge variant="secondary" className="gap-1">
              <Link2 className="w-3 h-3" />
              Has links
              <button
                onClick={() => toggleHasLinks(null)}
                className="ml-1 hover:text-status-danger"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.hasMedia === false && filters.hasVideoLinks === false && filters.hasLinks === false && (
            <Badge variant="secondary" className="gap-1">
              No attachments
              <button
                onClick={() => {
                  onFiltersChange({ ...filters, hasMedia: null, hasVideoLinks: null, hasLinks: null });
                }}
                className="ml-1 hover:text-status-danger"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.hasDistributions !== null && (
            <Badge variant="secondary" className="gap-1">
              {filters.hasDistributions ? "Has distributions" : "No distributions"}
              <button
                onClick={() => toggleHasDistributions(null)}
                className="ml-1 hover:text-status-danger"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.goalIds.map((goalId) => {
            const goal = goals.find((g) => g.id === goalId);
            if (!goal) return null;
            return (
              <Badge key={goalId} variant="secondary" className="gap-1">
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
          {filters.accountIds.map((accountId) => {
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
    </div>
  );
}
