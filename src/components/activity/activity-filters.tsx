"use client";

import { useState } from "react";
import {
  Filter,
  Calendar,
  X,
  Target,
  TrendingUp,
  ListTodo,
  Users,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import type { EventType, EventEntityType } from "@/lib/supabase/types";

export interface ActivityFiltersState {
  datePreset: "all" | "today" | "week" | "month" | "custom";
  dateFrom?: string;
  dateTo?: string;
  entityTypes: EventEntityType[];
  eventTypes: EventType[];
}

interface ActivityFiltersProps {
  filters: ActivityFiltersState;
  onFiltersChange: (filters: ActivityFiltersState) => void;
}

const datePresetOptions = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom Range" },
];

const entityTypeOptions: { value: EventEntityType; label: string; icon: React.ElementType }[] = [
  { value: "task", label: "Tasks", icon: ListTodo },
  { value: "check_in", label: "Check-ins", icon: TrendingUp },
  { value: "objective", label: "Objectives", icon: Target },
  { value: "annual_kr", label: "Key Results", icon: TrendingUp },
  { value: "quarter_target", label: "Quarter Targets", icon: CalendarDays },
  { value: "member", label: "Members", icon: Users },
];

const eventTypeOptions: { value: EventType; label: string }[] = [
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "completed", label: "Completed" },
  { value: "started", label: "Started" },
  { value: "status_changed", label: "Status Changed" },
  { value: "deleted", label: "Deleted" },
  { value: "joined", label: "Joined" },
  { value: "left", label: "Left" },
  { value: "role_changed", label: "Role Changed" },
];

export function ActivityFilters({ filters, onFiltersChange }: ActivityFiltersProps) {
  const [customDateOpen, setCustomDateOpen] = useState(false);
  
  // Calculate dates based on preset
  const getDateRange = (preset: string): { from?: string; to?: string } => {
    const now = new Date();
    switch (preset) {
      case "today":
        const today = format(now, "yyyy-MM-dd");
        return { from: today, to: today };
      case "week":
        return {
          from: format(startOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd"),
          to: format(endOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd"),
        };
      case "month":
        return {
          from: format(startOfMonth(now), "yyyy-MM-dd"),
          to: format(endOfMonth(now), "yyyy-MM-dd"),
        };
      default:
        return {};
    }
  };
  
  const handleDatePresetChange = (preset: string) => {
    const dateRange = getDateRange(preset);
    onFiltersChange({
      ...filters,
      datePreset: preset as ActivityFiltersState["datePreset"],
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
    });
    
    if (preset === "custom") {
      setCustomDateOpen(true);
    }
  };
  
  const handleEntityTypeToggle = (type: EventEntityType) => {
    const current = filters.entityTypes;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    onFiltersChange({ ...filters, entityTypes: updated });
  };
  
  const handleEventTypeToggle = (type: EventType) => {
    const current = filters.eventTypes;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    onFiltersChange({ ...filters, eventTypes: updated });
  };
  
  const handleClearFilters = () => {
    onFiltersChange({
      datePreset: "all",
      dateFrom: undefined,
      dateTo: undefined,
      entityTypes: [],
      eventTypes: [],
    });
  };
  
  const activeFilterCount = 
    (filters.datePreset !== "all" ? 1 : 0) +
    filters.entityTypes.length +
    filters.eventTypes.length;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-muted" />
          <Select value={filters.datePreset} onValueChange={handleDatePresetChange}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {datePresetOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Custom Date Range Popover */}
        {filters.datePreset === "custom" && (
          <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <CalendarDays className="w-4 h-4" />
                {filters.dateFrom && filters.dateTo ? (
                  <span>
                    {format(new Date(filters.dateFrom), "MMM d")} - {format(new Date(filters.dateTo), "MMM d")}
                  </span>
                ) : (
                  "Select dates"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom || ""}
                    onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo || ""}
                    onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        
        {/* Entity Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Filter className="w-4 h-4" />
              Entity Type
              {filters.entityTypes.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                  {filters.entityTypes.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <div className="space-y-1">
              {entityTypeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleEntityTypeToggle(value)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-button text-small transition-colors",
                    filters.entityTypes.includes(value)
                      ? "bg-accent/10 text-accent"
                      : "hover:bg-bg-1 text-text-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {filters.entityTypes.includes(value) && (
                    <span className="ml-auto text-accent">✓</span>
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Event Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Filter className="w-4 h-4" />
              Action
              {filters.eventTypes.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                  {filters.eventTypes.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="start">
            <div className="space-y-1">
              {eventTypeOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleEventTypeToggle(value)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-button text-small transition-colors",
                    filters.eventTypes.includes(value)
                      ? "bg-accent/10 text-accent"
                      : "hover:bg-bg-1 text-text-muted"
                  )}
                >
                  {label}
                  {filters.eventTypes.includes(value) && (
                    <span className="ml-auto text-accent">✓</span>
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-9 text-text-muted hover:text-text-strong gap-1"
          >
            <X className="w-4 h-4" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>
      
      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.datePreset !== "all" && (
            <Badge variant="secondary" className="gap-1 pr-1">
              <Calendar className="w-3 h-3" />
              {datePresetOptions.find(o => o.value === filters.datePreset)?.label}
              <button
                onClick={() => handleDatePresetChange("all")}
                className="ml-1 hover:bg-bg-2 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.entityTypes.map(type => (
            <Badge key={type} variant="secondary" className="gap-1 pr-1">
              {entityTypeOptions.find(o => o.value === type)?.label}
              <button
                onClick={() => handleEntityTypeToggle(type)}
                className="ml-1 hover:bg-bg-2 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {filters.eventTypes.map(type => (
            <Badge key={type} variant="secondary" className="gap-1 pr-1">
              {eventTypeOptions.find(o => o.value === type)?.label}
              <button
                onClick={() => handleEventTypeToggle(type)}
                className="ml-1 hover:bg-bg-2 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
