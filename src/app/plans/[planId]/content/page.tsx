"use client";

import { use } from "react";
import {
  Kanban,
  Calendar,
  BarChart3,
  Settings,
  Loader2,
  Megaphone,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentSettings } from "@/components/content/content-settings";
import { KanbanBoard } from "@/components/content/kanban-board";
import { ContentCalendar } from "@/components/content/content-calendar";
import { CampaignsList } from "@/components/content/campaigns-list";
import { ContentAnalytics } from "@/components/content/content-analytics";
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
          <TabsTrigger value="campaigns" className="gap-2">
            <Megaphone className="w-4 h-4" />
            Campaigns
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

        {/* Campaigns */}
        <TabsContent value="campaigns">
          <CampaignsList planId={planId} />
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <ContentAnalytics planId={planId} />
        </TabsContent>

        {/* Settings - Implemented */}
        <TabsContent value="settings">
          <ContentSettings planId={planId} />
        </TabsContent>
      </Tabs>
    </>
  );
}
