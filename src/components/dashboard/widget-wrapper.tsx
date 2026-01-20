"use client";

import { useState } from "react";
import { Maximize2, MoreVertical, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WidgetFullscreen } from "./widget-fullscreen";
import { getWidgetDefinition } from "./widget-registry";
import { cn } from "@/lib/utils";
import type { DashboardWidget } from "@/lib/supabase/types";

interface WidgetWrapperProps {
  widget: DashboardWidget;
  isEditing: boolean;
  onRemove: () => void;
  children: React.ReactNode;
  /** Content to render when in fullscreen mode (optional, defaults to children) */
  fullscreenContent?: React.ReactNode;
}

export function WidgetWrapper({
  widget,
  isEditing,
  onRemove,
  children,
  fullscreenContent,
}: WidgetWrapperProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const definition = getWidgetDefinition(widget.widget_type);
  const supportsFullscreen = definition?.supportsFullscreen ?? false;
  const title = widget.title || definition?.name || "Widget";
  const Icon = definition?.icon;

  return (
    <>
      <Card className={cn(
        "h-full flex flex-col transition-all",
        isEditing && "ring-2 ring-accent/20 ring-offset-2"
      )}>
        <CardHeader className="flex-shrink-0 flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-text-muted" />}
            {title}
          </CardTitle>
          <div className="flex items-center gap-1">
            {supportsFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="w-4 h-4" />
                <span className="sr-only">Expand</span>
              </Button>
            )}
            {isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="w-4 h-4" />
                    <span className="sr-only">Widget options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={onRemove}
                    className="text-status-danger focus:text-status-danger"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          {children}
        </CardContent>
      </Card>

      {supportsFullscreen && (
        <WidgetFullscreen
          open={isFullscreen}
          onOpenChange={setIsFullscreen}
          title={title}
        >
          {fullscreenContent || children}
        </WidgetFullscreen>
      )}
    </>
  );
}
