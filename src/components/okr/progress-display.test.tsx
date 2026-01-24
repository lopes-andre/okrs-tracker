/**
 * ProgressDisplay Component Integration Tests
 *
 * Tests for the ProgressDisplay component family (ProgressDisplay, ProgressInline, ProgressMini)
 * and their integration with the progress-engine utilities.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils/render";
import { ProgressDisplay, ProgressInline, ProgressMini } from "./progress-display";
import { formatProgress, formatValueWithUnit, type ProgressResult, type PaceStatus } from "@/lib/progress-engine";

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createProgressResult(overrides: Partial<ProgressResult> = {}): ProgressResult {
  return {
    currentValue: 50,
    target: 100,
    progress: 0.5,
    expectedProgress: 0.4,
    paceStatus: "ahead" as PaceStatus,
    paceRatio: 1.25,
    forecastValue: 120,
    daysRemaining: 30,
    lastCheckInDate: new Date("2026-01-20"),
    ...overrides,
  };
}

// ============================================================================
// PROGRESS DISPLAY TESTS
// ============================================================================

describe("ProgressDisplay", () => {
  describe("rendering", () => {
    it("should render progress bar", () => {
      const { container } = render(
        <ProgressDisplay
          progress={createProgressResult()}
          krType="metric"
          direction="increase"
          unit="units"
        />
      );

      const progressbar = container.querySelector('[role="progressbar"]');
      expect(progressbar).toBeInTheDocument();
    });

    it("should display current and target values", () => {
      const progress = createProgressResult({
        currentValue: 75,
        target: 150,
      });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="items"
        />
      );

      // Current value should be displayed
      expect(screen.getByText("75 items")).toBeInTheDocument();
      // Target should be displayed
      expect(screen.getByText("150 items")).toBeInTheDocument();
    });

    it("should display progress percentage", () => {
      const progress = createProgressResult({ progress: 0.65 });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="units"
        />
      );

      expect(screen.getByText(formatProgress(0.65))).toBeInTheDocument();
    });
  });

  describe("delta indicator", () => {
    it("should show positive delta when ahead", () => {
      const progress = createProgressResult({
        progress: 0.6,
        expectedProgress: 0.5,
      });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="units"
          showDelta={true}
        />
      );

      // Delta should show +10%
      expect(screen.getByText("+10%")).toBeInTheDocument();
    });

    it("should show negative delta when behind", () => {
      const progress = createProgressResult({
        progress: 0.4,
        expectedProgress: 0.5,
      });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="units"
          showDelta={true}
        />
      );

      // Delta should show -10%
      expect(screen.getByText("-10%")).toBeInTheDocument();
    });

    it("should hide delta when showDelta is false", () => {
      const progress = createProgressResult({
        progress: 0.6,
        expectedProgress: 0.5,
      });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="units"
          showDelta={false}
        />
      );

      expect(screen.queryByText("+10%")).not.toBeInTheDocument();
    });

    it("should not show delta when exactly on track", () => {
      const progress = createProgressResult({
        progress: 0.5,
        expectedProgress: 0.5,
      });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="units"
          showDelta={true}
        />
      );

      // No +0% or -0% should be shown
      expect(screen.queryByText("+0%")).not.toBeInTheDocument();
      expect(screen.queryByText("-0%")).not.toBeInTheDocument();
    });
  });

  describe("forecast display", () => {
    it("should show forecast when showForecast is true", () => {
      const progress = createProgressResult({
        forecastValue: 110,
        target: 100,
      });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="units"
          showForecast={true}
        />
      );

      expect(screen.getByText(/Forecast:/)).toBeInTheDocument();
    });

    it("should hide forecast when showForecast is false", () => {
      const progress = createProgressResult({ forecastValue: 110 });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="units"
          showForecast={false}
        />
      );

      expect(screen.queryByText(/Forecast:/)).not.toBeInTheDocument();
    });

    it("should hide forecast when forecastValue is null", () => {
      const progress = createProgressResult({ forecastValue: null });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="units"
          showForecast={true}
        />
      );

      expect(screen.queryByText(/Forecast:/)).not.toBeInTheDocument();
    });
  });

  describe("days remaining", () => {
    it("should show days remaining when positive", () => {
      const progress = createProgressResult({ daysRemaining: 45 });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="units"
        />
      );

      expect(screen.getByText("45d left")).toBeInTheDocument();
    });

    it("should not show days remaining when zero", () => {
      const progress = createProgressResult({ daysRemaining: 0 });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="units"
        />
      );

      expect(screen.queryByText(/\d+d left/)).not.toBeInTheDocument();
    });
  });

  describe("compact mode", () => {
    it("should apply compact styling", () => {
      const { container } = render(
        <ProgressDisplay
          progress={createProgressResult()}
          krType="metric"
          direction="increase"
          unit="units"
          compact={true}
        />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("space-y-1");
    });

    it("should hide additional info in compact mode", () => {
      const progress = createProgressResult({
        forecastValue: 110,
        daysRemaining: 30,
      });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="units"
          compact={true}
          showForecast={true}
        />
      );

      // Forecast should be hidden in compact mode
      expect(screen.queryByText(/Forecast:/)).not.toBeInTheDocument();
    });
  });

  describe("KR types", () => {
    it("should format milestone type correctly", () => {
      const progress = createProgressResult({
        currentValue: 0,
        target: 1,
      });

      render(
        <ProgressDisplay
          progress={progress}
          krType="milestone"
          direction="increase"
          unit={null}
        />
      );

      // Milestone shows numeric values (0 and 1)
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("should format count type with unit", () => {
      const progress = createProgressResult({
        currentValue: 5,
        target: 12,
      });

      render(
        <ProgressDisplay
          progress={progress}
          krType="count"
          direction="increase"
          unit="articles"
        />
      );

      expect(screen.getByText("5 articles")).toBeInTheDocument();
      expect(screen.getByText("12 articles")).toBeInTheDocument();
    });

    it("should format rate type with percentage", () => {
      const progress = createProgressResult({
        currentValue: 35,
        target: 50,
      });

      render(
        <ProgressDisplay
          progress={progress}
          krType="rate"
          direction="increase"
          unit="%"
        />
      );

      // Rate type uses toFixed(1), so 35 becomes "35.0%"
      expect(screen.getByText("35.0%")).toBeInTheDocument();
      expect(screen.getByText("50.0%")).toBeInTheDocument();
    });
  });
});

// ============================================================================
// PROGRESS INLINE TESTS
// ============================================================================

describe("ProgressInline", () => {
  it("should render current and target values", () => {
    const progress = createProgressResult({
      currentValue: 30,
      target: 60,
    });

    render(
      <ProgressInline
        progress={progress}
        krType="metric"
        unit="points"
      />
    );

    expect(screen.getByText("30 points")).toBeInTheDocument();
    expect(screen.getByText("60 points")).toBeInTheDocument();
  });

  it("should render progress bar", () => {
    const { container } = render(
      <ProgressInline
        progress={createProgressResult()}
        krType="metric"
        unit="units"
      />
    );

    const progressbar = container.querySelector('[role="progressbar"]');
    expect(progressbar).toBeInTheDocument();
  });

  it("should render progress percentage", () => {
    const progress = createProgressResult({ progress: 0.42 });

    render(
      <ProgressInline
        progress={progress}
        krType="metric"
        unit="units"
      />
    );

    expect(screen.getByText(formatProgress(0.42))).toBeInTheDocument();
  });

  it("should render pace badge", () => {
    const progress = createProgressResult({ paceStatus: "on_track" });

    render(
      <ProgressInline
        progress={progress}
        krType="metric"
        unit="units"
      />
    );

    expect(screen.getByText("On Track")).toBeInTheDocument();
  });
});

// ============================================================================
// PROGRESS MINI TESTS
// ============================================================================

describe("ProgressMini", () => {
  it("should render compact progress bar", () => {
    const { container } = render(
      <ProgressMini progress={createProgressResult()} />
    );

    const progressbar = container.querySelector('[role="progressbar"]');
    expect(progressbar).toBeInTheDocument();
  });

  it("should render progress percentage", () => {
    const progress = createProgressResult({ progress: 0.75 });

    render(<ProgressMini progress={progress} />);

    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("should show rounded percentage", () => {
    const progress = createProgressResult({ progress: 0.333 });

    render(<ProgressMini progress={progress} />);

    expect(screen.getByText("33%")).toBeInTheDocument();
  });
});

// ============================================================================
// PROGRESS ENGINE INTEGRATION
// ============================================================================

describe("ProgressDisplay - Progress Engine Integration", () => {
  describe("formatProgress integration", () => {
    it("should use formatProgress for percentage display", () => {
      const progress = createProgressResult({ progress: 0.873 });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="units"
        />
      );

      // formatProgress(0.873) should return "87%"
      expect(screen.getByText(formatProgress(0.873))).toBeInTheDocument();
    });
  });

  describe("formatValueWithUnit integration", () => {
    it("should format values with units correctly", () => {
      const progress = createProgressResult({
        currentValue: 1500,
        target: 3000,
      });

      render(
        <ProgressDisplay
          progress={progress}
          krType="metric"
          direction="increase"
          unit="$"
        />
      );

      // Should format currency with $ unit
      expect(screen.getByText(formatValueWithUnit(1500, "$", "metric"))).toBeInTheDocument();
      expect(screen.getByText(formatValueWithUnit(3000, "$", "metric"))).toBeInTheDocument();
    });
  });

  describe("ProgressResult handling", () => {
    it("should handle all PaceStatus values", () => {
      const statuses: PaceStatus[] = ["ahead", "on_track", "at_risk", "off_track"];

      statuses.forEach((status) => {
        const progress = createProgressResult({ paceStatus: status });

        const { unmount } = render(
          <ProgressInline
            progress={progress}
            krType="metric"
            unit="units"
          />
        );

        // Just verify it renders without error
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
        unmount();
      });
    });

    it("should handle edge case progress values", () => {
      // 0% progress
      const zeroProgress = createProgressResult({ progress: 0, currentValue: 0 });
      const { unmount: unmount1 } = render(
        <ProgressDisplay
          progress={zeroProgress}
          krType="metric"
          direction="increase"
          unit="units"
        />
      );
      expect(screen.getByText("0%")).toBeInTheDocument();
      unmount1();

      // 100% progress
      const fullProgress = createProgressResult({ progress: 1, currentValue: 100, target: 100 });
      render(
        <ProgressDisplay
          progress={fullProgress}
          krType="metric"
          direction="increase"
          unit="units"
        />
      );
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("should handle over 100% progress", () => {
      const overProgress = createProgressResult({
        progress: 1.2,
        currentValue: 120,
        target: 100,
      });

      render(
        <ProgressDisplay
          progress={overProgress}
          krType="metric"
          direction="increase"
          unit="units"
        />
      );

      expect(screen.getByText("120%")).toBeInTheDocument();
    });
  });
});
