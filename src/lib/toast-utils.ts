import { ApiError } from "./api-utils";

// Toast types that match our UI toast system
export type ToastType = "default" | "success" | "error" | "warning";

export interface ToastMessage {
  title: string;
  description?: string;
  type: ToastType;
}

// ============================================================================
// ERROR MESSAGE FORMATTING
// ============================================================================

export function formatErrorMessage(error: unknown): ToastMessage {
  if (error instanceof ApiError) {
    return {
      title: "Error",
      description: error.userMessage,
      type: "error",
    };
  }

  if (error instanceof Error) {
    return {
      title: "Error",
      description: error.message,
      type: "error",
    };
  }

  return {
    title: "Error",
    description: "An unexpected error occurred. Please try again.",
    type: "error",
  };
}

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const successMessages = {
  // Plans
  planCreated: { title: "Plan created", description: "Your new plan is ready.", type: "success" as const },
  planUpdated: { title: "Plan updated", description: "Your changes have been saved.", type: "success" as const },
  planDeleted: { title: "Plan deleted", description: "The plan has been removed.", type: "success" as const },

  // Members
  memberInvited: { title: "Invitation sent", description: "They'll receive an email invitation.", type: "success" as const },
  memberRemoved: { title: "Member removed", description: "They no longer have access.", type: "success" as const },
  roleUpdated: { title: "Role updated", description: "Member permissions have been changed.", type: "success" as const },

  // Objectives
  objectiveCreated: { title: "Objective created", type: "success" as const },
  objectiveUpdated: { title: "Objective updated", type: "success" as const },
  objectiveDeleted: { title: "Objective deleted", type: "success" as const },

  // Key Results
  krCreated: { title: "Key Result created", type: "success" as const },
  krUpdated: { title: "Key Result updated", type: "success" as const },
  krDeleted: { title: "Key Result deleted", type: "success" as const },

  // Quarter Targets
  targetCreated: { title: "Quarterly target set", type: "success" as const },
  targetUpdated: { title: "Target updated", type: "success" as const },

  // Tasks
  taskCreated: { title: "Task created", type: "success" as const },
  taskUpdated: { title: "Task updated", type: "success" as const },
  taskDeleted: { title: "Task deleted", type: "success" as const },
  taskCompleted: { title: "Task completed", description: "Great work! 🎉", type: "success" as const },

  // Check-ins
  checkInRecorded: { title: "Check-in recorded", description: "Progress has been updated.", type: "success" as const },

  // Tags & Groups
  tagCreated: { title: "Tag created", type: "success" as const },
  tagDeleted: { title: "Tag deleted", type: "success" as const },
  groupCreated: { title: "Group created", type: "success" as const },
  groupUpdated: { title: "Group updated", type: "success" as const },
  groupDeleted: { title: "Group deleted", type: "success" as const },

  // Dashboards
  dashboardCreated: { title: "Dashboard created", type: "success" as const },
  dashboardUpdated: { title: "Dashboard updated", type: "success" as const },
  dashboardDeleted: { title: "Dashboard deleted", type: "success" as const },
  widgetAdded: { title: "Widget added", type: "success" as const },
  widgetRemoved: { title: "Widget removed", type: "success" as const },

  // Mindmap
  layoutSaved: { title: "Layout saved", description: "Your mindmap layout has been saved.", type: "success" as const },

  // General
  saved: { title: "Saved", type: "success" as const },
  deleted: { title: "Deleted", type: "success" as const },
  copied: { title: "Copied to clipboard", type: "success" as const },
} as const;

// ============================================================================
// WARNING MESSAGES
// ============================================================================

export const warningMessages = {
  unsavedChanges: { title: "Unsaved changes", description: "You have unsaved changes that will be lost.", type: "warning" as const },
  offline: { title: "You're offline", description: "Changes will sync when you're back online.", type: "warning" as const },
  slowConnection: { title: "Slow connection", description: "This might take a moment.", type: "warning" as const },
} as const;
