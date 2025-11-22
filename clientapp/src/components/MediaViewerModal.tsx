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

interface MediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: MediaItem[];
  initialIndex: number;
}

export default function MediaViewerModal({
  isOpen,
  onClose,
  mediaItems,
  initialIndex,
}: MediaViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentMedia = mediaItems[currentIndex];
  const isVideo = currentMedia?.type === "video";

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex); // Cập nhật currentIndex mỗi lần modal mở
    }
  }, [isOpen, initialIndex]);

  // Reset zoom và rotation khi đổi ảnh
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setIsPlaying(false);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Header Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="text-white">
              <p className="font-medium">{currentMedia.filename}</p>
              <p className="text-sm text-gray-300">
                {currentIndex + 1} / {mediaItems.length} •{" "}
                {currentMedia.timestamp}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isVideo && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomOut();
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition"
                    title="Zoom out"
                  >
                    <ZoomOut size={20} className="text-white" />
                  </button>
                  <span className="text-white text-sm w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomIn();
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition"
                    title="Zoom in"
                  >
                    <ZoomIn size={20} className="text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRotate();
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition"
                    title="Rotate"
                  >
                    <RotateCw size={20} className="text-white" />
                  </button>
                </>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition"
                title="Download"
              >
                <Download size={20} className="text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition"
                title="Close (ESC)"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        {mediaItems.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition z-10"
              title="Previous (←)"
            >
              <ChevronLeft size={24} className="text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition z-10"
              title="Next (→)"
            >
              <ChevronRight size={24} className="text-white" />
            </button>
          </>
        )}

        {/* Media Content */}
        <div
          className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            {isVideo ? (
              <div className="relative">
                <video
                  src={`${API_ENDPOINTS.STREAM_MEDIA}/${currentMedia.id}`}
                  controls
                  autoPlay={isPlaying}
                  className="max-w-full max-h-[85vh] rounded-lg"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            ) : (
              <img
                src={`http://localhost:3000/v1/upload/media/${currentMedia.url}`}
                alt={currentMedia.filename}
                className="max-w-full max-h-[85vh] object-contain rounded-lg select-none"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-out",
                }}
                draggable={false}
              />
            )}
          </motion.div>
        </div>

        {/* Thumbnail Strip */}
        {mediaItems.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {mediaItems.map((media, index) => (
                <button
                  key={media.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                    index === currentIndex
                      ? "border-white scale-110"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  {media.type === "video" ? (
                    <>
                      <video
                        src={`http://localhost:3000/v1/upload/media/${media.url}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play size={16} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <img
                      src={`http://localhost:3000/v1/upload/media/${media.url}`}
                      alt={media.filename}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
