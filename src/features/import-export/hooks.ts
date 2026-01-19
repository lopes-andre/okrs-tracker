"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { formatErrorMessage, successMessages } from "@/lib/toast-utils";
import { queryKeys } from "@/lib/query-client";

import { exportPlanToJson, downloadJsonExport } from "./export-json";
import { exportPlanToMarkdown, downloadMarkdownExport } from "./export-markdown";
import { parseImportFile, importPlanFromJson } from "./import-json";
import { createBackup, listBackups, deleteBackup, downloadBackup } from "./backup";
import type { ImportOptions } from "./types";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const importExportKeys = {
  all: ["import-export"] as const,
  backups: (planId: string) => [...importExportKeys.all, "backups", planId] as const,
};

// ============================================================================
// EXPORT HOOKS
// ============================================================================

/**
 * Export plan to JSON and trigger download
 */
export function useExportJson(planId: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const data = await exportPlanToJson(planId);
      downloadJsonExport(data);
      return data;
    },
    onSuccess: () => {
      toast(successMessages.exportComplete);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Export plan to Markdown and trigger download
 */
export function useExportMarkdown(planId: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const jsonData = await exportPlanToJson(planId);
      const markdown = exportPlanToMarkdown(jsonData);
      downloadMarkdownExport(markdown, jsonData.plan.name, jsonData.plan.year);
      return markdown;
    },
    onSuccess: () => {
      toast(successMessages.exportComplete);
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// IMPORT HOOKS
// ============================================================================

/**
 * Parse and validate import file (no mutation, just parsing)
 */
export function useParseImportFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const content = await file.text();
      return parseImportFile(content);
    },
  });
}

/**
 * Import plan from JSON file
 */
export function useImportPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      file,
      options,
    }: {
      file: File;
      options: ImportOptions;
    }) => {
      const content = await file.text();
      return importPlanFromJson(content, options);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast(successMessages.importComplete);
        // Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.objectives.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      } else {
        toast({
          title: "Import completed with errors",
          description: result.errors[0] || "Some items could not be imported",
          variant: "warning",
        });
      }
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

// ============================================================================
// BACKUP HOOKS
// ============================================================================

/**
 * List backups for a plan
 */
export function useBackups(planId: string) {
  return useQuery({
    queryKey: importExportKeys.backups(planId),
    queryFn: async () => {
      const result = await listBackups(planId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.backups || [];
    },
    enabled: !!planId,
  });
}

/**
 * Create a backup
 */
export function useCreateBackup(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const result = await createBackup(planId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.backupId;
    },
    onSuccess: () => {
      toast(successMessages.backupCreated);
      queryClient.invalidateQueries({ queryKey: importExportKeys.backups(planId) });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Delete a backup
 */
export function useDeleteBackup(planId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (backupPath: string) => {
      const result = await deleteBackup(backupPath);
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      toast(successMessages.backupDeleted);
      queryClient.invalidateQueries({ queryKey: importExportKeys.backups(planId) });
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Restore from a backup (download and import)
 */
export function useRestoreBackup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      backupPath,
      options,
    }: {
      backupPath: string;
      options: ImportOptions;
    }) => {
      // Download backup data
      const downloadResult = await downloadBackup(backupPath);
      if (!downloadResult.success || !downloadResult.data) {
        throw new Error(downloadResult.error || "Failed to download backup");
      }

      // Import the data
      const jsonContent = JSON.stringify(downloadResult.data);
      return importPlanFromJson(jsonContent, options);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Backup restored",
          description: "Data has been restored successfully",
          variant: "success",
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.objectives.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.annualKrs.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      } else {
        toast({
          title: "Restore completed with errors",
          description: result.errors[0] || "Some items could not be restored",
          variant: "warning",
        });
      }
    },
    onError: (error) => {
      toast(formatErrorMessage(error));
    },
  });
}

/**
 * Get export data without downloading (for preview or backup)
 */
export function useGetExportData(planId: string, enabled = false) {
  return useQuery({
    queryKey: [...importExportKeys.all, "export", planId],
    queryFn: () => exportPlanToJson(planId),
    enabled: enabled && !!planId,
    staleTime: 0, // Always fetch fresh data for exports
  });
}
