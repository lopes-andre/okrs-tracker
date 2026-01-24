# Backup & Recovery Guide

> Established: 2026-01-24

This document describes the backup and recovery procedures for the OKRs Tracker application, including data export formats, cloud backup features, and disaster recovery procedures.

## Table of Contents

- [Overview](#overview)
- [Export Formats](#export-formats)
- [Cloud Backups](#cloud-backups)
- [Manual Backup Procedures](#manual-backup-procedures)
- [Recovery Procedures](#recovery-procedures)
- [Backup Verification](#backup-verification)
- [Recommended Backup Schedule](#recommended-backup-schedule)
- [Disaster Recovery](#disaster-recovery)

---

## Overview

### Backup Methods

| Method | Format | Storage | Automation |
|--------|--------|---------|------------|
| JSON Export | `.json` | Local download | Manual |
| Markdown Export | `.md` | Local download | Manual |
| Cloud Backup | `.json` | Supabase Storage | Manual (UI) |

### Data Included in Backups

| Entity | Included | Notes |
|--------|----------|-------|
| Plan metadata | Yes | Name, year, description |
| Objectives | Yes | With nested KRs |
| Annual KRs | Yes | All types and configurations |
| Quarter Targets | Yes | All 4 quarters |
| Tasks | Yes | With tag associations |
| Tags | Yes | All tag kinds |
| KR Groups | Yes | Grouping configuration |
| Check-ins | Yes | Can be skipped on import |
| Weekly Reviews | Yes | Can be skipped on import |

### Data NOT Included

| Data | Reason |
|------|--------|
| User accounts | Handled by authentication system |
| Plan membership | Re-created on import |
| Activity events | Generated automatically |
| Dashboard configurations | User-specific |

---

## Export Formats

### JSON Export

**Format:** `PlanName_yyyy-MM-dd.json`

**Structure (Schema v1.0):**

```json
{
  "metadata": {
    "version": "1.0",
    "exportedAt": "2026-01-24T10:30:00.000Z",
    "planId": "uuid",
    "planName": "Plan Name",
    "planYear": 2026,
    "exportedBy": "user@example.com"
  },
  "plan": {
    "name": "Plan Name",
    "year": 2026,
    "description": "Optional description"
  },
  "tags": [...],
  "krGroups": [...],
  "objectives": [...],
  "tasks": [...],
  "checkIns": [...],
  "weeklyReviews": [...]
}
```

**Features:**
- Complete data export
- Cross-references via `_exportId` fields
- Zod schema validation on import
- Human-readable when formatted

**How to Export:**
1. Go to Plan Settings → Import/Export
2. Click "Export JSON"
3. File downloads automatically

### Markdown Export

**Format:** `PlanName_yyyy-MM-dd.md`

**Structure:**

```markdown
# Plan Name - 2026

_Exported on January 24, 2026_

## Objectives

### O1: Objective Name
Progress: 45%

#### KR1.1: Key Result Name
Type: Metric | Target: 100 | Current: 45

**Quarter Targets:**
- Q1: 25 (current: 25)
- Q2: 50 (current: 20)
...

## Tasks

### Pending Tasks
- [ ] Task title (Due: Jan 30)
...

### Completed Tasks
- [x] Completed task (Completed: Jan 20)
...
```

**Features:**
- Human-readable format
- Progress visualization
- Suitable for documentation
- **Not importable** (for reference only)

**How to Export:**
1. Go to Plan Settings → Import/Export
2. Click "Export Markdown"
3. File downloads automatically

---

## Cloud Backups

Cloud backups are stored in Supabase Storage and require the `plan-backups` bucket to be configured.

### How Cloud Backups Work

1. **Create Backup**: Exports plan to JSON and uploads to storage
2. **Storage Path**: `{userId}/{planId}/{PlanName}_{timestamp}.json`
3. **Listing**: Shows all backups for the plan, sorted by date
4. **Download**: Generates signed URL for secure download
5. **Delete**: Removes backup file from storage

### Creating a Cloud Backup

**Via UI:**
1. Go to Plan Settings → Import/Export
2. Scroll to "Cloud Backups" section
3. Click "Create Backup"
4. Wait for confirmation

**Via API (for automation):**
```typescript
import { createBackup } from "@/features/import-export/backup";

const result = await createBackup(planId);
if (result.success) {
  console.log("Backup created:", result.backupId);
} else {
  console.error("Backup failed:", result.error);
}
```

### Listing Backups

```typescript
import { listBackups } from "@/features/import-export/backup";

const { success, backups } = await listBackups(planId);
// Returns: Array of { id, name, planName, createdAt, fileSize }
```

### Deleting Backups

```typescript
import { deleteBackup } from "@/features/import-export/backup";

await deleteBackup(backupPath);
```

### Storage Requirements

- **Bucket Name**: `plan-backups`
- **Access**: Private (user-scoped via RLS)
- **File Format**: JSON
- **Naming**: `{PlanName}_{yyyy-MM-dd_HH-mm-ss}.json`

### Setting Up the Bucket

If cloud backups show "not configured" error:

```sql
-- Create the bucket (Supabase SQL editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('plan-backups', 'plan-backups', false);

-- Enable RLS
CREATE POLICY "Users can manage own backups"
ON storage.objects
FOR ALL
USING (bucket_id = 'plan-backups' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'plan-backups' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Manual Backup Procedures

### Daily Export (Recommended)

For critical plans:

1. Export JSON daily or after significant changes
2. Store in cloud storage (Google Drive, Dropbox, etc.)
3. Maintain at least 7 days of backups

### Pre-Migration Backup

Before any database migration:

1. Export all plans as JSON
2. Create cloud backups for each plan
3. Store exports in multiple locations
4. Verify backup integrity

### End-of-Quarter Backup

At the end of each quarter:

1. Export all plans (JSON + Markdown)
2. Create cloud backup
3. Archive the Markdown for reference
4. Store in long-term storage

---

## Recovery Procedures

### Restoring from JSON Export

1. Go to Plan Settings → Import/Export (on any plan, or use login page)
2. Click "Import Plan" in the Import section
3. Drag and drop or select your JSON file
4. Review the validation results:
   - **Errors**: Must be fixed before import
   - **Warnings**: Cross-reference issues (usually OK)
5. Configure import options:
   - Skip check-ins (start fresh)
   - Skip weekly reviews (start fresh)
   - Reset progress (set current values to start values)
6. Click "Import"
7. You'll be redirected to the new plan

### Restoring from Cloud Backup

1. Go to Plan Settings → Import/Export
2. In Cloud Backups section, find the backup
3. Click the download button
4. Save the file locally
5. Follow "Restoring from JSON Export" steps above

### Import Options

| Option | Default | Use Case |
|--------|---------|----------|
| Skip Check-ins | Off | Start fresh without history |
| Skip Weekly Reviews | Off | Start fresh without reviews |
| Reset Progress | Off | Reset all KR values to start values |

### Common Import Issues

| Issue | Solution |
|-------|----------|
| "Invalid version" | Export was from incompatible version |
| "Invalid JSON" | File is corrupted or wrong format |
| Cross-reference warnings | Usually OK - orphaned references are skipped |
| "Plan already exists" | Import always creates new plan |

---

## Backup Verification

### Manual Verification

After creating a backup:

1. **Download the backup file**
2. **Open in text editor** - verify JSON is valid
3. **Check entity counts**:
   ```json
   "objectives": [...],  // Should have expected count
   "tasks": [...],       // Should have expected count
   ```
4. **Verify recent data** - look for recent tasks/check-ins

### Automated Verification Script

Use the verification script:

```bash
./scripts/verify-backup.sh path/to/backup.json
```

The script checks:
- Valid JSON structure
- Schema version compatibility
- Required fields present
- Entity counts
- Cross-reference integrity

### Verification Checklist

- [ ] File downloads successfully
- [ ] File is valid JSON
- [ ] Schema version is "1.0"
- [ ] Plan metadata is correct
- [ ] Objective count matches
- [ ] Task count matches
- [ ] Recent check-ins included
- [ ] No validation errors

---

## Recommended Backup Schedule

### For Active Plans

| Frequency | Action | Retention |
|-----------|--------|-----------|
| Daily | JSON export (after major changes) | 7 days |
| Weekly | Cloud backup | 4 weeks |
| Monthly | Full JSON + Markdown export | 12 months |
| Quarterly | Archive + off-site storage | Indefinite |

### For Completed Plans

| Action | When | Retention |
|--------|------|-----------|
| Final JSON export | End of plan year | Indefinite |
| Final Markdown export | End of plan year | Indefinite |
| Cloud backup | End of plan year | Indefinite |

### Backup Locations

Recommended multi-location storage:

1. **Local**: Download folder (temporary)
2. **Cloud Storage**: Google Drive, Dropbox, OneDrive
3. **Version Control**: Private Git repository (for long-term)
4. **Supabase Storage**: Cloud backups (built-in)

---

## Disaster Recovery

### Scenario: Accidental Data Deletion

1. **Immediate**: Check if recent cloud backup exists
2. If yes: Restore from cloud backup
3. If no: Check local JSON exports
4. Restore and verify data integrity

### Scenario: Database Corruption

1. **Stop**: Don't create new data
2. **Backup Current State**: Export whatever is accessible
3. **Contact Support**: Report the issue
4. **Restore**: From most recent verified backup

### Scenario: Complete Data Loss

1. **Locate Backups**: Check all storage locations
2. **Find Most Recent**: Compare timestamps
3. **Verify Integrity**: Run verification script
4. **Restore**: Import to new plan
5. **Review**: Check for missing data since backup

### Recovery Priority Order

1. Cloud backups (most recent, verified)
2. Local JSON exports
3. Markdown exports (for reference, not importable)
4. Manual reconstruction (last resort)

### Post-Recovery Actions

1. Verify all objectives and KRs restored
2. Check task list completeness
3. Review check-in history
4. Update any changed data since backup
5. Create fresh backup of restored plan
6. Document incident and recovery steps

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/features/import-export/backup.ts` | Cloud backup API |
| `src/features/import-export/export-json.ts` | JSON export logic |
| `src/features/import-export/export-markdown.ts` | Markdown export logic |
| `src/features/import-export/import-json.ts` | Import logic |
| `src/features/import-export/schema.ts` | Zod validation schemas |
| `src/features/import-export/types.ts` | Export format types |
| `scripts/verify-backup.sh` | Backup verification script |
