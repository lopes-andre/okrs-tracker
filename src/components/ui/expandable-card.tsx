"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WidgetFullscreen } from "@/components/dashboard/widget-fullscreen";
import { cn } from "@/lib/utils";

interface ExpandableCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Content to render when in fullscreen mode (optional, defaults to children) */
  fullscreenContent?: React.ReactNode;
  /** Additional actions to render in the header row (selects, buttons, etc.) */
  headerActions?: React.ReactNode;
  /** Extra content to render below the header row (e.g., filter pills) */
  headerExtra?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function ExpandableCard({
  title,
  icon,
  children,
  fullscreenContent,
  headerActions,
  headerExtra,
  className,
  contentClassName,
}: ExpandableCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <Card className={cn("h-full flex flex-col", className)}>
        <CardHeader className="flex-shrink-0 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {headerActions}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="w-4 h-4" />
                <span className="sr-only">Expand</span>
              </Button>
            </div>
          </div>
          {headerExtra}
        </CardHeader>
        <CardContent className={cn("flex-1", contentClassName)}>
          {children}
        </CardContent>
      </Card>

      <WidgetFullscreen
        open={isFullscreen}
        onOpenChange={setIsFullscreen}
        title={title}
      >
        {fullscreenContent || children}
      </WidgetFullscreen>
    </>
  );
}
