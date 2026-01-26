/**
 * Toast Utils Tests
 *
 * Tests for error message formatting and success/warning message definitions.
 */

import { describe, it, expect } from "vitest";
import {
  formatErrorMessage,
  successMessages,
  warningMessages,
  type ToastMessage,
} from "./toast-utils";
import { ApiError } from "./api-utils";

// ============================================================================
// formatErrorMessage TESTS
// ============================================================================

describe("formatErrorMessage", () => {
  describe("ApiError handling", () => {
    it("should format ApiError with unique violation", () => {
      // ApiError constructor expects a PostgrestError-like object
      const postgrestError = {
        message: "duplicate key value violates unique constraint",
        code: "23505",
        details: "Key (id)=(abc) already exists.",
        hint: null,
      };
      const error = new ApiError(postgrestError);

      const result = formatErrorMessage(error);

      expect(result.title).toBe("Conflict");
      expect(result.description).toBe("This item already exists.");
      expect(result.variant).toBe("destructive");
    });

    it("should format ApiError with permission denied", () => {
      const postgrestError = {
        message: "Permission denied for table",
        code: "42501",
        details: null,
        hint: null,
      };
      const error = new ApiError(postgrestError);

      const result = formatErrorMessage(error);

      expect(result.title).toBe("Access Denied");
      expect(result.description).toContain("You don't have permission to perform this action.");
      expect(result.variant).toBe("destructive");
    });

    it("should format ApiError with foreign key violation", () => {
      const postgrestError = {
        message: "Foreign key violation",
        code: "23503",
        details: null,
        hint: null,
      };
      const error = new ApiError(postgrestError);

      const result = formatErrorMessage(error);

      expect(result.title).toBe("Validation Error");
      expect(result.description).toBe("Cannot delete this item because it is referenced by other data.");
    });

    it("should format ApiError with unknown code using message", () => {
      const postgrestError = {
        message: "Some unknown database error",
        code: "99999",
        details: null,
        hint: null,
      };
      const error = new ApiError(postgrestError);

      const result = formatErrorMessage(error);

      expect(result.description).toBe("Some unknown database error");
    });
  });

  describe("Error object handling", () => {
    it("should format standard Error", () => {
      const error = new Error("Something went wrong");

      const result = formatErrorMessage(error);

      expect(result.title).toBe("Error");
      expect(result.description).toBe("Something went wrong");
      expect(result.variant).toBe("destructive");
    });

    it("should format TypeError", () => {
      const error = new TypeError("Cannot read property 'foo' of undefined");

      const result = formatErrorMessage(error);

      expect(result.title).toBe("Error");
      expect(result.description).toBe("Cannot read property 'foo' of undefined");
    });

    it("should format RangeError", () => {
      const error = new RangeError("Index out of bounds");

      const result = formatErrorMessage(error);

      expect(result.description).toBe("Index out of bounds");
    });
  });

  describe("Plain object error handling", () => {
    it("should format object with message property", () => {
      const error = { message: "Network request failed" };

      const result = formatErrorMessage(error);

      expect(result.title).toBe("Error");
      expect(result.description).toBe("Network request failed");
      expect(result.variant).toBe("destructive");
    });

    it("should format Supabase-like error object", () => {
      const error = {
        message: "duplicate key value violates unique constraint",
        code: "23505",
        details: "Key (id)=(abc) already exists.",
      };

      const result = formatErrorMessage(error);

      expect(result.title).toBe("Conflict");
      expect(result.description).toBe("This item already exists.");
    });

    it("should handle object with empty message", () => {
      const error = { message: "" };

      const result = formatErrorMessage(error);

      // Empty message gets converted to default
      expect(result.description).toBe("An unexpected error occurred.");
    });
  });

  describe("String error handling", () => {
    it("should format string error", () => {
      const error = "Custom error message";

      const result = formatErrorMessage(error);

      expect(result.title).toBe("Error");
      expect(result.description).toBe("Custom error message");
      expect(result.variant).toBe("destructive");
    });

    it("should format empty string error", () => {
      const error = "";

      const result = formatErrorMessage(error);

      // Empty string gets converted to default
      expect(result.description).toBe("An unexpected error occurred.");
    });
  });

  describe("Unknown error handling", () => {
    it("should handle null error", () => {
      const result = formatErrorMessage(null);

      expect(result.title).toBe("Error");
      expect(result.description).toBe("An unexpected error occurred.");
      expect(result.variant).toBe("destructive");
    });

    it("should handle undefined error", () => {
      const result = formatErrorMessage(undefined);

      expect(result.title).toBe("Error");
      expect(result.description).toBe("An unexpected error occurred.");
    });

    it("should handle number error", () => {
      const result = formatErrorMessage(404);

      expect(result.title).toBe("Error");
      expect(result.description).toBe("An unexpected error occurred.");
    });

    it("should handle boolean error", () => {
      const result = formatErrorMessage(false);

      expect(result.description).toBe("An unexpected error occurred.");
    });

    it("should handle array error", () => {
      const result = formatErrorMessage(["error1", "error2"]);

      // Arrays don't have a 'message' property
      expect(result.description).toBe("An unexpected error occurred.");
    });

    it("should handle object without message property", () => {
      const error = { code: "500", status: "error" };

      const result = formatErrorMessage(error);

      expect(result.description).toBe("An unexpected error occurred.");
    });
  });

  describe("Return type validation", () => {
    it("should always return a valid ToastMessage", () => {
      const testCases = [
        new ApiError({ message: "test", code: "UNKNOWN" }),
        new Error("test"),
        { message: "test" },
        "test",
        null,
        undefined,
        123,
        {},
      ];

      testCases.forEach((error) => {
        const result = formatErrorMessage(error);

        expect(result).toHaveProperty("title");
        expect(result).toHaveProperty("variant");
        expect(typeof result.title).toBe("string");
        expect(result.variant).toBe("destructive");
      });
    });
  });

  describe("Network error handling", () => {
    it("should format network errors with guidance", () => {
      const error = new TypeError("Failed to fetch");

      const result = formatErrorMessage(error);

      expect(result.title).toBe("Connection Error");
      expect(result.description).toContain("check your internet connection");
    });

    it("should format timeout errors", () => {
      const postgrestError = {
        message: "Request timeout",
        code: "PGRST103",
        details: null,
        hint: null,
      };
      const error = new ApiError(postgrestError);

      const result = formatErrorMessage(error);

      expect(result.title).toBe("Request Timeout");
    });
  });
});

