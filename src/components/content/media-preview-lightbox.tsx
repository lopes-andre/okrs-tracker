"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Download, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getMediaSignedUrl } from "@/features/content/api";
import type { ContentPostMedia } from "@/lib/supabase/types";

// ============================================================================
// TYPES
// ============================================================================

interface MediaPreviewLightboxProps {
  media: ContentPostMedia[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: (mediaId: string) => Promise<void>;
  isDeleting?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isVideoLink(item: ContentPostMedia): boolean {
  return item.media_type === "video_link" || item.is_external;
}

function isImage(item: ContentPostMedia): boolean {
  return item.media_type === "image" || item.file_type === "image" || item.file_type?.startsWith("image/");
}

function isPdf(item: ContentPostMedia): boolean {
  return item.media_type === "pdf" || item.file_type === "pdf" || item.mime_type === "application/pdf";
}

function getVideoEmbedUrl(url: string): string | null {
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MediaPreviewLightbox({
  media,
  initialIndex,
  onClose,
  onDelete,
  isDeleting = false,
}: MediaPreviewLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const currentMedia = media[currentIndex];
  const hasMultiple = media.length > 1;

  // Load signed URL for images
  useEffect(() => {
    if (!currentMedia) return;

    // For external video links, no need to fetch signed URL
    if (isVideoLink(currentMedia)) {
      setImageUrl(currentMedia.file_url);
      setIsLoading(false);
      return;
    }

    // For PDFs, get signed URL
    if (isPdf(currentMedia)) {
      setIsLoading(true);
      getMediaSignedUrl(currentMedia.file_url)
        .then(setImageUrl)
        .catch(() => setImageUrl(null))
        .finally(() => setIsLoading(false));
      return;
    }

    // For images, get signed URL
    if (isImage(currentMedia)) {
      setIsLoading(true);
      getMediaSignedUrl(currentMedia.file_url)
        .then(setImageUrl)
        .catch(() => setImageUrl(null))
        .finally(() => setIsLoading(false));
      return;
    }

    setIsLoading(false);
  }, [currentMedia]);

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  }, [media.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  }, [media.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasMultiple) {
        goToPrevious();
      } else if (e.key === "ArrowRight" && hasMultiple) {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goToPrevious, goToNext, hasMultiple]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!onDelete || !currentMedia) return;

    await onDelete(currentMedia.id);
    setShowDeleteDialog(false);

    // If we deleted the last item, close the lightbox
    if (media.length === 1) {
      onClose();
    } else if (currentIndex >= media.length - 1) {
      setCurrentIndex(media.length - 2);
    }
  }, [onDelete, currentMedia, media.length, currentIndex, onClose]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!imageUrl || isVideoLink(currentMedia)) return;

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = currentMedia.file_name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageUrl, currentMedia]);

  // Handle open external link
  const handleOpenExternal = useCallback(() => {
    if (isVideoLink(currentMedia)) {
      window.open(currentMedia.file_url, "_blank");
    } else if (isPdf(currentMedia) && imageUrl) {
      window.open(imageUrl, "_blank");
    }
  }, [currentMedia, imageUrl]);

  if (!currentMedia) return null;

  const embedUrl = isVideoLink(currentMedia) ? getVideoEmbedUrl(currentMedia.file_url) : null;

  return (
    <>
      {/* Lightbox Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/90 flex flex-col"
        onClick={onClose}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-1">
            <p className="text-sm font-medium truncate max-w-md">
              {currentMedia.file_name}
            </p>
            {hasMultiple && (
              <p className="text-xs text-white/60">
                {currentIndex + 1} of {media.length}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Download button (for non-external media) */}
            {!isVideoLink(currentMedia) && imageUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleDownload}
              >
                <Download className="w-5 h-5" />
              </Button>
            )}

            {/* Open external (for video links and PDFs) */}
            {(isVideoLink(currentMedia) || isPdf(currentMedia)) && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleOpenExternal}
              >
                <ExternalLink className="w-5 h-5" />
              </Button>
            )}

            {/* Delete button */}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 hover:text-red-400"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </Button>
            )}

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main content area */}
        <div
          className="flex-1 flex items-center justify-center p-4 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Navigation arrows */}
          {hasMultiple && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 text-white hover:bg-white/20 z-10"
                onClick={goToPrevious}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 text-white hover:bg-white/20 z-10"
                onClick={goToNext}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </>
          )}

          {/* Content */}
          <div className="max-w-full max-h-full flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="w-12 h-12 animate-spin text-white" />
            ) : isVideoLink(currentMedia) ? (
              embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="w-full max-w-4xl aspect-video rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="text-center text-white">
                  <p className="mb-4">External video link</p>
                  <Button
                    variant="outline"
                    className="border-white text-white hover:bg-white/20"
                    onClick={handleOpenExternal}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in new tab
                  </Button>
                </div>
              )
            ) : isPdf(currentMedia) ? (
              <div className="text-center text-white">
                <p className="mb-4">PDF Document: {currentMedia.file_name}</p>
                <Button
                  variant="outline"
                  className="border-white text-white hover:bg-white/20"
                  onClick={handleOpenExternal}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open PDF
                </Button>
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={currentMedia.alt_text || currentMedia.file_name}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            ) : (
              <div className="text-center text-white">
                <p>Unable to load preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail strip for multiple media */}
        {hasMultiple && (
          <div
            className="p-4 overflow-x-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2 justify-center">
              {media.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "w-16 h-16 rounded-md overflow-hidden border-2 transition-all shrink-0",
                    index === currentIndex
                      ? "border-white"
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <ThumbnailImage item={item} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{currentMedia.file_name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-status-danger hover:bg-status-danger/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// THUMBNAIL IMAGE COMPONENT
// ============================================================================

function ThumbnailImage({ item }: { item: ContentPostMedia }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isVideoLink(item)) {
      // Use thumbnail if available, otherwise show video icon
      if (item.thumbnail_url) {
        getMediaSignedUrl(item.thumbnail_url)
          .then(setUrl)
          .catch(() => setUrl(null));
      }
      return;
    }

    if (isImage(item)) {
      getMediaSignedUrl(item.file_url)
        .then(setUrl)
        .catch(() => setUrl(null));
    }
  }, [item]);

  if (isVideoLink(item) && !url) {
    return (
      <div className="w-full h-full bg-bg-1 flex items-center justify-center">
        <span className="text-xs text-white/60">Video</span>
      </div>
    );
  }

  if (isPdf(item)) {
    return (
      <div className="w-full h-full bg-bg-1 flex items-center justify-center">
        <span className="text-xs text-white/60">PDF</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="w-full h-full bg-bg-1 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={item.file_name}
      className="w-full h-full object-cover"
      loading="lazy"
    />
  );
}
