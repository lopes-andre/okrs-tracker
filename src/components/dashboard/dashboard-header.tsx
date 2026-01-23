"use client";

import { Edit2, Plus, Check } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/supabase/types";

interface DashboardHeaderProps {
  plan?: Plan | null;
  isEditing: boolean;
  onToggleEdit: () => void;
  onAddWidget: () => void;
  canEdit: boolean;
}

export function DashboardHeader({
  plan,
  isEditing,
  onToggleEdit,
  onAddWidget,
  canEdit,
}: DashboardHeaderProps) {
  return (
    <PageHeader
      title={plan?.name || "Plan Overview"}
      description={plan?.description || "Annual OKR tracking dashboard"}
    >
      {canEdit && (
        <>
          {isEditing && (
            <Button variant="secondary" onClick={onAddWidget}>
              <Plus className="w-4 h-4 mr-2" />
              Add Widget
            </Button>
          )}
          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={onToggleEdit}
          >
            {isEditing ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Done
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4 mr-2" />
                Customize
              </>
            )}
          </Button>
        </>
      )}
    </PageHeader>
  );
}
