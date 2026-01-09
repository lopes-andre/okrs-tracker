"use client";

import { useState, use } from "react";
import {
  Settings,
  Users,
  Shield,
  Trash2,
  Copy,
  Mail,
  UserPlus,
  Loader2,
  X,
  History,
  Target,
  CheckCircle2,
  Edit3,
  ListTodo,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  usePlan,
  usePlanRole,
  usePlanMembers,
  usePlanInvites,
  useUpdatePlan,
  useDeletePlan,
  useCreatePlanInvite,
  useRemovePlanMember,
  useDeletePlanInvite,
} from "@/features";
import { useTimelinePaginated } from "@/features/timeline/hooks";
import type { OkrRole, ActivityEventWithUser, EventType } from "@/lib/supabase/types";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";

// Activity Log helpers
const getEventIcon = (type: EventType, entityType?: string) => {
  switch (type) {
    case "created":
      if (entityType === "check_in") return <Target className="w-3.5 h-3.5" />;
      if (entityType === "task") return <ListTodo className="w-3.5 h-3.5" />;
      if (entityType === "member") return <Users className="w-3.5 h-3.5" />;
      return <Edit3 className="w-3.5 h-3.5" />;
    case "completed":
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    case "deleted":
      return <Trash2 className="w-3.5 h-3.5" />;
    default:
      return <Edit3 className="w-3.5 h-3.5" />;
  }
};

const formatEventText = (event: ActivityEventWithUser): string => {
  const newData = event.new_data as { name?: string; title?: string } | null;
  const metadata = event.metadata as { name?: string; title?: string } | null;
  const entityName = newData?.name || newData?.title || metadata?.name || metadata?.title || "";
  
  const entityLabel = {
    task: "Task",
    check_in: "Check-in",
    member: "Member",
    objective: "Objective",
    annual_kr: "Key Result",
    quarter_target: "Quarter Target",
    plan: "Plan",
  }[event.entity_type] || "Item";

  const action = {
    created: "created",
    updated: "updated",
    deleted: "deleted",
    completed: "completed",
    status_changed: "status changed",
    joined: "joined",
    left: "left",
    role_changed: "role changed",
  }[event.event_type] || event.event_type;

  return `${entityLabel} ${action}${entityName ? `: ${entityName}` : ""}`;
};

