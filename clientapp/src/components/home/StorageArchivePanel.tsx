import { useState, useEffect, useCallback } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import {
  ChevronLeft,
  FileText,
  Play,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { messageAPI } from "../../api/messageApi";
import type { MediaItemDTO } from "../../types/media";
import MediaStorageViewer from "./MediaStorageViwer";
import { activePanelAtom } from "../../recoil/atoms/uiAtom";
import { API_ENDPOINTS } from "../../config/api";

type MediaType = "image" | "video" | "file";
type TabType = "media" | "files" | "links";

export default function StorageArchivePanel() {
  const selectedChat = useRecoilValue(selectedChatState);
  const [activeTab, setActiveTab] = useState<TabType>("media");
  const setActivePanel = useSetRecoilState(activePanelAtom);

  // Separate states for different media types
  const [mediaItems, setMediaItems] = useState<MediaItemDTO[]>([]);
  const [fileItems, setFileItems] = useState<MediaItemDTO[]>([]);

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Media Viewer state
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string>("");
  const [viewerMediaIds, setViewerMediaIds] = useState<string[]>([]);

  // Fetch media based on active tab
  const fetchMediaList = useCallback(
    async (reset = false) => {
      if (!selectedChat) return;

      setLoading(true);
      try {
        const currentPage = reset ? 1 : page;
        let mediaType: MediaType;

        // Determine media_type based on active tab
        if (activeTab === "media") {
          // For media tab, we need to fetch both image and video
          const [imageResponse, videoResponse] = await Promise.all([
            messageAPI.getMediaList(
              selectedChat.user_id,
              selectedChat.group_id,
              20,
              "image"
            ),
            messageAPI.getMediaList(
              selectedChat.user_id,
              selectedChat.group_id,
              20,
              "video"
            ),
          ]);

          const combinedItems = [
            ...(imageResponse.data?.data || []),
            ...(videoResponse.data?.data || []),
          ].sort((a, b) => b.created_at - a.created_at);

          if (reset) {
            setMediaItems(combinedItems);
          } else {
            setMediaItems((prev) => [...prev, ...combinedItems]);
          }

          setHasMore(false);
          return;
        } else if (activeTab === "files") {
          mediaType = "file";
        } else {
          setLoading(false);
          return;
        }

        const response = await messageAPI.getMediaList(
          selectedChat.user_id,
          selectedChat.group_id,
          20,
          mediaType
        );

        if (response.status === 200 && response.data) {
          const newItems = response.data.data || [];

          if (activeTab === "files") {
            if (reset) {
              setFileItems(newItems);
            } else {
              setFileItems((prev) => [...prev, ...newItems]);
            }
          }

          const totalPages = Math.ceil(
            response.data.count / response.data.limit
          );
          setHasMore(currentPage < totalPages);

          if (!reset) {
            setPage(currentPage + 1);
          }
        }
      } catch (error) {
        console.error("Error fetching media list:", error);
      } finally {
        setLoading(false);
      }
    },
    [selectedChat, activeTab, page]
  );

  // Reset and fetch when chat or tab changes
  useEffect(() => {
    if (selectedChat) {
      setPage(1);
      setHasMore(true);
      fetchMediaList(true);
    }
  }, [selectedChat, activeTab, fetchMediaList]);

  // Get current items based on active tab
  const currentItems = activeTab === "media" ? mediaItems : fileItems;

  // Group items by date
  const groupedItems = currentItems.reduce((acc, item) => {
    const date = new Date(item.created_at * 1000);
    const dateKey = `Ngày ${date.getDate().toString().padStart(2, "0")} Tháng ${
      date.getMonth() + 1
    }, ${date.getFullYear()}`;

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, MediaItemDTO[]>);

  const handleMediaItemClick = (item: MediaItemDTO) => {
    setSelectedMediaId(item.id);
    setViewerMediaIds(currentItems.map((i) => i.id));
    setIsViewerOpen(true);
  };

  const getMediaUrl = (mediaId: string) => {
    return `${API_ENDPOINTS.STREAM_MEDIA}/${mediaId}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileExtension = (filename: string): string => {
    return filename.split(".").pop()?.toUpperCase() || "FILE";
  };

  // Render media item based on type
  const renderMediaItem = (item: MediaItemDTO, index: number) => {
    if (item.type === "image") {
      return (
        <div
          key={`${item.id}-${index}`}
          onClick={() => handleMediaItemClick(item)}
          className="relative aspect-square rounded-lg overflow-hidden bg-[#f0f3fb] cursor-pointer hover:ring-2 hover:ring-[#4f6eda] transition group border border-[#e3e8f2]"
        >
          <img
            src={getMediaUrl(item.id)}
            alt={item.filename}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                `;
              }
            }}
          />
        </div>
      );
    }

    if (item.type === "video") {
      return (
        <div
          key={`${item.id}-${index}`}
          onClick={() => handleMediaItemClick(item)}
          className="relative aspect-square rounded-lg overflow-hidden bg-[#f0f3fb] cursor-pointer hover:ring-2 hover:ring-[#4f6eda] transition group border border-[#e3e8f2]"
        >
          <video
            src={getMediaUrl(item.id)}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Play size={24} className="text-white" />
          </div>
        </div>
      );
    }

    if (item.type === "file") {
      return (
        <div
          key={`${item.id}-${index}`}
          onClick={() => handleMediaItemClick(item)}
          className="flex items-center gap-3 px-4 py-3 hover:bg-[#f0f3fb] cursor-pointer transition border-b border-[#e3e8f2]"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText size={20} className="text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#2e3a59] truncate">
              {item.filename}
            </p>
            <p className="text-xs text-[#7d89a8]">
              {getFileExtension(item.filename)} • {formatFileSize(item.size)}
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  if (!selectedChat) {
    return (
      <div className="bg-white w-full lg:w-80 h-full flex items-center justify-center">
        <div className="text-center px-6 space-y-3 text-[#7d89a8]">
          <p className="text-sm">Chọn một cuộc trò chuyện để xem kho lưu trữ</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white w-full lg:w-80 h-full flex flex-col text-[#2e3a59]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e3e8f2]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActivePanel("info")}
              className="hover:bg-[#f0f3fb] p-1.5 rounded-lg transition"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-base font-semibold">Kho lưu trữ</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#e3e8f2]">
          <button
            onClick={() => setActiveTab("media")}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === "media" ? "text-[#4f6eda]" : "text-[#7d89a8]"
            }`}
          >
            Ảnh/Video
            {activeTab === "media" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f6eda]"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === "files" ? "text-[#4f6eda]" : "text-[#7d89a8]"
            }`}
          >
            Files
            {activeTab === "files" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f6eda]"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("links")}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === "links" ? "text-[#4f6eda]" : "text-[#7d89a8]"
            }`}
          >
            Links
            {activeTab === "links" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f6eda]"></div>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#d4dbef] scrollbar-track-transparent">
          {loading && currentItems.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-[#4f6eda] animate-spin" />
            </div>
          ) : Object.keys(groupedItems).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              {activeTab === "media" ? (
                <ImageIcon size={48} className="text-[#d4dbef] mb-3" />
              ) : (
                <FileText size={48} className="text-[#d4dbef] mb-3" />
              )}
              <p className="text-sm text-[#7d89a8] text-center">
                {activeTab === "media"
                  ? "Chưa có ảnh/video"
                  : activeTab === "files"
                  ? "Chưa có file"
                  : "Chức năng đang phát triển"}
              </p>
            </div>
          ) : (
            <>
              {activeTab === "media" && (
                <>
                  {Object.entries(groupedItems).map(([dateGroup, items]) => (
                    <div key={dateGroup} className="mb-6">
                      <h3 className="text-xs font-semibold px-4 py-2 text-[#7d89a8] bg-[#f8f9fc] sticky top-0 z-10">
                        {dateGroup}
                      </h3>
                      <div className="grid grid-cols-3 gap-1.5 px-4 pt-2">
                        {items.map((item, index) =>
                          renderMediaItem(item, index)
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {activeTab === "files" && (
                <>
                  {Object.entries(groupedItems).map(([dateGroup, items]) => (
                    <div key={dateGroup} className="mb-4">
                      <h3 className="text-xs font-semibold px-4 py-2 text-[#7d89a8] bg-[#f8f9fc] sticky top-0 z-10">
                        {dateGroup}
                      </h3>
                      <div>
                        {items.map((item, index) =>
                          renderMediaItem(item, index)
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {hasMore && !loading && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={() => fetchMediaList(false)}
                    className="px-4 py-2 text-sm text-[#4f6eda] hover:bg-[#f0f3fb] rounded-lg transition"
                  >
                    Tải thêm
                  </button>
                </div>
              )}

              {loading && currentItems.length > 0 && (
                <div className="flex justify-center py-4">
                  <Loader2 size={20} className="text-[#4f6eda] animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Media Viewer Modal */}
      <MediaStorageViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        mediaId={selectedMediaId}
        allMediaIds={viewerMediaIds}
        mediaItems={currentItems}
      />
    </>
  );
}
