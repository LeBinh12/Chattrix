import { motion, AnimatePresence } from "framer-motion";
import { Copy, Download, Reply, Trash2 } from "lucide-react";
import { useRef, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useSetRecoilState } from "recoil";
import type { Messages } from "../../../types/Message";
import { replyMessageState } from "../../../recoil/atoms/uiAtom";
import { API_ENDPOINTS } from "../../../config/api";

interface MessageMenuProps {
  msg: Messages;
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  currentUserId?: string;
  display_name: string;
  isMine: boolean;
  onDeleteMessage: (messageId: string) => void;
}

export default function MessageMenu({
  msg,
  showMenu,
  setShowMenu,
  display_name,
  isMine,
  onDeleteMessage,
}: MessageMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const setReplyTo = useSetRecoilState(replyMessageState);
  const hasMedia = (msg.media_ids || []).length > 0;

  const handleReply = useCallback(() => {
    let mediaUrl: string | undefined = undefined;
    let type: string = "text";

    if (msg.media_ids && msg.media_ids.length > 0) {
      mediaUrl = msg.media_ids[0].url;
      type = msg.media_ids[0].type;
    }

    setReplyTo({
      id: msg.id,
      sender: isMine ? "Bạn" : display_name,
      content: msg.content,
      type: type,
      media_url: mediaUrl ?? "",
    });
    setShowMenu(false);
  }, [msg, isMine, display_name, setReplyTo, setShowMenu]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(msg.content);
    toast.success("Đã copy!");
    setShowMenu(false);
  }, [msg.content, setShowMenu]);

  const handleCopyMedia = useCallback(() => {
    if (!hasMedia) return;
    const links = (msg.media_ids || []).map((m) =>
      m.type === "video"
        ? `${API_ENDPOINTS.STREAM_MEDIA}/${m.id}`
        : `${API_ENDPOINTS.UPLOAD_MEDIA}/${m.url}`
    );
    navigator.clipboard.writeText(links.join("\n"));
    toast.success("Đã copy link media!");
    setShowMenu(false);
  }, [hasMedia, msg.media_ids, setShowMenu]);

  const handleDownloadAll = useCallback(() => {
    if (!hasMedia) return;
    (msg.media_ids || []).forEach((m) => {
      const url =
        m.type === "video"
          ? `${API_ENDPOINTS.STREAM_MEDIA}/${m.id}`
          : `${API_ENDPOINTS.UPLOAD_MEDIA}/${m.url}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = m.filename || "file";
      a.click();
    });
    toast.success("Đang tải tất cả media!");
    setShowMenu(false);
  }, [hasMedia, msg.media_ids, setShowMenu]);

  const handleDeleteForMe = useCallback(() => {
    onDeleteMessage(msg.id);
    setShowMenu(false);
  }, [msg.id, onDeleteMessage, setShowMenu]);

  // Close menu when clicking outside
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
  }, [showMenu, setShowMenu]);

  const menuItems = [
    { icon: Reply, label: "Trả lời", onClick: handleReply },
    { icon: Copy, label: "Copy", onClick: handleCopy, hidden: !msg.content },
    {
      icon: Download,
      label: "Copy link",
      onClick: handleCopyMedia,
      hidden: !hasMedia,
    },
    {
      icon: Download,
      label: "Tải tất cả",
      onClick: handleDownloadAll,
      hidden: !hasMedia,
    },
    { icon: Trash2, label: "Xóa", onClick: handleDeleteForMe, hidden: !isMine },
  ];

  return (
    <AnimatePresence>
      {showMenu && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute bottom-full right-0 mb-2 z-50 bg-white rounded-lg shadow-xl border border-gray-200"
        >
          {menuItems
            .filter((item) => !item.hidden)
            .map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg transition-colors"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
