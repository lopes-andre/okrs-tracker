/**
 * Badge Component Unit Tests
 *
 * Tests for the Badge component's rendering and variants.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils/render";
import { Badge, badgeVariants } from "./badge";

// ============================================================================
// RENDERING TESTS
// ============================================================================

describe("Badge", () => {
  describe("rendering", () => {
    it("should render with children text", () => {
      render(<Badge>New</Badge>);

      expect(screen.getByText("New")).toBeInTheDocument();
    });

    it("should render as div element", () => {
      render(<Badge>Badge</Badge>);

      const badge = screen.getByText("Badge");
      expect(badge.tagName).toBe("DIV");
    });

    it("should render with custom className", () => {
      render(<Badge className="custom-class">Badge</Badge>);

      const badge = screen.getByText("Badge");
      expect(badge).toHaveClass("custom-class");
    });

    it("should pass through HTML attributes", () => {
      render(<Badge data-testid="test-badge" title="Badge title">Badge</Badge>);

      const badge = screen.getByTestId("test-badge");
      expect(badge).toHaveAttribute("title", "Badge title");
    });
  });

  // ============================================================================
  // VARIANT TESTS
  // ============================================================================

  describe("variants", () => {
    it("should render default variant", () => {
      render(<Badge variant="default">Default</Badge>);

      const badge = screen.getByText("Default");
      expect(badge).toHaveClass("border-border-soft");
      expect(badge).toHaveClass("bg-bg-1");
    });

    it("should render secondary variant", () => {
      render(<Badge variant="secondary">Secondary</Badge>);

      const badge = screen.getByText("Secondary");
      expect(badge).toHaveClass("border-transparent");
      expect(badge).toHaveClass("bg-bg-2");
    });

    it("should render success variant", () => {
      render(<Badge variant="success">Success</Badge>);

      const badge = screen.getByText("Success");
      expect(badge).toHaveClass("text-status-success");
    });

    it("should render warning variant", () => {
      render(<Badge variant="warning">Warning</Badge>);

      const badge = screen.getByText("Warning");
      expect(badge).toHaveClass("text-status-warning");
    });

    it("should render danger variant", () => {
      render(<Badge variant="danger">Danger</Badge>);

      const badge = screen.getByText("Danger");
      expect(badge).toHaveClass("text-status-danger");
    });

    it("should render info variant", () => {
      render(<Badge variant="info">Info</Badge>);

      const badge = screen.getByText("Info");
      expect(badge).toHaveClass("text-status-info");
    });

    it("should render outline variant", () => {
      render(<Badge variant="outline">Outline</Badge>);

      const badge = screen.getByText("Outline");
      expect(badge).toHaveClass("bg-transparent");
      expect(badge).toHaveClass("border-border");
    });

    it("should render default variant when no variant specified", () => {
      render(<Badge>No Variant</Badge>);

      const badge = screen.getByText("No Variant");
      expect(badge).toHaveClass("border-border-soft");
      expect(badge).toHaveClass("bg-bg-1");
    });
  });

  // ============================================================================
  // STYLING TESTS
  // ============================================================================

  describe("styling", () => {
    it("should have base styling classes", () => {
      render(<Badge>Styled</Badge>);

      const badge = screen.getByText("Styled");
      expect(badge).toHaveClass("inline-flex");
      expect(badge).toHaveClass("items-center");
      expect(badge).toHaveClass("rounded-pill");
      expect(badge).toHaveClass("font-medium");
    });

    it("should have focus ring styles", () => {
      render(<Badge>Focusable</Badge>);

      const badge = screen.getByText("Focusable");
      expect(badge).toHaveClass("focus:outline-none");
      expect(badge).toHaveClass("focus:ring-2");
    });

    it("should merge custom className with variant classes", () => {
      render(<Badge variant="success" className="mt-2 ml-4">Merged</Badge>);

      const badge = screen.getByText("Merged");
      expect(badge).toHaveClass("mt-2");
      expect(badge).toHaveClass("ml-4");
      expect(badge).toHaveClass("text-status-success");
    });
  });

  // ============================================================================
  // BADGE VARIANTS FUNCTION TESTS
  // ============================================================================

  describe("badgeVariants function", () => {
    it("should return base classes", () => {
      const classes = badgeVariants();

      expect(classes).toContain("inline-flex");
      expect(classes).toContain("items-center");
      expect(classes).toContain("rounded-pill");
    });

    it("should return variant-specific classes", () => {
      const successClasses = badgeVariants({ variant: "success" });
      const dangerClasses = badgeVariants({ variant: "danger" });

      expect(successClasses).toContain("text-status-success");
      expect(dangerClasses).toContain("text-status-danger");
    });

    it("should return default variant classes when no variant specified", () => {
      const classes = badgeVariants({});

      expect(classes).toContain("border-border-soft");
      expect(classes).toContain("bg-bg-1");
    });
  });
});

// ============================================================================
// INTEGRATION SCENARIOS
// ============================================================================

describe("Badge - Integration Scenarios", () => {
  describe("status indicators", () => {
    it("should work as status indicator", () => {
      const statuses = [
        { status: "active", variant: "success" as const },
        { status: "pending", variant: "warning" as const },
        { status: "error", variant: "danger" as const },
      ];

      statuses.forEach(({ status, variant }) => {
        const { unmount } = render(<Badge variant={variant}>{status}</Badge>);
        expect(screen.getByText(status)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("with icons", () => {
    it("should render with icon and text", () => {
      render(
        <Badge>
          <span data-testid="icon">⭐</span>
          Featured
        </Badge>
      );

      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByText("Featured")).toBeInTheDocument();
    });
  });

  describe("multiple badges", () => {
    it("should render multiple badges with different variants", () => {
      render(
        <div>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
        </div>
      );

      const successBadge = screen.getByText("Success");
      const warningBadge = screen.getByText("Warning");
      const dangerBadge = screen.getByText("Danger");

      expect(successBadge).toHaveClass("text-status-success");
      expect(warningBadge).toHaveClass("text-status-warning");
      expect(dangerBadge).toHaveClass("text-status-danger");
    });
  });
});
