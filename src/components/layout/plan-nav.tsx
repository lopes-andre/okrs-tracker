"use client";

import { useState, useEffect } from "react";
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
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchCommand } from "./search-command";

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
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcut: Cmd+K or Ctrl+K to open search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <nav className="border-b border-border-soft bg-bg-0">
        <div className="container-main">
          <div className="flex items-center justify-between -mb-px">
            {/* Navigation Links */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
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

            {/* Search Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="gap-2 text-text-muted hover:text-text-strong hidden sm:flex"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
              <kbd className="ml-2 px-1.5 py-0.5 bg-bg-1 rounded text-[10px] font-mono text-text-subtle">
                ⌘K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="sm:hidden"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Search Command Dialog */}
      <SearchCommand
        planId={planId}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />
    </>
  );
}
