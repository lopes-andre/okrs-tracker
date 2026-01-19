"use client";

import Link from "next/link";
import { Plus, Target, Calendar, Users, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlans, useCreatePlan } from "@/features/plans/hooks";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PlansPage() {
  const { data: plans, isLoading, error } = usePlans();
  const createPlan = useCreatePlan();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanYear, setNewPlanYear] = useState(new Date().getFullYear());
  const [newPlanDescription, setNewPlanDescription] = useState("");

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlanName.trim()) return;

    await createPlan.mutateAsync({
      name: newPlanName,
      year: newPlanYear,
      description: newPlanDescription || null,
    });

    setCreateDialogOpen(false);
    setNewPlanName("");
    setNewPlanDescription("");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-1">
        <Navbar showPlanSwitcher={false} />
        <main className="container-main py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-1">
        <Navbar showPlanSwitcher={false} />
        <main className="container-main py-8">
          <div className="text-center py-12">
            <p className="text-status-danger">Error loading plans: {error.message}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-1">
      <Navbar showPlanSwitcher={false} />

      <main className="container-main py-8">
        <PageHeader
          title="Your OKR Plans"
          description="Create and manage your annual OKR plans"
        >
          <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            New Plan
          </Button>
        </PageHeader>

        {plans && plans.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No plans yet"
            description="Create your first OKR plan to get started tracking your goals."
            action={{
              label: "Create Plan",
              onClick: () => setCreateDialogOpen(true),
            }}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans?.map((plan) => (
              <Link key={plan.id} href={`/plans/${plan.id}`}>
                <Card className="card-hover h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-card bg-bg-1 flex items-center justify-center">
                        <Target className="w-6 h-6 text-text-muted" />
                      </div>
                      <Badge variant={plan.role === "owner" ? "success" : "secondary"}>
                        {plan.role === "owner" ? "Owner" : plan.role === "editor" ? "Editor" : "Viewer"}
                      </Badge>
                    </div>
                    <CardTitle className="mt-4">{plan.name}</CardTitle>
                    <CardDescription>
                      {plan.description || `${plan.year} OKR Plan`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Meta */}
                    <div className="flex items-center gap-4 text-small text-text-muted">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{plan.year}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          {plan.role === "owner" ? "Owner" : "Member"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Create New Plan Card */}
            <Card 
              className="card-hover border-dashed flex flex-col items-center justify-center min-h-[220px] cursor-pointer group"
              onClick={() => setCreateDialogOpen(true)}
            >
              <div className="w-16 h-16 rounded-card bg-bg-1 flex items-center justify-center mb-4 group-hover:bg-accent-muted transition-colors">
                <Plus className="w-8 h-8 text-text-muted group-hover:text-accent transition-colors" />
              </div>
              <CardTitle className="text-h5 mb-1">Create New Plan</CardTitle>
              <CardDescription className="text-center max-w-[200px]">
                Start a new annual OKR plan for {new Date().getFullYear()}
              </CardDescription>
            </Card>
          </div>
        )}
      </main>

      {/* Create Plan Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading">Create New Plan</DialogTitle>
            <DialogDescription>
              Create a new OKR plan to start tracking your goals.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan Name *</Label>
              <Input
                id="plan-name"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder="e.g., 2026 OKRs"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-year">Year</Label>
              <Input
                id="plan-year"
                type="number"
                value={newPlanYear}
                onChange={(e) => setNewPlanYear(parseInt(e.target.value))}
                min={2020}
                max={2100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-description">Description</Label>
              <Input
                id="plan-description"
                value={newPlanDescription}
                onChange={(e) => setNewPlanDescription(e.target.value)}
                placeholder="Optional description..."
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createPlan.isPending || !newPlanName.trim()}
                className="bg-accent hover:bg-accent-hover text-white"
              >
                {createPlan.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Create Plan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
