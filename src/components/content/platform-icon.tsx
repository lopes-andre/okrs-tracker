"use client";

import { cn } from "@/lib/utils";

// Platform colors from design spec
const platformColors: Record<string, { bg: string; text: string; border: string }> = {
  twitter: { bg: "bg-[#1DA1F2]/10", text: "text-[#1DA1F2]", border: "border-[#1DA1F2]/30" },
  instagram: { bg: "bg-[#E4405F]/10", text: "text-[#E4405F]", border: "border-[#E4405F]/30" },
  linkedin: { bg: "bg-[#0A66C2]/10", text: "text-[#0A66C2]", border: "border-[#0A66C2]/30" },
  youtube: { bg: "bg-[#FF0000]/10", text: "text-[#FF0000]", border: "border-[#FF0000]/30" },
  tiktok: { bg: "bg-[#000000]/10", text: "text-[#000000]", border: "border-[#000000]/30" },
  facebook: { bg: "bg-[#1877F2]/10", text: "text-[#1877F2]", border: "border-[#1877F2]/30" },
  pinterest: { bg: "bg-[#E60023]/10", text: "text-[#E60023]", border: "border-[#E60023]/30" },
  threads: { bg: "bg-[#000000]/10", text: "text-[#000000]", border: "border-[#000000]/30" },
  substack: { bg: "bg-[#FF6719]/10", text: "text-[#FF6719]", border: "border-[#FF6719]/30" },
  medium: { bg: "bg-[#000000]/10", text: "text-[#000000]", border: "border-[#000000]/30" },
  blog: { bg: "bg-[#6366F1]/10", text: "text-[#6366F1]", border: "border-[#6366F1]/30" },
  newsletter: { bg: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/30" },
  podcast: { bg: "bg-[#8B5CF6]/10", text: "text-[#8B5CF6]", border: "border-[#8B5CF6]/30" },
};

// Platform icons (using simple SVG for now, could be replaced with brand icons)
const platformIcons: Record<string, string> = {
  twitter: "𝕏",
  instagram: "📷",
  linkedin: "in",
  youtube: "▶",
  tiktok: "♪",
  facebook: "f",
  pinterest: "P",
  threads: "@",
  substack: "S",
  medium: "M",
  blog: "B",
  newsletter: "✉",
  podcast: "🎙",
};

interface PlatformIconProps {
  platformName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PlatformIcon({ platformName, size = "md", className }: PlatformIconProps) {
  const normalizedName = platformName.toLowerCase();
  const colors = platformColors[normalizedName] || { bg: "bg-bg-1", text: "text-text-muted", border: "border-border" };
  const icon = platformIcons[normalizedName] || platformName.charAt(0).toUpperCase();

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold",
        colors.bg,
        colors.text,
        sizeClasses[size],
        className
      )}
    >
      {icon}
    </div>
  );
}

export function getPlatformColors(platformName: string) {
  const normalizedName = platformName.toLowerCase();
  return platformColors[normalizedName] || { bg: "bg-bg-1", text: "text-text-muted", border: "border-border" };
}
