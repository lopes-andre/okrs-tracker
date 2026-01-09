"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  X, 
  Hash, 
  Target, 
  Percent, 
  TrendingUp,
  CheckCircle2,
  BarChart3,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  AnnualKr,
  AnnualKrInsert,
  AnnualKrUpdate,
  KrType,
  KrDirection,
  KrAggregation,
  KrGroup,
  Tag,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface AnnualKrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveId: string;
  kr?: AnnualKr | null;
  groups: KrGroup[];
  tags: Tag[];
  selectedTags?: string[];
  onSubmit: (data: AnnualKrInsert | AnnualKrUpdate, tagIds: string[]) => Promise<void>;
}

// Type configurations with defaults and field visibility
const krTypeConfig: Record<KrType, {
  label: string;
  description: string;
  icon: typeof Target;
  example: string;
  fields: {
    direction: boolean;
    aggregation: boolean;
    startValue: boolean;
    targetValue: boolean;
    unit: boolean;
  };
  defaults: {
    direction: KrDirection;
    aggregation: KrAggregation;
    startValue: number;
    targetValue: number | null;
    unit: string;
  };
}> = {
  metric: {
    label: "Metric",
    description: "Track any numeric value over time",
    icon: TrendingUp,
    example: "Revenue, followers, MRR",
    fields: {
      direction: true,
      aggregation: true,
      startValue: true,
      targetValue: true,
      unit: true,
    },
    defaults: {
      direction: "increase",
      aggregation: "cumulative",
      startValue: 0,
      targetValue: null,
      unit: "",
    },
  },
  count: {
    label: "Count",
    description: "Count items or completions",
    icon: Hash,
    example: "Blog posts, features shipped, calls made",
    fields: {
      direction: false, // Always increase
      aggregation: true,
      startValue: false, // Always 0
      targetValue: true,
      unit: true,
    },
    defaults: {
      direction: "increase",
      aggregation: "cumulative",
      startValue: 0,
      targetValue: null,
      unit: "",
    },
  },
  milestone: {
    label: "Milestone",
    description: "Binary goal - done or not done",
    icon: CheckCircle2,
    example: "Launch product, hire manager, complete certification",
    fields: {
      direction: false,
      aggregation: false,
      startValue: false,
      targetValue: false,
      unit: false,
    },
    defaults: {
      direction: "increase",
      aggregation: "cumulative",
      startValue: 0,
      targetValue: 1,
      unit: "",
    },
  },
  rate: {
    label: "Rate",
    description: "Track percentages or conversion rates",
    icon: Percent,
    example: "Conversion rate, retention %, NPS score",
    fields: {
      direction: true,
      aggregation: false,
      startValue: true,
      targetValue: true,
      unit: true,
    },
    defaults: {
      direction: "increase",
      aggregation: "reset_quarterly",
      startValue: 0,
      targetValue: null,
      unit: "%",
    },
  },
  average: {
    label: "Average",
    description: "Track averages over time periods",
    icon: BarChart3,
    example: "Avg response time, avg deal size, avg rating",
    fields: {
      direction: true,
      aggregation: false,
      startValue: true,
      targetValue: true,
      unit: true,
    },
    defaults: {
      direction: "increase",
      aggregation: "reset_quarterly",
      startValue: 0,
      targetValue: null,
      unit: "",
    },
  },
};

const directions: { value: KrDirection; label: string; icon: string }[] = [
  { value: "increase", label: "Increase", icon: "↑" },
  { value: "decrease", label: "Decrease", icon: "↓" },
  { value: "maintain", label: "Maintain", icon: "→" },
];

const aggregations: { value: KrAggregation; label: string; shortLabel: string; description: string }[] = [
  { value: "cumulative", label: "Cumulative", shortLabel: "YTD Total", description: "Year-to-date total" },
  { value: "reset_quarterly", label: "Reset Quarterly", shortLabel: "Per Quarter", description: "Fresh start each quarter" },
];

