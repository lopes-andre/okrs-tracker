"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  TrendingUp,
  Plus,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformIcon } from "./platform-icon";
import { MetricsCheckInDialog } from "./metrics-checkin-dialog";
import {
  getAllMetricFields,
  formatMetricValue,
  calculateTotalEngagement,
  calculateEngagementRate,
} from "./platform-metrics-config";
import { useDistributionMetrics } from "@/features/content/hooks";
import { cn } from "@/lib/utils";
import type {
  ContentPostWithDetails,
  ContentDistributionWithAccount,
  ContentDistributionMetrics,
} from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface PostMetricsTabProps {
  post: ContentPostWithDetails;
  planId: string;
}

// ============================================================================
// DISTRIBUTION METRICS CARD
// ============================================================================

function DistributionMetricsCard({
  distribution,
  planId,
}: {
  distribution: ContentDistributionWithAccount;
  planId: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);

  const { data: metricsHistory = [], isLoading } = useDistributionMetrics(
    distribution.id
  );

  const platformName = distribution.account.platform.name;
  const metricFields = useMemo(
    () => getAllMetricFields(platformName),
    [platformName]
  );

  // Get latest metrics
  const latestMetrics = metricsHistory[0];
  const previousMetrics = metricsHistory[1];

  // Calculate summary stats from latest metrics
  const summaryStats = useMemo(() => {
    if (!latestMetrics?.metrics) return null;

    const metrics = latestMetrics.metrics as Record<string, number>;
    return {
      impressions: metrics.impressions || metrics.views || metrics.page_views || 0,
      engagement: calculateTotalEngagement(metrics),
      engagementRate: calculateEngagementRate(metrics),
    };
  }, [latestMetrics]);

  const isPosted = distribution.status === "posted";

  return (
    <>
      <Card className={cn(!isPosted && "opacity-60")}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <PlatformIcon platformName={platformName} size="md" />
              <div>
                <p className="font-medium">{distribution.account.account_name}</p>
                <div className="flex items-center gap-2 text-small text-text-muted">
                  {isPosted ? (
                    <>
                      <span>Posted {distribution.posted_at && format(parseISO(distribution.posted_at), "MMM d")}</span>
                      {distribution.platform_post_url && (
                        <a
                          href={distribution.platform_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline inline-flex items-center gap-1"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      {distribution.status === "scheduled" ? "Scheduled" : "Draft"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {isPosted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCheckInDialog(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Check-in
              </Button>
            )}
          </div>

          {/* Summary Stats */}
          {isPosted && summaryStats && (
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-bg-1 rounded-lg p-2 text-center">
                <p className="text-lg font-semibold">
                  {summaryStats.impressions.toLocaleString()}
                </p>
                <p className="text-[10px] text-text-muted">Impressions</p>
              </div>
              <div className="bg-bg-1 rounded-lg p-2 text-center">
                <p className="text-lg font-semibold">
                  {summaryStats.engagement.toLocaleString()}
                </p>
                <p className="text-[10px] text-text-muted">Engagement</p>
              </div>
              <div className="bg-bg-1 rounded-lg p-2 text-center">
                <p className="text-lg font-semibold">
                  {summaryStats.engagementRate.toFixed(1)}%
                </p>
                <p className="text-[10px] text-text-muted">Eng. Rate</p>
              </div>
            </div>
          )}

          {/* Not Posted State */}
          {!isPosted && (
            <div className="text-center py-4 text-text-muted">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-small">
                Mark as posted to track metrics
              </p>
            </div>
          )}

          {/* Check-in History (Expandable) */}
          {isPosted && metricsHistory.length > 0 && (
            <div className="border-t border-border-soft pt-3 mt-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-small text-text-muted hover:text-text w-full"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                {metricsHistory.length} check-in{metricsHistory.length !== 1 && "s"}
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-3">
                  {metricsHistory.map((checkin) => (
                    <MetricsCheckInItem
                      key={checkin.id}
                      checkin={checkin}
                      metricFields={metricFields}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No Metrics Yet */}
          {isPosted && metricsHistory.length === 0 && !isLoading && (
            <div className="text-center py-2 text-text-muted">
              <p className="text-small">No metrics recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in Dialog */}
      <MetricsCheckInDialog
        open={showCheckInDialog}
        onOpenChange={setShowCheckInDialog}
        distribution={distribution}
        planId={planId}
        previousMetrics={latestMetrics?.metrics as Record<string, number> | null}
      />
    </>
  );
}

// ============================================================================
// METRICS CHECK-IN ITEM
// ============================================================================

function MetricsCheckInItem({
  checkin,
  metricFields,
}: {
  checkin: ContentDistributionMetrics;
  metricFields: ReturnType<typeof getAllMetricFields>;
}) {
  const metrics = checkin.metrics as Record<string, number>;

  // Get the metrics that have values
  const recordedMetrics = metricFields.filter(
    (field) => metrics[field.key] !== undefined && metrics[field.key] !== null
  );

  return (
    <div className="bg-bg-1 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-small text-text-muted flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {format(parseISO(checkin.checked_at), "MMM d, yyyy 'at' h:mm a")}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {recordedMetrics.slice(0, 6).map((field) => (
          <div key={field.key} className="text-small">
            <span className="text-text-muted">{field.label}: </span>
            <span className="font-medium">
              {formatMetricValue(metrics[field.key], field.type)}
            </span>
          </div>
        ))}
        {recordedMetrics.length > 6 && (
          <div className="text-small text-text-muted">
            +{recordedMetrics.length - 6} more
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PostMetricsTab({ post, planId }: PostMetricsTabProps) {
  // Filter to only posted distributions
  const postedDistributions = post.distributions.filter(
    (d) => d.status === "posted"
  );
  const otherDistributions = post.distributions.filter(
    (d) => d.status !== "posted"
  );

  if (post.distributions.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-text-muted" />
        <h3 className="font-medium mb-2">No Distributions</h3>
        <p className="text-small text-text-muted max-w-sm mx-auto">
          Add distributions to this post from the Distributions tab, then mark them
          as posted to track metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Posted Distributions */}
      {postedDistributions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-small font-medium text-text-muted flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Posted ({postedDistributions.length})
          </h3>
          <div className="space-y-4">
            {postedDistributions.map((distribution) => (
              <DistributionMetricsCard
                key={distribution.id}
                distribution={distribution}
                planId={planId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Distributions */}
      {otherDistributions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-small font-medium text-text-muted">
            Pending ({otherDistributions.length})
          </h3>
          <div className="space-y-4">
            {otherDistributions.map((distribution) => (
              <DistributionMetricsCard
                key={distribution.id}
                distribution={distribution}
                planId={planId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
