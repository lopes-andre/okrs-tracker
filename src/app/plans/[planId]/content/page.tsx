"use client";

import { use } from "react";
import {
  Kanban,
  Calendar,
  BarChart3,
  Settings,
  Construction,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentSettings } from "@/components/content/content-settings";
import { KanbanBoard } from "@/components/content/kanban-board";
import { ContentCalendar } from "@/components/content/content-calendar";
import { useGoals } from "@/features/content/hooks";

export default function ContentPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const { data: goals = [], isLoading: isLoadingGoals } = useGoals(planId);

  return (
    <>
      <PageHeader
        title="Content Planner"
        description="Plan and track your social media content strategy"
      />

      <Tabs defaultValue="planner" className="space-y-6">
        <TabsList>
          <TabsTrigger value="planner" className="gap-2">
            <Kanban className="w-4 h-4" />
            Planner
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="w-4 h-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Planner - Kanban Board */}
        <TabsContent value="planner">
          {isLoadingGoals ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
            </div>
          ) : (
            <KanbanBoard planId={planId} goals={goals} />
          )}
        </TabsContent>

        {/* Calendar */}
        <TabsContent value="calendar">
          <ContentCalendar planId={planId} />
        </TabsContent>

        {/* Analytics - Coming Soon */}
        <TabsContent value="analytics">
          <ComingSoonPlaceholder
            title="Content Analytics"
            description="Track performance of your content strategy. See how your posts contribute to your OKRs."
            features={[
              "Platform performance metrics",
              "Content type analysis",
              "OKR contribution tracking",
              "Engagement trends",
            ]}
          />
        </TabsContent>

        {/* Settings - Implemented */}
        <TabsContent value="settings">
          <ContentSettings planId={planId} />
        </TabsContent>
      </Tabs>
    </>
  );
}

interface ComingSoonPlaceholderProps {
  title: string;
  description: string;
  features: string[];
}

function ComingSoonPlaceholder({
  title,
  description,
  features,
}: ComingSoonPlaceholderProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-bg-1 flex items-center justify-center mb-4">
          <Construction className="w-6 h-6 text-text-muted" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="max-w-md mx-auto">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <p className="text-small text-text-muted mb-4">Coming soon:</p>
          <ul className="inline-block text-left space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-body-sm text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
