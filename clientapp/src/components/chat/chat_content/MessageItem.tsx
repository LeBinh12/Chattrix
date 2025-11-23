import {
  Check,
  CheckCheck,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Play,
  Share,
  Copy,
  Pin,
  Star,
  List,
  Info,
  Undo,
  Trash2,
  Reply,
  Share2,
  Image,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Messages } from "../../../types/Message";
import AvatarPreview from "./AvatarPreview";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMemo, useState, useRef, useEffect } from "react";
import { API_ENDPOINTS } from "../../../config/api";
import { socketManager } from "../../../api/socket";
import { LOGO } from "../../../assets/paths";
import { toast } from "react-toastify";
import { useSetRecoilState } from "recoil";
import { replyMessageState } from "../../../recoil/atoms/uiAtom";
import { messageIDAtom } from "../../../recoil/atoms/messageAtom";

type StatusConfig = {
  icon: typeof Check;
  label: string;
};

type Props = {
  msg: Messages;
  index: number;
  messages: Messages[];
  currentUserId?: string;
  onPreviewMedia: (url: string) => void;
  display_name: string;
  size?: "small" | "large";
  isHighlighted?: boolean;
};

const statusMap: Record<string, StatusConfig> = {
  sent: { icon: Check, label: "Đã gửi" },
  delivered: { icon: CheckCheck, label: "Đã nhận" },
  received: { icon: CheckCheck, label: "Đã nhận" },
  seen: { icon: Eye, label: "Đã xem" },
};