export default function SettingsPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const router = useRouter();

  const { data: plan, isLoading: isLoadingPlan } = usePlan(planId);
  const { data: role } = usePlanRole(planId);
  const { data: members = [], isLoading: isLoadingMembers } = usePlanMembers(planId);
  const { data: invites = [], isLoading: isLoadingInvites } = usePlanInvites(planId);

  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const createInvite = useCreatePlanInvite();
  const removeMember = useRemovePlanMember();
  const deleteInvite = useDeletePlanInvite();

  const isOwner = role === "owner";

  // Activity Log state
  const [logPage, setLogPage] = useState(1);
  const [logFilter, setLogFilter] = useState<string>("all");
  const logFilters = logFilter !== "all" ? { event_type: [logFilter as EventType] } : undefined;
  const { data: logData, isLoading: isLoadingLog, isFetching: isFetchingLog } = useTimelinePaginated(planId, logPage, 15, logFilters);
  const logEvents = logData?.data || [];
  const logTotalPages = Math.ceil((logData?.count || 0) / 15);

  // Form state for plan details
  const [planName, setPlanName] = useState("");
  const [planYear, setPlanYear] = useState<string>("");
  const [planDescription, setPlanDescription] = useState("");

  // Initialize form state when plan data loads
  useState(() => {
    if (plan) {
      setPlanName(plan.name);
      setPlanYear(plan.year.toString());
      setPlanDescription(plan.description || "");
    }
  });

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OkrRole>("viewer");

  const handleSaveSettings = async () => {
    if (!plan) return;
    await updatePlan.mutateAsync({
      planId: plan.id,
      updates: {
        name: planName || plan.name,
        year: planYear ? parseInt(planYear) : plan.year,
        description: planDescription || null,
      },
    });
  };

  const handleDeletePlan = async () => {
    if (!plan) return;
    if (
      confirm(
        `Are you sure you want to delete "${plan.name}"? This action cannot be undone.`
      )
    ) {
      await deletePlan.mutateAsync(plan.id);
      router.push("/plans");
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    await createInvite.mutateAsync({
      planId,
      email: inviteEmail.trim(),
      role: inviteRole,
    });
    setInviteEmail("");
    setInviteRole("viewer");
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (confirm(`Are you sure you want to remove ${memberName} from this plan?`)) {
      await removeMember.mutateAsync({ planId, userId });
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    await deleteInvite.mutateAsync({ inviteId, planId });
  };

  if (isLoadingPlan) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Plan Settings"
        description="Manage your plan configuration and team access"
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="w-4 h-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <History className="w-4 h-4" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Plan Details</CardTitle>
                <CardDescription>
                  Basic information about your OKR plan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Plan Name</Label>
                  <Input
                    id="plan-name"
                    value={planName || plan?.name || ""}
                    onChange={(e) => setPlanName(e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-year">Year</Label>
                  <Select
                    value={planYear || plan?.year?.toString() || ""}
                    onValueChange={setPlanYear}
                    disabled={!isOwner}
                  >
                    <SelectTrigger id="plan-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                      <SelectItem value="2028">2028</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-description">Description (optional)</Label>
                  <Input
                    id="plan-description"
                    value={planDescription || plan?.description || ""}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    placeholder="Personal and professional goals for the year"
                    disabled={!isOwner}
                  />
                </div>
                {isOwner && (
                  <Button
                    onClick={handleSaveSettings}
                    disabled={updatePlan.isPending}
                  >
                    {updatePlan.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            {isOwner && (
              <Card className="border-status-danger/20">
                <CardHeader>
                  <CardTitle className="text-status-danger">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible actions for this plan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-card bg-status-danger/5 border border-status-danger/20">
                    <div>
                      <p className="font-medium text-body-sm">Duplicate Plan</p>
                      <p className="text-small text-text-muted">
                        Create a copy of this plan with all objectives and KRs
                      </p>
                    </div>
                    <Button variant="secondary" className="gap-2" disabled>
                      <Copy className="w-4 h-4" />
                      Duplicate
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-card bg-status-danger/5 border border-status-danger/20">
                    <div>
                      <p className="font-medium text-body-sm">Delete Plan</p>
                      <p className="text-small text-text-muted">
                        Permanently delete this plan and all its data
                      </p>
                    </div>
                    <Button
                      variant="danger"
                      className="gap-2"
                      onClick={handleDeletePlan}
                      disabled={deletePlan.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Members */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Manage who has access to this plan
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Invite Form - only for owner */}
              {isOwner && (
                <div className="flex gap-3 mb-6 p-4 rounded-card bg-bg-1/50 border border-border-soft">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter email address"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as OkrRole)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleSendInvite}
                    disabled={!inviteEmail.trim() || createInvite.isPending}
                  >
                    {createInvite.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Invite
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Pending Invites */}
              {invites.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-body-sm font-medium text-text-muted mb-3">
                    Pending Invites
                  </h4>
                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 rounded-card bg-bg-1/30 border border-border-soft"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-bg-1 flex items-center justify-center">
                            <Mail className="w-4 h-4 text-text-muted" />
                          </div>
                          <div>
                            <p className="text-body-sm">{invite.email}</p>
                            <p className="text-small text-text-muted">
                              Invited as {invite.role}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Pending</Badge>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelInvite(invite.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members List */}
              {isLoadingMembers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-4 rounded-card bg-bg-1/30 border border-border-soft"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.profile?.avatar_url || ""} />
                          <AvatarFallback>
                            {member.profile?.full_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("") || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-body-sm">
                            {member.profile?.full_name || "Unknown"}
                          </p>
                          <p className="text-small text-text-muted">
                            {member.profile?.email || ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={member.role === "owner" ? "default" : "outline"}
                        >
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                        {isOwner && member.role !== "owner" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-text-muted hover:text-status-danger"
                            onClick={() =>
                              handleRemoveMember(
                                member.user_id,
                                member.profile?.full_name || "this member"
                              )
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>
                Understanding what each role can do in this plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Owner */}
                <div className="p-4 rounded-card bg-bg-1/30 border border-border-soft">
                  <Badge className="mb-3">Owner</Badge>
                  <ul className="space-y-2 text-body-sm">
                    <li className="flex items-center gap-2 text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                      Full access to all features
                    </li>
                    <li className="flex items-center gap-2 text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                      Manage team members
                    </li>
                    <li className="flex items-center gap-2 text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                      Delete plan
                    </li>
                    <li className="flex items-center gap-2 text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                      Transfer ownership
                    </li>
                  </ul>
                </div>

                {/* Editor */}
                <div className="p-4 rounded-card bg-bg-1/30 border border-border-soft">
                  <Badge variant="outline" className="mb-3">
                    Editor
                  </Badge>
                  <ul className="space-y-2 text-body-sm">
                    <li className="flex items-center gap-2 text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                      Create and edit OKRs
                    </li>
                    <li className="flex items-center gap-2 text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                      Add check-ins
                    </li>
                    <li className="flex items-center gap-2 text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                      View analytics
                    </li>
                    <li className="flex items-center gap-2 text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-border" />
                      Cannot manage members
                    </li>
                  </ul>
                </div>

                {/* Viewer */}
                <div className="p-4 rounded-card bg-bg-1/30 border border-border-soft">
                  <Badge variant="outline" className="mb-3">
                    Viewer
                  </Badge>
                  <ul className="space-y-2 text-body-sm">
                    <li className="flex items-center gap-2 text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                      View all OKRs
                    </li>
                    <li className="flex items-center gap-2 text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                      View analytics
                    </li>
                    <li className="flex items-center gap-2 text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-border" />
                      Cannot edit OKRs
                    </li>
                    <li className="flex items-center gap-2 text-text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-border" />
                      Cannot add check-ins
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Activity Log</CardTitle>
                  <CardDescription>
                    Audit trail of all changes in this plan
                  </CardDescription>
                </div>
                <Select value={logFilter} onValueChange={setLogFilter}>
                  <SelectTrigger className="w-36">
                    <Filter className="w-3.5 h-3.5 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="updated">Updated</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLog ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
                </div>
              ) : logEvents.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No activity yet"
                  description="Activity will appear here as you make changes to your plan."
                />
              ) : (
                <>
                  {/* Compact event list */}
                  <div className="divide-y divide-border-soft">
                    {logEvents.map((event) => (
                      <div key={event.id} className="flex items-center gap-3 py-2.5">
                        {/* Icon */}
                        <div className="w-7 h-7 rounded-full bg-bg-1 border border-border-soft flex items-center justify-center shrink-0 text-text-muted">
                          {getEventIcon(event.event_type, event.entity_type)}
                        </div>

                        {/* Event text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm text-text-strong truncate">
                            {formatEventText(event)}
                          </p>
                          <div className="flex items-center gap-2 text-small text-text-muted">
                            {event.user && (
                              <>
                                <span>{event.user.full_name || event.user.email}</span>
                                <span>•</span>
                              </>
                            )}
                            <span title={format(new Date(event.created_at), "PPpp")}>
                              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>

                        {/* Badge */}
                        <Badge 
                          variant={
                            event.event_type === "created" ? "success" :
                            event.event_type === "completed" ? "success" :
                            event.event_type === "deleted" ? "warning" :
                            "outline"
                          }
                          className="shrink-0 text-[10px]"
                        >
                          {event.entity_type.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {logTotalPages > 1 && (
                    <div className="mt-4 pt-4 border-t border-border-soft flex justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={logPage === 1 || isFetchingLog}
                        onClick={() => setLogPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <span className="flex items-center px-3 text-small text-text-muted">
                        {logPage} / {logTotalPages}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={logPage >= logTotalPages || isFetchingLog}
                        onClick={() => setLogPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
