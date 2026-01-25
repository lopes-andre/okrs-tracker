import { describe, it, expect } from "vitest";
import type {
  ContentDistribution,
  ContentPostStatus,
  ContentDistributionStatus,
} from "@/lib/supabase/types";

// ============================================================================
// POST STATUS AUTO-UPDATE LOGIC TESTS
// ============================================================================

/**
 * Compute what the post status should be based on its distributions.
 * This mirrors the logic in the database trigger `update_content_post_status`.
 *
 * Status rules:
 *   - No distributions → "backlog"
 *   - Has distributions, none scheduled/posted → "tagged"
 *   - Any distribution scheduled or posted, not all complete → "ongoing"
 *   - All distributions posted → "complete"
 */
function computePostStatus(distributions: Pick<ContentDistribution, "status">[]): ContentPostStatus {
  if (distributions.length === 0) {
    return "backlog";
  }

  const totalCount = distributions.length;
  const postedCount = distributions.filter((d) => d.status === "posted").length;
  const scheduledCount = distributions.filter((d) => d.status === "scheduled").length;

  if (postedCount === totalCount) {
    return "complete";
  }

  if (postedCount > 0 || scheduledCount > 0) {
    return "ongoing";
  }

  return "tagged";
}

describe("Content Post Status Logic", () => {
  describe("computePostStatus", () => {
    it('should return "backlog" when there are no distributions', () => {
      const distributions: Pick<ContentDistribution, "status">[] = [];
      expect(computePostStatus(distributions)).toBe("backlog");
    });

    it('should return "tagged" when all distributions are drafts', () => {
      const distributions: Pick<ContentDistribution, "status">[] = [
        { status: "draft" },
        { status: "draft" },
      ];
      expect(computePostStatus(distributions)).toBe("tagged");
    });

    it('should return "ongoing" when some distributions are scheduled', () => {
      const distributions: Pick<ContentDistribution, "status">[] = [
        { status: "draft" },
        { status: "scheduled" },
      ];
      expect(computePostStatus(distributions)).toBe("ongoing");
    });

    it('should return "ongoing" when some distributions are posted but not all', () => {
      const distributions: Pick<ContentDistribution, "status">[] = [
        { status: "draft" },
        { status: "posted" },
      ];
      expect(computePostStatus(distributions)).toBe("ongoing");
    });

    it('should return "ongoing" when distributions are scheduled and posted but not all complete', () => {
      const distributions: Pick<ContentDistribution, "status">[] = [
        { status: "scheduled" },
        { status: "posted" },
      ];
      expect(computePostStatus(distributions)).toBe("ongoing");
    });

    it('should return "complete" when all distributions are posted', () => {
      const distributions: Pick<ContentDistribution, "status">[] = [
        { status: "posted" },
        { status: "posted" },
        { status: "posted" },
      ];
      expect(computePostStatus(distributions)).toBe("complete");
    });

    it('should return "complete" with single posted distribution', () => {
      const distributions: Pick<ContentDistribution, "status">[] = [{ status: "posted" }];
      expect(computePostStatus(distributions)).toBe("complete");
    });

    it('should return "ongoing" with mixed scheduled and draft', () => {
      const distributions: Pick<ContentDistribution, "status">[] = [
        { status: "draft" },
        { status: "draft" },
        { status: "scheduled" },
      ];
      expect(computePostStatus(distributions)).toBe("ongoing");
    });
  });
});

// ============================================================================
// CALENDAR DATE RANGE TESTS
// ============================================================================

/**
 * Filter distributions by date range (simulating calendar query logic)
 * This uses date-only comparison, ignoring time, similar to SQL's date casting
 */
function filterDistributionsByDateRange(
  distributions: Array<{
    id: string;
    scheduled_at: string | null;
    posted_at: string | null;
  }>,
  startDate: string,
  endDate: string
): typeof distributions {
  const start = startDate;
  const end = endDate;

  return distributions.filter((d) => {
    // Check scheduled_at - compare dates only
    if (d.scheduled_at) {
      const scheduledDate = d.scheduled_at.slice(0, 10); // Get YYYY-MM-DD
      if (scheduledDate >= start && scheduledDate <= end) {
        return true;
      }
    }
    // Check posted_at - compare dates only
    if (d.posted_at) {
      const postedDate = d.posted_at.slice(0, 10); // Get YYYY-MM-DD
      if (postedDate >= start && postedDate <= end) {
        return true;
      }
    }
    return false;
  });
}

