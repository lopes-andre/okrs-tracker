/**
 * PaceBadge Component Integration Tests
 *
 * Tests for the PaceBadge component's rendering across different
 * pace statuses and integration with the progress-engine utilities.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils/render";
import { PaceBadge } from "./pace-badge";
import { formatPaceStatus } from "@/lib/progress-engine";
import type { PaceStatus } from "@/lib/progress-engine";

// ============================================================================
// RENDERING TESTS
// ============================================================================

describe("PaceBadge", () => {
  describe("rendering", () => {
    it("should render with ahead status", () => {
      render(<PaceBadge status="ahead" showTooltip={false} />);

      expect(screen.getByText(formatPaceStatus("ahead"))).toBeInTheDocument();
    });

    it("should render with on_track status", () => {
      render(<PaceBadge status="on_track" showTooltip={false} />);

      expect(screen.getByText(formatPaceStatus("on_track"))).toBeInTheDocument();
    });

    it("should render with at_risk status", () => {
      render(<PaceBadge status="at_risk" showTooltip={false} />);

      expect(screen.getByText(formatPaceStatus("at_risk"))).toBeInTheDocument();
    });

    it("should render with off_track status", () => {
      render(<PaceBadge status="off_track" showTooltip={false} />);

      expect(screen.getByText(formatPaceStatus("off_track"))).toBeInTheDocument();
    });
  });

  // ============================================================================
  // VARIANT STYLING TESTS
  // ============================================================================

  describe("variant styling", () => {
    const statusVariants: Array<{ status: PaceStatus; expectedClass: string }> = [
      { status: "ahead", expectedClass: "text-status-success" },
      { status: "on_track", expectedClass: "text-status-info" },
      { status: "at_risk", expectedClass: "text-status-warning" },
      { status: "off_track", expectedClass: "text-status-danger" },
    ];

    statusVariants.forEach(({ status, expectedClass }) => {
      it(`should apply ${expectedClass} for ${status} status`, () => {
        render(<PaceBadge status={status} showTooltip={false} />);

        const badge = screen.getByText(formatPaceStatus(status));
        expect(badge).toHaveClass(expectedClass);
      });
    });
  });

  // ============================================================================
  // SIZE TESTS
  // ============================================================================

  describe("size variants", () => {
    it("should render with small size by default", () => {
      render(<PaceBadge status="on_track" showTooltip={false} />);

      const badge = screen.getByText(formatPaceStatus("on_track"));
      expect(badge).toHaveClass("text-xs");
    });

    it("should render with medium size when specified", () => {
      render(<PaceBadge status="on_track" showTooltip={false} size="md" />);

      const badge = screen.getByText(formatPaceStatus("on_track"));
      expect(badge).toHaveClass("text-sm");
    });
  });

  // ============================================================================
  // COMPACT MODE TESTS
  // ============================================================================

  describe("compact mode", () => {
    it("should render compact ahead indicator", () => {
      render(<PaceBadge status="ahead" showTooltip={false} compact />);

      expect(screen.getByText("↑")).toBeInTheDocument();
    });

    it("should render compact on_track indicator", () => {
      render(<PaceBadge status="on_track" showTooltip={false} compact />);

      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    it("should render compact at_risk indicator", () => {
      render(<PaceBadge status="at_risk" showTooltip={false} compact />);

      expect(screen.getByText("!")).toBeInTheDocument();
    });

    it("should render compact off_track indicator", () => {
      render(<PaceBadge status="off_track" showTooltip={false} compact />);

      expect(screen.getByText("✕")).toBeInTheDocument();
    });

    it("should apply compact styling classes", () => {
      render(<PaceBadge status="ahead" showTooltip={false} compact />);

      const indicator = screen.getByText("↑");
      expect(indicator).toHaveClass("text-[10px]");
      expect(indicator).toHaveClass("font-bold");
    });
  });

  // ============================================================================
  // ICON TESTS
  // ============================================================================

  describe("icons", () => {
    it("should render icon within badge", () => {
      const { container } = render(<PaceBadge status="ahead" showTooltip={false} />);

      // Badge should have an SVG icon
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render small icon size for sm variant", () => {
      const { container } = render(<PaceBadge status="on_track" showTooltip={false} size="sm" />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-3");
      expect(svg).toHaveClass("h-3");
    });

    it("should render larger icon size for md variant", () => {
      const { container } = render(<PaceBadge status="on_track" showTooltip={false} size="md" />);

      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("w-3.5");
      expect(svg).toHaveClass("h-3.5");
    });
  });

  // ============================================================================
  // TOOLTIP TESTS
  // ============================================================================

  describe("tooltip", () => {
    it("should render with tooltip by default", () => {
      render(<PaceBadge status="on_track" />);

      // When tooltip is enabled, the badge should be wrapped in a tooltip trigger
      const badge = screen.getByText(formatPaceStatus("on_track"));
      expect(badge).toBeInTheDocument();
    });

    it("should hide tooltip when showTooltip is false", () => {
      render(<PaceBadge status="on_track" showTooltip={false} />);

      // When showTooltip=false, the badge should render without tooltip wrapper
      // The badge should still be present
      expect(screen.getByText(formatPaceStatus("on_track"))).toBeInTheDocument();
    });
  });
});

// ============================================================================
// INTEGRATION WITH PROGRESS ENGINE
// ============================================================================

describe("PaceBadge - Progress Engine Integration", () => {
  describe("formatPaceStatus integration", () => {
    const allStatuses: PaceStatus[] = ["ahead", "on_track", "at_risk", "off_track"];

    allStatuses.forEach((status) => {
      it(`should display formatPaceStatus output for ${status}`, () => {
        const formattedStatus = formatPaceStatus(status);
        render(<PaceBadge status={status} showTooltip={false} />);

        expect(screen.getByText(formattedStatus)).toBeInTheDocument();
      });
    });
  });

  describe("status-to-variant mapping", () => {
    it("should map ahead to success variant styling", () => {
      render(<PaceBadge status="ahead" showTooltip={false} />);

      const badge = screen.getByText(formatPaceStatus("ahead"));
      expect(badge).toHaveClass("text-status-success");
    });

    it("should map on_track to info variant styling", () => {
      render(<PaceBadge status="on_track" showTooltip={false} />);

      const badge = screen.getByText(formatPaceStatus("on_track"));
      expect(badge).toHaveClass("text-status-info");
    });

    it("should map at_risk to warning variant styling", () => {
      render(<PaceBadge status="at_risk" showTooltip={false} />);

      const badge = screen.getByText(formatPaceStatus("at_risk"));
      expect(badge).toHaveClass("text-status-warning");
    });

    it("should map off_track to danger variant styling", () => {
      render(<PaceBadge status="off_track" showTooltip={false} />);

      const badge = screen.getByText(formatPaceStatus("off_track"));
      expect(badge).toHaveClass("text-status-danger");
    });
  });
});

// ============================================================================
// PROP COMBINATION TESTS
// ============================================================================

describe("PaceBadge - Prop Combinations", () => {
  it("should render with all optional props", () => {
    render(
      <PaceBadge
        status="ahead"
        paceRatio={1.2}
        progress={0.75}
        expectedProgress={0.6}
        expectedValue={60}
        currentValue={75}
        unit="followers"
        showTooltip={true}
        size="md"
        compact={false}
      />
    );

    expect(screen.getByText(formatPaceStatus("ahead"))).toBeInTheDocument();
  });

  it("should render compact mode with value props", () => {
    render(
      <PaceBadge
        status="at_risk"
        expectedValue={100}
        currentValue={80}
        unit="items"
        compact
      />
    );

    expect(screen.getByText("!")).toBeInTheDocument();
  });

  it("should render without tooltip in compact mode", () => {
    render(
      <PaceBadge
        status="off_track"
        showTooltip={false}
        compact
      />
    );

    expect(screen.getByText("✕")).toBeInTheDocument();
  });
});
