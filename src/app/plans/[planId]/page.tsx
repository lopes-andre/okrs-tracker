import {
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Mock data
const mockStats = [
  {
    label: "Overall Progress",
    value: "32%",
    change: "+4% this week",
    trend: "up",
  },
  { label: "Objectives", value: "6", change: "2 on track", trend: "neutral" },
  { label: "Key Results", value: "24", change: "8 ahead of pace", trend: "up" },
  {
    label: "At Risk",
    value: "3",
    change: "Needs attention",
    trend: "down",
  },
];

const mockObjectives = [
  {
    id: "o1",
    name: "Grow audience across all platforms",
    progress: 45,
    status: "on-track",
    keyResults: 5,
  },
  {
    id: "o2",
    name: "Build sustainable content engine",
    progress: 28,
    status: "at-risk",
    keyResults: 4,
  },
  {
    id: "o3",
    name: "Convert audience to owned leads",
    progress: 35,
    status: "on-track",
    keyResults: 4,
  },
];

export default async function PlanOverviewPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <>
      <PageHeader
        title="2026 Plan Overview"
        description="Annual OKR tracking dashboard"
      >
        <Button variant="secondary">Weekly Review</Button>
        <Button>Quick Check-in</Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {mockStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-caption text-text-muted mb-1">{stat.label}</p>
              <p className="font-heading text-h2-mobile font-bold text-text-strong">
                {stat.value}
              </p>
              <p
                className={`text-small mt-1 flex items-center gap-1 ${
                  stat.trend === "up"
                    ? "text-status-success"
                    : stat.trend === "down"
                    ? "text-status-danger"
                    : "text-text-muted"
                }`}
              >
                {stat.trend === "up" && <TrendingUp className="w-3 h-3" />}
                {stat.trend === "down" && <TrendingDown className="w-3 h-3" />}
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Objectives List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Objectives</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockObjectives.map((objective) => (
                <div
                  key={objective.id}
                  className="p-4 rounded-card bg-bg-1/50 border border-border-soft hover:border-border transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-button bg-bg-0 flex items-center justify-center border border-border-soft">
                        <Target className="w-5 h-5 text-text-muted" />
                      </div>
                      <div>
                        <h4 className="font-heading font-semibold text-body text-text-strong">
                          {objective.name}
                        </h4>
                        <p className="text-small text-text-muted">
                          {objective.keyResults} Key Results
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        objective.status === "on-track" ? "success" : "warning"
                      }
                    >
                      {objective.status === "on-track" ? "On Track" : "At Risk"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={objective.progress} className="flex-1" />
                    <span className="text-small font-medium w-12 text-right">
                      {objective.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & At Risk */}
        <div className="space-y-6">
          {/* Quarter Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-h5">Q1 Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-small mb-2">
                    <span className="text-text-muted">Days Remaining</span>
                    <span className="font-medium">52</span>
                  </div>
                  <div className="flex justify-between text-small mb-2">
                    <span className="text-text-muted">Quarter Progress</span>
                    <span className="font-medium">42%</span>
                  </div>
                  <Progress value={42} />
                </div>
                <div className="pt-2 border-t border-border-soft">
                  <p className="text-small text-text-muted mb-3">This Week</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-small">
                      <CheckCircle2 className="w-4 h-4 text-status-success" />
                      <span>5 check-ins completed</span>
                    </div>
                    <div className="flex items-center gap-2 text-small">
                      <Clock className="w-4 h-4 text-text-muted" />
                      <span>3 KRs need updates</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* At Risk Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-status-warning" />
                <CardTitle className="text-h5">Needs Attention</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 rounded-button bg-status-warning/5 border border-status-warning/20">
                  <p className="text-body-sm font-medium text-text-strong mb-1">
                    LinkedIn Followers
                  </p>
                  <p className="text-small text-text-muted">
                    23% behind target pace
                  </p>
                </div>
                <div className="p-3 rounded-button bg-status-warning/5 border border-status-warning/20">
                  <p className="text-body-sm font-medium text-text-strong mb-1">
                    YouTube Subscribers
                  </p>
                  <p className="text-small text-text-muted">
                    15% behind target pace
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
