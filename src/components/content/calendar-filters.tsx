"use client";

import { Filter, X } from "lucide-react";
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
import type { ContentAccountWithPlatform } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

export interface CalendarFiltersState {
  status: "all" | "scheduled" | "posted";
  accountIds: string[];
  platformIds: string[];
}

export const defaultCalendarFilters: CalendarFiltersState = {
  status: "all",
  accountIds: [],
  platformIds: [],
};

interface CalendarFiltersProps {
  filters: CalendarFiltersState;
  onFiltersChange: (filters: CalendarFiltersState) => void;
  accounts: ContentAccountWithPlatform[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CalendarFilters({
  filters,
  onFiltersChange,
  accounts,
}: CalendarFiltersProps) {
  // Get unique platforms from accounts
  const platforms = Array.from(
    new Map(
      accounts.map((a) => [a.platform_id, { id: a.platform_id, name: a.platform.name }])
    ).values()
  );

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.accountIds.length > 0 ||
    filters.platformIds.length > 0;

  const activeFilterCount =
    (filters.status !== "all" ? 1 : 0) +
    filters.accountIds.length +
    filters.platformIds.length;

  const clearFilters = () => {
    onFiltersChange(defaultCalendarFilters);
  };

  const toggleStatus = (status: CalendarFiltersState["status"]) => {
    onFiltersChange({
      ...filters,
      status: filters.status === status ? "all" : status,
    });
  };

  const toggleAccount = (accountId: string) => {
    const newAccountIds = filters.accountIds.includes(accountId)
      ? filters.accountIds.filter((id) => id !== accountId)
      : [...filters.accountIds, accountId];
    onFiltersChange({ ...filters, accountIds: newAccountIds });
  };

  const togglePlatform = (platformId: string) => {
    const newPlatformIds = filters.platformIds.includes(platformId)
      ? filters.platformIds.filter((id) => id !== platformId)
      : [...filters.platformIds, platformId];
    onFiltersChange({ ...filters, platformIds: newPlatformIds });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Status Quick Filters */}
      <div className="flex items-center gap-1">
        <Badge
          variant={filters.status === "all" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onFiltersChange({ ...filters, status: "all" })}
        >
          All
        </Badge>
        <Badge
          variant={filters.status === "scheduled" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => toggleStatus("scheduled")}
        >
          Scheduled
        </Badge>
        <Badge
          variant={filters.status === "posted" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => toggleStatus("posted")}
        >
          Posted
        </Badge>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Advanced Filters Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <div className="space-y-4">
            {/* Platforms Section */}
            {platforms.length > 0 && (
              <div className="space-y-2">
                <Label className="text-small font-medium">Platforms</Label>
                <div className="space-y-2">
                  {platforms.map((platform) => (
                    <div key={platform.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`platform-${platform.id}`}
                        checked={filters.platformIds.includes(platform.id)}
                        onCheckedChange={() => togglePlatform(platform.id)}
                      />
                      <label
                        htmlFor={`platform-${platform.id}`}
                        className="flex items-center gap-2 text-small cursor-pointer"
                      >
                        <PlatformIcon platformName={platform.name} size="sm" />
                        {platform.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accounts Section */}
            {accounts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-small font-medium">Accounts</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`account-${account.id}`}
                        checked={filters.accountIds.includes(account.id)}
                        onCheckedChange={() => toggleAccount(account.id)}
                      />
                      <label
                        htmlFor={`account-${account.id}`}
                        className="flex items-center gap-2 text-small cursor-pointer"
                      >
                        <PlatformIcon platformName={account.platform.name} size="sm" />
                        {account.account_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1 text-text-muted"
        >
          <X className="w-3 h-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
