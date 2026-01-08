import { Navbar } from "@/components/layout/navbar";
import { PlanNav } from "@/components/layout/plan-nav";

export default async function PlanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <div className="min-h-screen bg-bg-1">
      <Navbar />
      <PlanNav planId={planId} />
      <main className="container-main py-8">{children}</main>
    </div>
  );
}
