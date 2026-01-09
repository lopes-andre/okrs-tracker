"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Target,
  Hash,
  Flag,
  Percent,
  BarChart3,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { KrPerformanceRow } from "@/features/analytics/api";
import type { PaceStatus } from "@/lib/progress-engine";

interface KrPerformanceTableProps {
  data: KrPerformanceRow[];
  onRecordCheckIn?: (krId: string) => void;
}

type SortField = "name" | "progress" | "paceStatus" | "currentValue" | "targetValue" | "forecast" | "lastCheckInDate";
type SortDirection = "asc" | "desc";
type GroupBy = "none" | "objective" | "krType" | "paceStatus";

// KR Type icons
const krTypeIcons: Record<string, React.ElementType> = {
  metric: TrendingUp,
  count: Hash,
  milestone: Flag,
  rate: Percent,
  average: BarChart3,
};

// Pace status styling
const paceStatusStyles: Record<string, { bg: string; text: string; label: string }> = {
  ahead: { bg: "bg-status-success/10", text: "text-status-success", label: "Ahead" },
  "on-track": { bg: "bg-status-success/10", text: "text-status-success", label: "On Track" },
  "at-risk": { bg: "bg-status-warning/10", text: "text-status-warning", label: "At Risk" },
  "off-track": { bg: "bg-status-danger/10", text: "text-status-danger", label: "Off Track" },
  complete: { bg: "bg-accent/10", text: "text-accent", label: "Complete" },
};

// Trend icons
const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
  switch (trend) {
    case "up":
      return <TrendingUp className="w-4 h-4 text-status-success" />;
    case "down":
      return <TrendingDown className="w-4 h-4 text-status-danger" />;
    default:
      return <Minus className="w-4 h-4 text-text-subtle" />;
  }
};

