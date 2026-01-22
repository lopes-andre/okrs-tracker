import { Navbar } from "@/components/layout/navbar";
import { PlanNav } from "@/components/layout/plan-nav";
import { ReminderProvider } from "@/components/tasks";
import { createClient } from "@/lib/supabase/server";

export default async function PlanLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get profile data
  let fullName: string | null = null;
  let avatarUrl: string | null = null;
  
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();
    
    if (data) {
      fullName = (data as { full_name: string | null; avatar_url: string | null }).full_name;
      avatarUrl = (data as { full_name: string | null; avatar_url: string | null }).avatar_url;
    }
  }

  const userData = user ? {
    email: user.email!,
    fullName,
    avatarUrl,
  } : null;

  return (
    <div className="min-h-screen bg-bg-1">
      <Navbar user={userData} />
      <PlanNav planId={planId} />
      <ReminderProvider planId={planId}>
        <main className="container-main py-8">{children}</main>
      </ReminderProvider>
    </div>
  );
}
