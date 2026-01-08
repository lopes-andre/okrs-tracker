import { Plus, Search, Filter, Target, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock objectives data
const mockObjectives = [
  {
    id: "o1",
    code: "O1",
    name: "Grow audience across all platforms",
    description: "Build a sustainable audience that grows month over month",
    progress: 45,
    status: "on-track",
    keyResults: [
      {
        id: "kr1",
        name: "LinkedIn followers",
        current: 12500,
        target: 30000,
        unit: "followers",
        progress: 42,
      },
      {
        id: "kr2",
        name: "YouTube subscribers",
        current: 8200,
        target: 25000,
        unit: "subscribers",
        progress: 33,
      },
      {
        id: "kr3",
        name: "Newsletter subscribers",
        current: 4500,
        target: 10000,
        unit: "subscribers",
        progress: 45,
      },
    ],
  },
  {
    id: "o2",
    code: "O2",
    name: "Build sustainable content engine",
    description: "Create a repeatable process for high-quality content production",
    progress: 28,
    status: "at-risk",
    keyResults: [
      {
        id: "kr4",
        name: "Long-form posts published",
        current: 12,
        target: 48,
        unit: "posts",
        progress: 25,
      },
      {
        id: "kr5",
        name: "YouTube videos published",
        current: 8,
        target: 24,
        unit: "videos",
        progress: 33,
      },
    ],
  },
];

export default async function OKRsPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <>
      <PageHeader
        title="Objectives & Key Results"
        description="Define and track your annual OKRs"
      >
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Objective
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="Search objectives and key results..."
            className="pl-10"
          />
        </div>
        <Button variant="secondary" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      {/* Tabs for view modes */}
      <Tabs defaultValue="list" className="mb-6">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="board">Board View</TabsTrigger>
          <TabsTrigger value="tree">Tree View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          {/* Objectives List */}
          <div className="space-y-6">
            {mockObjectives.map((objective) => (
              <Card key={objective.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-card bg-bg-1 flex items-center justify-center shrink-0">
                        <span className="font-heading font-bold text-body text-text-muted">
                          {objective.code}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-h5 mb-1">
                          {objective.name}
                        </CardTitle>
                        <p className="text-body-sm text-text-muted">
                          {objective.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          objective.status === "on-track" ? "success" : "warning"
                        }
                      >
                        {objective.status === "on-track" ? "On Track" : "At Risk"}
                      </Badge>
                      <span className="font-heading font-bold text-h4">
                        {objective.progress}%
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {objective.keyResults.map((kr) => (
                      <div
                        key={kr.id}
                        className="flex items-center gap-4 p-3 rounded-button bg-bg-1/50 border border-border-soft hover:border-border transition-colors cursor-pointer group"
                      >
                        <Target className="w-4 h-4 text-text-subtle shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm font-medium text-text-strong truncate">
                            {kr.name}
                          </p>
                          <p className="text-small text-text-muted">
                            {kr.current.toLocaleString()} / {kr.target.toLocaleString()} {kr.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 w-48">
                          <Progress value={kr.progress} className="flex-1" />
                          <span className="text-small font-medium w-10 text-right">
                            {kr.progress}%
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-text-muted hover:text-text-strong"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Key Result
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="board">
          <EmptyState
            icon={Target}
            title="Board View Coming Soon"
            description="Drag and drop your objectives and key results across different status columns."
          />
        </TabsContent>

        <TabsContent value="tree">
          <EmptyState
            icon={Target}
            title="Tree View Coming Soon"
            description="View your OKRs in a hierarchical tree structure showing parent-child relationships."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
