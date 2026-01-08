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
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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
import type { OkrRole } from "@/lib/supabase/types";
import { useRouter } from "next/navigation";

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
      </Tabs>
    </>
  );
}
