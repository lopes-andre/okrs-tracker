// ============================================================================
// IMPORT/EXPORT FEATURE MODULE
// ============================================================================

// Types
export type {
  PlanExport,
  ExportMetadata,
  ExportPlan,
  ExportTag,
  ExportKrGroup,
  ExportObjective,
  ExportAnnualKr,
  ExportQuarterTarget,
  ExportTask,
  ExportCheckIn,
  ExportWeeklyReview,
  ImportOptions,
  ImportPreview,
  ImportResult,
  BackupMetadata,
  BackupListItem,
} from "./types";
export { EXPORT_SCHEMA_VERSION } from "./types";

// Schema validation
export { validateImportFile, countExportEntities, planExportSchema } from "./schema";

// Export functions
export { exportPlanToJson, downloadJsonExport } from "./export-json";
export { exportPlanToMarkdown, downloadMarkdownExport } from "./export-markdown";

// Import functions
export { parseImportFile, importPlanFromJson } from "./import-json";

// Backup functions
export {
  createBackup,
  listBackups,
  downloadBackup,
  deleteBackup,
  getBackupDownloadUrl,
} from "./backup";

// Hooks
export {
  useExportJson,
  useExportMarkdown,
  useParseImportFile,
  useImportPlan,
  useBackups,
  useCreateBackup,
  useDeleteBackup,
  useRestoreBackup,
  useGetExportData,
  importExportKeys,
} from "./hooks";
