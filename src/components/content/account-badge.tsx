"use client";

import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { PlatformIcon, getPlatformColors } from "./platform-icon";

interface AccountBadgeProps {
  platformName: string;
  platformDisplayName: string;
  handle: string;
  accountType?: "personal" | "business";
  profileUrl?: string | null;
  isActive?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function AccountBadge({
  platformName,
  platformDisplayName,
  handle,
  accountType = "personal",
  profileUrl,
  isActive = true,
  size = "md",
  className,
}: AccountBadgeProps) {
  const colors = getPlatformColors(platformName);

  const sizeClasses = {
    sm: "px-2 py-1 text-small",
    md: "px-3 py-1.5",
  };

  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border transition-colors",
        colors.bg,
        colors.border,
        !isActive && "opacity-50",
        sizeClasses[size],
        profileUrl && "cursor-pointer hover:border-border",
        className
      )}
    >
      <PlatformIcon
        platformName={platformName}
        size={size === "sm" ? "sm" : "md"}
      />
      <div className="flex flex-col">
        <span className={cn("font-medium", colors.text)}>{handle}</span>
        <span className="text-[10px] text-text-muted">
          {platformDisplayName} · {accountType}
        </span>
      </div>
      {profileUrl && (
        <ExternalLink className="w-3 h-3 text-text-muted ml-1" />
      )}
    </div>
  );

  if (profileUrl) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="no-underline"
      >
        {content}
      </a>
    );
  }

  return content;
}
