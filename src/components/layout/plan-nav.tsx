"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Target,
  ListTodo,
  CalendarCheck,
  BarChart3,
  Settings,
} from "lucide-react";

interface PlanNavProps {
  planId: string;
}

const navItems = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "OKRs", href: "/okrs", icon: Target },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Reviews", href: "/reviews", icon: CalendarCheck },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function PlanNav({ planId }: PlanNavProps) {
  const pathname = usePathname();
  const basePath = `/plans/${planId}`;

  return (
    <nav className="border-b border-border-soft bg-bg-0">
      <div className="container-main">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mb-px">
          {navItems.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive =
              item.href === ""
                ? pathname === basePath
                : pathname.startsWith(href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-body-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                  isActive
                    ? "border-accent text-text-strong"
                    : "border-transparent text-text-muted hover:text-text-strong hover:border-border"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
