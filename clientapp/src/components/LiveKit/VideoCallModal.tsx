import { X, Minimize2, Maximize2 } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { VideoCall } from "./VideoCall";

interface VideoCallModalProps {
    isOpen: boolean;
    onClose: () => void;
    token: string | null;
    serverUrl: string | null;
    error?: string | null;
    loading?: boolean;
}

export const VideoCallModal = ({
    isOpen,
    onClose,
    token,
    serverUrl,
    error,
    loading,
}: VideoCallModalProps) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const dragRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!isOpen) {
            setIsMinimized(false);
        }
    }, [isOpen]);

    // Reset position when minimizing
    useEffect(() => {
        if (isMinimized) {
            setPosition({ x: window.innerWidth - 340, y: window.innerHeight - 220 });
        }
    }, [isMinimized]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only drag from the header area
        if (!(e.target as HTMLElement).closest("[data-drag-handle]")) return;
        isDragging.current = true;
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        e.preventDefault();
    }, [position]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragStart.current.x));
            const newY = Math.max(0, Math.min(window.innerHeight - 200, e.clientY - dragStart.current.y));
            setPosition({ x: newX, y: newY });
        };
        const handleMouseUp = () => {
            isDragging.current = false;
        };
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    if (!isOpen) return null;

    return createPortal(
        <div
            ref={dragRef}
            onMouseDown={isMinimized ? handleMouseDown : undefined}
            className={
                isMinimized
                    ? "!fixed !z-[9999] !w-80 !h-48 !rounded-xl !shadow-2xl !border !border-white/10 !overflow-hidden"
                    : "!fixed !inset-0 !z-[9999] !bg-black !flex !flex-col"
            }
            style={
                isMinimized
                    ? { left: position.x, top: position.y }
                    : undefined
            }
        >
            {/* Controls */}
            {!isMinimized && (
                <div className="!absolute !top-4 !right-4 !z-50 !flex !items-center !gap-2">
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="!p-3 !bg-gray-800/80 hover:!bg-gray-700 !text-white !rounded-full !transition-colors !backdrop-blur-md"
                        title="Thu nhỏ"
                    >
                        <Minimize2 size={24} />
                    </button>
                    <button
                        onClick={onClose}
                        className="!p-3 !bg-red-600/90 hover:!bg-red-700 !text-white !rounded-full !transition-colors !backdrop-blur-md"
                        title="Kết thúc"
                    >
                        <X size={24} />
                    </button>
                </div>
            )}

            {isMinimized && (
                <div
                    data-drag-handle
                    className="!absolute !top-0 !left-0 !right-0 !z-20 !flex !items-center !justify-end !gap-2 !p-2 !bg-gradient-to-b !from-black/60 !to-transparent !cursor-move"
                >
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="!p-1.5 !bg-black/50 hover:!bg-black/70 !rounded-full !text-white !backdrop-blur-sm"
                    >
                        <Maximize2 size={16} />
                    </button>
                    <button
                        onClick={onClose}
                        className="!p-1.5 !bg-red-500/50 hover:!bg-red-600/80 !rounded-full !text-white !backdrop-blur-sm"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Video area - always rendered, never unmounted */}
            <div className="!flex-1 !w-full !h-full !relative">
                {loading && !token && (
                    <div className="!absolute !inset-0 !flex !items-center !justify-center !text-white !gap-2">
                        <span className="!loading !loading-spinner !loading-lg"></span>
                        <span className="!text-lg !font-medium">Đang kết nối...</span>
                    </div>
                )}
                {error && (
                    <div className="!absolute !inset-0 !flex !items-center !justify-center !text-red-500 !gap-2">
                        <span>Lỗi: {error}</span>
                    </div>
                )}

                {token && serverUrl && (
                    <VideoCall
                        token={token}
                        serverUrl={serverUrl}
                        onDisconnected={onClose}
                    />
                )}
            </div>
        </div>,
        document.body
    );
};
