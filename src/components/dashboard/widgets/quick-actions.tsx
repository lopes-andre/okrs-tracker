"use client";

import Link from "next/link";
import {
  Target,
  Clock,
  TrendingUp,
  ListTodo,
  CalendarDays,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "../dashboard-data-provider";

interface QuickActionsWidgetProps {
  config: Record<string, unknown>;
}

const actions = [
  { label: "OKRs", icon: Target, href: (planId: string) => `/plans/${planId}/okrs` },
  { label: "Tasks", icon: ListTodo, href: (planId: string) => `/plans/${planId}/tasks` },
  { label: "Analytics", icon: TrendingUp, href: (planId: string) => `/plans/${planId}/analytics` },
  { label: "Timeline", icon: Clock, href: (planId: string) => `/plans/${planId}/timeline` },
  { label: "Reviews", icon: CalendarDays, href: (planId: string) => `/plans/${planId}/reviews` },
  { label: "Settings", icon: Settings, href: (planId: string) => `/plans/${planId}/settings` },
];

export function QuickActionsWidget({ config: _config }: QuickActionsWidgetProps) {
  const { planId } = useDashboardData();

  return (
    <div className="h-full flex flex-col gap-1.5">
      {actions.map((action) => (
        <Link key={action.label} href={action.href(planId)} className="block">
          <Button
            variant="ghost"
            className="w-full justify-start h-8 px-2 text-xs"
          >
            <action.icon className="w-3.5 h-3.5 mr-2" />
            {action.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
