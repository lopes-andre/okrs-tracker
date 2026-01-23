"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Target,
  TrendingUp,
  CheckSquare,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePlanSearch } from "@/features/search/hooks";
import { cn } from "@/lib/utils";

interface SearchCommandProps {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ResultType = "objective" | "kr" | "task";

interface SearchResultItem {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  href: string;
}

export function SearchCommand({ planId, open, onOpenChange }: SearchCommandProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: results, isLoading } = usePlanSearch(planId, query);

  // Build flat list of results for keyboard navigation
  const flatResults = useMemo<SearchResultItem[]>(() => {
    if (!results) return [];

    const items: SearchResultItem[] = [];

    results.objectives.forEach((obj) => {
      items.push({
        id: obj.id,
        type: "objective",
        title: `${obj.code}: ${obj.name}`,
        href: `/plans/${planId}/okrs`,
      });
    });

    results.annualKrs.forEach((kr) => {
      items.push({
        id: kr.id,
        type: "kr",
        title: kr.name,
        subtitle: kr.objective_name,
        href: `/plans/${planId}/okrs`,
      });
    });

    results.tasks.forEach((task) => {
      items.push({
        id: task.id,
        type: "task",
        title: task.title,
        subtitle: task.objective_name || task.kr_name,
        href: `/plans/${planId}/tasks`,
      });
    });

    return items;
  }, [results, planId]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatResults.length]);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatResults.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flatResults.length - 1
        );
      } else if (e.key === "Enter" && flatResults[selectedIndex]) {
        e.preventDefault();
        const result = flatResults[selectedIndex];
        router.push(result.href);
        onOpenChange(false);
      }
    },
    [flatResults, selectedIndex, router, onOpenChange]
  );

  const getIcon = (type: ResultType) => {
    switch (type) {
      case "objective":
        return <Target className="w-4 h-4 text-accent" />;
      case "kr":
        return <TrendingUp className="w-4 h-4 text-status-info" />;
      case "task":
        return <CheckSquare className="w-4 h-4 text-status-warning" />;
    }
  };

  const getTypeLabel = (type: ResultType) => {
    switch (type) {
      case "objective":
        return "Objective";
      case "kr":
        return "Key Result";
      case "task":
        return "Task";
    }
  };

  function handleSelect(result: SearchResultItem) {
    router.push(result.href);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b border-border-soft px-4">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <Input
            placeholder="Search objectives, KRs, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pl-3"
            autoFocus
          />
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-text-muted shrink-0" />
          )}
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto">
          {query.length < 2 ? (
            <div className="py-8 text-center text-text-muted text-body-sm">
              Type at least 2 characters to search
            </div>
          ) : flatResults.length === 0 && !isLoading ? (
            <div className="py-8 text-center text-text-muted text-body-sm">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="py-2">
              {flatResults.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    "hover:bg-bg-1",
                    index === selectedIndex && "bg-bg-1"
                  )}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {getIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-text-strong truncate">
                      {result.title}
                    </p>
                    {result.subtitle && (
                      <p className="text-small text-text-muted truncate">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="text-small text-text-subtle shrink-0">
                    {getTypeLabel(result.type)}
                  </span>
                  {index === selectedIndex && (
                    <ArrowRight className="w-3 h-3 text-text-muted shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="border-t border-border-soft px-4 py-2 flex items-center gap-4 text-small text-text-subtle">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-bg-1 rounded text-[10px] font-mono">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-bg-1 rounded text-[10px] font-mono">↓</kbd>
            <span className="ml-1">Navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-bg-1 rounded text-[10px] font-mono">↵</kbd>
            <span className="ml-1">Select</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-bg-1 rounded text-[10px] font-mono">esc</kbd>
            <span className="ml-1">Close</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
