// ============================================================================
// MARKDOWN EXPORT - Export plan data to Markdown format
// ============================================================================

import type { PlanExport, ExportObjective, ExportAnnualKr } from "./types";
import { format } from "date-fns";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatKrType(type: string): string {
  const typeMap: Record<string, string> = {
    metric: "Metric",
    count: "Count",
    milestone: "Milestone",
    rate: "Rate",
    average: "Average",
  };
  return typeMap[type] || type;
}

function formatDirection(direction: string): string {
  const dirMap: Record<string, string> = {
    increase: "Increase",
    decrease: "Decrease",
    maintain: "Maintain",
  };
  return dirMap[direction] || direction;
}

function calculateProgress(kr: ExportAnnualKr): number {
  if (kr.targetValue === kr.startValue) return 0;
  const progress = ((kr.currentValue - kr.startValue) / (kr.targetValue - kr.startValue)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

function formatValue(value: number, unit: string | null): string {
  if (unit) {
    // Handle percentage, currency, etc.
    if (unit === "%") return `${value}%`;
    if (unit === "$" || unit === "USD") return `$${value.toLocaleString()}`;
    return `${value.toLocaleString()} ${unit}`;
  }
  return value.toLocaleString();
}

// ============================================================================
// MARKDOWN GENERATION
// ============================================================================

function generateKrTable(kr: ExportAnnualKr): string {
  const progress = calculateProgress(kr);
  const lines: string[] = [];

  lines.push("| Property | Value |");
  lines.push("|----------|-------|");
  lines.push(`| Type | ${formatKrType(kr.krType)} |`);
  lines.push(`| Direction | ${formatDirection(kr.direction)} |`);
  lines.push(`| Start Value | ${formatValue(kr.startValue, kr.unit)} |`);
  lines.push(`| Target Value | ${formatValue(kr.targetValue, kr.unit)} |`);
  lines.push(`| Current Value | ${formatValue(kr.currentValue, kr.unit)} |`);
  lines.push(`| Progress | ${progress.toFixed(1)}% |`);

  if (kr.description) {
    lines.push("");
    lines.push(`> ${kr.description}`);
  }

  return lines.join("\n");
}

function generateQuarterTargetsTable(kr: ExportAnnualKr): string | null {
  if (kr.quarterTargets.length === 0) return null;

  const lines: string[] = [];
  lines.push("**Quarterly Targets:**");
  lines.push("");
  lines.push("| Quarter | Target | Current | Progress |");
  lines.push("|---------|--------|---------|----------|");

  for (const qt of kr.quarterTargets) {
    const qtProgress = qt.targetValue > 0
      ? ((qt.currentValue / qt.targetValue) * 100).toFixed(1)
      : "0.0";
    lines.push(
      `| Q${qt.quarter} | ${formatValue(qt.targetValue, kr.unit)} | ${formatValue(qt.currentValue, kr.unit)} | ${qtProgress}% |`
    );
  }

  return lines.join("\n");
}

function generateObjectiveSection(
  objective: ExportObjective,
  objIndex: number
): string {
  const lines: string[] = [];

  // Objective header
  lines.push(`## ${objective.code}: ${objective.name}`);
  lines.push("");

  if (objective.description) {
    lines.push(objective.description);
    lines.push("");
  }

  // Key Results
  for (let i = 0; i < objective.annualKrs.length; i++) {
    const kr = objective.annualKrs[i];
    lines.push(`### KR ${objIndex + 1}.${i + 1}: ${kr.name}`);
    lines.push("");
    lines.push(generateKrTable(kr));
    lines.push("");

    const qtTable = generateQuarterTargetsTable(kr);
    if (qtTable) {
      lines.push(qtTable);
      lines.push("");
    }
  }

  return lines.join("\n");
}

function generateTasksSection(data: PlanExport): string {
  if (data.tasks.length === 0) return "";

  const lines: string[] = [];
  lines.push("## Tasks Summary");
  lines.push("");

  // Group by status
  const statusGroups = {
    pending: data.tasks.filter((t) => t.status === "pending"),
    in_progress: data.tasks.filter((t) => t.status === "in_progress"),
    completed: data.tasks.filter((t) => t.status === "completed"),
    cancelled: data.tasks.filter((t) => t.status === "cancelled"),
  };

  lines.push("| Status | Count |");
  lines.push("|--------|-------|");
  lines.push(`| Pending | ${statusGroups.pending.length} |`);
  lines.push(`| In Progress | ${statusGroups.in_progress.length} |`);
  lines.push(`| Completed | ${statusGroups.completed.length} |`);
  lines.push(`| Cancelled | ${statusGroups.cancelled.length} |`);
  lines.push(`| **Total** | **${data.tasks.length}** |`);
  lines.push("");

  // Active tasks list
  const activeTasks = [...statusGroups.pending, ...statusGroups.in_progress];
  if (activeTasks.length > 0) {
    lines.push("### Active Tasks");
    lines.push("");
    for (const task of activeTasks) {
      const priority = task.priority === "high" ? "(!)" : task.priority === "medium" ? "(~)" : "";
      const dueInfo = task.dueDate ? ` - Due: ${task.dueDate}` : "";
      lines.push(`- [ ] ${priority} ${task.title}${dueInfo}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function generateTagsSection(data: PlanExport): string {
  if (data.tags.length === 0) return "";

  const lines: string[] = [];
  lines.push("## Tags");
  lines.push("");

  // Group by kind
  const kindGroups = new Map<string, typeof data.tags>();
  for (const tag of data.tags) {
    const existing = kindGroups.get(tag.kind) || [];
    existing.push(tag);
    kindGroups.set(tag.kind, existing);
  }

  for (const [kind, tags] of kindGroups) {
    lines.push(`**${kind.charAt(0).toUpperCase() + kind.slice(1).replace("_", " ")}:** ${tags.map((t) => t.name).join(", ")}`);
  }
  lines.push("");

  return lines.join("\n");
}

function generateSummary(data: PlanExport): string {
  const lines: string[] = [];

  // Calculate overall progress
  let totalProgress = 0;
  let krCount = 0;
  for (const obj of data.objectives) {
    for (const kr of obj.annualKrs) {
      totalProgress += calculateProgress(kr);
      krCount++;
    }
  }
  const avgProgress = krCount > 0 ? (totalProgress / krCount).toFixed(1) : "0.0";

  lines.push("## Plan Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|--------|-------|");
  lines.push(`| Objectives | ${data.objectives.length} |`);
  lines.push(`| Key Results | ${krCount} |`);
  lines.push(`| Tasks | ${data.tasks.length} |`);
  lines.push(`| Check-ins | ${data.checkIns.length} |`);
  lines.push(`| Overall Progress | ${avgProgress}% |`);
  lines.push("");

  return lines.join("\n");
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function exportPlanToMarkdown(data: PlanExport): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${data.plan.name} - ${data.plan.year} OKR Plan`);
  lines.push("");
  lines.push(`*Exported on ${format(new Date(data.metadata.exportedAt), "MMMM d, yyyy 'at' h:mm a")}*`);
  lines.push("");

  if (data.plan.description) {
    lines.push(data.plan.description);
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // Summary
  lines.push(generateSummary(data));

  // Objectives and KRs
  for (let i = 0; i < data.objectives.length; i++) {
    lines.push(generateObjectiveSection(data.objectives[i], i + 1));
  }

  // Tasks
  lines.push(generateTasksSection(data));

  // Tags
  lines.push(generateTagsSection(data));

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(`*Generated by OKRs Tracker | Schema version ${data.metadata.version}*`);

  return lines.join("\n");
}

// ============================================================================
// DOWNLOAD HELPER
// ============================================================================

export function downloadMarkdownExport(
  markdown: string,
  planName: string,
  planYear: number
): void {
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);

  const filename = `${planName.replace(/[^a-zA-Z0-9-_]/g, "_")}_${planYear}_plan.md`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
