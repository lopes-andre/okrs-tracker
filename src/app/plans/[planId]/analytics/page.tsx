import { BarChart3, TrendingUp, Calendar, Download } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Insights and visualizations for your OKR progress"
      >
        <Select defaultValue="q1">
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Quarter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Year</SelectItem>
            <SelectItem value="q1">Q1 2026</SelectItem>
            <SelectItem value="q2">Q2 2026</SelectItem>
            <SelectItem value="q3">Q3 2026</SelectItem>
            <SelectItem value="q4">Q4 2026</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </PageHeader>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="pace">Pace Analysis</TabsTrigger>
          <TabsTrigger value="heatmap">Activity Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Summary Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Year-to-Date Progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="font-heading text-h1-mobile font-bold">32%</span>
                  <span className="text-status-success text-small flex items-center gap-1 mb-2">
                    <TrendingUp className="w-3 h-3" />
                    +4%
                  </span>
                </div>
                <p className="text-small text-text-muted">vs. 28% expected by today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Projected Year-End</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="font-heading text-h1-mobile font-bold">78%</span>
                </div>
                <p className="text-small text-text-muted">Based on current pace</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Check-ins This Month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="font-heading text-h1-mobile font-bold">24</span>
                </div>
                <p className="text-small text-text-muted">Across 18 key results</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart Placeholders */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress Over Time</CardTitle>
                <CardDescription>
                  Cumulative progress for all objectives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-bg-1/50 rounded-card border border-border-soft">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-text-subtle mx-auto mb-3" />
                    <p className="text-body-sm text-text-muted">
                      Line chart coming soon
                    </p>
                    <p className="text-small text-text-subtle">
                      Powered by Recharts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Objective Breakdown</CardTitle>
                <CardDescription>
                  Progress distribution across objectives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-bg-1/50 rounded-card border border-border-soft">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-text-subtle mx-auto mb-3" />
                    <p className="text-body-sm text-text-muted">
                      Bar chart coming soon
                    </p>
                    <p className="text-small text-text-subtle">
                      Powered by Recharts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progress">
          <EmptyState
            icon={BarChart3}
            title="Progress Charts Coming Soon"
            description="Detailed progress tracking with cumulative lines, weekly bars, and threshold trackers."
          />
        </TabsContent>

        <TabsContent value="pace">
          <EmptyState
            icon={TrendingUp}
            title="Pace Analysis Coming Soon"
            description="See where you should be today vs. where you are, with forecasts and recommendations."
          />
        </TabsContent>

        <TabsContent value="heatmap">
          <EmptyState
            icon={Calendar}
            title="Activity Heatmap Coming Soon"
            description="Visualize your check-in activity, workouts, deep work, and weekly review completion."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
