import { Check, CheckCheck, Eye, MoreVertical } from "lucide-react";
import { motion } from "framer-motion";
import type { Messages } from "../../../types/Message";
import AvatarPreview from "./AvatarPreview";
import { useState, useRef, useEffect, useCallback } from "react";
import { API_ENDPOINTS } from "../../../config/api";
import { LOGO } from "../../../assets/paths";
import { useSetRecoilState } from "recoil";
import { messageIDAtom } from "../../../recoil/atoms/messageAtom";
import MessageContent from "./MessageContent";
import MessageMenu from "./MessageMenu";
import ReplyPreview from "./ReplyPreview";
import React from "react";

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

function MessageItemComponent({
  msg,
  currentUserId,
  onPreviewMedia,
  display_name,
  size = "large",
  isHighlighted = false,
}: Props) {
  const isMine = msg.sender_id === currentUserId;
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const setMessageID = useSetRecoilState(messageIDAtom);

  // Strip HTML để hiển thị text thuần
  const getTextContent = useCallback((html: string) => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  }, []);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }, []);

  const onDeleteMessage = useCallback(
    (messageId: string) => {
      if (currentUserId) {
        import("../../../api/socket").then((module) => {
          module.socketManager.sendDeleteMessageForMe(currentUserId, [
            messageId,
          ]);
        });
      }
    },
    [currentUserId]
  );

  useEffect(() => {
    if (isHighlighted && messageRef.current) {
      messageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isHighlighted]);

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

  return (
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
      onMouseLeave={() => setIsHovered(false)}
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
        ref={messageRef}
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
            className={`absolute flex items-center gap-2 px-2 py-1 
              bg-white shadow border border-gray-200 rounded-full
              ${
                isMine ? "left-0 -translate-x-full" : "right-0 translate-x-full"
              }
            `}
          >
            <button
              onClick={() => setShowMenu(true)}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Message bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl border ${bubbleStyles} relative group`}
        >
          {/* Reply Preview */}
          {msg.reply && (
            <ReplyPreview
              reply={msg.reply}
              onClickReply={(id) => setMessageID(id)}
              getTextContent={getTextContent}
            />
          )}

          {/* Content */}
          <MessageContent
            msg={msg}
            onPreviewMedia={onPreviewMedia}
            getTextContent={getTextContent}
          />

          {/* Status icon for sent messages */}
          {isMine && (
            <div className="mt-1 flex items-center justify-end gap-1">
              <span className="text-xs text-[#7a89b8]">
                {formatTime(msg.created_at)}
              </span>
              <statusInfo.icon className="w-3.5 h-3.5 text-[#7a89b8]" />
            </div>
          )}

          {!isMine && (
            <div className="mt-1 flex items-center justify-start">
              <span className="text-xs text-[#7a89b8]">
                {formatTime(msg.created_at)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      <MessageMenu
        msg={msg}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        currentUserId={currentUserId}
        display_name={display_name}
        isMine={isMine}
        onDeleteMessage={onDeleteMessage}
      />
    </motion.div>
  );
}

export default React.memo(MessageItemComponent);
