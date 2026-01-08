import { ApiError } from "./api-utils";

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

export function formatErrorMessage(error: unknown): ToastMessage {
  if (error instanceof ApiError) {
    return {
      title: "Error",
      description: error.userMessage,
      variant: "destructive",
    };
  }

  if (error instanceof Error) {
    return {
      title: "Error",
      description: error.message,
      variant: "destructive",
    };
  }

  return {
    title: "Error",
    description: "An unexpected error occurred. Please try again.",
    variant: "destructive",
  };
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
  tagDeleted: { title: "Tag deleted", variant: "success" as const },
  groupCreated: { title: "Group created", variant: "success" as const },
  groupUpdated: { title: "Group updated", variant: "success" as const },
  groupDeleted: { title: "Group deleted", variant: "success" as const },

  // Dashboards
  dashboardCreated: { title: "Dashboard created", variant: "success" as const },
  dashboardUpdated: { title: "Dashboard updated", variant: "success" as const },
  dashboardDeleted: { title: "Dashboard deleted", variant: "success" as const },
  widgetAdded: { title: "Widget added", variant: "success" as const },
  widgetRemoved: { title: "Widget removed", variant: "success" as const },

  // Mindmap
  layoutSaved: { title: "Layout saved", description: "Your mindmap layout has been saved.", variant: "success" as const },

  // General
  saved: { title: "Saved", variant: "success" as const },
  deleted: { title: "Deleted", variant: "success" as const },
  copied: { title: "Copied to clipboard", variant: "success" as const },
} as const;

// ============================================================================
// WARNING MESSAGES
// ============================================================================

export const warningMessages = {
  unsavedChanges: { title: "Unsaved changes", description: "You have unsaved changes that will be lost.", variant: "warning" as const },
  offline: { title: "You're offline", description: "Changes will sync when you're back online.", variant: "warning" as const },
  slowConnection: { title: "Slow connection", description: "This might take a moment.", variant: "warning" as const },
} as const;
