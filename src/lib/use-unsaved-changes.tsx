"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook to track unsaved changes and warn before navigation.
 * Provides form state management with dirty tracking.
 */
export function useUnsavedChanges(initialValue = false) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(initialValue);
  const router = useRouter();

  // Track if we're intentionally navigating (to prevent warning)
  const isNavigatingRef = useRef(false);

  // Browser beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isNavigatingRef.current) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  /**
   * Mark the form as having unsaved changes
   */
  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Mark the form as clean (e.g., after successful save)
   */
  const markClean = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  /**
   * Safely navigate, asking for confirmation if there are unsaved changes
   */
  const safeNavigate = useCallback((path: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmed) {
        return false;
      }
    }
    isNavigatingRef.current = true;
    router.push(path);
    return true;
  }, [hasUnsavedChanges, router]);

  /**
   * Check if there are unsaved changes and prompt if needed
   * Returns true if safe to proceed, false if user cancelled
   */
  const confirmLeave = useCallback((): boolean => {
    if (hasUnsavedChanges) {
      return window.confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
    }
    return true;
  }, [hasUnsavedChanges]);

  return {
    hasUnsavedChanges,
    markDirty,
    markClean,
    safeNavigate,
    confirmLeave,
    setHasUnsavedChanges,
  };
}

/**
 * Hook to track form field changes and auto-mark dirty.
 * Wraps a state setter to automatically track changes.
 */
export function useTrackedState<T>(
  initialValue: T,
  onChange?: (value: T) => void
): [T, (value: T) => void, { isDirty: boolean; reset: () => void }] {
  const [value, setValue] = useState<T>(initialValue);
  const [isDirty, setIsDirty] = useState(false);
  const initialRef = useRef(initialValue);

  const setTrackedValue = useCallback((newValue: T) => {
    setValue(newValue);
    setIsDirty(true);
    onChange?.(newValue);
  }, [onChange]);

  const reset = useCallback(() => {
    setValue(initialRef.current);
    setIsDirty(false);
  }, []);

  // Update initial ref when initialValue changes (e.g., data loaded)
  useEffect(() => {
    initialRef.current = initialValue;
    setValue(initialValue);
    setIsDirty(false);
  }, [initialValue]);

  return [value, setTrackedValue, { isDirty, reset }];
}

/**
 * Hook for auto-saving form data to localStorage.
 * Useful for preserving data on accidental page refresh.
 */
export function useFormDraft<T extends object>(
  key: string,
  initialValue: T
): {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  clearDraft: () => void;
  hasDraft: boolean;
} {
  const storageKey = `form-draft-${key}`;

  // Initialize state from localStorage if available
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore parse errors
    }
    return initialValue;
  });

  const [hasDraft, setHasDraft] = useState(false);

  // Check for existing draft on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      setHasDraft(!!saved);
    }
  }, [storageKey]);

  // Save to localStorage when value changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
        setHasDraft(true);
      } catch {
        // Ignore storage errors
      }
    }
  }, [value, storageKey]);

  const clearDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
    }
  }, [storageKey]);

  return { value, setValue, clearDraft, hasDraft };
}
