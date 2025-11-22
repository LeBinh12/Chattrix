import { useEffect, useState } from "react";
import type { FileItem, MediaItem } from "../types/media";
import type { Messages } from "../types/Message";
import { socketManager } from "../api/socket";
import { messageAPI } from "../api/messageApi";


interface UseChatMediaProps {
    selectedChat: any;
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
    const extractMediaFromMessage = (msg: Messages) => {
        const mediaItems: MediaItem[] = [];
        const fileItems: FileItem[] = [];

        if (msg.media_ids && msg.media_ids.length > 0) {
            msg.media_ids.forEach((media) => {
                const timestamp = new Date(msg.created_at).toLocaleDateString("vi-VN");
                console.log("msg.id", msg.id)

                if (media.type === "image" || media.type === "video") {
                    mediaItems.push({
                        id: `${media.id}`,
                        type: media.type,
                        url: media.url,
                        filename: media.filename,
                        timestamp,
                    });
                } else if (media.type === "file") {
                    fileItems.push({
                        name: media.filename,
                        size: formatFileSize(media.size),
                        url: media.url,
                        timestamp,
                    });
                }
            });
        }

        return { mediaItems, fileItems };
    };

    // Fetch media và files ban đầu
    useEffect(() => {
        if (!selectedChat || !userId) return;

        const fetchMediaAndFiles = async () => {
            try {
                const res = await messageAPI.getMessage(
                    selectedChat?.user_id ?? "",
                    selectedChat?.group_id ?? "",
                    100,
                    "0"
                );

                const messages: Messages[] = res.data.data || [];
                const allMedia: MediaItem[] = [];
                const allFiles: FileItem[] = [];

                messages.forEach((msg) => {
                    const { mediaItems, fileItems } = extractMediaFromMessage(msg);
                    allMedia.push(...mediaItems);
                    allFiles.push(...fileItems);
                });

                // Sắp xếp theo thời gian mới nhất
                setRecentMedia(allMedia.reverse());
                setRecentFiles(allFiles.reverse());
            } catch (err) {
                console.error(" Lỗi khi tải media/files:", err);
            }
        };

        fetchMediaAndFiles();
    }, [selectedChat, userId]);

    // Lắng nghe socket realtime để cập nhật media/files
    useEffect(() => {
        if (!userId || !selectedChat) return;

        const listener = (data: any) => {
            if (data.type === "chat" && data.message) {
                const msg: Messages = data.message;

                // Kiểm tra xem tin nhắn có thuộc cuộc trò chuyện hiện tại không
                const isCurrentChat =
                    (msg.sender_id === userId && msg.receiver_id === selectedChat?.user_id) ||
                    (msg.sender_id === selectedChat?.user_id && msg.receiver_id === userId) ||
                    (msg.group_id && msg.group_id === selectedChat?.group_id);

                if (!isCurrentChat) return;

                // Extract media và files từ tin nhắn mới
                const { mediaItems, fileItems } = extractMediaFromMessage(msg);

                // Thêm media mới vào đầu danh sách
                if (mediaItems.length > 0) {
                    setRecentMedia((prev) => [...mediaItems, ...prev]);
                }

                // Thêm file mới vào đầu danh sách
                if (fileItems.length > 0) {
                    setRecentFiles((prev) => [...fileItems, ...prev]);
                }
            }
        };

        socketManager.addListener(listener);

        return () => {
            socketManager.removeListener(listener);
        };
    }, [userId, selectedChat]);

    return { recentMedia, recentFiles };
};