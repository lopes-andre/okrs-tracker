"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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
import type { Objective, ObjectiveInsert, ObjectiveUpdate } from "@/lib/supabase/types";

interface ObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  objective?: Objective | null;
  existingCodes: string[];
  onSubmit: (data: ObjectiveInsert | ObjectiveUpdate) => Promise<void>;
}

export function ObjectiveDialog({
  open,
  onOpenChange,
  planId,
  objective,
  existingCodes,
  onSubmit,
}: ObjectiveDialogProps) {
  const isEditing = !!objective;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("1");

  // Reset form when dialog opens/closes or objective changes
  useEffect(() => {
    if (open) {
      if (objective) {
        setCode(objective.code);
        setName(objective.name);
        setDescription(objective.description || "");
        setWeight(String(objective.weight));
      } else {
        // Generate next code
        const nextCode = generateNextCode(existingCodes);
        setCode(nextCode);
        setName("");
        setDescription("");
        setWeight("1");
      }
    }
  }, [open, objective, existingCodes]);

  // Generate next objective code (O1, O2, O3, etc.)
  function generateNextCode(codes: string[]): string {
    const numbers = codes
      .filter((c) => c.match(/^O\d+$/))
      .map((c) => parseInt(c.slice(1), 10));
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `O${max + 1}`;
  }

  // Validate code is unique
  const isCodeTaken = !isEditing && existingCodes.includes(code);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isCodeTaken || !code.trim() || !name.trim()) return;

    setIsSubmitting(true);
    try {
      const weightNum = parseFloat(weight) || 1;
      const data = isEditing
        ? { code, name, description: description || null, weight: weightNum }
        : { plan_id: planId, code, name, description: description || null, weight: weightNum, sort_order: existingCodes.length };

      await onSubmit(data);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEditing ? "Edit Objective" : "Create Objective"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the objective details below."
              : "Add a new objective to your plan."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="O1"
                maxLength={10}
                className={isCodeTaken ? "border-status-danger" : ""}
              />
              {isCodeTaken && (
                <p className="text-xs text-status-danger">Code already exists</p>
              )}
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="1.0"
                min="0"
                max="1"
                step="0.1"
              />
              <p className="text-xs text-text-subtle">0 to 1</p>
            </div>

            {/* Name - spans remaining columns */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Grow audience across platforms"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what success looks like for this objective..."
              rows={3}
              className="w-full px-3 py-2 text-body-sm rounded-button border border-border-soft bg-white placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
            />
            <p className="text-xs text-text-subtle">
              Optional. Add context to help track progress.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isCodeTaken || !name.trim()}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Objective"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
