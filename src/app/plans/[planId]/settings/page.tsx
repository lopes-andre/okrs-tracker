import { Settings, Users, Shield, Trash2, Copy, Mail, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

// Mock members data
const mockMembers = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "owner",
    avatar: "",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "editor",
    avatar: "",
  },
];

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

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
                  <Input id="plan-name" defaultValue="2026 Plan" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-year">Year</Label>
                  <Select defaultValue="2026">
                    <SelectTrigger id="plan-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-description">Description (optional)</Label>
                  <Input
                    id="plan-description"
                    placeholder="Personal and professional goals for the year"
                  />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
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
                  <Button variant="secondary" className="gap-2">
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
                  <Button variant="danger" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Invite Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Invite Form */}
              <div className="flex gap-3 mb-6 p-4 rounded-card bg-bg-1/50 border border-border-soft">
                <div className="flex-1">
                  <Input placeholder="Enter email address" type="email" />
                </div>
                <Select defaultValue="viewer">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
                <Button>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invite
                </Button>
              </div>

              {/* Members List */}
              <div className="space-y-3">
                {mockMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-card bg-bg-1/30 border border-border-soft"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-body-sm">{member.name}</p>
                        <p className="text-small text-text-muted">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={member.role === "owner" ? "default" : "outline"}
                      >
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                      {member.role !== "owner" && (
                        <Button variant="ghost" size="sm" className="text-text-muted">
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
                  <Badge variant="outline" className="mb-3">Editor</Badge>
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
                  <Badge variant="outline" className="mb-3">Viewer</Badge>
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
