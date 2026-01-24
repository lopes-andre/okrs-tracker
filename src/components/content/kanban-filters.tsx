"use client";

import { useState, useCallback } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
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
};

// ============================================================================
// COMPONENT
// ============================================================================

export function KanbanFilters({
  goals,
  accounts,
  filters,
  onFiltersChange,
}: KanbanFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate active filter count
  const activeFilterCount =
    filters.goalIds.length +
    filters.accountIds.length +
    (filters.hasDistributions !== null ? 1 : 0);

  // Handle search change
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value });
    },
    [filters, onFiltersChange]
  );

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
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
        {filters.search && (
          <button
            onClick={() => handleSearchChange("")}
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
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
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
                <div className="space-y-3 max-h-48 overflow-y-auto">
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
