"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useObjectivesWithKrs } from "@/features/objectives/hooks";

interface KrSelectorProps {
  planId: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function KrSelector({
  planId,
  value,
  onChange,
  placeholder = "Select a Key Result...",
  disabled = false,
}: KrSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: objectives } = useObjectivesWithKrs(planId);

  // Flatten KRs for easier lookup
  const allKrs = useMemo(() => {
    if (!objectives) return [];
    return objectives.flatMap((obj) =>
      obj.annual_krs.map((kr) => ({
        ...kr,
        objectiveCode: obj.code,
        objectiveName: obj.name,
      }))
    );
  }, [objectives]);

  const selectedKr = allKrs.find((kr) => kr.id === value);

  const handleSelect = (krId: string) => {
    onChange(krId === value ? null : krId);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-text-muted"
          )}
        >
          {selectedKr ? (
            <span className="flex items-center gap-2 truncate">
              <Target className="w-4 h-4 text-accent shrink-0" />
              <span className="font-medium text-text-muted">
                {selectedKr.objectiveCode}:
              </span>
              <span className="truncate">{selectedKr.name}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              {placeholder}
            </span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClear(e as unknown as React.MouseEvent);
                  }
                }}
                className="p-0.5 rounded hover:bg-bg-1 cursor-pointer"
              >
                <X className="w-4 h-4 text-text-muted" />
              </span>
            )}
            <ChevronsUpDown className="w-4 h-4 text-text-muted" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder="Search Key Results..." />
          <CommandList>
            <CommandEmpty>No Key Results found.</CommandEmpty>
            {objectives?.map((objective) => (
              <CommandGroup
                key={objective.id}
                heading={
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-accent">
                      {objective.code}
                    </span>
                    <span className="truncate">{objective.name}</span>
                  </span>
                }
              >
                {objective.annual_krs.map((kr) => (
                  <CommandItem
                    key={kr.id}
                    value={`${objective.code} ${objective.name} ${kr.name}`}
                    onSelect={() => handleSelect(kr.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "w-4 h-4 shrink-0 text-accent",
                        value === kr.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate text-text">{kr.name}</span>
                      <span className="text-[10px] text-text-muted">
                        {kr.kr_type} · {kr.direction} · Target: {kr.target_value}
                        {kr.unit ? ` ${kr.unit}` : ""}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
