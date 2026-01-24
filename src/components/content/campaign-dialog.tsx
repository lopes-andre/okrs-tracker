"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ContentCampaign,
  ContentCampaignStatus,
  ContentCampaignObjective,
} from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
// COMPONENT
// ============================================================================

export function CampaignDialog({
  open,
  onOpenChange,
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
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
      }
    }
  }, [open, campaign]);

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
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, description, objective, status, startDate, endDate, budget, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Campaign" : "New Campaign"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              rows={3}
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
        </div>

        <DialogFooter>
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
