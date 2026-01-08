import Link from "next/link";
import { Plus, Target, Calendar, Users } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Mock data for demonstration
const mockPlans = [
  {
    id: "2026",
    name: "2026 Plan",
    year: 2026,
    objectives: 6,
    keyResults: 24,
    progress: 12,
    status: "active",
    members: 1,
  },
  {
    id: "2025",
    name: "2025 Plan",
    year: 2025,
    objectives: 5,
    keyResults: 20,
    progress: 78,
    status: "completed",
    members: 2,
  },
];

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-bg-1">
      <Navbar showPlanSwitcher={false} />

      <main className="container-main py-8">
        <PageHeader
          title="Your OKR Plans"
          description="Create and manage your annual OKR plans"
        >
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Plan
          </Button>
        </PageHeader>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockPlans.map((plan) => (
            <Link key={plan.id} href={`/plans/${plan.id}`}>
              <Card className="card-hover h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-card bg-bg-1 flex items-center justify-center">
                      <Target className="w-6 h-6 text-text-muted" />
                    </div>
                    <Badge
                      variant={plan.status === "active" ? "success" : "default"}
                    >
                      {plan.status === "active" ? "Active" : "Completed"}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4">{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.objectives} Objectives • {plan.keyResults} Key Results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-small mb-2">
                      <span className="text-text-muted">Overall Progress</span>
                      <span className="font-medium">{plan.progress}%</span>
                    </div>
                    <Progress value={plan.progress} />
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-small text-text-muted">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{plan.year}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>
                        {plan.members} {plan.members === 1 ? "member" : "members"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Create New Plan Card */}
          <Card className="card-hover border-dashed flex flex-col items-center justify-center min-h-[280px] cursor-pointer group">
            <div className="w-16 h-16 rounded-card bg-bg-1 flex items-center justify-center mb-4 group-hover:bg-accent-muted transition-colors">
              <Plus className="w-8 h-8 text-text-muted group-hover:text-accent transition-colors" />
            </div>
            <CardTitle className="text-h5 mb-1">Create New Plan</CardTitle>
            <CardDescription className="text-center max-w-[200px]">
              Start a new annual OKR plan for {new Date().getFullYear() + 1}
            </CardDescription>
          </Card>
        </div>
      </main>
    </div>
  );
}