describe("Content Calendar Date Range Logic", () => {
  describe("filterDistributionsByDateRange", () => {
    const testDistributions = [
      { id: "1", scheduled_at: "2026-01-15T10:00:00Z", posted_at: null },
      { id: "2", scheduled_at: "2026-01-20T14:00:00Z", posted_at: "2026-01-20T14:05:00Z" },
      { id: "3", scheduled_at: "2026-02-01T09:00:00Z", posted_at: null },
      { id: "4", scheduled_at: null, posted_at: "2026-01-25T16:00:00Z" },
      { id: "5", scheduled_at: "2026-01-10T08:00:00Z", posted_at: null },
      { id: "6", scheduled_at: null, posted_at: null }, // Should not match
    ];

    it("should filter distributions within date range by scheduled_at", () => {
      const result = filterDistributionsByDateRange(
        testDistributions,
        "2026-01-14",
        "2026-01-21"
      );
      expect(result.map((d) => d.id)).toContain("1");
      expect(result.map((d) => d.id)).toContain("2");
      expect(result.map((d) => d.id)).not.toContain("3");
    });

    it("should filter distributions within date range by posted_at", () => {
      const result = filterDistributionsByDateRange(
        testDistributions,
        "2026-01-24",
        "2026-01-26"
      );
      expect(result.map((d) => d.id)).toContain("4");
      expect(result.length).toBe(1);
    });

    it("should include distributions that match either scheduled_at or posted_at", () => {
      const result = filterDistributionsByDateRange(
        testDistributions,
        "2026-01-20",
        "2026-01-25"
      );
      // Distribution 2 matches scheduled_at
      // Distribution 4 matches posted_at
      expect(result.map((d) => d.id)).toContain("2");
      expect(result.map((d) => d.id)).toContain("4");
    });

    it("should return empty array when no distributions match", () => {
      const result = filterDistributionsByDateRange(
        testDistributions,
        "2026-03-01",
        "2026-03-31"
      );
      expect(result).toHaveLength(0);
    });

    it("should include boundary dates", () => {
      // Start boundary
      const startResult = filterDistributionsByDateRange(
        testDistributions,
        "2026-01-10",
        "2026-01-10"
      );
      expect(startResult.map((d) => d.id)).toContain("5");

      // End boundary
      const endResult = filterDistributionsByDateRange(
        testDistributions,
        "2026-01-25",
        "2026-01-25"
      );
      expect(endResult.map((d) => d.id)).toContain("4");
    });

    it("should exclude distributions without dates", () => {
      const result = filterDistributionsByDateRange(
        testDistributions,
        "2026-01-01",
        "2026-12-31"
      );
      expect(result.map((d) => d.id)).not.toContain("6");
    });

    it("should handle empty distribution list", () => {
      const result = filterDistributionsByDateRange([], "2026-01-01", "2026-01-31");
      expect(result).toHaveLength(0);
    });
  });
});

// ============================================================================
// DISTRIBUTION STATUS TRANSITIONS
// ============================================================================

describe("Distribution Status Transitions", () => {
  it("draft → scheduled is valid", () => {
    const from: ContentDistributionStatus = "draft";
    const to: ContentDistributionStatus = "scheduled";
    expect(isValidStatusTransition(from, to)).toBe(true);
  });

  it("scheduled → posted is valid", () => {
    const from: ContentDistributionStatus = "scheduled";
    const to: ContentDistributionStatus = "posted";
    expect(isValidStatusTransition(from, to)).toBe(true);
  });

  it("draft → posted is valid (direct posting)", () => {
    const from: ContentDistributionStatus = "draft";
    const to: ContentDistributionStatus = "posted";
    expect(isValidStatusTransition(from, to)).toBe(true);
  });

  it("posted → draft is invalid", () => {
    const from: ContentDistributionStatus = "posted";
    const to: ContentDistributionStatus = "draft";
    expect(isValidStatusTransition(from, to)).toBe(false);
  });

  it("posted → scheduled is invalid", () => {
    const from: ContentDistributionStatus = "posted";
    const to: ContentDistributionStatus = "scheduled";
    expect(isValidStatusTransition(from, to)).toBe(false);
  });

  it("scheduled → draft is valid (cancellation)", () => {
    const from: ContentDistributionStatus = "scheduled";
    const to: ContentDistributionStatus = "draft";
    expect(isValidStatusTransition(from, to)).toBe(true);
  });
});

