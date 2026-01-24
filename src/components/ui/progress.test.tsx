/**
 * Progress Component Unit Tests
 *
 * Tests for the Progress component's rendering and value handling.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/utils/render";
import { Progress } from "./progress";

// ============================================================================
// RENDERING TESTS
// ============================================================================

describe("Progress", () => {
  describe("rendering", () => {
    it("should render progress bar", () => {
      render(<Progress value={50} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toBeInTheDocument();
    });

    it("should render with custom className", () => {
      render(<Progress value={50} className="custom-progress" />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveClass("custom-progress");
    });

    it("should forward ref", () => {
      const ref = vi.fn();
      render(<Progress value={50} ref={ref} />);

      expect(ref).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // VALUE TESTS
  // ============================================================================

  describe("value handling", () => {
    it("should render with value 0", () => {
      const { container } = render(<Progress value={0} />);

      // Verify via the transform style
      const progressRoot = container.querySelector('[role="progressbar"]');
      const indicator = progressRoot?.firstElementChild as HTMLElement;
      expect(indicator?.style.transform).toBe("translateX(-100%)");
    });

    it("should render with value 50", () => {
      const { container } = render(<Progress value={50} />);

      const progressRoot = container.querySelector('[role="progressbar"]');
      const indicator = progressRoot?.firstElementChild as HTMLElement;
      expect(indicator?.style.transform).toBe("translateX(-50%)");
    });

    it("should render with value 100", () => {
      const { container } = render(<Progress value={100} />);

      const progressRoot = container.querySelector('[role="progressbar"]');
      const indicator = progressRoot?.firstElementChild as HTMLElement;
      expect(indicator?.style.transform).toBe("translateX(-0%)");
    });

    it("should handle undefined value", () => {
      render(<Progress value={undefined} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toBeInTheDocument();
    });

    it("should handle null value", () => {
      render(<Progress value={null as unknown as number} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toBeInTheDocument();
    });
  });

  // ============================================================================
  // STYLING TESTS
  // ============================================================================

  describe("styling", () => {
    it("should have base styling classes", () => {
      render(<Progress value={50} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveClass("relative");
      expect(progressbar).toHaveClass("h-2");
      expect(progressbar).toHaveClass("w-full");
      expect(progressbar).toHaveClass("overflow-hidden");
      expect(progressbar).toHaveClass("rounded-full");
      expect(progressbar).toHaveClass("bg-bg-1");
    });

    it("should merge custom className with base classes", () => {
      render(<Progress value={50} className="h-4 custom-height" />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveClass("custom-height");
      // Original h-2 class is still there but overridden by h-4 in cascade
    });
  });

  // ============================================================================
  // INDICATOR TESTS
  // ============================================================================

  describe("indicator", () => {
    it("should have indicator element", () => {
      const { container } = render(<Progress value={50} />);

      // The indicator is a child div with transform style
      const indicator = container.querySelector('[data-state]');
      expect(indicator).toBeInTheDocument();
    });

    it("should transform indicator based on value", () => {
      const { container } = render(<Progress value={75} />);

      // Find the indicator element (it's the first child of the progress root)
      const progressRoot = container.querySelector('[role="progressbar"]');
      const indicator = progressRoot?.firstElementChild as HTMLElement;

      // At 75% progress, translateX should be -25%
      expect(indicator?.style.transform).toBe("translateX(-25%)");
    });

    it("should show 0% progress with translateX(-100%)", () => {
      const { container } = render(<Progress value={0} />);

      const progressRoot = container.querySelector('[role="progressbar"]');
      const indicator = progressRoot?.firstElementChild as HTMLElement;

      expect(indicator?.style.transform).toBe("translateX(-100%)");
    });

    it("should show 100% progress with translateX(0%)", () => {
      const { container } = render(<Progress value={100} />);

      const progressRoot = container.querySelector('[role="progressbar"]');
      const indicator = progressRoot?.firstElementChild as HTMLElement;

      expect(indicator?.style.transform).toBe("translateX(-0%)");
    });
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe("accessibility", () => {
    it("should have progressbar role", () => {
      render(<Progress value={50} />);

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("should render indicator that reflects value", () => {
      const { container } = render(<Progress value={75} />);

      // Verify value is reflected in transform style
      const progressRoot = container.querySelector('[role="progressbar"]');
      const indicator = progressRoot?.firstElementChild as HTMLElement;
      expect(indicator?.style.transform).toBe("translateX(-25%)");
    });

    it("should be accessible via progressbar role", () => {
      render(<Progress value={50} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toBeInTheDocument();
    });

    it("should allow custom max value", () => {
      const { container } = render(<Progress value={50} max={200} />);

      // Component should render without error
      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toBeInTheDocument();
    });
  });
});

// ============================================================================
// INTEGRATION SCENARIOS
// ============================================================================

describe("Progress - Integration Scenarios", () => {
  describe("OKR progress display", () => {
    it("should display KR progress correctly", () => {
      const krProgress = 65; // 65% complete
      const { container } = render(<Progress value={krProgress} />);

      const progressRoot = container.querySelector('[role="progressbar"]');
      const indicator = progressRoot?.firstElementChild as HTMLElement;
      // At 65% progress, translateX should be -35%
      expect(indicator?.style.transform).toBe("translateX(-35%)");
    });

    it("should display objective progress correctly", () => {
      const objectiveProgress = 42.5; // Average of KRs
      const { container } = render(<Progress value={objectiveProgress} />);

      const progressRoot = container.querySelector('[role="progressbar"]');
      const indicator = progressRoot?.firstElementChild as HTMLElement;
      // At 42.5% progress, translateX should be -57.5%
      expect(indicator?.style.transform).toBe("translateX(-57.5%)");
    });
  });

  describe("loading states", () => {
    it("should handle indeterminate state with null value", () => {
      render(<Progress value={null as unknown as number} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toBeInTheDocument();
    });
  });

  describe("multiple progress bars", () => {
    it("should render multiple progress bars independently", () => {
      const { container } = render(
        <div>
          <Progress value={25} />
          <Progress value={50} />
          <Progress value={75} />
        </div>
      );

      const progressBars = container.querySelectorAll('[role="progressbar"]');
      expect(progressBars).toHaveLength(3);

      // Verify each has different indicator transforms
      const indicator1 = progressBars[0].firstElementChild as HTMLElement;
      const indicator2 = progressBars[1].firstElementChild as HTMLElement;
      const indicator3 = progressBars[2].firstElementChild as HTMLElement;

      expect(indicator1?.style.transform).toBe("translateX(-75%)");
      expect(indicator2?.style.transform).toBe("translateX(-50%)");
      expect(indicator3?.style.transform).toBe("translateX(-25%)");
    });
  });
});