export function KrPerformanceTable({ data, onRecordCheckIn }: KrPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>("progress");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Sort function
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "progress":
          comparison = a.progress - b.progress;
          break;
        case "paceStatus":
          const paceOrder = { "off-track": 0, "at-risk": 1, "on-track": 2, "ahead": 3, "complete": 4 };
          comparison = (paceOrder[a.paceStatus as keyof typeof paceOrder] || 0) - 
                       (paceOrder[b.paceStatus as keyof typeof paceOrder] || 0);
          break;
        case "currentValue":
          comparison = a.currentValue - b.currentValue;
          break;
        case "targetValue":
          comparison = a.targetValue - b.targetValue;
          break;
        case "forecast":
          comparison = a.forecast - b.forecast;
          break;
        case "lastCheckInDate":
          const aDate = a.lastCheckInDate ? new Date(a.lastCheckInDate).getTime() : 0;
          const bDate = b.lastCheckInDate ? new Date(b.lastCheckInDate).getTime() : 0;
          comparison = aDate - bDate;
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  // Group function
  const groupedData = useMemo(() => {
    if (groupBy === "none") return { "": sortedData };
    
    const groups: Record<string, KrPerformanceRow[]> = {};
    
    sortedData.forEach((row) => {
      let groupKey: string;
      
      switch (groupBy) {
        case "objective":
          groupKey = row.objectiveName;
          break;
        case "krType":
          groupKey = row.krType.charAt(0).toUpperCase() + row.krType.slice(1);
          break;
        case "paceStatus":
          groupKey = paceStatusStyles[row.paceStatus]?.label || row.paceStatus;
          break;
        default:
          groupKey = "";
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(row);
    });
    
    return groups;
  }, [sortedData, groupBy]);

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Toggle group expansion
  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  // Sort header renderer
  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-text-strong transition-colors"
    >
      {children}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      )}
    </button>
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-text-muted" />
            KR Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-small text-text-muted">Group by:</span>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="objective">Objective</SelectItem>
                <SelectItem value="krType">KR Type</SelectItem>
                <SelectItem value="paceStatus">Pace Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">
                  <SortHeader field="name">Key Result</SortHeader>
                </TableHead>
                <TableHead className="w-[140px]">
                  <SortHeader field="progress">Progress</SortHeader>
                </TableHead>
                <TableHead className="w-[100px]">
                  <SortHeader field="paceStatus">Pace</SortHeader>
                </TableHead>
                <TableHead className="w-[100px] text-right">
                  <SortHeader field="currentValue">Current</SortHeader>
                </TableHead>
                <TableHead className="w-[100px] text-right">
                  <SortHeader field="targetValue">Target</SortHeader>
                </TableHead>
                <TableHead className="w-[100px] text-right">
                  <SortHeader field="forecast">Forecast</SortHeader>
                </TableHead>
                <TableHead className="w-[80px] text-center">Trend</TableHead>
                <TableHead className="w-[120px]">
                  <SortHeader field="lastCheckInDate">Last Update</SortHeader>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedData).map(([group, rows]) => (
                <>
                  {/* Group Header */}
                  {groupBy !== "none" && group && (
                    <TableRow 
                      key={`group-${group}`}
                      className="bg-bg-1/50 hover:bg-bg-1"
                    >
                      <TableCell 
                        colSpan={8}
                        className="py-2 cursor-pointer"
                        onClick={() => toggleGroup(group)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedGroups.has(group) || groupBy === "none" ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span className="font-medium text-text-strong">{group}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {rows.length} KR{rows.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {/* Group Rows */}
                  {(groupBy === "none" || expandedGroups.has(group) || !group) && rows.map((row) => {
                    const TypeIcon = krTypeIcons[row.krType] || Target;
                    const paceStyle = paceStatusStyles[row.paceStatus] || paceStatusStyles["on-track"];
                    
                    return (
                      <TableRow key={row.id} className="hover:bg-bg-1/30">
                        {/* KR Name */}
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <div className={cn(
                              "w-7 h-7 rounded-button flex items-center justify-center shrink-0 mt-0.5",
                              paceStyle.bg
                            )}>
                              <TypeIcon className={cn("w-3.5 h-3.5", paceStyle.text)} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-text-strong truncate max-w-[180px]">
                                {row.name}
                              </p>
                              {groupBy !== "objective" && (
                                <p className="text-xs text-text-muted truncate max-w-[180px]">
                                  {row.objectiveName}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* Progress */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={Math.min(row.progress * 100, 100)} 
                              className="h-2 w-16"
                            />
                            <span className="text-small font-medium">
                              {Math.round(row.progress * 100)}%
                            </span>
                          </div>
                        </TableCell>
                        
                        {/* Pace Status */}
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={cn("text-[10px]", paceStyle.bg, paceStyle.text, "border-transparent")}
                          >
                            {paceStyle.label}
                          </Badge>
                        </TableCell>
                        
                        {/* Current Value */}
                        <TableCell className="text-right">
                          <span className="text-small font-medium">
                            {row.krType === "milestone" 
                              ? (row.currentValue >= 1 ? "Done" : "Pending")
                              : row.currentValue.toLocaleString()}
                          </span>
                          {row.unit && row.krType !== "milestone" && (
                            <span className="text-xs text-text-muted ml-1">{row.unit}</span>
                          )}
                        </TableCell>
                        
                        {/* Target Value */}
                        <TableCell className="text-right">
                          <span className="text-small">
                            {row.krType === "milestone" 
                              ? "Complete"
                              : row.targetValue.toLocaleString()}
                          </span>
                          {row.unit && row.krType !== "milestone" && (
                            <span className="text-xs text-text-muted ml-1">{row.unit}</span>
                          )}
                        </TableCell>
                        
                        {/* Forecast */}
                        <TableCell className="text-right">
                          {row.krType !== "milestone" && row.forecast != null && (
                            <>
                              <span className={cn(
                                "text-small font-medium",
                                row.forecast >= row.targetValue ? "text-status-success" : "text-status-warning"
                              )}>
                                {row.forecast.toLocaleString()}
                              </span>
                              {row.unit && (
                                <span className="text-xs text-text-muted ml-1">{row.unit}</span>
                              )}
                            </>
                          )}
                          {row.krType !== "milestone" && row.forecast == null && (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                        </TableCell>
                        
                        {/* Trend */}
                        <TableCell className="text-center">
                          <TrendIcon trend={row.trend} />
                        </TableCell>
                        
                        {/* Last Update */}
                        <TableCell>
                          {row.lastCheckInDate ? (
                            <div className="flex items-center gap-1 text-small text-text-muted">
                              <Calendar className="w-3 h-3" />
                              {formatDistanceToNow(new Date(row.lastCheckInDate), { addSuffix: true })}
                            </div>
                          ) : (
                            <span className="text-small text-text-subtle">Never</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
