"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface QuickCaptureProps {
  onCapture: (title: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}

export function QuickCapture({
  onCapture,
  placeholder = "Capture a content idea...",
  className,
}: QuickCaptureProps) {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Keyboard shortcut: Cmd/Ctrl + N to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmedValue = value.trim();
    if (!trimmedValue || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCapture(trimmedValue);
      setValue("");
      toast({
        title: "Idea captured!",
        description: "Click the card to add more details.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Failed to capture idea",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex gap-2", className)}
    >
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSubmitting}
        className="flex-1 bg-bg-0 border-border-soft focus:border-accent"
      />
      <Button
        type="submit"
        size="icon"
        disabled={!value.trim() || isSubmitting}
        className="shrink-0"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        <span className="sr-only">Add idea</span>
      </Button>
    </form>
  );
}
