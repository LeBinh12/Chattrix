import { useCallback, useEffect, useState } from "react";
import type { FileItem, MediaItem } from "../types/media";
import type { Messages } from "../types/Message";
import { socketManager } from "../api/socket";
import { messageAPI } from "../api/messageApi";


type ChatTarget = { user_id?: string; group_id?: string } | null;
type ChatSocketPayload = { type?: string; message?: Messages };

interface UseChatMediaProps {
    selectedChat: ChatTarget;
    userId?: string;
}

export const useChatMedia = ({ selectedChat, userId }: UseChatMediaProps) => {
    const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
    const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
    console.log("recentMedia", recentMedia)

    // Helper function để format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    // Helper function để extract media và files từ message
    const extractMediaFromMessage = useCallback((msg: Messages) => {
        const mediaItems: MediaItem[] = [];
        const fileItems: FileItem[] = [];

        if (msg.media_ids && msg.media_ids.length > 0) {
            msg.media_ids.forEach((media) => {
                const timestamp = new Date(msg.created_at).toLocaleDateString("vi-VN");

                if (media.type === "image" || media.type === "video") {
                    mediaItems.push({
                        id: `${media.id}`,
                        message_id: msg.id,
                        type: media.type,
                        url: media.url,
                        filename: media.filename,
                        timestamp,
                    });
                } else if (media.type === "file") {
                    fileItems.push({
                        id: `${media.id}`,
                        message_id: msg.id,
                        name: media.filename,
                        size: formatFileSize(media.size),
                        url: media.url,
                        timestamp,
                    });
                }
            });
        }

        return { mediaItems, fileItems };
    }, []);

    // Fetch media và files ban đầu
    useEffect(() => {
        if (!selectedChat || !userId) return;

        const fetchMediaAndFiles = async () => {
            try {
                // Fetch all media types in one call (backend now supports empty media_type)
                const res = await messageAPI.getMediaList(
                    selectedChat?.user_id,
                    selectedChat?.group_id,
                    50, // Fetch enough to cover both sections
                    ""
                );

                const items = res.data.data || [];

                const mappedMedia: MediaItem[] = items
                    .filter(item => item.type === "image" || item.type === "video")
                    .map(item => ({
                        id: item.id,
                        message_id: item.message_id,
                        type: item.type as "image" | "video",
                        url: item.url,
                        filename: item.filename,
                        timestamp: new Date(item.created_at).toLocaleDateString("vi-VN")
                    }));

                const mappedFiles: FileItem[] = items
                    .filter(item => item.type === "file")
                    .map(item => ({
                        id: item.id,
                        message_id: item.message_id,
                        name: item.filename,
                        size: formatFileSize(item.size),
                        url: item.url,
                        timestamp: new Date(item.created_at).toLocaleDateString("vi-VN")
                    }));

                setRecentMedia(mappedMedia.slice(0, 20));
                setRecentFiles(mappedFiles.slice(0, 20));
            } catch (err) {
                console.error(" Lỗi khi tải media/files:", err);
            }
        };

        fetchMediaAndFiles();
    }, [selectedChat?.user_id, selectedChat?.group_id, userId]);

    // Lắng nghe socket realtime để cập nhật media/files
    useEffect(() => {
        if (!userId || !selectedChat) return;

        const listener = (data: any) => {
            // New message
            if (data.type === "chat" && data.message) {
                const msg = data.message;

                const isCurrentChat =
                    (msg.sender_id === userId && msg.receiver_id === selectedChat?.user_id) ||
                    (msg.sender_id === selectedChat?.user_id && msg.receiver_id === userId) ||
                    (msg.group_id && msg.group_id === selectedChat?.group_id);

                if (!isCurrentChat) return;

                const { mediaItems, fileItems } = extractMediaFromMessage(msg);

                if (mediaItems.length > 0) {
                    setRecentMedia((prev) => {
                        const filtered = prev.filter(p => !mediaItems.some(m => m.id === p.id));
                        return [...mediaItems, ...filtered].slice(0, 20);
                    });
                }

                if (fileItems.length > 0) {
                    setRecentFiles((prev) => {
                        const filtered = prev.filter(p => !fileItems.some(m => m.id === p.id));
                        return [...fileItems, ...filtered].slice(0, 20);
                    });
                }
            }
            
            // Recall message
            else if (data.type === "recall-message" && data.message) {
                const recalledMsgId = data.message.id;
                setRecentMedia((prev) => prev.filter(m => m.message_id !== recalledMsgId));
                setRecentFiles((prev) => prev.filter(f => f.message_id !== recalledMsgId));
            }
            
            // Delete for me
            else if (data.type === "delete_for_me" && data.delete_msg) {
                const deletedMsgIds: string[] = data.delete_msg.message_ids || [];
                setRecentMedia((prev) => prev.filter(m => !deletedMsgIds.includes(m.message_id || "")));
                setRecentFiles((prev) => prev.filter(f => !deletedMsgIds.includes(f.message_id || "")));
            }
        };

        socketManager.addListener(listener);
        return () => socketManager.removeListener(listener);
    }, [extractMediaFromMessage, selectedChat?.user_id, selectedChat?.group_id, userId]);

    return { recentMedia, recentFiles };
};
