"use client";

import { useState } from "react";
import {
  Save,
  FolderOpen,
  Trash2,
  Star,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Predefined views
const PRESET_VIEWS: SavedView[] = [
  {
    id: "preset-overview",
    name: "Executive Overview",
    isPreset: true,
    config: {
      tab: "overview",
      quarter: "all",
    },
  },
  {
    id: "preset-performance",
    name: "KR Performance",
    isPreset: true,
    config: {
      tab: "performance",
      quarter: "all",
      tableGroupBy: "objective",
    },
  },
  {
    id: "preset-at-risk",
    name: "At Risk Focus",
    isPreset: true,
    config: {
      tab: "pace",
      quarter: "all",
    },
  },
  {
    id: "preset-activity",
    name: "Activity Patterns",
    isPreset: true,
    config: {
      tab: "heatmap",
      quarter: "all",
    },
  },
];

export interface ViewConfig {
  tab: string;
  quarter: string;
  tableGroupBy?: string;
  tableSortField?: string;
  tableSortDirection?: "asc" | "desc";
  chartTimeRange?: string;
  selectedKrIds?: string[];
}

export interface SavedView {
  id: string;
  name: string;
  isPreset?: boolean;
  config: ViewConfig;
}

interface SavedViewsProps {
  currentConfig: ViewConfig;
  onApplyView: (config: ViewConfig) => void;
  savedViews: SavedView[];
  onSaveView: (name: string, config: ViewConfig) => void;
  onDeleteView: (id: string) => void;
}

export function SavedViews({
  currentConfig,
  onApplyView,
  savedViews,
  onSaveView,
  onDeleteView,
}: SavedViewsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _allViews = [...PRESET_VIEWS, ...savedViews];

  const handleSaveView = () => {
    if (newViewName.trim()) {
      onSaveView(newViewName.trim(), currentConfig);
      setNewViewName("");
      setIsSaveDialogOpen(false);
    }
  };

  const handleApplyView = (view: SavedView) => {
    onApplyView(view.config);
    setIsOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Load View Popover */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              Views
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-small">Saved Views</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => {
                    setIsOpen(false);
                    setIsSaveDialogOpen(true);
                  }}
                >
                  <Plus className="w-3 h-3" />
                  Save Current
                </Button>
              </div>

              {/* Preset Views */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-text-subtle font-medium">
                  Presets
                </p>
                {PRESET_VIEWS.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => handleApplyView(view)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-button text-small hover:bg-bg-1 transition-colors text-left"
                  >
                    <Star className="w-3 h-3 text-status-warning" />
                    <span className="flex-1">{view.name}</span>
                  </button>
                ))}
              </div>

              {/* Custom Views */}
              {savedViews.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-border-soft">
                  <p className="text-[10px] uppercase tracking-wide text-text-subtle font-medium">
                    Your Views
                  </p>
                  {savedViews.map((view) => (
                    <div
                      key={view.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-button hover:bg-bg-1 transition-colors group"
                    >
                      <button
                        onClick={() => handleApplyView(view)}
                        className="flex-1 text-small text-left"
                      >
                        {view.name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteView(view.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-status-danger/10 rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-status-danger" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {savedViews.length === 0 && (
                <p className="text-xs text-text-muted text-center py-2">
                  No custom views saved yet
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick Save Button */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setIsSaveDialogOpen(true)}
        >
          <Save className="w-4 h-4" />
          Save View
        </Button>
      </div>

      {/* Save View Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
            <DialogDescription>
              Save your current filters and display settings as a custom view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-small font-medium">View Name</label>
              <Input
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="e.g., Q1 Performance Review"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveView();
                  }
                }}
              />
            </div>
            
            {/* Current Config Preview */}
            <div className="p-3 rounded-card bg-bg-1 border border-border-soft text-small">
              <p className="text-text-muted mb-2">This view will save:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-[10px]">
                  Tab: {currentConfig.tab}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Quarter: {currentConfig.quarter}
                </Badge>
                {currentConfig.tableGroupBy && (
                  <Badge variant="outline" className="text-[10px]">
                    Group: {currentConfig.tableGroupBy}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveView}
              disabled={!newViewName.trim()}
              className="bg-accent hover:bg-accent-hover text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hook to manage saved views in localStorage
export function useSavedViews(planId: string) {
  const storageKey = `analytics-views-${planId}`;

  const getSavedViews = (): SavedView[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const [savedViews, setSavedViews] = useState<SavedView[]>(getSavedViews);

  const saveView = (name: string, config: ViewConfig) => {
    const newView: SavedView = {
      id: `custom-${Date.now()}`,
      name,
      config,
    };
    const updated = [...savedViews, newView];
    setSavedViews(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const deleteView = (id: string) => {
    const updated = savedViews.filter((v) => v.id !== id);
    setSavedViews(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  return {
    savedViews,
    saveView,
    deleteView,
  };
}