/**
 * Check if a distribution status transition is valid.
 * Posted status is final and cannot be changed.
 */
function isValidStatusTransition(
  from: ContentDistributionStatus,
  to: ContentDistributionStatus
): boolean {
  // Same status is always valid (no change)
  if (from === to) return true;

  // Posted is final - cannot change from posted
  if (from === "posted") return false;

  // All other transitions are valid:
  // draft → scheduled (scheduling)
  // draft → posted (direct posting)
  // scheduled → posted (auto-posting or manual)
  // scheduled → draft (cancellation)
  return true;
}

// ============================================================================
// CONTENT GOAL COLOR VALIDATION
// ============================================================================

describe("Content Goal Colors", () => {
  it("should accept valid hex colors", () => {
    expect(isValidHexColor("#FF0000")).toBe(true);
    expect(isValidHexColor("#00ff00")).toBe(true);
    expect(isValidHexColor("#0000FF")).toBe(true);
    expect(isValidHexColor("#8B5CF6")).toBe(true);
    expect(isValidHexColor("#abc")).toBe(true); // shorthand
  });

  it("should reject invalid colors", () => {
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("FF0000")).toBe(false); // missing #
    expect(isValidHexColor("#GG0000")).toBe(false); // invalid chars
    expect(isValidHexColor("#FF00")).toBe(false); // wrong length
    expect(isValidHexColor("")).toBe(false);
  });
});

function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

// ============================================================================
// PLATFORM FORMAT VALIDATION
// ============================================================================

describe("Platform Format Validation", () => {
  const platformFormats: Record<string, string[]> = {
    instagram: ["post", "carousel", "reel", "story"],
    linkedin: ["post", "article", "document", "video"],
    youtube: ["short", "video"],
    tiktok: ["video"],
    x: ["post", "thread"],
  };

  it("should validate formats for each platform", () => {
    expect(isValidFormat("instagram", "post")).toBe(true);
    expect(isValidFormat("instagram", "reel")).toBe(true);
    expect(isValidFormat("instagram", "video")).toBe(false);

    expect(isValidFormat("youtube", "short")).toBe(true);
    expect(isValidFormat("youtube", "video")).toBe(true);
    expect(isValidFormat("youtube", "reel")).toBe(false);

    expect(isValidFormat("linkedin", "article")).toBe(true);
    expect(isValidFormat("linkedin", "story")).toBe(false);
  });

  function isValidFormat(platform: string, format: string): boolean {
    const formats = platformFormats[platform];
    if (!formats) return false;
    return formats.includes(format);
  }
});

// ============================================================================
// CAPTION PERSISTENCE TESTS
// ============================================================================

/**
 * Extract caption from distribution data.
 * Priority: distribution.caption > platform_specific_data.caption > platform_specific_data.tweet_text > etc.
 */
function extractCaption(
  distribution: {
    caption: string | null;
    platform_specific_data?: {
      caption?: string;
      tweet_text?: string;
      video_description?: string;
    } | null;
  }
): string {
  const data = distribution.platform_specific_data || {};
  return distribution.caption || data.caption || data.tweet_text || data.video_description || "";
}

describe("Caption Persistence", () => {
  it("should prioritize distribution.caption over platform_specific_data", () => {
    const distribution = {
      caption: "Main caption from distribution column",
      platform_specific_data: {
        caption: "Legacy caption in platform data",
      },
    };
    expect(extractCaption(distribution)).toBe("Main caption from distribution column");
  });

  it("should fallback to platform_specific_data.caption when distribution.caption is null", () => {
    const distribution = {
      caption: null,
      platform_specific_data: {
        caption: "Legacy caption in platform data",
      },
    };
    expect(extractCaption(distribution)).toBe("Legacy caption in platform data");
  });

  it("should fallback to tweet_text for Twitter/X distributions", () => {
    const distribution = {
      caption: null,
      platform_specific_data: {
        tweet_text: "My tweet content",
      },
    };
    expect(extractCaption(distribution)).toBe("My tweet content");
  });

  it("should fallback to video_description for YouTube distributions", () => {
    const distribution = {
      caption: null,
      platform_specific_data: {
        video_description: "Video description here",
      },
    };
    expect(extractCaption(distribution)).toBe("Video description here");
  });

  it("should return empty string when no caption data is available", () => {
    const distribution = {
      caption: null,
      platform_specific_data: {},
    };
    expect(extractCaption(distribution)).toBe("");
  });

  it("should handle null platform_specific_data", () => {
    const distribution = {
      caption: null,
      platform_specific_data: null,
    };
    expect(extractCaption(distribution)).toBe("");
  });
});

