import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Play,
} from "lucide-react";
import type { MediaItem } from "../types/media";
import { API_ENDPOINTS } from "../config/api";

interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: MediaItem[];
  initialIndex: number;
}

export default function MediaViewer({
  isOpen,
  onClose,
  mediaItems,
  initialIndex,
}: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const currentMedia = mediaItems[currentIndex];
  const isVideo = currentMedia?.type === "video";

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex]);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [currentIndex]);

  const handlePrev = () =>
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));

  const handleNext = () =>
    setCurrentIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `${API_ENDPOINTS.UPLOAD_MEDIA}/${currentMedia.url}`;
    link.download = currentMedia.filename;
    link.click();
  };

  if (!isOpen || !currentMedia) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="text-white text-sm">
            <div>{currentMedia.filename}</div>
            <div className="text-xs opacity-70">
              {currentIndex + 1} / {mediaItems.length}
            </div>
          </div>
          <div className="flex gap-2">
            {!isVideo && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomOut();
                  }}
                  className="p-2 hover:bg-white/10 rounded"
                >
                  <ZoomOut size={18} className="text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomIn();
                  }}
                  className="p-2 hover:bg-white/10 rounded"
                >
                  <ZoomIn size={18} className="text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRotate();
                  }}
                  className="p-2 hover:bg-white/10 rounded"
                >
                  <RotateCw size={18} className="text-white" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="p-2 hover:bg-white/10 rounded"
            >
              <Download size={18} className="text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 hover:bg-white/10 rounded"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Nút điều hướng */}
        {mediaItems.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-3"
            >
              <ChevronLeft size={24} className="text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-full p-3"
            >
              <ChevronRight size={24} className="text-white" />
            </button>
          </>
        )}

        {/* Nội dung media */}
        <div
          className="max-w-6xl max-h-[85vh] relative"
          onClick={(e) => e.stopPropagation()}
        >
          {isVideo ? (
            <video
              src={`http://localhost:3000/v1/upload/media/stream/${currentMedia.url}`}
              controls
              className="max-w-full max-h-[85vh] rounded-lg"
            />
          ) : (
            <img
              src={`http://localhost:3000/v1/upload/media/${currentMedia.url}`}
              alt={currentMedia.filename}
              className="max-w-full max-h-[85vh] object-contain select-none rounded-lg"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: "transform 0.2s ease-out",
              }}
            />
          )}
        </div>

        {/* Thumbnail */}
        {mediaItems.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 overflow-x-auto">
            {mediaItems.map((m, i) => (
              <button
                key={m.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(i);
                }}
                className={`w-16 h-16 rounded overflow-hidden border-2 ${
                  i === currentIndex
                    ? "border-white scale-105"
                    : "border-transparent opacity-60 hover:opacity-100"
                } transition`}
              >
                {m.type === "video" ? (
                  <div className="relative">
                    <video
                      src={`http://localhost:3000/v1/upload/media/${m.url}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play size={14} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={`http://localhost:3000/v1/upload/media/${m.url}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
