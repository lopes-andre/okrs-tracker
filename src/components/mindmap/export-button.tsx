"use client";

import { useState, useCallback } from "react";
import { Download, Image, FileCode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { toPng, toSvg } from "html-to-image";

interface ExportButtonProps {
  getFlowElement: () => HTMLElement | null;
  fileName?: string;
}

export function ExportButton({ getFlowElement, fileName = "mindmap" }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const downloadImage = useCallback(
    async (dataUrl: string, extension: string) => {
      const link = document.createElement("a");
      link.download = `${fileName}-${new Date().toISOString().split("T")[0]}.${extension}`;
      link.href = dataUrl;
      link.click();
    },
    [fileName]
  );

  const handleExportPng = useCallback(async () => {
    const element = getFlowElement();
    if (!element) {
      toast({
        title: "Export failed",
        description: "Could not find mindmap element",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "var(--color-bg-0)",
        quality: 1,
        pixelRatio: 2, // Higher resolution
        filter: (node) => {
          // Exclude controls, minimap, and panels from export
          const exclude = ["react-flow__controls", "react-flow__minimap", "react-flow__panel"];
          return !exclude.some((className) => node.classList?.contains(className));
        },
      });
      await downloadImage(dataUrl, "png");
      toast({
        title: "Export successful",
        description: "PNG image downloaded",
      });
    } catch (error) {
      console.error("PNG export error:", error);
      toast({
        title: "Export failed",
        description: "Could not generate PNG image",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [getFlowElement, downloadImage, toast]);

  const handleExportSvg = useCallback(async () => {
    const element = getFlowElement();
    if (!element) {
      toast({
        title: "Export failed",
        description: "Could not find mindmap element",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const dataUrl = await toSvg(element, {
        backgroundColor: "var(--color-bg-0)",
        filter: (node) => {
          // Exclude controls, minimap, and panels from export
          const exclude = ["react-flow__controls", "react-flow__minimap", "react-flow__panel"];
          return !exclude.some((className) => node.classList?.contains(className));
        },
      });
      await downloadImage(dataUrl, "svg");
      toast({
        title: "Export successful",
        description: "SVG image downloaded",
      });
    } catch (error) {
      console.error("SVG export error:", error);
      toast({
        title: "Export failed",
        description: "Could not generate SVG image",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [getFlowElement, downloadImage, toast]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPng} className="gap-2 cursor-pointer">
          <Image className="w-4 h-4" />
          Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportSvg} className="gap-2 cursor-pointer">
          <FileCode className="w-4 h-4" />
          Export as SVG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
