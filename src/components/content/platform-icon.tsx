"use client";

import { cn } from "@/lib/utils";
import { FileText, Mail, Mic } from "lucide-react";

// Platform colors from design spec
const platformColors: Record<string, { bg: string; text: string; border: string; fill: string }> = {
  twitter: { bg: "bg-[#000000]/10", text: "text-[#000000]", border: "border-[#000000]/30", fill: "#000000" },
  x: { bg: "bg-[#000000]/10", text: "text-[#000000]", border: "border-[#000000]/30", fill: "#000000" },
  instagram: { bg: "bg-[#E4405F]/10", text: "text-[#E4405F]", border: "border-[#E4405F]/30", fill: "#E4405F" },
  linkedin: { bg: "bg-[#0A66C2]/10", text: "text-[#0A66C2]", border: "border-[#0A66C2]/30", fill: "#0A66C2" },
  youtube: { bg: "bg-[#FF0000]/10", text: "text-[#FF0000]", border: "border-[#FF0000]/30", fill: "#FF0000" },
  tiktok: { bg: "bg-[#000000]/10", text: "text-[#000000]", border: "border-[#000000]/30", fill: "#000000" },
  facebook: { bg: "bg-[#1877F2]/10", text: "text-[#1877F2]", border: "border-[#1877F2]/30", fill: "#1877F2" },
  pinterest: { bg: "bg-[#E60023]/10", text: "text-[#E60023]", border: "border-[#E60023]/30", fill: "#E60023" },
  threads: { bg: "bg-[#000000]/10", text: "text-[#000000]", border: "border-[#000000]/30", fill: "#000000" },
  substack: { bg: "bg-[#FF6719]/10", text: "text-[#FF6719]", border: "border-[#FF6719]/30", fill: "#FF6719" },
  medium: { bg: "bg-[#000000]/10", text: "text-[#000000]", border: "border-[#000000]/30", fill: "#000000" },
  blog: { bg: "bg-[#6366F1]/10", text: "text-[#6366F1]", border: "border-[#6366F1]/30", fill: "#6366F1" },
  newsletter: { bg: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/30", fill: "#10B981" },
  podcast: { bg: "bg-[#8B5CF6]/10", text: "text-[#8B5CF6]", border: "border-[#8B5CF6]/30", fill: "#8B5CF6" },
};

// SVG icons for each platform
function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
    </svg>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.733 2.064-1.146 3.338-1.248 1.049-.083 2.103.012 3.114.252-.032-1.196-.377-2.073-1.027-2.608-.71-.584-1.77-.876-3.148-.867-1.32.005-2.381.323-3.076.915l-1.35-1.583c1.084-.923 2.576-1.416 4.432-1.427 1.842-.013 3.305.435 4.35 1.335 1.097.946 1.674 2.344 1.716 4.156.107.05.213.104.317.16 1.14.613 2.03 1.477 2.575 2.5.655 1.228.908 2.79.756 4.202-.198 1.767-.924 3.345-2.097 4.56-1.59 1.643-3.94 2.643-7.232 2.643zm-.084-7.51c-.088.004-.175.01-.262.018-.918.076-1.59.357-1.944.645-.326.265-.474.585-.443.95.032.39.238.725.608.984.464.324 1.136.495 1.946.454.964-.05 1.69-.358 2.16-.918.392-.467.64-1.123.743-1.965-.852-.206-1.772-.255-2.808-.168z" />
    </svg>
  );
}

function SubstackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
    </svg>
  );
}

function MediumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
    </svg>
  );
}

interface PlatformIconProps {
  platformName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  sm: { container: "w-6 h-6", icon: "w-3 h-3" },
  md: { container: "w-8 h-8", icon: "w-4 h-4" },
  lg: { container: "w-10 h-10", icon: "w-5 h-5" },
};

export function PlatformIcon({ platformName, size = "md", className }: PlatformIconProps) {
  const normalizedName = platformName.toLowerCase();
  const colors = platformColors[normalizedName] || { bg: "bg-bg-1", text: "text-text-muted", border: "border-border", fill: "#666" };
  const sizes = sizeConfig[size];

  const renderIcon = () => {
    const iconClass = sizes.icon;

    switch (normalizedName) {
      case "twitter":
      case "x":
        return <TwitterIcon className={iconClass} />;
      case "instagram":
        return <InstagramIcon className={iconClass} />;
      case "linkedin":
        return <LinkedInIcon className={iconClass} />;
      case "youtube":
        return <YouTubeIcon className={iconClass} />;
      case "tiktok":
        return <TikTokIcon className={iconClass} />;
      case "facebook":
        return <FacebookIcon className={iconClass} />;
      case "pinterest":
        return <PinterestIcon className={iconClass} />;
      case "threads":
        return <ThreadsIcon className={iconClass} />;
      case "substack":
        return <SubstackIcon className={iconClass} />;
      case "medium":
        return <MediumIcon className={iconClass} />;
      case "blog":
        return <FileText className={iconClass} />;
      case "newsletter":
        return <Mail className={iconClass} />;
      case "podcast":
        return <Mic className={iconClass} />;
      default:
        // Fallback to first letter for unknown platforms
        return <span className="text-xs font-semibold">{platformName.charAt(0).toUpperCase()}</span>;
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full",
        colors.bg,
        colors.text,
        sizes.container,
        className
      )}
    >
      {renderIcon()}
    </div>
  );
}

export function getPlatformColors(platformName: string) {
  const normalizedName = platformName.toLowerCase();
  return platformColors[normalizedName] || { bg: "bg-bg-1", text: "text-text-muted", border: "border-border", fill: "#666" };
}
