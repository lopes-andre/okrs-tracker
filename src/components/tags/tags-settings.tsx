"use client";

import { useState } from "react";
import {
  Tag as TagIcon,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  Check,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/layout/empty-state";
import {
  useTagsWithUsage,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  type TagWithUsage,
} from "@/features";
import type { TagKind, TagInsert, TagUpdate } from "@/lib/supabase/types";

interface TagsSettingsProps {
  planId: string;
  isOwner: boolean;
}

const tagKindOptions: { value: TagKind; label: string; description: string }[] = [
  { value: "custom", label: "Custom", description: "General purpose tags" },
  { value: "category", label: "Category", description: "Task categories" },
  { value: "platform", label: "Platform", description: "Social media or platform tags" },
  { value: "funnel_stage", label: "Funnel Stage", description: "Marketing funnel stages" },
  { value: "initiative", label: "Initiative", description: "Project or initiative tags" },
];

const tagKindColors: Record<TagKind, string> = {
  custom: "bg-text-muted/10 text-text-muted border-text-muted/20",
  category: "bg-accent/10 text-accent border-accent/20",
  platform: "bg-status-info/10 text-status-info border-status-info/20",
  funnel_stage: "bg-status-warning/10 text-status-warning border-status-warning/20",
  initiative: "bg-status-success/10 text-status-success border-status-success/20",
};

export function TagsSettings({ planId, isOwner }: TagsSettingsProps) {
  const { data: tags = [], isLoading } = useTagsWithUsage(planId);
  const createTag = useCreateTag(planId);
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<TagWithUsage | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagWithUsage | null>(null);

  // Form state
  const [newTagName, setNewTagName] = useState("");
  const [newTagKind, setNewTagKind] = useState<TagKind>("custom");
  const [editTagName, setEditTagName] = useState("");
  const [editTagKind, setEditTagKind] = useState<TagKind>("custom");

  // Group tags by kind
  const tagsByKind = tags.reduce((acc, tag) => {
    if (!acc[tag.kind]) acc[tag.kind] = [];
    acc[tag.kind].push(tag);
    return acc;
  }, {} as Record<TagKind, TagWithUsage[]>);

  async function handleCreateTag() {
    if (!newTagName.trim()) return;

    await createTag.mutateAsync({
      name: newTagName.trim(),
      kind: newTagKind,
      color: null,
    });

    setNewTagName("");
    setNewTagKind("custom");
    setShowCreateDialog(false);
  }

  async function handleUpdateTag() {
    if (!editingTag || !editTagName.trim()) return;

    await updateTag.mutateAsync({
      tagId: editingTag.id,
      updates: {
        name: editTagName.trim(),
        kind: editTagKind,
      },
    });

    setEditingTag(null);
  }

  async function handleDeleteTag() {
    if (!deletingTag) return;

    await deleteTag.mutateAsync({
      tagId: deletingTag.id,
      planId,
    });

    setDeletingTag(null);
  }

  function openEditDialog(tag: TagWithUsage) {
    setEditingTag(tag);
    setEditTagName(tag.name);
    setEditTagKind(tag.kind);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-accent" />
                Manage Tags
              </CardTitle>
              <CardDescription>
                Create, edit, and delete tags used for organizing tasks
              </CardDescription>
            </div>
            {isOwner && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Tag
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <EmptyState
              icon={TagIcon}
              title="No tags yet"
              description="Create tags to organize and categorize your tasks"
              action={
                isOwner
                  ? {
                      label: "Create your first tag",
                      onClick: () => setShowCreateDialog(true),
                    }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-6">
              {tagKindOptions.map((kindOption) => {
                const kindTags = tagsByKind[kindOption.value] || [];
                if (kindTags.length === 0) return null;

                return (
                  <div key={kindOption.value}>
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-body-sm font-medium text-text-strong">
                        {kindOption.label}
                      </h4>
                      <Badge variant="outline" className="text-[10px]">
                        {kindTags.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {kindTags.map((tag) => (
                        <div
                          key={tag.id}
                          className="flex items-center justify-between p-3 rounded-card bg-bg-1/30 border border-border-soft group hover:border-border transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={tagKindColors[tag.kind]}
                            >
                              {tag.name}
                            </Badge>
                            <span className="text-small text-text-muted">
                              {tag.task_count === 0
                                ? "Not used"
                                : tag.task_count === 1
                                ? "1 task"
                                : `${tag.task_count} tasks`}
                            </span>
                          </div>
                          {isOwner && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditDialog(tag)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-status-danger hover:text-status-danger hover:bg-status-danger/10"
                                onClick={() => setDeletingTag(tag)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Tag Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading">Create Tag</DialogTitle>
            <DialogDescription>
              Create a new tag to organize your tasks
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Name</Label>
              <Input
                id="tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g., Marketing, Development, Q1 Focus"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-kind">Category</Label>
              <Select
                value={newTagKind}
                onValueChange={(v) => setNewTagKind(v as TagKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tagKindOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <span className="font-medium">{opt.label}</span>
                        <p className="text-xs text-text-muted">
                          {opt.description}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={createTag.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || createTag.isPending}
            >
              {createTag.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog
        open={!!editingTag}
        onOpenChange={(open) => !open && setEditingTag(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Tag</DialogTitle>
            <DialogDescription>
              Update the tag details. Changes will be reflected in all tasks
              using this tag.
            </DialogDescription>
          </DialogHeader>

          {editingTag && editingTag.task_count > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-card bg-status-warning/10 border border-status-warning/20">
              <AlertTriangle className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
              <div className="text-small">
                <p className="font-medium text-status-warning">
                  This tag is used in {editingTag.task_count}{" "}
                  {editingTag.task_count === 1 ? "task" : "tasks"}
                </p>
                <p className="text-text-muted mt-1">
                  Updating this tag will change it everywhere it&apos;s used.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-tag-name">Name</Label>
              <Input
                id="edit-tag-name"
                value={editTagName}
                onChange={(e) => setEditTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleUpdateTag();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tag-kind">Category</Label>
              <Select
                value={editTagKind}
                onValueChange={(v) => setEditTagKind(v as TagKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tagKindOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <span className="font-medium">{opt.label}</span>
                        <p className="text-xs text-text-muted">
                          {opt.description}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingTag(null)}
              disabled={updateTag.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTag}
              disabled={!editTagName.trim() || updateTag.isPending}
            >
              {updateTag.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingTag}
        onOpenChange={(open) => !open && setDeletingTag(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-status-danger">
              Delete Tag
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this tag?
            </DialogDescription>
          </DialogHeader>

          {deletingTag && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-card bg-bg-1/50 border border-border-soft">
                <Badge
                  variant="outline"
                  className={tagKindColors[deletingTag.kind]}
                >
                  {deletingTag.name}
                </Badge>
                <span className="text-small text-text-muted">
                  {deletingTag.task_count === 0
                    ? "Not used in any tasks"
                    : deletingTag.task_count === 1
                    ? "Used in 1 task"
                    : `Used in ${deletingTag.task_count} tasks`}
                </span>
              </div>

              {deletingTag.task_count > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-card bg-status-danger/10 border border-status-danger/20">
                  <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
                  <div className="text-small">
                    <p className="font-medium text-status-danger">
                      This will remove the tag from {deletingTag.task_count}{" "}
                      {deletingTag.task_count === 1 ? "task" : "tasks"}
                    </p>
                    <p className="text-text-muted mt-1">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingTag(null)}
              disabled={deleteTag.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteTag}
              disabled={deleteTag.isPending}
            >
              {deleteTag.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
