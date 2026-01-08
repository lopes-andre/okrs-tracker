"use client";

import Link from "next/link";
import { Target, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "@/app/(auth)/actions";

interface NavbarProps {
  showPlanSwitcher?: boolean;
  user?: {
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

export function Navbar({ showPlanSwitcher = true, user }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-soft bg-bg-0/95 backdrop-blur supports-[backdrop-filter]:bg-bg-0/80">
      <div className="container-main flex h-16 items-center justify-between">
        {/* Left side: Logo + Plan Switcher */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/plans" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-semibold text-lg hidden sm:inline">OKRs</span>
          </Link>

          {/* Plan Switcher */}
          {showPlanSwitcher && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-body-sm">
                  <span className="font-medium">2026 Plan</span>
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Your Plans</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    2026 Plan
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-text-subtle" />
                    2025 Plan
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/plans">View All Plans</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right side: User Menu */}
        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl || ""} alt={user.fullName || user.email} />
                    <AvatarFallback>{getInitials(user.fullName, user.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-body-sm font-medium leading-none">
                      {user.fullName || "User"}
                    </p>
                    <p className="text-small leading-none text-text-muted">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => signOut()}
                  className="text-status-danger focus:text-status-danger"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
