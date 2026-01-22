"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Trash2,
  Tag,
  X,
  ChevronDown,
  Circle,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { TaskStatus, Tag as TagType } from "@/lib/supabase/types";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStatusChange: (status: TaskStatus) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onBulkAddTag: (tagId: string) => Promise<void>;
  onBulkRemoveTag: (tagId: string) => Promise<void>;
  tags: TagType[];
  isProcessing?: boolean;
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onBulkStatusChange,
  onBulkDelete,
  onBulkAddTag,
  onBulkRemoveTag,
  tags,
  isProcessing = false,
}: BulkActionsToolbarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (selectedCount === 0) return null;

  async function handleDelete() {
    await onBulkDelete();
    setDeleteDialogOpen(false);
  }

  return (
    <>
      <div className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "bg-bg-0 border border-border shadow-lg rounded-xl",
        "px-4 py-3 flex items-center gap-3",
        "animate-in slide-in-from-bottom-4 duration-200"
      )}>
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-border-soft">
          <span className="text-sm font-medium text-text-strong">
            {selectedCount} selected
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Clear selection</span>
          </Button>
        </div>

        {/* Status change */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isProcessing}
            >
              <Circle className="w-4 h-4" />
              Set Status
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => onBulkStatusChange("pending")}
              className="gap-2"
            >
              <Circle className="w-4 h-4 text-text-muted" />
              Pending
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onBulkStatusChange("in_progress")}
              className="gap-2"
            >
              <Clock className="w-4 h-4 text-status-warning" />
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onBulkStatusChange("completed")}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-status-success" />
              Completed
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onBulkStatusChange("cancelled")}
              className="gap-2 text-text-muted"
            >
              <XCircle className="w-4 h-4" />
              Cancelled
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tag management */}
        {tags.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isProcessing}
              >
                <Tag className="w-4 h-4" />
                Tags
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              <div className="px-2 py-1.5 text-xs font-medium text-text-muted">
                Add Tag
              </div>
              {tags.map((tag) => (
                <DropdownMenuItem
                  key={`add-${tag.id}`}
                  onClick={() => onBulkAddTag(tag.id)}
                  className="gap-2"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color || "#6B7280" }}
                  />
                  {tag.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-medium text-text-muted">
                Remove Tag
              </div>
              {tags.map((tag) => (
                <DropdownMenuItem
                  key={`remove-${tag.id}`}
                  onClick={() => onBulkRemoveTag(tag.id)}
                  className="gap-2 text-text-muted"
                >
                  <div
                    className="w-3 h-3 rounded-full opacity-50"
                    style={{ backgroundColor: tag.color || "#6B7280" }}
                  />
                  <span className="line-through">{tag.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Delete */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-status-danger hover:text-status-danger hover:bg-status-danger/10"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={isProcessing}
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected tasks will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-status-danger hover:bg-status-danger/90"
              disabled={isProcessing}
            >
              {isProcessing ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
