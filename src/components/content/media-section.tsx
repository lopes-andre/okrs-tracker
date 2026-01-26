"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  Image as ImageIcon,
  Video,
  FileText,
  Loader2,
  Link2,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useUploadMedia, useDeleteMedia, useAddVideoLink } from "@/features/content/hooks";
import { getMediaSignedUrl } from "@/features/content/api";
import { MediaPreviewLightbox } from "./media-preview-lightbox";
import type { ContentPostMedia } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface MediaSectionProps {
  postId: string;
  planId: string;
  media: ContentPostMedia[];
  onMediaChange?: () => void;
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

function getMediaIcon(item: ContentPostMedia) {
  if (item.media_type === "video_link" || item.is_external) {
    return Video;
  }
  if (item.media_type === "image" || item.file_type === "image" || item.file_type?.startsWith("image/")) {
    return ImageIcon;
  }
  if (item.media_type === "pdf" || item.file_type === "pdf" || item.mime_type === "application/pdf") {
    return FileText;
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
    return `File type not supported. Supported: jpg, png, webp, gif, pdf`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large (max 10MB)`;
  }
  return null;
}

function isImage(item: ContentPostMedia): boolean {
  return item.media_type === "image" || item.file_type === "image" || item.file_type?.startsWith("image/");
}

function isVideoLink(item: ContentPostMedia): boolean {
  return item.media_type === "video_link" || item.is_external;
}

function getVideoPlatform(url: string): string {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  if (url.includes("vimeo.com")) return "Vimeo";
  if (url.includes("sharepoint.com")) return "SharePoint";
  if (url.includes("loom.com")) return "Loom";
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Video";
  }
}

// ============================================================================
// MEDIA THUMBNAIL COMPONENT
// ============================================================================

function MediaThumbnail({
  item,
  onClick,
  onDelete,
  isDeleting,
}: {
  item: ContentPostMedia;
  onClick: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const Icon = getMediaIcon(item);
  const showImage = isImage(item) || (isVideoLink(item) && item.thumbnail_url);

  useEffect(() => {
    if (!showImage) {
      setIsLoading(false);
      return;
    }

    const urlToFetch = isVideoLink(item) && item.thumbnail_url
      ? item.thumbnail_url
      : item.file_url;

    getMediaSignedUrl(urlToFetch)
      .then(setImageUrl)
      .catch(() => setImageUrl(null))
      .finally(() => setIsLoading(false));
  }, [item, showImage]);

  return (
    <div className="relative group rounded-lg border border-border-soft overflow-hidden bg-bg-1">
      {/* Thumbnail area */}
      <div
        className="w-full h-24 cursor-pointer flex items-center justify-center"
        onClick={onClick}
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        ) : showImage && imageUrl ? (
          <img
            src={imageUrl}
            alt={item.file_name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Icon className="w-8 h-8 text-text-muted" />
            {isVideoLink(item) && (
              <span className="text-[10px] text-text-muted">
                {getVideoPlatform(item.file_url)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover overlay with actions */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={onClick}
          aria-label="Preview media"
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/20 hover:text-red-400"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
          aria-label="Delete media"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Video link badge */}
      {isVideoLink(item) && (
        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white font-medium">
          Link
        </div>
      )}

      {/* File info */}
      <div className="p-2 border-t border-border-soft">
        <p className="text-xs text-text-muted truncate" title={item.file_name}>
          {item.file_name}
        </p>
        {item.file_size && !isVideoLink(item) && (
          <p className="text-[10px] text-text-muted">
            {formatFileSize(item.file_size)}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// VIDEO LINK FORM COMPONENT
// ============================================================================

function VideoLinkForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  onSubmit: (url: string, title: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim(), title.trim() || getVideoPlatform(url.trim()));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-border rounded-lg bg-bg-1">
      <div className="space-y-1.5">
        <Label htmlFor="video-url" className="text-small">Video URL</Label>
        <Input
          id="video-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          required
          autoFocus
        />
        <p className="text-xs text-text-muted">
          YouTube, Vimeo, SharePoint, Loom, or any video URL
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="video-title" className="text-small">Title (optional)</Label>
        <Input
          id="video-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Video title"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="flex-1"
          disabled={!url.trim() || isSubmitting}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Add Video
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MediaSection({
  postId,
  planId,
  media,
  onMediaChange,
}: MediaSectionProps) {
  const uploadMedia = useUploadMedia(planId);
  const deleteMedia = useDeleteMedia(planId);
  const addVideoLink = useAddVideoLink(planId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [deleteDialogItem, setDeleteDialogItem] = useState<ContentPostMedia | null>(null);

  // Sort media by display_order
  const sortedMedia = [...media].sort((a, b) => a.display_order - b.display_order);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const newErrors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const error = validateFile(file);

        if (error) {
          newErrors.push(`${file.name}: ${error}`);
          continue;
        }

        try {
          await uploadMedia.mutateAsync({ postId, file });
          onMediaChange?.();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          newErrors.push(`${file.name}: ${message}`);
        }
      }

      setErrors(newErrors);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
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

  // Handle video link submission
  const handleAddVideoLink = useCallback(
    async (url: string, title: string) => {
      try {
        await addVideoLink.mutateAsync({
          postId,
          url,
          title,
        });
        setShowVideoForm(false);
        onMediaChange?.();
      } catch {
        // Error handled by hook
      }
    },
    [postId, addVideoLink, onMediaChange]
  );

  // Handle delete
  const handleDelete = useCallback(
    async (mediaId: string) => {
      await deleteMedia.mutateAsync(mediaId);
      setDeleteDialogItem(null);
      onMediaChange?.();
    },
    [deleteMedia, onMediaChange]
  );

  // Handle delete from lightbox
  const handleDeleteFromLightbox = useCallback(
    async (mediaId: string) => {
      await deleteMedia.mutateAsync(mediaId);
      onMediaChange?.();
    },
    [deleteMedia, onMediaChange]
  );

  return (
    <div className="space-y-4">
      {/* Upload area and actions */}
      <div className="flex gap-3">
        {/* Drag & drop zone */}
        <div
          className={cn(
            "flex-1 border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
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
            accept={ALLOWED_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          {uploadMedia.isPending ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
              <span className="text-small text-text-muted">Uploading...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Upload className="w-5 h-5 text-text-muted" />
              <span className="text-small text-text-muted">
                Drop files or click to upload
              </span>
            </div>
          )}
        </div>

        {/* Add video link button */}
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => setShowVideoForm(true)}
          disabled={showVideoForm}
        >
          <Link2 className="w-4 h-4 mr-2" />
          Add Video Link
        </Button>
      </div>

      {/* Video link form */}
      {showVideoForm && (
        <VideoLinkForm
          onSubmit={handleAddVideoLink}
          onCancel={() => setShowVideoForm(false)}
          isSubmitting={addVideoLink.isPending}
        />
      )}

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="space-y-1 p-3 bg-status-danger/10 border border-status-danger/20 rounded-lg">
          {errors.map((error, index) => (
            <p key={index} className="text-small text-status-danger">
              {error}
            </p>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-status-danger hover:text-status-danger"
            onClick={() => setErrors([])}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Media grid */}
      {sortedMedia.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedMedia.map((item, index) => (
            <MediaThumbnail
              key={item.id}
              item={item}
              onClick={() => setPreviewIndex(index)}
              onDelete={() => setDeleteDialogItem(item)}
              isDeleting={deleteMedia.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-text-muted">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-small">No media attached</p>
          <p className="text-xs">Upload images, PDFs, or add video links</p>
        </div>
      )}

      {/* Preview lightbox */}
      {previewIndex !== null && (
        <MediaPreviewLightbox
          media={sortedMedia}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onDelete={handleDeleteFromLightbox}
          isDeleting={deleteMedia.isPending}
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteDialogItem}
        onOpenChange={(open) => !open && setDeleteDialogItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDialogItem?.file_name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMedia.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialogItem && handleDelete(deleteDialogItem.id)}
              disabled={deleteMedia.isPending}
              className="bg-status-danger hover:bg-status-danger/90"
            >
              {deleteMedia.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
