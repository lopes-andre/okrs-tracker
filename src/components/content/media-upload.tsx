"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Video, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUploadMedia, useDeleteMedia } from "@/features/content/hooks";
import { getMediaSignedUrl } from "@/features/content/api";
import type { ContentPostMedia } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface MediaUploadProps {
  postId: string;
  planId: string;
  media: ContentPostMedia[];
  onMediaChange?: () => void;
}

interface MediaThumbnailProps {
  fileUrl: string;
  alt: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getMediaIcon(fileType: string) {
  // file_type is stored as category: "image", "pdf", or "other"
  // Also support MIME type format for backwards compatibility
  if (fileType === "image" || fileType.startsWith("image/")) {
    return Image;
  } else if (fileType === "video" || fileType.startsWith("video/")) {
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

// ============================================================================
// MEDIA THUMBNAIL COMPONENT
// ============================================================================

function MediaThumbnail({ fileUrl, alt }: MediaThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchUrl() {
      try {
        const url = await getMediaSignedUrl(fileUrl);
        if (!cancelled) {
          setImageUrl(url);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchUrl();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  if (isLoading) {
    return (
      <div className="w-full h-24 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="w-full h-24 flex items-center justify-center">
        <ImageIcon className="w-8 h-8 text-text-muted" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className="w-full h-24 object-cover"
    />
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MediaUpload({
  postId,
  planId,
  media,
  onMediaChange,
}: MediaUploadProps) {
  const uploadMedia = useUploadMedia(planId);
  const deleteMedia = useDeleteMedia(planId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          continue;
        }

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
          continue;
        }

        try {
          await uploadMedia.mutateAsync({ postId, file });
          onMediaChange?.();
        } catch {
          // Error handled by hook
        }
      }
    },
    [postId, uploadMedia, onMediaChange]
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

  // Handle delete
  const handleDelete = useCallback(
    async (item: ContentPostMedia) => {
      await deleteMedia.mutateAsync(item.id);
      onMediaChange?.();
    },
    [deleteMedia, onMediaChange]
  );

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          isDragging
            ? "border-accent bg-accent/5"
            : "border-border-soft hover:border-border",
          uploadMedia.isPending && "opacity-50 pointer-events-none"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {uploadMedia.isPending ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
            <p className="text-small text-text-muted">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 cursor-pointer">
            <Upload className="w-8 h-8 text-text-muted" />
            <p className="text-small text-text-muted">
              Drag and drop images or videos here, or click to browse
            </p>
            <p className="text-xs text-text-muted">
              Max file size: 50MB
            </p>
          </div>
        )}
      </div>

      {/* Media Grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {media.map((item) => {
            const Icon = getMediaIcon(item.file_type);
            const isImage = item.file_type === "image" || item.file_type.startsWith("image/");

            return (
              <div
                key={item.id}
                className="relative group rounded-lg border border-border-soft overflow-hidden bg-bg-1"
              >
                {isImage ? (
                  <MediaThumbnail fileUrl={item.file_url} alt={item.file_name} />
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
                    onClick={() => handleDelete(item)}
                    disabled={deleteMedia.isPending}
                    className="text-white hover:bg-white/20"
                  >
                    {deleteMedia.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* File info */}
                <div className="p-2 border-t border-border-soft">
                  <p className="text-xs text-text-muted truncate" title={item.file_name}>
                    {item.file_size ? formatFileSize(item.file_size) : item.file_name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {media.length === 0 && (
        <p className="text-center text-small text-text-muted py-4">
          No media attached to this post
        </p>
      )}
    </div>
  );
}