// ============================================================================
// DIRTY STATE DETECTION TESTS
// ============================================================================

/**
 * Compare distribution edit values against original values to detect real changes.
 */
function hasDistributionChanges(
  editData: {
    format?: string | null;
    caption?: string | null;
    scheduledDate?: string;
    scheduledTime?: string;
    platformPostUrl?: string | null;
    internalNotes?: string | null;
  },
  original: {
    format: string | null;
    caption: string | null;
    scheduled_at: string | null;
    platform_post_url: string | null;
    platform_specific_data?: { internal_notes?: string } | null;
  }
): boolean {
  // Get original values for comparison
  const origData = original.platform_specific_data || {};
  let origScheduledDate = "";
  let origScheduledTime = "";
  if (original.scheduled_at) {
    const date = new Date(original.scheduled_at);
    origScheduledDate = date.toISOString().slice(0, 10);
    origScheduledTime = date.toISOString().slice(11, 16);
  }

  // Compare each field
  const formatChanged = (editData.format ?? null) !== (original.format ?? null);
  const captionChanged = (editData.caption ?? null) !== (original.caption ?? null);
  const dateChanged = (editData.scheduledDate ?? "") !== origScheduledDate;
  const timeChanged = (editData.scheduledTime ?? "") !== origScheduledTime;
  const urlChanged = (editData.platformPostUrl ?? null) !== (original.platform_post_url ?? null);
  const notesChanged = (editData.internalNotes ?? null) !== (origData.internal_notes ?? null);

  return formatChanged || captionChanged || dateChanged || timeChanged || urlChanged || notesChanged;
}

describe("Dirty State Detection", () => {
  const originalDistribution = {
    format: "post" as const,
    caption: "Original caption",
    scheduled_at: "2026-01-25T10:00:00.000Z",
    platform_post_url: null,
    platform_specific_data: {
      internal_notes: "Some notes",
    },
  };

  it("should detect no changes when values are the same", () => {
    const editData = {
      format: "post",
      caption: "Original caption",
      scheduledDate: "2026-01-25",
      scheduledTime: "10:00",
      platformPostUrl: null,
      internalNotes: "Some notes",
    };
    expect(hasDistributionChanges(editData, originalDistribution)).toBe(false);
  });

  it("should detect format change", () => {
    const editData = {
      format: "reel",
      caption: "Original caption",
      scheduledDate: "2026-01-25",
      scheduledTime: "10:00",
      platformPostUrl: null,
      internalNotes: "Some notes",
    };
    expect(hasDistributionChanges(editData, originalDistribution)).toBe(true);
  });

  it("should detect caption change", () => {
    const editData = {
      format: "post",
      caption: "New caption",
      scheduledDate: "2026-01-25",
      scheduledTime: "10:00",
      platformPostUrl: null,
      internalNotes: "Some notes",
    };
    expect(hasDistributionChanges(editData, originalDistribution)).toBe(true);
  });

  it("should detect date change", () => {
    const editData = {
      format: "post",
      caption: "Original caption",
      scheduledDate: "2026-01-26",
      scheduledTime: "10:00",
      platformPostUrl: null,
      internalNotes: "Some notes",
    };
    expect(hasDistributionChanges(editData, originalDistribution)).toBe(true);
  });

  it("should detect time change", () => {
    const editData = {
      format: "post",
      caption: "Original caption",
      scheduledDate: "2026-01-25",
      scheduledTime: "11:00",
      platformPostUrl: null,
      internalNotes: "Some notes",
    };
    expect(hasDistributionChanges(editData, originalDistribution)).toBe(true);
  });

  it("should detect internal notes change", () => {
    const editData = {
      format: "post",
      caption: "Original caption",
      scheduledDate: "2026-01-25",
      scheduledTime: "10:00",
      platformPostUrl: null,
      internalNotes: "Updated notes",
    };
    expect(hasDistributionChanges(editData, originalDistribution)).toBe(true);
  });

  it("should handle null vs undefined correctly", () => {
    const original = {
      format: null,
      caption: null,
      scheduled_at: null,
      platform_post_url: null,
      platform_specific_data: null,
    };
    const editData = {
      format: null,
      caption: null,
      scheduledDate: "",
      scheduledTime: "",
      platformPostUrl: null,
      internalNotes: null,
    };
    expect(hasDistributionChanges(editData, original)).toBe(false);
  });
});

