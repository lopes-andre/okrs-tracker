"use client";

import { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCreateGoal, useUpdateGoal } from "@/features/content/hooks";
import type { ContentGoal } from "@/lib/supabase/types";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  goal?: ContentGoal | null;
}

// Preset colors for goals
const presetColors = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#6366F1", // Indigo
  "#14B8A6", // Teal
];

export function GoalDialog({
  open,
  onOpenChange,
  planId,
  goal,
}: GoalDialogProps) {
  const isEditing = !!goal;
  const createGoal = useCreateGoal(planId);
  const updateGoal = useUpdateGoal(planId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(presetColors[0]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (goal) {
        setName(goal.name);
        setDescription(goal.description || "");
        setColor(goal.color || presetColors[0]);
      } else {
        setName("");
        setDescription("");
        setColor(presetColors[0]);
      }
    }
  }, [open, goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && goal) {
      await updateGoal.mutateAsync({
        goalId: goal.id,
        updates: {
          name,
          description: description || null,
          color,
        },
      });
    } else {
      await createGoal.mutateAsync({
        name,
        description: description || null,
        color,
        display_order: 0, // Will be set by the API based on existing goals
        is_active: true,
      });
    }

    onOpenChange(false);
  };

  const isPending = createGoal.isPending || updateGoal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Goal" : "Add Goal"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the goal details below."
                : "Create a content goal to categorize your posts by purpose."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Authority, Audience Growth"
                required
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this goal..."
                rows={2}
              />
            </div>

            {/* Color */}
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {presetColors.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    onClick={() => setColor(presetColor)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
                      color === presetColor
                        ? "border-text-strong ring-2 ring-accent"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: presetColor }}
                  >
                    {color === presetColor && (
                      <Check className="w-4 h-4 text-white mx-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