export function AnnualKrDialog({
  open,
  onOpenChange,
  objectiveId,
  kr,
  groups,
  tags,
  selectedTags: initialSelectedTags = [],
  onSubmit,
}: AnnualKrDialogProps) {
  const isEditing = !!kr;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [krType, setKrType] = useState<KrType>("metric");
  const [direction, setDirection] = useState<KrDirection>("increase");
  const [aggregation, setAggregation] = useState<KrAggregation>("cumulative");
  const [unit, setUnit] = useState("");
  const [startValue, setStartValue] = useState("0");
  const [targetValue, setTargetValue] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const config = krTypeConfig[krType];

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (kr) {
        setName(kr.name);
        setDescription(kr.description || "");
        setKrType(kr.kr_type);
        setDirection(kr.direction);
        setAggregation(kr.aggregation);
        setUnit(kr.unit || "");
        setStartValue(String(kr.start_value));
        setTargetValue(String(kr.target_value));
        setGroupId(kr.group_id || "");
        setSelectedTagIds(initialSelectedTags);
      } else {
        setName("");
        setDescription("");
        setKrType("metric");
        setDirection("increase");
        setAggregation("cumulative");
        setUnit("");
        setStartValue("0");
        setTargetValue("");
        setGroupId("");
        setSelectedTagIds([]);
      }
    }
  }, [open, kr, initialSelectedTags]);

  // Update defaults when type changes (only for new KRs)
  function handleTypeChange(newType: KrType) {
    setKrType(newType);
    
    // Only apply defaults for new KRs
    if (!isEditing) {
      const newConfig = krTypeConfig[newType];
      setDirection(newConfig.defaults.direction);
      setAggregation(newConfig.defaults.aggregation);
      setStartValue(String(newConfig.defaults.startValue));
      setUnit(newConfig.defaults.unit);
      
      // Clear target value for milestone (will be auto-set to 1)
      if (newType === "milestone") {
        setTargetValue("1");
      } else if (newConfig.defaults.targetValue !== null) {
        setTargetValue(String(newConfig.defaults.targetValue));
      }
    }
  }

  // Toggle tag selection
  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  // Get effective values based on type
  function getEffectiveValues() {
    const effectiveStartValue = config.fields.startValue ? parseFloat(startValue) || 0 : 0;
    const effectiveTargetValue = krType === "milestone" ? 1 : parseFloat(targetValue) || 0;
    const effectiveDirection = config.fields.direction ? direction : "increase";
    const effectiveAggregation = config.fields.aggregation ? aggregation : "cumulative";
    const effectiveUnit = config.fields.unit ? (unit || null) : null;
    
    return {
      startValue: effectiveStartValue,
      targetValue: effectiveTargetValue,
      direction: effectiveDirection,
      aggregation: effectiveAggregation,
      unit: effectiveUnit,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (krType !== "milestone" && !targetValue) return;

    setIsSubmitting(true);
    try {
      const values = getEffectiveValues();
      
      const data = isEditing
        ? {
            name,
            description: description || null,
            kr_type: krType,
            direction: values.direction,
            aggregation: values.aggregation,
            unit: values.unit,
            start_value: values.startValue,
            target_value: values.targetValue,
            group_id: groupId || null,
          }
        : {
            objective_id: objectiveId,
            name,
            description: description || null,
            kr_type: krType,
            direction: values.direction,
            aggregation: values.aggregation,
            unit: values.unit,
            start_value: values.startValue,
            target_value: values.targetValue,
            current_value: values.startValue,
            group_id: groupId || null,
            sort_order: 0,
          };

      await onSubmit(data, selectedTagIds);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  const TypeIcon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-h4">
            {isEditing ? "Edit Key Result" : "Create Key Result"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the key result configuration."
              : "Define a measurable outcome to track your progress."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selection - Card Style */}
          <div className="space-y-3">
            <Label className="text-body-sm font-medium">Type</Label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(krTypeConfig) as KrType[]).map((type) => {
                const typeConf = krTypeConfig[type];
                const Icon = typeConf.icon;
                const isSelected = krType === type;
                
                return (
                  <TooltipProvider key={type} delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleTypeChange(type)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-card border-2 transition-all",
                            isSelected
                              ? "border-accent bg-accent/5 text-accent"
                              : "border-border-soft bg-bg-0 text-text-muted hover:border-border hover:bg-bg-1"
                          )}
                        >
                          <Icon className={cn("w-5 h-5", isSelected && "text-accent")} />
                          <span className={cn(
                            "text-xs font-medium",
                            isSelected ? "text-accent" : "text-text-strong"
                          )}>
                            {typeConf.label}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px]">
                        <p className="font-medium">{typeConf.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          e.g., {typeConf.example}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>

          {/* Name & Description Section */}
          <div className="space-y-4 p-4 bg-bg-1 rounded-card">
            <div className="space-y-2">
              <Label htmlFor="kr-name" className="flex items-center gap-2">
                <TypeIcon className="w-4 h-4 text-text-muted" />
                Name *
              </Label>
              <Input
                id="kr-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  krType === "milestone" 
                    ? "e.g., Launch new product" 
                    : krType === "count"
                    ? "e.g., Blog posts published"
                    : krType === "rate"
                    ? "e.g., Conversion rate"
                    : "e.g., Monthly revenue"
                }
                className="bg-bg-0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kr-description" className="text-text-muted">
                Description (optional)
              </Label>
              <textarea
                id="kr-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context or notes about this key result..."
                rows={2}
                className="w-full px-3 py-2 text-body-sm rounded-button border border-border-soft bg-bg-0 placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
              />
            </div>
          </div>

          {/* Type-Specific Configuration */}
          {krType === "milestone" ? (
            // Milestone: Simple completion goal
            <div className="p-4 bg-status-success/5 border border-status-success/20 rounded-card">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-status-success mt-0.5" />
                <div>
                  <p className="font-medium text-text-strong">Completion Goal</p>
                  <p className="text-small text-text-muted mt-1">
                    This key result will be tracked as complete or incomplete. 
                    Mark it done when you achieve the milestone.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Other types: Show relevant fields
            <div className="space-y-4">
              {/* Direction & Aggregation Row */}
              {(config.fields.direction || config.fields.aggregation) && (
                <div className={cn(
                  "grid gap-4",
                  config.fields.direction && config.fields.aggregation ? "grid-cols-2" : "grid-cols-1"
                )}>
                  {config.fields.direction && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        Direction
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3.5 h-3.5 text-text-subtle" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">How should progress be measured?</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {directions.map((d) => (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => setDirection(d.value)}
                            className={cn(
                              "flex items-center justify-center gap-1.5 py-2 px-3 rounded-button border transition-all text-sm",
                              direction === d.value
                                ? "border-accent bg-accent/5 text-accent font-medium"
                                : "border-border-soft text-text-muted hover:border-border"
                            )}
                          >
                            <span className="text-base">{d.icon}</span>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {config.fields.aggregation && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        Aggregation
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3.5 h-3.5 text-text-subtle" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">How to track progress across quarters</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Select value={aggregation} onValueChange={(v) => setAggregation(v as KrAggregation)}>
                        <SelectTrigger>
                          <SelectValue>
                            {aggregations.find(a => a.value === aggregation)?.shortLabel}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {aggregations.map((a) => (
                            <SelectItem key={a.value} value={a.value}>
                              <span>{a.label}</span>
                              <span className="text-xs text-text-muted ml-2">{a.description}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Values Row */}
              <div className={cn(
                "grid gap-4",
                config.fields.startValue && config.fields.targetValue && config.fields.unit
                  ? "grid-cols-3"
                  : config.fields.targetValue && config.fields.unit
                  ? "grid-cols-2"
                  : "grid-cols-1"
              )}>
                {config.fields.startValue && (
                  <div className="space-y-2">
                    <Label htmlFor="start-value">
                      {krType === "rate" ? "Current Rate" : "Start Value"}
                    </Label>
                    <Input
                      id="start-value"
                      type="number"
                      step="any"
                      value={startValue}
                      onChange={(e) => setStartValue(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                )}

                {config.fields.targetValue && (
                  <div className="space-y-2">
                    <Label htmlFor="target-value">
                      {krType === "count" 
                        ? "Target Count *" 
                        : krType === "rate"
                        ? "Target Rate *"
                        : "Target Value *"}
                    </Label>
                    <Input
                      id="target-value"
                      type="number"
                      step="any"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder={krType === "rate" ? "10" : krType === "count" ? "52" : "1000"}
                      required
                    />
                  </div>
                )}

                {config.fields.unit && (
                  <div className="space-y-2">
                    <Label htmlFor="unit">
                      Unit
                      {krType === "rate" && (
                        <span className="text-text-subtle ml-1">(default: %)</span>
                      )}
                    </Label>
                    <Input
                      id="unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder={
                        krType === "rate" 
                          ? "%" 
                          : krType === "count"
                          ? "posts"
                          : "followers"
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Group Selection */}
          {groups.length > 0 && (
            <div className="space-y-2">
              <Label>Group (optional)</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No group</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-bg-1 rounded-button min-h-[52px]">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTagIds.includes(tag.id) ? "default" : "secondary"}
                    className="cursor-pointer transition-all hover:scale-105"
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                    {selectedTagIds.includes(tag.id) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-text-subtle">Click to select/deselect tags</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border-soft">
            <Button 
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !name.trim() || (krType !== "milestone" && !targetValue)}
              className="bg-accent hover:bg-accent-hover text-white"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Key Result"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