// ============================================================================
// DUPLICATE TASK PREVENTION TESTS
// ============================================================================

/**
 * Check if performance check tasks should be created for a distribution.
 */
function shouldCreatePerformanceTasks(
  createPerformanceCheckTasks: boolean,
  scheduledAt: string | null,
  isPosted: boolean,
  platformData?: { performance_tasks_created?: boolean } | null
): boolean {
  // Don't create tasks if:
  // - The toggle is off
  // - No scheduled date
  // - Not posted yet
  // - Tasks were already created
  const tasksAlreadyCreated = platformData?.performance_tasks_created === true;
  return createPerformanceCheckTasks && !!scheduledAt && isPosted && !tasksAlreadyCreated;
}

describe("Duplicate Task Prevention", () => {
  it("should allow task creation when all conditions are met and tasks not created yet", () => {
    expect(
      shouldCreatePerformanceTasks(true, "2026-01-20T10:00:00Z", true, {})
    ).toBe(true);
  });

  it("should prevent task creation when toggle is off", () => {
    expect(
      shouldCreatePerformanceTasks(false, "2026-01-20T10:00:00Z", true, {})
    ).toBe(false);
  });

  it("should prevent task creation when no scheduled date", () => {
    expect(
      shouldCreatePerformanceTasks(true, null, true, {})
    ).toBe(false);
  });

  it("should prevent task creation when not posted yet", () => {
    expect(
      shouldCreatePerformanceTasks(true, "2026-01-20T10:00:00Z", false, {})
    ).toBe(false);
  });

  it("should prevent task creation when tasks were already created", () => {
    expect(
      shouldCreatePerformanceTasks(true, "2026-01-20T10:00:00Z", true, {
        performance_tasks_created: true,
      })
    ).toBe(false);
  });

  it("should handle undefined platform data", () => {
    expect(
      shouldCreatePerformanceTasks(true, "2026-01-20T10:00:00Z", true, undefined)
    ).toBe(true);
  });

  it("should handle null platform data", () => {
    expect(
      shouldCreatePerformanceTasks(true, "2026-01-20T10:00:00Z", true, null)
    ).toBe(true);
  });
});

// ============================================================================
// OVERDUE DISTRIBUTION DETECTION TESTS
// ============================================================================

/**
 * Check if a distribution is overdue (scheduled time has passed but status is still "scheduled")
 */
function isDistributionOverdue(
  status: ContentDistributionStatus,
  scheduledAt: string | null,
  currentTime: Date
): boolean {
  if (status !== "scheduled") return false;
  if (!scheduledAt) return false;
  return new Date(scheduledAt) < currentTime;
}

describe("Overdue Distribution Detection", () => {
  const now = new Date("2026-01-25T12:00:00Z");

  it("should identify overdue scheduled distribution", () => {
    expect(
      isDistributionOverdue("scheduled", "2026-01-25T10:00:00Z", now)
    ).toBe(true);
  });

  it("should not identify future scheduled distribution as overdue", () => {
    expect(
      isDistributionOverdue("scheduled", "2026-01-25T14:00:00Z", now)
    ).toBe(false);
  });

  it("should not identify draft distribution as overdue", () => {
    expect(
      isDistributionOverdue("draft", "2026-01-25T10:00:00Z", now)
    ).toBe(false);
  });

  it("should not identify posted distribution as overdue", () => {
    expect(
      isDistributionOverdue("posted", "2026-01-25T10:00:00Z", now)
    ).toBe(false);
  });

  it("should not identify distribution without scheduled_at as overdue", () => {
    expect(
      isDistributionOverdue("scheduled", null, now)
    ).toBe(false);
  });

  it("should handle exact boundary time", () => {
    const exactTime = new Date("2026-01-25T10:00:00Z");
    expect(
      isDistributionOverdue("scheduled", "2026-01-25T10:00:00Z", exactTime)
    ).toBe(false); // Not past yet, exactly at the time
  });

  it("should handle distribution scheduled exactly one second ago", () => {
    const oneSecondLater = new Date("2026-01-25T10:00:01Z");
    expect(
      isDistributionOverdue("scheduled", "2026-01-25T10:00:00Z", oneSecondLater)
    ).toBe(true);
  });
});
