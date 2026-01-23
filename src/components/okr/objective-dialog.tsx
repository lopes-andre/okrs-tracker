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
import { useEditingTracker } from "@/lib/realtime";
import { EditingIndicator } from "@/components/layout/editing-indicator";

interface ObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  objective?: Objective | null;
  existingCodes: string[];
  currentUserId?: string;
  onSubmit: (data: ObjectiveInsert | ObjectiveUpdate) => Promise<void>;
}

export function ObjectiveDialog({
  open,
  onOpenChange,
  planId,
  objective,
  existingCodes,
  currentUserId,
  onSubmit,
}: ObjectiveDialogProps) {
  const isEditing = !!objective;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track editing state for real-time collaboration
  useEditingTracker(
    open && isEditing ? "objective" : null,
    open && isEditing ? objective?.id ?? null : null
  );

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Reset form when dialog opens/closes or objective changes
  useEffect(() => {
    if (open) {
      if (objective) {
        setCode(objective.code);
        setName(objective.name);
        setDescription(objective.description || "");
      } else {
        // Generate next code
        const nextCode = generateNextCode(existingCodes);
        setCode(nextCode);
        setName("");
        setDescription("");
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
      const data = isEditing
        ? { code, name, description: description || null }
        : { plan_id: planId, code, name, description: description || null, sort_order: existingCodes.length };

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
          <div className="flex items-center gap-2">
            <DialogTitle className="font-heading">
              {isEditing ? "Edit Objective" : "Create Objective"}
            </DialogTitle>
            {isEditing && objective && (
              <EditingIndicator
                entityType="objective"
                entityId={objective.id}
                currentUserId={currentUserId}
              />
            )}
          </div>
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

            {/* Name - spans remaining columns */}
            <div className="col-span-3 space-y-2">
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
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isCodeTaken || !name.trim()}
              className="bg-accent hover:bg-accent-hover text-white"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Objective"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
