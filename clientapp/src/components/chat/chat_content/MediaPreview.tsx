import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { API_ENDPOINTS } from "../../../config/api";

type Media = {
  id?: string;
  url: string;
  type: "image" | "video";
  filename?: string;
};

type Props = {
  mediaUrl: string | null;
  onClose: () => void;
  allMedia?: Media[];
};

export default function MediaPreview({
  mediaUrl,
  onClose,
  allMedia = [],
}: Props) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Tìm media hiện tại trong danh sách
  useEffect(() => {
    if (!mediaUrl || allMedia.length === 0) return;
    const index = allMedia.findIndex(
      (m) => mediaUrl.includes(m.url) || mediaUrl.includes(m.id || "")
    );
    setCurrentIndex(index >= 0 ? index : 0);
    setIsLoading(true);
    setZoom(1);
  }, [mediaUrl, allMedia]);

  const currentMedia = allMedia[currentIndex] || {
    url: mediaUrl,
    type: "image",
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") nextMedia();
      if (e.key === "ArrowLeft") prevMedia();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, allMedia.length]);

  const nextMedia = () => {
    if (allMedia.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % allMedia.length);
    setIsLoading(true);
    setZoom(1);
  };

  const prevMedia = () => {
    if (allMedia.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
    setIsLoading(true);
    setZoom(1);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  if (!mediaUrl) return null;

  const isVideo = currentMedia.type === "video";

  // Xử lý URL cho video stream và image
  const fileUrl = isVideo
    ? `${API_ENDPOINTS.STREAM_MEDIA}/${currentMedia.id || currentMedia.url}`
    : `${API_ENDPOINTS.UPLOAD_MEDIA}/${currentMedia.url}`;

  // URL download - dùng url thông thường
  const downloadUrl = `${API_ENDPOINTS.UPLOAD_MEDIA}/${currentMedia.url}`;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      >
        {/* Header controls */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 z-10">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Left side - Download */}
            <a
              href={downloadUrl}
              download={currentMedia.filename}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg px-4 py-2 flex items-center gap-2 transition"
            >
              <Download size={18} />
              <span className="hidden sm:inline text-sm">Tải xuống</span>
            </a>

            {/* Center - Media counter */}
            {allMedia.length > 1 && (
              <div className="bg-white/10 backdrop-blur-sm text-white rounded-lg px-4 py-2 text-sm">
                {currentIndex + 1} / {allMedia.length}
              </div>
            )}

            {/* Right side - Close & Zoom controls */}
            <div className="flex items-center gap-2">
              {!isVideo && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomOut();
                    }}
                    disabled={zoom <= 0.5}
                    className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm text-white rounded-lg w-9 h-9 flex items-center justify-center transition"
                  >
                    <ZoomOut size={18} />
                  </button>
                  <span className="text-white text-sm bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomIn();
                    }}
                    disabled={zoom >= 3}
                    className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm text-white rounded-lg w-9 h-9 flex items-center justify-center transition"
                  >
                    <ZoomIn size={18} />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="bg-red-500/80 hover:bg-red-600 backdrop-blur-sm text-white rounded-lg w-9 h-9 flex items-center justify-center transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        {allMedia.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevMedia();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full p-3 transition z-10"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextMedia();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full p-3 transition z-10"
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full"
            />
          </div>
        )}

        {/* Main content */}
        <motion.div
          key={currentMedia.url}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        >
          {isVideo ? (
            <video
              ref={videoRef}
              key={fileUrl}
              className="max-h-[85vh] max-w-[90vw] rounded-lg shadow-2xl"
              controls
              autoPlay
              preload="metadata"
              onLoadedData={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            >
              <source src={fileUrl} type="video/mp4" />
              Trình duyệt không hỗ trợ phát video.
            </video>
          ) : (
            <motion.img
              src={fileUrl}
              alt={currentMedia.filename || "Preview"}
              style={{ scale: zoom }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl cursor-zoom-in"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
              onClick={(e) => {
                e.stopPropagation();
                if (zoom < 3) handleZoomIn();
              }}
            />
          )}
        </motion.div>

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-white text-sm text-center truncate">
              {currentMedia.filename || currentMedia.url}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