export default function MessageItem({
  msg,
  currentUserId,
  onPreviewMedia,
  messages,
  display_name,
  size = "large",
  isHighlighted = false,
}: Props) {
  const isMine = msg.sender_id === currentUserId;
  const isLastMineMessage =
    isMine &&
    messages &&
    messages.length > 0 &&
    messages[messages.length - 1].id === msg.id;

  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  // Recoil state để set reply
  const setReplyTo = useSetRecoilState(replyMessageState);
  const setMessageID = useSetRecoilState(messageIDAtom);
  const hasMedia = (msg.media_ids || []).length > 0;

  // Hàm xử lý reply - Lưu toàn bộ thông tin vào Recoil
  const handleReply = () => {
    // Lấy URL đầu tiên nếu có media
    let mediaUrl: string | undefined = undefined;
    let type: string = "text"; // default là text

    if (msg.media_ids && msg.media_ids.length > 0) {
      mediaUrl = msg.media_ids[0].url;
      type = msg.media_ids[0].type; // "image", "video", "file"
    }

    setReplyTo({
      id: msg.id,
      sender: isMine ? "Bạn" : display_name,
      content: msg.content,
      type: type,
      media_url: mediaUrl ?? "",
    });

    setShowMenu(false);
  };

  const handleCopyMedia = () => {
    if (!hasMedia) return;
    const links = (msg.media_ids || []).map((m) =>
      m.type === "video"
        ? `${API_ENDPOINTS.STREAM_MEDIA}/${m.id}`
        : `${API_ENDPOINTS.UPLOAD_MEDIA}/${m.url}`
    );
    navigator.clipboard.writeText(links.join("\n"));
    toast.success("Đã copy link media!");
    setShowMenu(false);
  };

  const handleDownloadAll = () => {
    if (!hasMedia) return;
    (msg.media_ids || []).forEach((m) => {
      const url =
        m.type === "video"
          ? `${API_ENDPOINTS.STREAM_MEDIA}/${m.id}`
          : `${API_ENDPOINTS.UPLOAD_MEDIA}/${m.url}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = m.filename;
      a.click();
    });
    toast.success("Đã tải tất cả media!");
    setShowMenu(false);
  };
  useEffect(() => {
    if (isHighlighted && messageRef.current) {
      messageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isHighlighted]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: msg.content,
    editable: false,
  });

  const mediaItems = useMemo(
    () =>
      (msg.media_ids || []).filter(
        (m) => m.type === "image" || m.type === "video"
      ),
    [msg.media_ids]
  );

  const fileItems = useMemo(
    () => (msg.media_ids || []).filter((m) => m.type === "file"),
    [msg.media_ids]
  );

  const onDeleteMessage = (messageId: string) => {
    socketManager.sendDeleteMessageForMe(currentUserId ?? "", [messageId]);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const handleReport = () => {
    alert(`Đã báo cáo tin nhắn từ ${display_name}`);
    setShowMenu(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setShowMenu(false);
  };

  const handlePin = () => {
    console.log("Ghim tin nhắn:", msg.id);
    toast.info("Tin năng đang phát triễn");
    setShowMenu(false);
  };

  const handleStar = () => {
    console.log("Đánh dấu tin nhắn:", msg.id);
    toast.info("Tin năng đang phát triễn");
    setShowMenu(false);
  };

  const handleSelectMultiple = () => {
    console.log("Chọn nhiều tin nhắn");
    toast.info("Tin năng đang phát triễn");
    setShowMenu(false);
  };

  const handleViewDetail = () => {
    console.log("Xem chi tiết tin nhắn:", msg.id);
    toast.info("Tin năng đang phát triễn");
    setShowMenu(false);
  };

  const handleRecall = () => {
    console.log("Thu hồi tin nhắn:", msg.id);
    toast.info("Tin năng đang phát triễn");
    setShowMenu(false);
  };

  const handleDeleteForMe = () => {
    onDeleteMessage(msg.id);
    setShowMenu(false);
  };

  // Strip HTML để hiển thị text thuần
  const getTextContent = (html: string) => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  // Render reply preview trong message bubble (khi tin nhắn này reply tin khác)
  const renderReplyPreview = () => {
    if (!msg.reply || msg.reply.id === "000000000000000000000000") return null;

    const hasReplyMedia = ["image", "video", "file"].includes(msg.reply.type);

    return (
      <div
        onClick={() => setMessageID(msg.reply?.id ?? "")}
        className="mb-3 w-full cursor-pointer"
      >
        <div className="flex gap-3 p-3 rounded-lg bg-gray-100 border-l-4 border-blue-500">
          {/* Cột trái: chỉ hiển thị nếu reply có media */}
          {hasReplyMedia && (
            <div className="flex-shrink-0">
              {msg.reply.type === "image" && (
                <img
                  src={`${API_ENDPOINTS.UPLOAD_MEDIA}/${msg.reply.media_url}`}
                  alt="reply"
                  className="w-12 h-12 object-cover rounded"
                />
              )}

              {msg.reply.type === "video" && (
                <div className="relative">
                  <video
                    src={`${API_ENDPOINTS.UPLOAD_MEDIA}/${msg.reply.media_url}`}
                    className="w-12 h-12 object-cover rounded"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7L8 5z" />
                    </svg>
                  </div>
                </div>
              )}

              {msg.reply.type === "file" && (
                <div className="w-12 h-12 bg-gray-300 rounded flex items-center justify-center">
                  <FileText className="w-6 h-6 text-gray-600" />
                </div>
              )}
            </div>
          )}

          {/* Cột phải: thông tin reply */}
          <div className={`flex-1 min-w-0 ${hasReplyMedia ? "" : "ml-0"}`}>
            <div className="text-sm font-semibold text-blue-600 truncate">
              {msg.reply.sender}
            </div>

            <div className="text-sm text-gray-700 line-clamp-2 break-words">
              {msg.reply.type === "image" && "[Hình Ảnh]"}
              {msg.reply.type === "video" && "[Video]"}
              {msg.reply.type === "file" && (
                <span className="text-blue-600">
                  [File] {msg.reply.content}
                </span>
              )}
              {(!msg.reply.media_url || msg.reply.type === "text") &&
                getTextContent(msg.reply.content)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (msg.type === "system") {
    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex justify-center my-4"
      >
        <div className="px-4 py-2 rounded-full bg-white border border-[#e4e8f1] text-xs text-[#707b97] shadow-sm">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  const bubbleStyles = isMine
    ? "bg-[#dfe8ff] border-[#c5d6ff] text-[#0f3d8c]"
    : "bg-white border-[#e4e8f1] text-[#1f2a44]";

  const statusInfo =
    statusMap[(msg.status as keyof typeof statusMap) ?? "sent"] ||
    statusMap.sent;

  const renderMedia = () => {
    if (!mediaItems.length) return null;

    let columns = 1;
    let itemHeight = "auto"; // chiều cao mặc định

    if (mediaItems.length === 1) {
      columns = 1;
      itemHeight = "300px"; // 1 ảnh lớn
    } else if (mediaItems.length === 2) {
      columns = 2;
      itemHeight = "150px"; // 2 ảnh khung vừa
    } else if (mediaItems.length <= 4) {
      columns = 2;
      itemHeight = "100px"; // 3-4 ảnh 2 cột nhỏ
    } else {
      columns = 3;
      itemHeight = "100px"; // nhiều hơn 4 ảnh 3 cột
    }

    return (
      <div
        className="mt-3 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {mediaItems.map((media) => {
          const mediaUrl =
            media.type === "video"
              ? `${API_ENDPOINTS.STREAM_MEDIA}/${media.id}`
              : `${API_ENDPOINTS.UPLOAD_MEDIA}/${media.url}`;

          return (
            <div
              key={media.id}
              className="relative cursor-pointer rounded overflow-hidden border border-gray-200 bg-gray-50"
              style={{ height: itemHeight }}
              onClick={() => onPreviewMedia(mediaUrl)}
            >
              {media.type === "video" ? (
                <>
                  <video
                    src={mediaUrl}
                    className="w-full h-full object-cover rounded"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <img
                  src={mediaUrl}
                  alt={media.filename}
                  className="w-full h-full object-cover rounded"
                />
              )}
            </div>
          );
        })}
        {msg.content && (
          <div className="mt-2 text-sm text-gray-800 break-words col-span-full">
            {getTextContent(msg.content)}
          </div>
        )}
      </div>
    );
  };

  const renderFiles = () => {
    if (!fileItems.length) return null;

    return (
      <div className="mt-3 space-y-2">
        {fileItems.map((file) => {
          const mediaUrl = `${API_ENDPOINTS.UPLOAD_MEDIA}/${file.url}`;
          return (
            <div
              key={file.id}
              className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 bg-gray-50"
            >
              {/* File icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>

              {/* Filename */}
              <div className="flex-1 min-w-0 text-center">
                <p className="text-sm text-blue-700 font-semibold truncate">
                  {file.filename}
                </p>
              </div>

              {/* Download button */}
              <a
                href={mediaUrl}
                download
                className="flex-shrink-0 text-blue-600 hover:text-blue-800"
              >
                <Download className="w-5 h-5" />
              </a>
            </div>
          );
        })}

        {msg.content && (
          <div className="mt-2 text-sm text-gray-800 break-words">
            {getTextContent(msg.content)}
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`flex gap-2.5 ${
          isMine ? "justify-end" : "justify-start"
        } relative`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      >
        {!isMine ? (
          <AvatarPreview
            src={
              msg.sender_avatar && msg.sender_avatar !== "null"
                ? `${API_ENDPOINTS.UPLOAD_MEDIA}/${msg.sender_avatar}`
                : LOGO
            }
            alt={display_name}
            size={size === "small" ? 30 : 32}
          />
        ) : (
          <div className="w-7" />
        )}

        <div
          className={`flex flex-col ${
            isMine ? "items-end" : "items-start"
          } max-w-[85%] sm:max-w-[75%] md:max-w-[68%] gap-1 relative`}
        >
          {/* Hover actions */}
          {isHovered && !showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -5 }}
              className={`
      absolute  flex items-center gap-2 px-2 py-1 
      bg-white shadow border border-gray-200 rounded-full
      ${isMine ? "left-0 -translate-x-full" : "right-0 translate-x-full"}
    `}
            >
              <button
                onClick={() => setShowMenu(true)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              <button
                onClick={() => console.log("Share message:", msg.id)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
              >
                <Share className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Menu dropdown */}
          {showMenu && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={` absolute z-50 w-56 bg-white            
                    ${isMine ? "right-0" : "left-0"}
            rounded shadow-2xl overflow-hidden border border-gray-200`}
            >
              {isMine ? (
                <div className="py-1">
                  <button
                    onClick={handleReply}
                    className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Reply className="w-4 h-4 text-[#707b97]" />
                    <span>Trả lời</span>
                  </button>
                  <button className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm">
                    <Share2 className="w-4 h-4 text-[#707b97]" />
                    <span>Chia sẽ</span>
                  </button>
                  <div className="h-px bg-gray-300 w-4/5 mx-auto"></div>
                  <button
                    onClick={handleCopy}
                    className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Copy className="w-4 h-4 text-[#707b97]" />
                    <span>Copy tin nhắn</span>
                  </button>
                  <div className="h-px bg-gray-300 w-4/5 mx-auto"></div>
                  {hasMedia && (
                    <>
                      <button
                        onClick={handleCopyMedia}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-[#1f2a44] hover:bg-[#f5f7fb]"
                      >
                        <Copy className="w-4 h-4 text-[#707b97]" />
                        <span>Copy ảnh</span>
                      </button>
                      <button
                        onClick={handleDownloadAll}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-[#1f2a44] hover:bg-[#f5f7fb]"
                      >
                        <Download className="w-4 h-4 text-[#707b97]" />
                        <span>Tải tất cả</span>
                      </button>
                    </>
                  )}
                  <div className="h-px bg-gray-300 w-4/5 mx-auto"></div>
                  <button
                    onClick={handlePin}
                    className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Pin className="w-4 h-4 text-[#707b97]" />
                    <span>Ghim tin nhắn</span>
                  </button>
                  <button
                    onClick={handleStar}
                    className="w-full px-4 py-2.5 text-left text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Star className="w-4 h-4 text-[#707b97]" />
                    <span>Đánh dấu tin nhắn</span>
                  </button>
                  <button
                    onClick={handleSelectMultiple}
                    className="w-full px-4 py-2.5 text-left text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <List className="w-4 h-4 text-[#707b97]" />
                    <span>Chọn nhiều tin nhắn</span>
                  </button>
                  <button
                    onClick={handleViewDetail}
                    className="w-full px-4 py-2.5 text-left text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Info className="w-4 h-4 text-[#707b97]" />
                    <span>Xem chi tiết</span>
                  </button>

                  <div className="h-px bg-gray-300 w-4/5 mx-auto"></div>

                  <button
                    onClick={handleRecall}
                    className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Undo className="w-4 h-4 " />
                    <span>Thu hồi</span>
                  </button>
                  <button
                    onClick={handleDeleteForMe}
                    className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa chỉ ở phía tôi</span>
                  </button>
                </div>
              ) : (
                <div className="py-1">
                  <button
                    onClick={handleReply}
                    className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Reply className="w-4 h-4 text-[#707b97]" />
                    <span>Trả lời tin nhắn</span>
                  </button>
                  <button className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm">
                    <Share2 className="w-4 h-4 text-[#707b97]" />
                    <span>Chia sẽ</span>
                  </button>
                  <div className="h-px bg-gray-300 w-4/5 mx-auto"></div>
                  <button
                    onClick={handleCopy}
                    className="w-full px-4 py-2.5 text-left text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Copy className="w-4 h-4 text-[#707b97]" />
                    <span>Copy tin nhắn</span>
                  </button>
                  <div className="h-px bg-gray-300 w-4/5 mx-auto"></div>
                  {hasMedia && (
                    <>
                      <button
                        onClick={handleCopyMedia}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-[#1f2a44] hover:bg-[#f5f7fb]"
                      >
                        <Image className="w-4 h-4 text-[#707b97]" />
                        <span>Copy ảnh</span>
                      </button>
                      <button
                        onClick={handleDownloadAll}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-[#1f2a44] hover:bg-[#f5f7fb]"
                      >
                        <Download className="w-4 h-4 text-[#707b97]" />
                        <span>Tải tất cả</span>
                      </button>
                    </>
                  )}
                  <div className="h-px bg-gray-300 w-4/5 mx-auto"></div>
                  <button
                    onClick={handlePin}
                    className="w-full px-4 py-2.5 text-left text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Pin className="w-4 h-4 text-[#707b97]" />
                    <span>Ghim tin nhắn</span>
                  </button>
                  <button
                    onClick={handleStar}
                    className="w-full px-4 py-2.5 text-left text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Star className="w-4 h-4 text-[#707b97]" />
                    <span>Đánh dấu tin nhắn</span>
                  </button>
                  <button
                    onClick={handleSelectMultiple}
                    className="w-full px-4 py-2.5 text-left text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <List className="w-4 h-4" />
                    <span>Chọn nhiều tin nhắn</span>
                  </button>
                  <button
                    onClick={handleViewDetail}
                    className="w-full px-4 py-2.5 text-left text-[#1f2a44] hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Info className="w-4 h-4 text-[#707b97]" />
                    <span>Xem chi tiết</span>
                  </button>
                  <div className="h-px bg-gray-300 w-4/5 mx-auto"></div>
                  <button
                    onClick={handleReport}
                    className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Info className="w-4 h-4 " />
                    <span>Báo cáo</span>
                  </button>
                  <button
                    onClick={handleDeleteForMe}
                    className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-[#f5f7fb] flex items-center gap-3 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa chỉ ở phía tôi</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Message bubble */}
          <div
            className={`px-3 py-2 rounded-[20px] border shadow-sm max-w-full leading-5 ${bubbleStyles} ${
              size === "small" ? "text-[12px]" : "text-[13px]"
            } ${
              isHighlighted
                ? "ring-2 ring-blue-500 shadow-lg shadow-blue-200/50"
                : ""
            }`}
          >
            {/* Hiển thị reply preview nếu tin nhắn này reply tin khác */}
            {renderReplyPreview()}

            {msg.type !== "file" && editor && (
              <EditorContent
                editor={editor}
                className={`prose prose-sm max-w-none text-[13px] ${
                  isMine ? "text-[#0f3d8c]" : "text-[#1f2a44]"
                }`}
              />
            )}
            {renderMedia()}
            {renderFiles()}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-[#8a94b3] pl-1 pr-1">
            <span>{formatTime(msg.created_at)}</span>
            {isMine && (
              <>
                {(isLastMineMessage || isHovered) && (
                  <span className="flex items-center gap-0.5">
                    <statusInfo.icon className="w-3 h-3" />
                    {statusInfo.label}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
