"use client";

import { use } from "react";
import { Clock, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function TimelinePage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  use(params); // Consume params to satisfy React

  return (
    <>
      <PageHeader
        title="Timeline"
        description="Visual timeline of your OKR journey"
      />

      <Card className="border-dashed">
        <CardContent className="py-16">
          <div className="flex flex-col items-center text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-6">
              <Clock className="w-8 h-8 text-accent" />
            </div>
            
            <h2 className="text-h4 font-heading font-semibold text-text-strong mb-2">
              Coming Soon
            </h2>
            
            <p className="text-body text-text-muted mb-6">
              We&apos;re building an interactive timeline to visualize your OKR journey 
              throughout the year. Track milestones, see progress over time, and 
              celebrate your achievements.
            </p>

            <div className="flex items-center gap-2 px-4 py-2 rounded-pill bg-bg-1 border border-border-soft">
              <Sparkles className="w-4 h-4 text-status-warning" />
              <span className="text-small text-text-muted">In development</span>
            </div>

            <div className="mt-8 p-4 rounded-card bg-bg-1/50 border border-border-soft text-left w-full">
              <p className="text-small font-medium text-text-strong mb-2">
                What to expect:
              </p>
              <ul className="space-y-1.5 text-small text-text-muted">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-accent" />
                  Visual timeline of OKR progress
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-accent" />
                  Milestone tracking and celebrations
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-accent" />
                  Quarter-by-quarter progress visualization
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-accent" />
                  Historical performance insights
                </li>
              </ul>
            </div>

            <p className="mt-6 text-small text-text-subtle">
              Looking for the activity log? It&apos;s now in{" "}
              <span className="text-accent font-medium">Settings → Activity Log</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
