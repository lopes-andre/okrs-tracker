"use client";

import { useState } from "react";
import { Plus, Loader2, MoreVertical, Pencil, Trash2, Target, User, Briefcase, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/layout/empty-state";
import { PlatformIcon, getPlatformColors } from "./platform-icon";
import { AccountDialog } from "./account-dialog";
import { DeleteConfirmationDialog } from "@/components/okr/delete-confirmation-dialog";
import {
  useAccountsWithPlatform,
  usePlatforms,
  useDeleteAccount,
} from "@/features/content/hooks";
import type { ContentAccountWithPlatform } from "@/lib/supabase/types";

interface AccountsSettingsProps {
  planId: string;
}

export function AccountsSettings({ planId }: AccountsSettingsProps) {
  const { data: accounts, isLoading } = useAccountsWithPlatform(planId);
  const { data: platforms } = usePlatforms();
  const deleteAccount = useDeleteAccount(planId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ContentAccountWithPlatform | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<ContentAccountWithPlatform | null>(null);

  // Group accounts by platform
  const accountsByPlatform = accounts?.reduce((acc, account) => {
    const platformId = account.platform_id;
    if (!acc[platformId]) {
      acc[platformId] = [];
    }
    acc[platformId].push(account);
    return acc;
  }, {} as Record<string, ContentAccountWithPlatform[]>) || {};

  const handleEdit = (account: ContentAccountWithPlatform) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const handleDelete = (account: ContentAccountWithPlatform) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (accountToDelete) {
      await deleteAccount.mutateAsync(accountToDelete.id);
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingAccount(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h4 font-heading font-semibold text-text-strong">
            Platforms & Accounts
          </h2>
          <p className="text-small text-text-muted mt-1">
            Manage your social media accounts and platforms
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Account
        </Button>
      </div>

      {/* Accounts List */}
      {!accounts || accounts.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No accounts connected"
          description="Add your social media accounts to start tracking content distribution across platforms."
          action={{
            label: "Add Account",
            onClick: () => setDialogOpen(true),
          }}
        />
      ) : (
        <div className="columns-1 lg:columns-2 gap-4 lg:gap-6">
          {Object.entries(accountsByPlatform).map(([platformId, platformAccounts]) => {
            const platform = platformAccounts[0]?.platform;
            if (!platform) return null;

            return (
              <Card key={platformId} className="break-inside-avoid mb-4 lg:mb-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <PlatformIcon platformName={platform.name} size="lg" />
                    <div>
                      <CardTitle className="text-base">{platform.display_name}</CardTitle>
                      <CardDescription>
                        {platformAccounts.length} account{platformAccounts.length !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {platformAccounts.map((account) => (
                      <AccountRow
                        key={account.id}
                        account={account}
                        onEdit={() => handleEdit(account)}
                        onDelete={() => handleDelete(account)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Account Dialog */}
      <AccountDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        planId={planId}
        account={editingAccount}
        platforms={platforms || []}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Account"
        description="This will remove all distribution data associated with this account."
        itemName={accountToDelete?.account_name || "this account"}
      />
    </div>
  );
}

interface AccountRowProps {
  account: ContentAccountWithPlatform;
  onEdit: () => void;
  onDelete: () => void;
}

function AccountRow({ account, onEdit, onDelete }: AccountRowProps) {
  const colors = getPlatformColors(account.platform.name);

  return (
    <TooltipProvider>
      <div
        className={`flex items-center justify-between p-4 rounded-card border ${
          account.is_active ? "border-border-soft" : "border-border-soft opacity-60"
        } bg-bg-0 hover:border-border transition-colors`}
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${colors.text}`}>{account.account_name}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="px-1.5 py-0.5 cursor-default">
                    {account.account_type === "personal" ? (
                      <User className="w-3 h-3" />
                    ) : (
                      <Briefcase className="w-3 h-3" />
                    )}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{account.account_type === "personal" ? "Personal account" : "Business account"}</p>
                </TooltipContent>
              </Tooltip>
              {!account.is_active && (
                <Badge variant="secondary" className="text-[10px]">
                  Inactive
                </Badge>
              )}
            </div>
            {account.linked_kr && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <Target className="w-3 h-3 text-text-muted shrink-0" />
                {account.linked_kr.objective && (
                  <>
                    <span className="text-small text-text-muted">
                      {account.linked_kr.objective.name}
                    </span>
                    <span className="text-small text-text-muted">→</span>
                  </>
                )}
                <span className="text-small text-text-muted">
                  {account.linked_kr.name}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-status-danger focus:text-status-danger"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
