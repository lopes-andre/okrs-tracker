"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, Image, Video, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface PendingMediaUploadProps {
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getMediaIcon(fileType: string) {
  if (fileType.startsWith("image/")) {
    return Image;
  } else if (fileType.startsWith("video/")) {
    return Video;
  }
  return FileText;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `File type not supported: ${file.type}. Supported: jpg, png, webp, gif, pdf`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large: ${formatFileSize(file.size)}. Max: 10MB`;
  }
  return null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PendingMediaUpload({
  files,
  onAddFiles,
  onRemoveFile,
}: PendingMediaUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Handle file selection
  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return;

      const validFiles: File[] = [];
      const newErrors: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const error = validateFile(file);
        if (error) {
          newErrors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      }

      setErrors(newErrors);
      if (validFiles.length > 0) {
        onAddFiles(validFiles);
      }

      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onAddFiles]
  );

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  // Create preview URL for image files
  const getPreviewUrl = useCallback((file: File): string | null => {
    if (file.type.startsWith("image/")) {
      return URL.createObjectURL(file);
    }
    return null;
  }, []);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-accent bg-accent/5"
            : "border-border-soft hover:border-border"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        <div className="flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-text-muted" />
          <p className="text-small text-text-muted">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-text-muted">
            Supported: jpg, png, webp, gif, pdf
          </p>
        </div>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-small text-status-danger"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* File Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((file, index) => {
            const Icon = getMediaIcon(file.type);
            const isImage = file.type.startsWith("image/");
            const previewUrl = getPreviewUrl(file);

            return (
              <div
                key={`${file.name}-${index}`}
                className="relative group rounded-lg border border-border-soft overflow-hidden bg-bg-1"
              >
                {isImage && previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-full h-24 object-cover"
                    onLoad={() => URL.revokeObjectURL(previewUrl)}
                  />
                ) : (
                  <div className="w-full h-24 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-text-muted" />
                  </div>
                )}

                {/* Overlay with delete button */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(index);
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* File info */}
                <div className="p-2 border-t border-border-soft">
                  <p className="text-xs text-text-muted truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {files.length === 0 && (
        <p className="text-center text-small text-text-muted py-2">
          No files selected
        </p>
      )}
    </div>
  );
}
