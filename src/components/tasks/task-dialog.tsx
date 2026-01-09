"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Plus, X, Tag as TagIcon } from "lucide-react";
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
  Task,
  TaskInsert,
  TaskUpdate,
  TaskStatus,
  TaskPriority,
  Objective,
  AnnualKr,
  Tag,
} from "@/lib/supabase/types";

// Type for creating - without plan_id since the hook adds it
type TaskCreateData = Omit<TaskInsert, "plan_id">;

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  task?: Task | null;
  objectives?: Objective[];
  annualKrs?: AnnualKr[];
  tags?: Tag[];
  selectedTags?: string[];
  onSubmit: (data: TaskCreateData | TaskUpdate, tagIds: string[]) => Promise<void>;
  onCreateTag?: (name: string) => Promise<Tag>;
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function TaskDialog({
  open,
  onOpenChange,
  planId: _planId,
  task,
  objectives = [],
  annualKrs = [],
  tags = [],
  selectedTags: initialSelectedTags = [],
  onSubmit,
  onCreateTag,
}: TaskDialogProps) {
  const isEditing = !!task;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [objectiveId, setObjectiveId] = useState<string>("");
  const [annualKrId, setAnnualKrId] = useState<string>("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Filter KRs based on selected objective
  const filteredKrs = useMemo(() => {
    if (!objectiveId) return [];
    return annualKrs.filter((kr) => kr.objective_id === objectiveId);
  }, [objectiveId, annualKrs]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description || "");
        setStatus(task.status);
        setPriority(task.priority);
        setDueDate(task.due_date || "");
        setObjectiveId(task.objective_id || "");
        setAnnualKrId(task.annual_kr_id || "");
        setSelectedTagIds(initialSelectedTags);
      } else {
        setTitle("");
        setDescription("");
        setStatus("pending");
        setPriority("medium");
        setDueDate("");
        setObjectiveId("");
        setAnnualKrId("");
        setSelectedTagIds([]);
      }
      setNewTagName("");
    }
  }, [open, task, initialSelectedTags]);

  // When objective changes, reset KR selection if the KR doesn't belong to new objective
  useEffect(() => {
    if (annualKrId && objectiveId) {
      const kr = annualKrs.find((k) => k.id === annualKrId);
      if (kr && kr.objective_id !== objectiveId) {
        setAnnualKrId("");
      }
    }
  }, [objectiveId, annualKrId, annualKrs]);

  function handleTagToggle(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function handleCreateTag() {
    if (!newTagName.trim() || !onCreateTag) return;
    
    setIsCreatingTag(true);
    try {
      const newTag = await onCreateTag(newTagName.trim());
      setSelectedTagIds((prev) => [...prev, newTag.id]);
      setNewTagName("");
    } finally {
      setIsCreatingTag(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const data: TaskCreateData | TaskUpdate = isEditing
        ? {
            title,
            description: description || null,
            status,
            priority,
            due_date: dueDate || null,
            objective_id: objectiveId || null,
            annual_kr_id: annualKrId || null,
          }
        : {
            // Don't include plan_id - the hook adds it automatically
            title,
            description: description || null,
            status,
            priority,
            due_date: dueDate || null,
            objective_id: objectiveId || null,
            annual_kr_id: annualKrId || null,
            quarter_target_id: null,
            assigned_to: null,
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
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEditing ? "Edit Task" : "Create Task"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the task details below."
              : "Add a new task to your plan."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Publish LinkedIn post about OKRs"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this task..."
              rows={2}
              className="w-full px-3 py-2 text-body-sm rounded-button border border-border-soft bg-white placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="task-due-date">Due Date</Label>
            <Input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <p className="text-xs text-text-subtle">
              Leave empty for ideas/backlog tasks
            </p>
          </div>

          {/* Objective and KR Linking */}
          <div className="space-y-4 p-3 rounded-card bg-bg-1/50 border border-border-soft">
            <p className="text-small font-medium text-text-muted">Link to OKRs (optional)</p>
            
            {/* Objective */}
            {objectives.length > 0 && (
              <div className="space-y-2">
                <Label>Objective</Label>
                <Select 
                  value={objectiveId || "none"} 
                  onValueChange={(v) => {
                    setObjectiveId(v === "none" ? "" : v);
                    // Reset KR when objective changes
                    if (v === "none" || v !== objectiveId) {
                      setAnnualKrId("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an objective" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No objective</SelectItem>
                    {objectives.map((obj) => (
                      <SelectItem key={obj.id} value={obj.id}>
                        {obj.code}: {obj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Key Result (only shown when an objective is selected) */}
            {objectiveId && filteredKrs.length > 0 && (
              <div className="space-y-2">
                <Label>Key Result</Label>
                <Select 
                  value={annualKrId || "none"} 
                  onValueChange={(v) => setAnnualKrId(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a key result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific KR</SelectItem>
                    {filteredKrs.map((kr) => (
                      <SelectItem key={kr.id} value={kr.id}>
                        {kr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-text-subtle">
                  Link to a specific Key Result for granular tracking
                </p>
              </div>
            )}

            {objectiveId && filteredKrs.length === 0 && (
              <p className="text-small text-text-muted">
                No Key Results defined for this objective yet.
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <TagIcon className="w-4 h-4" />
              Tags
            </Label>
            
            {/* Selected tags */}
            {selectedTagIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTagIds.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <Badge
                      key={tagId}
                      variant="outline"
                      className="gap-1 pr-1 cursor-pointer"
                      onClick={() => handleTagToggle(tagId)}
                    >
                      {tag.name}
                      <X className="w-3 h-3" />
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Available tags */}
            {tags.filter((t) => !selectedTagIds.includes(t.id)).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags
                  .filter((t) => !selectedTagIds.includes(t.id))
                  .map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="cursor-pointer hover:bg-bg-2"
                      onClick={() => handleTagToggle(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
              </div>
            )}

            {/* Create new tag */}
            {onCreateTag && (
              <div className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Create new tag..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || isCreatingTag}
                >
                  {isCreatingTag ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
