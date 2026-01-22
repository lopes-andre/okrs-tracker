"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  Plus,
  X,
  Tag as TagIcon,
  Clock,
  AlertTriangle,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Bell,
  BellOff,
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
import { Checkbox } from "@/components/ui/checkbox";
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
  TaskEffort,
  Objective,
  AnnualKr,
  Tag,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

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
  initialObjectiveId?: string; // For pre-populating objective when editing task with KR
  onSubmit: (data: TaskCreateData | TaskUpdate, tagIds: string[]) => Promise<void>;
  onCreateTag?: (name: string) => Promise<Tag>;
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Priority options with icons and descriptions
const priorityOptions: { 
  value: TaskPriority; 
  label: string; 
  description: string;
  color: string;
}[] = [
  { value: "high", label: "Critical", description: "High impact if delayed", color: "text-status-danger" },
  { value: "medium", label: "Important", description: "Should be addressed soon", color: "text-status-warning" },
  { value: "low", label: "Minor", description: "Low impact, handle when convenient", color: "text-text-muted" },
];

// Effort options with icons and descriptions
const effortOptions: { 
  value: TaskEffort; 
  label: string; 
  description: string;
  color: string;
  Icon: typeof BatteryLow;
}[] = [
  { value: "light", label: "Light", description: "Quick task, low energy", color: "text-status-success", Icon: BatteryLow },
  { value: "moderate", label: "Moderate", description: "Requires some focus", color: "text-text-muted", Icon: BatteryMedium },
  { value: "heavy", label: "Heavy", description: "Significant time investment", color: "text-status-danger", Icon: BatteryFull },
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
  initialObjectiveId = "",
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
  const [effort, setEffort] = useState<TaskEffort>("moderate");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [objectiveId, setObjectiveId] = useState<string>("");
  const [annualKrId, setAnnualKrId] = useState<string>("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);

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
        setEffort(task.effort || "moderate");
        
        // Parse due_date and due_time
        if (task.due_date) {
          // If due_date is a timestamp, split date and time
          if (task.due_date.includes("T")) {
            const [date, time] = task.due_date.split("T");
            setDueDate(date);
            if (time && time !== "00:00:00" && time !== "00:00") {
              setDueTime(time.substring(0, 5)); // HH:MM
              setShowTimeInput(true);
            } else {
              setDueTime("");
              setShowTimeInput(false);
            }
          } else {
            setDueDate(task.due_date);
            setDueTime(task.due_time || "");
            setShowTimeInput(!!task.due_time);
          }
        } else {
          setDueDate("");
          setDueTime("");
          setShowTimeInput(false);
        }
        
        // Use initialObjectiveId if provided (for tasks linked via KR)
        // Otherwise use task.objective_id
        setObjectiveId(initialObjectiveId || task.objective_id || "");
        setAnnualKrId(task.annual_kr_id || "");
        setSelectedTagIds(initialSelectedTags);
        setReminderEnabled(task.reminder_enabled ?? true);
      } else {
        setTitle("");
        setDescription("");
        setStatus("pending");
        setPriority("medium");
        setEffort("moderate");
        setDueDate("");
        setDueTime("");
        setShowTimeInput(false);
        setObjectiveId("");
        setAnnualKrId("");
        setSelectedTagIds([]);
        setReminderEnabled(true);
      }
      setNewTagName("");
    }
  }, [open, task, initialSelectedTags, initialObjectiveId]);

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
      // Important: Task can only have ONE parent link due to constraint
      // If KR is selected, use that (KR already knows its Objective)
      // If only Objective is selected, use that
      // If neither, both are null
      const finalObjectiveId = annualKrId ? null : (objectiveId || null);
      const finalAnnualKrId = annualKrId || null;

      const data: TaskCreateData | TaskUpdate = isEditing
        ? {
            title,
            description: description || null,
            status,
            priority,
            effort,
            due_date: dueDate || null,
            due_time: showTimeInput && dueTime ? dueTime : null,
            objective_id: finalObjectiveId,
            annual_kr_id: finalAnnualKrId,
            reminder_enabled: reminderEnabled,
          }
        : {
            // Don't include plan_id - the hook adds it automatically
            title,
            description: description || null,
            status,
            priority,
            effort,
            due_date: dueDate || null,
            due_time: showTimeInput && dueTime ? dueTime : null,
            objective_id: finalObjectiveId,
            annual_kr_id: finalAnnualKrId,
            quarter_target_id: null,
            assigned_to: null,
            sort_order: 0,
            reminder_enabled: reminderEnabled,
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

        <form onSubmit={handleSubmit} className="space-y-5">
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

          {/* Status */}
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

          {/* Priority and Effort - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Priority
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <AlertTriangle className={cn("w-3.5 h-3.5", priorityOptions.find(o => o.value === priority)?.color)} />
                      {priorityOptions.find(o => o.value === priority)?.label}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={cn("w-3.5 h-3.5", opt.color)} />
                        <div>
                          <span className="font-medium">{opt.label}</span>
                          <p className="text-xs text-text-muted">{opt.description}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <BatteryMedium className="w-3.5 h-3.5" />
                Effort
              </Label>
              <Select value={effort} onValueChange={(v) => setEffort(v as TaskEffort)}>
                <SelectTrigger>
                  <SelectValue>
                    {(() => {
                      const opt = effortOptions.find(o => o.value === effort);
                      if (!opt) return null;
                      const Icon = opt.Icon;
                      return (
                        <span className="flex items-center gap-2">
                          <Icon className={cn("w-3.5 h-3.5", opt.color)} />
                          {opt.label}
                        </span>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {effortOptions.map((opt) => {
                    const Icon = opt.Icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={cn("w-3.5 h-3.5", opt.color)} />
                          <div>
                            <span className="font-medium">{opt.label}</span>
                            <p className="text-xs text-text-muted">{opt.description}</p>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date and Time */}
          <div className="space-y-2">
            <Label htmlFor="task-due-date">Due Date</Label>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              
              {/* Time toggle button / time input */}
              {showTimeInput ? (
                <div className="flex gap-1 items-center">
                  <Input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-text-muted hover:text-text-strong"
                    onClick={() => {
                      setShowTimeInput(false);
                      setDueTime("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 px-3 gap-1.5"
                  onClick={() => setShowTimeInput(true)}
                  disabled={!dueDate}
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Add time</span>
                </Button>
              )}
            </div>
            <p className="text-xs text-text-subtle">
              Leave empty for ideas/backlog tasks
            </p>
          </div>

          {/* Reminder Toggle - only show if due date is set */}
          {dueDate && (
            <div className="flex items-center gap-3 p-3 rounded-card bg-bg-1/50 border border-border-soft">
              <Checkbox
                id="task-reminder"
                checked={reminderEnabled}
                onCheckedChange={(checked) => setReminderEnabled(checked as boolean)}
              />
              <Label
                htmlFor="task-reminder"
                className="flex items-center gap-2 cursor-pointer flex-1"
              >
                {reminderEnabled ? (
                  <Bell className="w-4 h-4 text-accent" />
                ) : (
                  <BellOff className="w-4 h-4 text-text-muted" />
                )}
                <div>
                  <span className="text-body-sm font-medium">
                    {reminderEnabled ? "Reminder enabled" : "Reminder disabled"}
                  </span>
                  <p className="text-xs text-text-muted">
                    {showTimeInput && dueTime
                      ? "You'll be notified 15, 10, 5 min before and 30 min after due time"
                      : "You'll receive hourly reminders on the due date"}
                  </p>
                </div>
              </Label>
            </div>
          )}

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
              disabled={isSubmitting || !title.trim()}
              className="bg-accent hover:bg-accent-hover text-white"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
