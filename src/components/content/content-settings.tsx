"use client";

import { Settings, UserCircle, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountsSettings } from "./accounts-settings";
import { GoalsSettings } from "./goals-settings";

interface ContentSettingsProps {
  planId: string;
}

export function ContentSettings({ planId }: ContentSettingsProps) {
  return (
    <Tabs defaultValue="accounts" className="space-y-6">
      <TabsList>
        <TabsTrigger value="accounts" className="gap-2">
          <UserCircle className="w-4 h-4" />
          Platforms & Accounts
        </TabsTrigger>
        <TabsTrigger value="goals" className="gap-2">
          <Target className="w-4 h-4" />
          Content Goals
        </TabsTrigger>
        <TabsTrigger value="general" className="gap-2">
          <Settings className="w-4 h-4" />
          General
        </TabsTrigger>
      </TabsList>

      {/* Platforms & Accounts */}
      <TabsContent value="accounts">
        <AccountsSettings planId={planId} />
      </TabsContent>

      {/* Content Goals */}
      <TabsContent value="goals">
        <GoalsSettings planId={planId} />
      </TabsContent>

      {/* General Settings */}
      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure default behaviors for your content planning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-small text-text-muted">
              General settings coming soon. This will include default posting times,
              content calendar preferences, and notification settings.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
