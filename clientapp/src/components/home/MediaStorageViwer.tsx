import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { MediaItemDTO } from "../../types/media";
import { API_ENDPOINTS } from "../../config/api";

interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: string;
  allMediaIds: string[];
  mediaItems: MediaItemDTO[];
}

export default function MediaStorageViewer({
  isOpen,
  onClose,
  mediaId,
  allMediaIds,
  mediaItems,
}: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find current media item
  const currentMedia = mediaItems.find(
    (item) => item.id === allMediaIds[currentIndex]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < allMediaIds.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, allMediaIds.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);
  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();

      setIsPlaying((prev) => !prev);
    }
  }, [isPlaying]);

  // Initialize current index from mediaId
  useEffect(() => {
    const index = allMediaIds.findIndex((id) => id === mediaId);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  }, [mediaId, allMediaIds]);

  // Reset zoom and rotation when media changes
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
        case " ":
          if (currentMedia?.type === "video") {
            e.preventDefault();
            togglePlayPause();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    currentIndex,
    currentMedia,
    handlePrevious,
    handleNext,
    onClose,
    togglePlayPause,
  ]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("ended", handleEnded);
    };
  }, [currentMedia]);

  if (!isOpen || !currentMedia) return null;

  const getMediaUrl = (mediaId: string) => {
    return `${API_ENDPOINTS.STREAM_MEDIA}/${mediaId}`;
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

  const handleDownload = async () => {
    try {
      const url = getMediaUrl(currentMedia.id);
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = currentMedia.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition text-white"
          >
            <X size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">
              {currentMedia.filename}
            </h3>
            <p className="text-gray-400 text-xs">
              {formatFileSize(currentMedia.size)} • {currentIndex + 1} /{" "}
              {allMediaIds.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentMedia.type === "image" && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-white/10 rounded-lg transition text-white"
                title="Zoom out"
              >
                <ZoomOut size={20} />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-white/10 rounded-lg transition text-white"
                title="Zoom in"
              >
                <ZoomIn size={20} />
              </button>
              <button
                onClick={handleRotate}
                className="p-2 hover:bg-white/10 rounded-lg transition text-white"
                title="Rotate"
              >
                <RotateCw size={20} />
              </button>
            </>
          )}
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 rounded-lg transition text-white"
            title="Download"
          >
            <Download size={20} />
          </button>
          {/* <button
            className="p-2 hover:bg-white/10 rounded-lg transition text-white"
            title="Share"
          >
            <Share2 size={20} />
          </button> */}
        </div>
      </div>

      {/* Main Content */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center relative overflow-hidden"
      >
        {/* Navigation Buttons */}
        {allMediaIds.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className={`absolute left-4 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-full transition text-white ${
                currentIndex === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === allMediaIds.length - 1}
              className={`absolute right-4 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-full transition text-white ${
                currentIndex === allMediaIds.length - 1
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Media Display */}
        <div className="w-full h-full flex items-center justify-center p-4">
          {currentMedia.type === "image" && (
            <img
              src={getMediaUrl(currentMedia.id)}
              alt={currentMedia.filename}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            />
          )}

          {currentMedia.type === "video" && (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={getMediaUrl(currentMedia.id)}
                className="max-w-full max-h-full"
                onClick={togglePlayPause}
              />

              {/* Video Controls Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {!isPlaying && (
                  <button
                    onClick={togglePlayPause}
                    className="p-4 bg-black/50 rounded-full hover:bg-black/70 transition pointer-events-auto"
                  >
                    <Play size={48} className="text-white" fill="white" />
                  </button>
                )}
              </div>

              {/* Video Controls Bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                {/* Progress Bar */}
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer mb-3"
                  style={{
                    background: `linear-gradient(to right, #4f6eda 0%, #4f6eda ${
                      (currentTime / duration) * 100
                    }%, #4b5563 ${
                      (currentTime / duration) * 100
                    }%, #4b5563 100%)`,
                  }}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Play/Pause */}
                    <button
                      onClick={togglePlayPause}
                      className="p-2 hover:bg-white/10 rounded-lg transition text-white"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>

                    {/* Volume */}
                    <div className="flex items-center gap-2 group">
                      <button
                        onClick={toggleMute}
                        className="p-2 hover:bg-white/10 rounded-lg transition text-white"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX size={20} />
                        ) : (
                          <Volume2 size={20} />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>

                    {/* Time */}
                    <span className="text-white text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 hover:bg-white/10 rounded-lg transition text-white"
                  >
                    <Maximize2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentMedia.type === "file" && (
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-orange-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {currentMedia.filename}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(currentMedia.size)}
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-6 py-3 bg-[#4f6eda] text-white rounded-lg hover:bg-[#3f5ed0] transition font-medium"
                >
                  <Download size={20} />
                  Tải xuống
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Navigation (Optional) */}
      {allMediaIds.length > 1 && (
        <div className="bg-black/50 backdrop-blur-sm px-4 py-3 overflow-x-auto">
          <div className="flex gap-2 justify-center">
            {allMediaIds.slice(0, 10).map((id, idx) => {
              const item = mediaItems.find((m) => m.id === id);
              if (!item) return null;

              return (
                <button
                  key={id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${
                    idx === currentIndex
                      ? "border-[#4f6eda]"
                      : "border-transparent hover:border-white/50"
                  }`}
                >
                  {item.type === "image" && (
                    <img
                      src={getMediaUrl(item.id)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  {item.type === "video" && (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <Play size={16} className="text-white" />
                    </div>
                  )}
                  {item.type === "file" && (
                    <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-orange-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
            {allMediaIds.length > 10 && (
              <div className="flex items-center justify-center px-3 text-white text-sm">
                +{allMediaIds.length - 10}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
