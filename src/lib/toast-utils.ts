import { toApiError, type ErrorCategory } from "./api-utils";

// Toast variants that match our UI toast system
export type ToastVariant = "default" | "success" | "warning" | "destructive";

export interface ToastMessage {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

// ============================================================================
// ERROR MESSAGE FORMATTING
// ============================================================================

/**
 * Get user-friendly title based on error category
 */
function getErrorTitle(category: ErrorCategory): string {
  switch (category) {
    case "validation":
      return "Validation Error";
    case "auth":
      return "Access Denied";
    case "not_found":
      return "Not Found";
    case "conflict":
      return "Conflict";
    case "network":
      return "Connection Error";
    case "timeout":
      return "Request Timeout";
    case "rate_limit":
      return "Too Many Requests";
    case "server":
      return "Server Error";
    default:
      return "Error";
  }
}

/**
 * Get additional guidance based on error category
 */
function getErrorGuidance(category: ErrorCategory): string | undefined {
  switch (category) {
    case "network":
      return "Please check your internet connection and try again.";
    case "timeout":
      return "The request took too long. Please try again.";
    case "rate_limit":
      return "Please wait a moment before trying again.";
    case "server":
      return "Our team has been notified. Please try again later.";
    case "auth":
      return "Please refresh the page or log in again.";
    default:
      return undefined;
  }
}

export function formatErrorMessage(error: unknown): ToastMessage {
  const apiError = toApiError(error);
  const title = getErrorTitle(apiError.category);
  const guidance = getErrorGuidance(apiError.category);

  // Combine user message with guidance
  let description = apiError.userMessage;
  if (guidance && !description.toLowerCase().includes(guidance.toLowerCase().slice(0, 20))) {
    description = `${description} ${guidance}`;
  }

  return {
    title,
    description,
    variant: "destructive",
  };
}

/**
 * Format error with additional retry hint
 */
export function formatErrorWithRetryHint(error: unknown): ToastMessage {
  const base = formatErrorMessage(error);
  const apiError = toApiError(error);

  // Add retry hint for retryable errors
  if (apiError.isRetryable && base.description) {
    return {
      ...base,
      description: `${base.description} You can try again.`,
    };
  }

  return base;
}

/**
 * Check if error is likely transient and will resolve on retry
 */
export function isTransientError(error: unknown): boolean {
  const apiError = toApiError(error);
  return apiError.category === "network" || apiError.category === "timeout";
}

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const successMessages = {
  // Plans
  planCreated: { title: "Plan created", description: "Your new plan is ready.", variant: "success" as const },
  planUpdated: { title: "Plan updated", description: "Your changes have been saved.", variant: "success" as const },
  planDeleted: { title: "Plan deleted", description: "The plan has been removed.", variant: "success" as const },

  // Members
  memberInvited: { title: "Invitation sent", description: "They'll receive an email invitation.", variant: "success" as const },
  memberRemoved: { title: "Member removed", description: "They no longer have access.", variant: "success" as const },
  roleUpdated: { title: "Role updated", description: "Member permissions have been changed.", variant: "success" as const },
  inviteAccepted: { title: "Invite accepted", description: "You now have access to the plan.", variant: "success" as const },
  inviteDeclined: { title: "Invite declined", variant: "success" as const },

  // Objectives
  objectiveCreated: { title: "Objective created", variant: "success" as const },
  objectiveUpdated: { title: "Objective updated", variant: "success" as const },
  objectiveDeleted: { title: "Objective deleted", variant: "success" as const },

  // Key Results
  krCreated: { title: "Key Result created", variant: "success" as const },
  krUpdated: { title: "Key Result updated", variant: "success" as const },
  krDeleted: { title: "Key Result deleted", variant: "success" as const },

  // Quarter Targets
  targetCreated: { title: "Quarterly target set", variant: "success" as const },
  targetUpdated: { title: "Target updated", variant: "success" as const },

  // Tasks
  taskCreated: { title: "Task created", variant: "success" as const },
  taskUpdated: { title: "Task updated", variant: "success" as const },
  taskDeleted: { title: "Task deleted", variant: "success" as const },
  taskCompleted: { title: "Task completed", description: "Great work! 🎉", variant: "success" as const },

  // Check-ins
  checkInRecorded: { title: "Check-in recorded", description: "Progress has been updated.", variant: "success" as const },

  // Tags & Groups
  tagCreated: { title: "Tag created", variant: "success" as const },
  tagUpdated: { title: "Tag updated", description: "All tasks using this tag have been updated.", variant: "success" as const },
  tagDeleted: { title: "Tag deleted", description: "Tag has been removed from all tasks.", variant: "success" as const },
  groupCreated: { title: "Group created", variant: "success" as const },
  groupUpdated: { title: "Group updated", variant: "success" as const },
  groupDeleted: { title: "Group deleted", variant: "success" as const },

  // Dashboards
  dashboardCreated: { title: "Dashboard created", variant: "success" as const },
  dashboardUpdated: { title: "Dashboard updated", variant: "success" as const },
  dashboardDeleted: { title: "Dashboard deleted", variant: "success" as const },
  widgetAdded: { title: "Widget added", variant: "success" as const },
  widgetRemoved: { title: "Widget removed", variant: "success" as const },

  // General
  saved: { title: "Saved", variant: "success" as const },
  deleted: { title: "Deleted", variant: "success" as const },
  copied: { title: "Copied to clipboard", variant: "success" as const },

  // Import/Export
  exportComplete: { title: "Export complete", description: "File downloaded successfully", variant: "success" as const },
  importComplete: { title: "Import complete", description: "Data imported successfully", variant: "success" as const },
  backupCreated: { title: "Backup created", description: "Stored in cloud", variant: "success" as const },
  backupDeleted: { title: "Backup deleted", variant: "success" as const },

  // Content Planner
  postCreated: { title: "Post created", variant: "success" as const },
  postUpdated: { title: "Post updated", variant: "success" as const },
  postDeleted: { title: "Post deleted", variant: "success" as const },
  distributionCreated: { title: "Distribution added", variant: "success" as const },
  distributionUpdated: { title: "Distribution updated", variant: "success" as const },
  distributionDeleted: { title: "Distribution deleted", variant: "success" as const },
  distributionPosted: { title: "Marked as posted", variant: "success" as const },
  mediaUploaded: { title: "Media uploaded", variant: "success" as const },
  mediaDeleted: { title: "Media deleted", variant: "success" as const },
  linkAdded: { title: "Link added", variant: "success" as const },
  linkDeleted: { title: "Link deleted", variant: "success" as const },
} as const;

// ============================================================================
// WARNING MESSAGES
// ============================================================================

export const warningMessages = {
  unsavedChanges: { title: "Unsaved changes", description: "You have unsaved changes that will be lost.", variant: "warning" as const },
  offline: { title: "You're offline", description: "Changes will sync when you're back online.", variant: "warning" as const },
  slowConnection: { title: "Slow connection", description: "This might take a moment.", variant: "warning" as const },
} as const;
