"use client";

import { useState } from "react";
import {
  Download,
  Upload,
  Cloud,
  FileJson,
  FileText,
  Loader2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useExportJson,
  useExportMarkdown,
  useBackups,
  useCreateBackup,
  useDeleteBackup,
} from "@/features/import-export/hooks";
import { ImportDialog } from "./import-dialog";
import { format, formatDistanceToNow } from "date-fns";

interface ImportExportSettingsProps {
  planId: string;
  isOwner: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ImportExportSettings({
  planId,
  isOwner,
}: ImportExportSettingsProps) {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [deletingBackupId, setDeletingBackupId] = useState<string | null>(null);

  const exportJson = useExportJson(planId);
  const exportMarkdown = useExportMarkdown(planId);
  const { data: backups = [], isLoading: isLoadingBackups } = useBackups(planId);
  const createBackup = useCreateBackup(planId);
  const deleteBackup = useDeleteBackup(planId);

  const handleDeleteBackup = async () => {
    if (!deletingBackupId) return;
    await deleteBackup.mutateAsync(deletingBackupId);
    setDeletingBackupId(null);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Export Data Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-accent" />
              <CardTitle>Export Data</CardTitle>
            </div>
            <CardDescription>
              Download your plan data in various formats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* JSON Export */}
              <div className="p-4 rounded-card bg-bg-1/30 border border-border-soft">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <FileJson className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-body-sm font-medium">JSON Export</h4>
                    <p className="text-small text-text-muted mt-1">
                      Full data backup for import into another plan or account
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-2"
                      onClick={() => exportJson.mutate()}
                      disabled={exportJson.isPending}
                    >
                      {exportJson.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Download JSON
                    </Button>
                  </div>
                </div>
              </div>

              {/* Markdown Export */}
              <div className="p-4 rounded-card bg-bg-1/30 border border-border-soft">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-status-success/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-status-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-body-sm font-medium">Markdown Export</h4>
                    <p className="text-small text-text-muted mt-1">
                      Human-readable document of your OKRs and progress
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-2"
                      onClick={() => exportMarkdown.mutate()}
                      disabled={exportMarkdown.isPending}
                    >
                      {exportMarkdown.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Download Markdown
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Data Card - Owner only */}
        {isOwner && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-accent" />
                <CardTitle>Import Data</CardTitle>
              </div>
              <CardDescription>
                Import data from a previously exported JSON file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-card bg-bg-1/30 border border-border-soft border-dashed">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="text-body-sm font-medium">Import OKR Plan</h4>
                  <p className="text-small text-text-muted mt-1 max-w-sm mx-auto">
                    Create a new plan from an exported JSON file, or merge data
                    into an existing plan
                  </p>
                  <Button
                    className="mt-4 gap-2"
                    onClick={() => setShowImportDialog(true)}
                  >
                    <Upload className="w-4 h-4" />
                    Import from JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cloud Backups Card - Owner only */}
        {isOwner && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-accent" />
                  <CardTitle>Cloud Backups</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => createBackup.mutate()}
                  disabled={createBackup.isPending}
                >
                  {createBackup.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  Create Backup
                </Button>
              </div>
              <CardDescription>
                Automatic cloud backups of your plan data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBackups ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
                </div>
              ) : backups.length === 0 ? (
                <EmptyState
                  icon={Cloud}
                  title="No backups yet"
                  description="Create a backup to store your plan data in the cloud"
                />
              ) : (
                <div className="space-y-2">
                  {backups.map((backup) => (
                    <div
                      key={backup.id}
                      className="flex items-center justify-between p-3 rounded-card bg-bg-1/30 border border-border-soft group hover:border-border transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <FileJson className="w-5 h-5 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-body-sm font-medium truncate">
                            {backup.planName}
                          </p>
                          <p className="text-small text-text-muted">
                            {format(new Date(backup.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            {" "}
                            <span className="text-text-muted/60">
                              ({formatDistanceToNow(new Date(backup.createdAt), { addSuffix: true })})
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {formatFileSize(backup.fileSize)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-status-danger hover:text-status-danger hover:bg-status-danger/10 transition-opacity"
                          onClick={() => setDeletingBackupId(backup.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Info note */}
              <div className="mt-4 flex items-start gap-2 p-3 rounded-card bg-accent/5 border border-accent/10">
                <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <p className="text-small text-text-muted">
                  Cloud backups are stored securely and can be restored at any time.
                  We recommend creating backups before making major changes.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Import Dialog */}
      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />

      {/* Delete Backup Confirmation */}
      <Dialog
        open={!!deletingBackupId}
        onOpenChange={(open) => !open && setDeletingBackupId(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-status-danger">
              Delete Backup
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this backup? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingBackupId(null)}
              disabled={deleteBackup.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteBackup}
              disabled={deleteBackup.isPending}
            >
              {deleteBackup.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
