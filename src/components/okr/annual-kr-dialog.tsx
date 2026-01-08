"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X } from "lucide-react";
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

const krTypes: { value: KrType; label: string; description: string }[] = [
  { value: "metric", label: "Metric", description: "Numeric value with unit" },
  { value: "count", label: "Count", description: "Integer count of items" },
  { value: "milestone", label: "Milestone", description: "Binary done/not done" },
  { value: "rate", label: "Rate", description: "Percentage or ratio" },
  { value: "average", label: "Average", description: "Averaged over time" },
];

const directions: { value: KrDirection; label: string }[] = [
  { value: "increase", label: "↑ Increase" },
  { value: "decrease", label: "↓ Decrease" },
  { value: "maintain", label: "→ Maintain" },
];

const aggregations: { value: KrAggregation; label: string; description: string }[] = [
  { value: "reset_quarterly", label: "Reset Quarterly", description: "Each quarter starts fresh" },
  { value: "cumulative", label: "Cumulative", description: "Year-to-date total" },
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
  const [aggregation, setAggregation] = useState<KrAggregation>("reset_quarterly");
  const [unit, setUnit] = useState("");
  const [startValue, setStartValue] = useState("0");
  const [targetValue, setTargetValue] = useState("");
  const [weight, setWeight] = useState("1");
  const [groupId, setGroupId] = useState<string>("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

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
        setWeight(String(kr.weight));
        setGroupId(kr.group_id || "");
        setSelectedTagIds(initialSelectedTags);
      } else {
        setName("");
        setDescription("");
        setKrType("metric");
        setDirection("increase");
        setAggregation("reset_quarterly");
        setUnit("");
        setStartValue("0");
        setTargetValue("");
        setWeight("1");
        setGroupId("");
        setSelectedTagIds([]);
      }
    }
  }, [open, kr, initialSelectedTags]);

  // Toggle tag selection
  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !targetValue) return;

    setIsSubmitting(true);
    try {
      const data = isEditing
        ? {
            name,
            description: description || null,
            kr_type: krType,
            direction,
            aggregation,
            unit: unit || null,
            start_value: parseFloat(startValue) || 0,
            target_value: parseFloat(targetValue) || 0,
            weight: parseFloat(weight) || 1,
            group_id: groupId || null,
          }
        : {
            objective_id: objectiveId,
            name,
            description: description || null,
            kr_type: krType,
            direction,
            aggregation,
            unit: unit || null,
            start_value: parseFloat(startValue) || 0,
            target_value: parseFloat(targetValue) || 0,
            current_value: parseFloat(startValue) || 0,
            weight: parseFloat(weight) || 1,
            group_id: groupId || null,
            sort_order: 0,
          };

      await onSubmit(data, selectedTagIds);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEditing ? "Edit Key Result" : "Create Key Result"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the key result configuration."
              : "Add a new key result to track progress."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="kr-name">Name *</Label>
            <Input
              id="kr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., LinkedIn followers"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="kr-description">Description</Label>
            <textarea
              id="kr-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this key result..."
              rows={2}
              className="w-full px-3 py-2 text-body-sm rounded-button border border-border-soft bg-white placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
            />
          </div>

          {/* Type, Direction, Aggregation */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={krType} onValueChange={(v) => setKrType(v as KrType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {krTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <span className="font-medium">{t.label}</span>
                        <span className="text-text-muted ml-2 text-xs">{t.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as KrDirection)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {directions.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Aggregation</Label>
              <Select value={aggregation} onValueChange={(v) => setAggregation(v as KrAggregation)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aggregations.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Values */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-value">Start Value</Label>
              <Input
                id="start-value"
                type="number"
                value={startValue}
                onChange={(e) => setStartValue(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-value">Target Value *</Label>
              <Input
                id="target-value"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="1000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="followers"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kr-weight">Weight</Label>
              <Input
                id="kr-weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="1.0"
                min="0"
                max="1"
                step="0.1"
              />
            </div>
          </div>

          {/* Group */}
          {groups.length > 0 && (
            <div className="space-y-2">
              <Label>Group</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a group (optional)" />
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
              <div className="flex flex-wrap gap-2 p-3 bg-bg-1 rounded-button min-h-[60px]">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTagIds.includes(tag.id) ? "default" : "secondary"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                    {selectedTagIds.includes(tag.id) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <span className="text-body-sm text-text-muted">No tags available</span>
                )}
              </div>
              <p className="text-xs text-text-subtle">Click to select/deselect tags</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !targetValue}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Key Result"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
