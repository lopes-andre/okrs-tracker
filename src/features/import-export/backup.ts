// ============================================================================
// CLOUD BACKUP - Supabase storage operations for plan backups
// ============================================================================

import { createUntypedClient as createClient } from "@/lib/supabase/untyped-client";
import type { BackupListItem, PlanExport } from "./types";
import { exportPlanToJson } from "./export-json";
import { format } from "date-fns";

const BUCKET_NAME = "plan-backups";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateBackupPath(
  userId: string,
  planId: string,
  planName: string
): string {
  const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
  const safeName = planName.replace(/[^a-zA-Z0-9-_]/g, "_");
  return `${userId}/${planId}/${safeName}_${timestamp}.json`;
}

function parseBackupFilename(filename: string): { name: string; timestamp: Date } | null {
  // Format: PlanName_yyyy-MM-dd_HH-mm-ss.json
  const match = filename.match(/^(.+)_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.json$/);
  if (!match) return null;

  const [, name, dateStr] = match;
  const [datePart, timePart] = dateStr.split("_");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split("-").map(Number);

  return {
    name: name.replace(/_/g, " "),
    timestamp: new Date(year, month - 1, day, hour, minute, second),
  };
}

// ============================================================================
// BACKUP OPERATIONS
// ============================================================================

/**
 * Create a backup of a plan in cloud storage
 */
export async function createBackup(planId: string): Promise<{
  success: boolean;
  backupId?: string;
  error?: string;
}> {
  const supabase = createClient();

  // Get current user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { success: false, error: "Authentication required" };
  }

  try {
    // Export plan data
    const exportData = await exportPlanToJson(planId);

    // Generate backup path
    const filePath = generateBackupPath(
      userData.user.id,
      planId,
      exportData.plan.name
    );

    // Upload to storage
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      // Check if bucket doesn't exist
      if (uploadError.message.includes("Bucket not found")) {
        return {
          success: false,
          error: "Cloud backup is not configured. Please contact your administrator.",
        };
      }
      return { success: false, error: uploadError.message };
    }

    return {
      success: true,
      backupId: uploadData.path,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create backup",
    };
  }
}

/**
 * List all backups for a plan
 */
export async function listBackups(planId: string): Promise<{
  success: boolean;
  backups?: BackupListItem[];
  error?: string;
}> {
  const supabase = createClient();

  // Get current user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { success: false, error: "Authentication required" };
  }

  const folderPath = `${userData.user.id}/${planId}`;

  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath, {
      sortBy: { column: "created_at", order: "desc" },
    });

  if (listError) {
    // Return empty list if bucket doesn't exist
    if (listError.message.includes("Bucket not found")) {
      return { success: true, backups: [] };
    }
    return { success: false, error: listError.message };
  }

  const backups: BackupListItem[] = [];

  for (const file of files || []) {
    if (!file.name.endsWith(".json")) continue;

    const parsed = parseBackupFilename(file.name);
    if (!parsed) continue;

    backups.push({
      id: `${folderPath}/${file.name}`,
      name: file.name,
      planName: parsed.name,
      createdAt: parsed.timestamp.toISOString(),
      fileSize: file.metadata?.size || 0,
    });
  }

  return { success: true, backups };
}

/**
 * Download a backup file content
 */
export async function downloadBackup(backupPath: string): Promise<{
  success: boolean;
  data?: PlanExport;
  error?: string;
}> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(backupPath);

  if (error) {
    return { success: false, error: error.message };
  }

  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as PlanExport;
    return { success: true, data: parsed };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to parse backup",
    };
  }
}

/**
 * Delete a backup file
 */
export async function deleteBackup(backupPath: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([backupPath]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get a signed URL for downloading a backup
 */
export async function getBackupDownloadUrl(backupPath: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(backupPath, 60); // 60 seconds expiry

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, url: data.signedUrl };
}
