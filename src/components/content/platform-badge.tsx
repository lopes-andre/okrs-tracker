"use client";

import { cn } from "@/lib/utils";
import { PlatformIcon, getPlatformColors } from "./platform-icon";

interface PlatformBadgeProps {
  platformName: string;
  displayName: string;
  className?: string;
}

export function PlatformBadge({ platformName, displayName, className }: PlatformBadgeProps) {
  const colors = getPlatformColors(platformName);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-small font-medium",
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      <PlatformIcon platformName={platformName} size="sm" className="w-4 h-4 text-[10px]" />
      <span>{displayName}</span>
    </div>
  );
}
