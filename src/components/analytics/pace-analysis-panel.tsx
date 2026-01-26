"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Lightbulb,
  ArrowRight,
  Calendar,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { differenceInDays, endOfYear } from "date-fns";
import type { KrPerformanceRow } from "@/features/analytics/api";

interface PaceAnalysisPanelProps {
  krs: KrPerformanceRow[];
  year: number;
}

interface Recommendation {
  type: "urgent" | "warning" | "info" | "success";
  icon: React.ElementType;
  title: string;
  description: string;
  action?: string;
}

// Pace status distribution card
function PaceDistribution({ krs }: { krs: KrPerformanceRow[] }) {
  const distribution = useMemo(() => {
    const counts = {
      ahead: 0,
      "on-track": 0,
      "at-risk": 0,
      "off-track": 0,
      complete: 0,
    };
    
    krs.forEach((kr) => {
      const status = kr.paceStatus as keyof typeof counts;
      if (status in counts) {
        counts[status]++;
      }
    });
    
    return counts;
  }, [krs]);

  const total = krs.length;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-text-muted" />
          Pace Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Visual bar */}
        <div className="flex h-4 rounded-full overflow-hidden mb-4">
          {distribution.complete > 0 && (
            <div 
              className="bg-accent transition-all" 
              style={{ width: `${(distribution.complete / total) * 100}%` }}
            />
          )}
          {distribution.ahead > 0 && (
            <div 
              className="bg-status-success transition-all" 
              style={{ width: `${(distribution.ahead / total) * 100}%` }}
            />
          )}
          {distribution["on-track"] > 0 && (
            <div 
              className="bg-status-success/60 transition-all" 
              style={{ width: `${(distribution["on-track"] / total) * 100}%` }}
            />
          )}
          {distribution["at-risk"] > 0 && (
            <div 
              className="bg-status-warning transition-all" 
              style={{ width: `${(distribution["at-risk"] / total) * 100}%` }}
            />
          )}
          {distribution["off-track"] > 0 && (
            <div 
              className="bg-status-danger transition-all" 
              style={{ width: `${(distribution["off-track"] / total) * 100}%` }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <div>
              <p className="text-xs font-medium">{distribution.complete}</p>
              <p className="text-[10px] text-text-muted">Complete</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-success" />
            <div>
              <p className="text-xs font-medium">{distribution.ahead}</p>
              <p className="text-[10px] text-text-muted">Ahead</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-success/60" />
            <div>
              <p className="text-xs font-medium">{distribution["on-track"]}</p>
              <p className="text-[10px] text-text-muted">On Track</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-warning" />
            <div>
              <p className="text-xs font-medium">{distribution["at-risk"]}</p>
              <p className="text-[10px] text-text-muted">At Risk</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-danger" />
            <div>
              <p className="text-xs font-medium">{distribution["off-track"]}</p>
              <p className="text-[10px] text-text-muted">Off Track</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// KRs needing attention list
function AttentionList({ krs }: { krs: KrPerformanceRow[] }) {
  const needsAttention = useMemo(() => {
    return krs
      .filter((kr) => kr.paceStatus === "off-track" || kr.paceStatus === "at-risk")
      .sort((a, b) => {
        // Off-track first, then by progress
        if (a.paceStatus !== b.paceStatus) {
          return a.paceStatus === "off-track" ? -1 : 1;
        }
        return a.progress - b.progress;
      })
      .slice(0, 5);
  }, [krs]);

  if (needsAttention.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-status-success mb-3" />
          <p className="font-medium text-status-success">All KRs are on track!</p>
          <p className="text-small text-text-muted mt-1">Keep up the great work</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-status-warning" />
          Needs Attention
          <Badge variant="warning" className="ml-2 text-[10px]">
            {needsAttention.length} KR{needsAttention.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {needsAttention.map((kr) => {
          const gap = kr.expectedValue - kr.currentValue;
          const isOffTrack = kr.paceStatus === "off-track";
          
          return (
            <div
              key={kr.id}
              className={cn(
                "p-3 rounded-card border",
                isOffTrack 
                  ? "bg-status-danger/5 border-status-danger/20" 
                  : "bg-status-warning/5 border-status-warning/20"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={isOffTrack ? "danger" : "warning"}
                      className="text-[10px]"
                    >
                      {isOffTrack ? "Off Track" : "At Risk"}
                    </Badge>
                    <span className="text-small font-medium truncate">
                      {kr.name}
                    </span>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                    <span>
                      Current: <span className="font-medium text-text-strong">{kr.currentValue.toLocaleString()}</span>
                    </span>
                    <span>
                      Expected: <span className="font-medium text-text-strong">{Math.round(kr.expectedValue).toLocaleString()}</span>
                    </span>
                    <span className={cn(
                      "font-medium",
                      gap > 0 ? "text-status-danger" : "text-status-success"
                    )}>
                      {gap > 0 ? `-${gap.toLocaleString()}` : `+${Math.abs(gap).toLocaleString()}`} gap
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold">{Math.round(kr.progress * 100)}%</p>
                  <p className="text-[10px] text-text-muted">progress</p>
                </div>
              </div>
              
              <Progress 
                value={kr.progress * 100} 
                className={cn(
                  "h-1.5 mt-2",
                  isOffTrack ? "[&>div]:bg-status-danger" : "[&>div]:bg-status-warning"
                )}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Smart recommendations
function Recommendations({ krs, year }: { krs: KrPerformanceRow[]; year: number }) {
  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];
    const now = new Date();
    const yearEnd = endOfYear(new Date(year, 0, 1));
    const daysRemaining = differenceInDays(yearEnd, now);
    
    // Count statuses
    const offTrackCount = krs.filter((kr) => kr.paceStatus === "off-track").length;
    const _atRiskCount = krs.filter((kr) => kr.paceStatus === "at-risk").length;
    const staleKrs = krs.filter((kr) => {
      if (!kr.lastCheckInDate) return true;
      return differenceInDays(now, new Date(kr.lastCheckInDate)) > 14;
    });
    
    // Off-track urgent
    if (offTrackCount > 0) {
      recs.push({
        type: "urgent",
        icon: AlertTriangle,
        title: `${offTrackCount} KR${offTrackCount > 1 ? "s" : ""} off track`,
        description: "These need immediate attention to get back on pace.",
        action: "Review and adjust targets or increase effort",
      });
    }
    
    // Stale KRs
    if (staleKrs.length > 0) {
      recs.push({
        type: "warning",
        icon: Clock,
        title: `${staleKrs.length} KR${staleKrs.length > 1 ? "s" : ""} haven't been updated in 2+ weeks`,
        description: "Regular check-ins help maintain visibility and momentum.",
        action: "Schedule weekly check-in time",
      });
    }
    
    // End of year push
    if (daysRemaining < 90 && daysRemaining > 0) {
      const avgProgress = krs.reduce((sum, kr) => sum + kr.progress, 0) / krs.length;
      const neededProgress = 1 - avgProgress;
      const weeklyNeeded = (neededProgress / (daysRemaining / 7)) * 100;
      
      if (weeklyNeeded > 5) {
        recs.push({
          type: "info",
          icon: Calendar,
          title: `${daysRemaining} days remaining in ${year}`,
          description: `Need ~${weeklyNeeded.toFixed(1)}% weekly progress to hit targets.`,
          action: "Focus on high-impact KRs",
        });
      }
    }
    
    // Celebrate success
    const aheadCount = krs.filter((kr) => kr.paceStatus === "ahead" || kr.paceStatus === "complete").length;
    if (aheadCount > krs.length / 2) {
      recs.push({
        type: "success",
        icon: Zap,
        title: "Strong momentum!",
        description: `${aheadCount} of ${krs.length} KRs are ahead or complete.`,
      });
    }
    
    // Quick wins
    const quickWins = krs.filter((kr) => {
      const remaining = kr.targetValue - kr.currentValue;
      const target = kr.targetValue - kr.startValue;
      return remaining > 0 && remaining / target < 0.1; // Less than 10% to go
    });
    if (quickWins.length > 0) {
      recs.push({
        type: "info",
        icon: Target,
        title: `${quickWins.length} KR${quickWins.length > 1 ? "s" : ""} almost complete`,
        description: "A small push could close these out.",
        action: `Focus on: ${quickWins[0].name}`,
      });
    }
    
    return recs;
  }, [krs, year]);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-status-warning" />
          Insights & Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, index) => {
          const Icon = rec.icon;
          return (
            <div
              key={index}
              className={cn(
                "p-3 rounded-card border flex items-start gap-3",
                rec.type === "urgent" && "bg-status-danger/5 border-status-danger/20",
                rec.type === "warning" && "bg-status-warning/5 border-status-warning/20",
                rec.type === "info" && "bg-accent/5 border-accent/20",
                rec.type === "success" && "bg-status-success/5 border-status-success/20"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                rec.type === "urgent" && "bg-status-danger/10",
                rec.type === "warning" && "bg-status-warning/10",
                rec.type === "info" && "bg-accent/10",
                rec.type === "success" && "bg-status-success/10"
              )}>
                <Icon className={cn(
                  "w-4 h-4",
                  rec.type === "urgent" && "text-status-danger",
                  rec.type === "warning" && "text-status-warning",
                  rec.type === "info" && "text-accent",
                  rec.type === "success" && "text-status-success"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-small">{rec.title}</p>
                <p className="text-xs text-text-muted mt-0.5">{rec.description}</p>
                {rec.action && (
                  <p className="text-xs font-medium text-accent mt-1 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    {rec.action}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function PaceAnalysisPanel({ krs, year }: PaceAnalysisPanelProps) {
  if (krs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="w-12 h-12 mx-auto text-text-subtle mb-4" />
          <p className="text-text-muted">No KRs to analyze</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pace Distribution */}
      <PaceDistribution krs={krs} />
      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Needs Attention */}
        <AttentionList krs={krs} />
        
        {/* Recommendations */}
        <Recommendations krs={krs} year={year} />
      </div>
    </div>
  );
}
