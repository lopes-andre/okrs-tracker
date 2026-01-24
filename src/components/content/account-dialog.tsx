"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlatformIcon } from "./platform-icon";
import { KrSelector } from "./kr-selector";
import { useCreateAccount, useUpdateAccount } from "@/features/content/hooks";
import type { ContentAccountWithPlatform, ContentPlatform, ContentAccountType } from "@/lib/supabase/types";

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  account?: ContentAccountWithPlatform | null;
  platforms: ContentPlatform[];
}

export function AccountDialog({
  open,
  onOpenChange,
  planId,
  account,
  platforms,
}: AccountDialogProps) {
  const isEditing = !!account;
  const createAccount = useCreateAccount(planId);
  const updateAccount = useUpdateAccount(planId);

  const [platformId, setPlatformId] = useState<string>("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<ContentAccountType>("personal");
  const [linkedKrId, setLinkedKrId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (account) {
        setPlatformId(account.platform_id);
        setAccountName(account.account_name);
        setAccountType(account.account_type);
        setLinkedKrId(account.linked_kr_id);
        setIsActive(account.is_active);
      } else {
        setPlatformId(platforms[0]?.id || "");
        setAccountName("");
        setAccountType("personal");
        setLinkedKrId(null);
        setIsActive(true);
      }
    }
  }, [open, account, platforms]);

  const selectedPlatform = platforms.find((p) => p.id === platformId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && account) {
      await updateAccount.mutateAsync({
        accountId: account.id,
        updates: {
          account_name: accountName,
          account_type: accountType,
          linked_kr_id: linkedKrId,
          is_active: isActive,
        },
      });
    } else {
      await createAccount.mutateAsync({
        platform_id: platformId,
        account_name: accountName,
        account_type: accountType,
        linked_kr_id: linkedKrId,
        is_active: isActive,
        display_order: 0,
        settings: {},
      });
    }

    onOpenChange(false);
  };

  const isPending = createAccount.isPending || updateAccount.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Account" : "Add Account"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the account details below."
                : "Connect a social media account to track content distribution."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Platform Selection (disabled when editing) */}
            <div className="grid gap-2">
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={platformId}
                onValueChange={setPlatformId}
                disabled={isEditing}
              >
                <SelectTrigger id="platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>
                      <div className="flex items-center gap-2">
                        <PlatformIcon platformName={platform.name} size="sm" />
                        <span>{platform.display_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account Name */}
            <div className="grid gap-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder={`My ${selectedPlatform?.display_name || "Social Media"} Account`}
                required
              />
              <p className="text-small text-text-muted">
                A friendly name to identify this account (e.g., &quot;Personal Twitter&quot;, &quot;Business Instagram&quot;)
              </p>
            </div>

            {/* Account Type */}
            <div className="grid gap-2">
              <Label htmlFor="accountType">Account Type</Label>
              <Select
                value={accountType}
                onValueChange={(v) => setAccountType(v as ContentAccountType)}
              >
                <SelectTrigger id="accountType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* KR Linking */}
            <div className="grid gap-2">
              <Label>Link to Key Result (optional)</Label>
              <KrSelector
                planId={planId}
                value={linkedKrId}
                onChange={setLinkedKrId}
                placeholder="Select a KR to link..."
              />
              <p className="text-small text-text-muted">
                Link this account to a KR to track how content contributes to your goals.
              </p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border-soft p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active Account</Label>
                <p className="text-small text-text-muted">
                  Inactive accounts won&apos;t appear in distribution options.
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !accountName.trim()}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