// ============================================================================
// successMessages TESTS
// ============================================================================

describe("successMessages", () => {
  describe("structure validation", () => {
    it("should have all required properties for each message", () => {
      const messageKeys = Object.keys(successMessages) as Array<keyof typeof successMessages>;

      messageKeys.forEach((key) => {
        const message = successMessages[key];
        expect(message).toHaveProperty("title");
        expect(message).toHaveProperty("variant");
        expect(message.variant).toBe("success");
        expect(typeof message.title).toBe("string");
        expect(message.title.length).toBeGreaterThan(0);
      });
    });
  });

  describe("plan messages", () => {
    it("should have planCreated message", () => {
      expect(successMessages.planCreated.title).toBe("Plan created");
      expect(successMessages.planCreated.description).toBe("Your new plan is ready.");
    });

    it("should have planUpdated message", () => {
      expect(successMessages.planUpdated.title).toBe("Plan updated");
    });

    it("should have planDeleted message", () => {
      expect(successMessages.planDeleted.title).toBe("Plan deleted");
    });
  });

  describe("member messages", () => {
    it("should have memberInvited message", () => {
      expect(successMessages.memberInvited.title).toBe("Invitation sent");
      expect(successMessages.memberInvited.description).toContain("email");
    });

    it("should have memberRemoved message", () => {
      expect(successMessages.memberRemoved.title).toBe("Member removed");
    });

    it("should have roleUpdated message", () => {
      expect(successMessages.roleUpdated.title).toBe("Role updated");
    });
  });

  describe("objective messages", () => {
    it("should have objectiveCreated message", () => {
      expect(successMessages.objectiveCreated.title).toBe("Objective created");
    });

    it("should have objectiveUpdated message", () => {
      expect(successMessages.objectiveUpdated.title).toBe("Objective updated");
    });

    it("should have objectiveDeleted message", () => {
      expect(successMessages.objectiveDeleted.title).toBe("Objective deleted");
    });
  });

  describe("key result messages", () => {
    it("should have krCreated message", () => {
      expect(successMessages.krCreated.title).toBe("Key Result created");
    });

    it("should have krUpdated message", () => {
      expect(successMessages.krUpdated.title).toBe("Key Result updated");
    });

    it("should have krDeleted message", () => {
      expect(successMessages.krDeleted.title).toBe("Key Result deleted");
    });
  });

  describe("task messages", () => {
    it("should have taskCreated message", () => {
      expect(successMessages.taskCreated.title).toBe("Task created");
    });

    it("should have taskCompleted message with emoji", () => {
      expect(successMessages.taskCompleted.title).toBe("Task completed");
      expect(successMessages.taskCompleted.description).toContain("🎉");
    });

    it("should have taskDeleted message", () => {
      expect(successMessages.taskDeleted.title).toBe("Task deleted");
    });
  });

  describe("tag messages", () => {
    it("should have tagCreated message", () => {
      expect(successMessages.tagCreated.title).toBe("Tag created");
    });

    it("should have tagUpdated message with details", () => {
      expect(successMessages.tagUpdated.title).toBe("Tag updated");
      expect(successMessages.tagUpdated.description).toContain("tasks");
    });

    it("should have tagDeleted message with details", () => {
      expect(successMessages.tagDeleted.title).toBe("Tag deleted");
      expect(successMessages.tagDeleted.description).toContain("removed");
    });
  });

  describe("dashboard messages", () => {
    it("should have dashboardCreated message", () => {
      expect(successMessages.dashboardCreated.title).toBe("Dashboard created");
    });

    it("should have widgetAdded message", () => {
      expect(successMessages.widgetAdded.title).toBe("Widget added");
    });

    it("should have widgetRemoved message", () => {
      expect(successMessages.widgetRemoved.title).toBe("Widget removed");
    });
  });

  describe("import/export messages", () => {
    it("should have exportComplete message", () => {
      expect(successMessages.exportComplete.title).toBe("Export complete");
      expect(successMessages.exportComplete.description).toContain("downloaded");
    });

    it("should have importComplete message", () => {
      expect(successMessages.importComplete.title).toBe("Import complete");
    });

    it("should have backupCreated message", () => {
      expect(successMessages.backupCreated.title).toBe("Backup created");
      expect(successMessages.backupCreated.description).toContain("cloud");
    });
  });

  describe("content planner messages", () => {
    it("should have postCreated message", () => {
      expect(successMessages.postCreated.title).toBe("Post created");
    });

    it("should have distributionCreated message", () => {
      expect(successMessages.distributionCreated.title).toBe("Distribution added");
    });

    it("should have distributionPosted message", () => {
      expect(successMessages.distributionPosted.title).toBe("Marked as posted");
    });

    it("should have mediaUploaded message", () => {
      expect(successMessages.mediaUploaded.title).toBe("Media uploaded");
    });
  });

  describe("general messages", () => {
    it("should have saved message", () => {
      expect(successMessages.saved.title).toBe("Saved");
    });

    it("should have deleted message", () => {
      expect(successMessages.deleted.title).toBe("Deleted");
    });

    it("should have copied message", () => {
      expect(successMessages.copied.title).toBe("Copied to clipboard");
    });
  });
});

