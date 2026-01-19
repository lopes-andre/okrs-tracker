"use client";

import { Mail, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useMyPendingInvites,
  useAcceptPlanInvite,
  useDeclinePlanInvite,
} from "@/features/plans/hooks";

export function PendingInvitesBanner() {
  const { data: invites = [], isLoading } = useMyPendingInvites();
  const acceptInvite = useAcceptPlanInvite();
  const declineInvite = useDeclinePlanInvite();

  if (isLoading || invites.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center justify-between p-4 rounded-card bg-accent/5 border border-accent/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-body-sm font-medium">
                You&apos;ve been invited to join{" "}
                <span className="font-semibold">{invite.plan?.name || "a plan"}</span>
              </p>
              <p className="text-small text-text-muted">
                {invite.plan?.year} plan
                <span className="mx-2">·</span>
                Role: <Badge variant="outline" className="ml-1 text-[10px]">
                  {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                </Badge>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => declineInvite.mutate(invite.id)}
              disabled={declineInvite.isPending || acceptInvite.isPending}
              className="gap-1.5"
            >
              {declineInvite.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              Decline
            </Button>
            <Button
              size="sm"
              onClick={() => acceptInvite.mutate(invite.id)}
              disabled={acceptInvite.isPending || declineInvite.isPending}
              className="gap-1.5 bg-accent hover:bg-accent-hover text-white"
            >
              {acceptInvite.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
