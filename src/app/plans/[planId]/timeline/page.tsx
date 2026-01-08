import { History, Filter, Calendar, MessageSquare, Target, CheckCircle2, Edit3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Mock timeline data
const mockTimelineEvents = [
  {
    id: "1",
    type: "check-in",
    title: "LinkedIn Followers updated",
    description: "Updated value from 12,200 to 12,500",
    user: "John Doe",
    timestamp: "2 hours ago",
    meta: { previous: 12200, new: 12500, unit: "followers" },
  },
  {
    id: "2",
    type: "task-complete",
    title: "Task completed",
    description: "Published Q1 content calendar",
    user: "John Doe",
    timestamp: "5 hours ago",
    meta: { objective: "O2" },
  },
  {
    id: "3",
    type: "comment",
    title: "Note added",
    description: "Great progress this week! The LinkedIn algorithm changes seem to be working in our favor.",
    user: "John Doe",
    timestamp: "1 day ago",
    meta: { kr: "LinkedIn Followers" },
  },
  {
    id: "4",
    type: "edit",
    title: "Target adjusted",
    description: "YouTube Subscribers target changed from 20,000 to 25,000",
    user: "John Doe",
    timestamp: "2 days ago",
    meta: { reason: "Stretch goal based on Q1 momentum" },
  },
  {
    id: "5",
    type: "check-in",
    title: "Newsletter Subscribers updated",
    description: "Updated value from 4,200 to 4,500",
    user: "John Doe",
    timestamp: "3 days ago",
    meta: { previous: 4200, new: 4500, unit: "subscribers" },
  },
];

const getEventIcon = (type: string) => {
  switch (type) {
    case "check-in":
      return <Target className="w-4 h-4" />;
    case "task-complete":
      return <CheckCircle2 className="w-4 h-4" />;
    case "comment":
      return <MessageSquare className="w-4 h-4" />;
    case "edit":
      return <Edit3 className="w-4 h-4" />;
    default:
      return <History className="w-4 h-4" />;
  }
};

const getEventBadge = (type: string) => {
  switch (type) {
    case "check-in":
      return <Badge variant="info">Check-in</Badge>;
    case "task-complete":
      return <Badge variant="success">Completed</Badge>;
    case "comment":
      return <Badge>Note</Badge>;
    case "edit":
      return <Badge variant="warning">Edit</Badge>;
    default:
      return <Badge>Event</Badge>;
  }
};

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <>
      <PageHeader
        title="Timeline"
        description="Activity feed and audit log for your OKR plan"
      >
        <Button variant="secondary" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
        <Button variant="secondary" className="gap-2">
          <Calendar className="w-4 h-4" />
          Date Range
        </Button>
      </PageHeader>

      {/* Timeline */}
      <Card>
        <CardContent className="py-6">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border-soft" />

            {/* Events */}
            <div className="space-y-6">
              {mockTimelineEvents.map((event) => (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className="relative z-10 w-12 h-12 rounded-full bg-bg-0 border border-border-soft flex items-center justify-center shrink-0">
                    {getEventIcon(event.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-body-sm text-text-strong">
                            {event.title}
                          </h4>
                          {getEventBadge(event.type)}
                        </div>
                        <p className="text-body-sm text-text-muted">
                          {event.description}
                        </p>
                      </div>
                      <span className="text-small text-text-subtle whitespace-nowrap">
                        {event.timestamp}
                      </span>
                    </div>

                    {/* User */}
                    <div className="flex items-center gap-2 mt-3">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-[10px]">JD</AvatarFallback>
                      </Avatar>
                      <span className="text-small text-text-muted">{event.user}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Load More */}
          <div className="mt-8 text-center">
            <Button variant="secondary">Load More</Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