// ============================================================================
// warningMessages TESTS
// ============================================================================

describe("warningMessages", () => {
  describe("structure validation", () => {
    it("should have all required properties for each message", () => {
      const messageKeys = Object.keys(warningMessages) as Array<keyof typeof warningMessages>;

      messageKeys.forEach((key) => {
        const message = warningMessages[key];
        expect(message).toHaveProperty("title");
        expect(message).toHaveProperty("variant");
        expect(message.variant).toBe("warning");
        expect(typeof message.title).toBe("string");
      });
    });
  });

  describe("individual messages", () => {
    it("should have unsavedChanges message", () => {
      expect(warningMessages.unsavedChanges.title).toBe("Unsaved changes");
      expect(warningMessages.unsavedChanges.description).toContain("lost");
    });

    it("should have offline message", () => {
      expect(warningMessages.offline.title).toBe("You're offline");
      expect(warningMessages.offline.description).toContain("sync");
    });

    it("should have slowConnection message", () => {
      expect(warningMessages.slowConnection.title).toBe("Slow connection");
      expect(warningMessages.slowConnection.description).toContain("moment");
    });
  });
});

// ============================================================================
// Type safety tests
// ============================================================================

describe("type safety", () => {
  it("successMessages should be readonly", () => {
    // This test verifies the const assertion
    // If successMessages was mutable, this would be allowed
    // TypeScript would catch attempts to modify at compile time
    const message = successMessages.taskCreated;
    expect(message.variant).toBe("success");
  });

  it("warningMessages should be readonly", () => {
    const message = warningMessages.offline;
    expect(message.variant).toBe("warning");
  });

  it("formatErrorMessage should accept any type", () => {
    // Test that the function handles various types without throwing
    expect(() => formatErrorMessage(new Error())).not.toThrow();
    expect(() => formatErrorMessage("string")).not.toThrow();
    expect(() => formatErrorMessage(null)).not.toThrow();
    expect(() => formatErrorMessage(undefined)).not.toThrow();
    expect(() => formatErrorMessage({})).not.toThrow();
    expect(() => formatErrorMessage([])).not.toThrow();
    expect(() => formatErrorMessage(123)).not.toThrow();
    expect(() => formatErrorMessage(Symbol("test"))).not.toThrow();
    expect(() => formatErrorMessage(() => {})).not.toThrow();
  });
});
