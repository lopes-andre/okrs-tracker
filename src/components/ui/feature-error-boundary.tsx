"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./button";
import { handleComponentError } from "@/lib/error-reporter";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  /** Feature name for error context and display */
  featureName: string;
  /** Optional custom fallback component */
  fallback?: ReactNode;
  /** Whether to show a compact error display */
  compact?: boolean;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

/**
 * Feature-level error boundary for graceful degradation.
 * Wraps individual features so one failing feature doesn't crash the whole app.
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Report with feature context
    handleComponentError(error, {
      ...errorInfo,
      componentStack: `[Feature: ${this.props.featureName}]\n${errorInfo.componentStack}`,
    });

    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { compact = false, featureName } = this.props;
      const { error, showDetails } = this.state;

      if (compact) {
        return (
          <div className="p-4 rounded-card border border-status-danger/30 bg-status-danger/5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-status-danger">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Failed to load {featureName}</span>
              </div>
              <Button onClick={this.handleReset} variant="ghost" size="sm">
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="p-6 rounded-card border border-status-danger/30 bg-status-danger/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-status-danger/10 flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-status-danger" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-status-danger mb-1">
                {featureName} failed to load
              </h3>
              <p className="text-sm text-text-muted mb-4">
                This section encountered an error. The rest of the app should still work normally.
              </p>

              {error && process.env.NODE_ENV === "development" && (
                <div className="mb-4">
                  <button
                    onClick={this.toggleDetails}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors"
                  >
                    {showDetails ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    {showDetails ? "Hide" : "Show"} error details
                  </button>
                  {showDetails && (
                    <pre className={cn(
                      "mt-2 p-3 bg-bg-1 rounded-md text-xs text-text-muted",
                      "overflow-auto max-h-32 border"
                    )}>
                      {error.message}
                      {error.stack && `\n\n${error.stack}`}
                    </pre>
                  )}
                </div>
              )}

              <Button onClick={this.handleReset} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap functional components with feature error boundary
 */
export function withFeatureErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureName: string,
  options?: { compact?: boolean; fallback?: ReactNode }
): React.FC<P> {
  return function WithFeatureErrorBoundary(props: P) {
    return (
      <FeatureErrorBoundary
        featureName={featureName}
        compact={options?.compact}
        fallback={options?.fallback}
      >
        <WrappedComponent {...props} />
      </FeatureErrorBoundary>
    );
  };
}
