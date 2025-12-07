import React, { useCallback } from "react";
import UserAvatar from "../UserAvatar";
import { LOGO } from "../../assets/paths";
import { API_ENDPOINTS } from "../../config/api";
import TimeAgo from "javascript-time-ago";
import viLocale from "javascript-time-ago/locale/vi.json";
import type { Conversation } from "../../types/conversation";

TimeAgo.addDefaultLocale(viLocale);
const timeAgo = new TimeAgo("vi-VN");

interface ChannelItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  width: number;
  isCompact?: boolean;
}

function ChannelItem({
  conversation,
  isSelected,
  onSelect,
  width,
  isCompact = false,
}: ChannelItemProps) {
  const displayAvatar = conversation.avatar || LOGO;

  // Get full avatar URL
  const avatarUrl = displayAvatar.startsWith("http")
    ? displayAvatar
    : `${API_ENDPOINTS.UPLOAD_MEDIA}/${conversation.avatar}`;

  const getLastMessageText = useCallback(() => {
    if (!conversation.last_message) return "Không có tin nhắn";

    const message = conversation.last_message;
    if (conversation.last_message_type === "image") return "[Hình ảnh]";
    if (conversation.last_message_type === "video") return "[Video]";
    if (conversation.last_message_type === "file") return "[File]";

    return message.substring(0, 50) + (message.length > 50 ? "..." : "");
  }, [conversation.last_message, conversation.last_message_type]);

  const isOnline = conversation.status === "online";

  return (
    <div
      onClick={onSelect}
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer
        transition-all duration-200 hover:bg-gray-100
        ${
          isSelected
            ? "bg-blue-100 border-l-4 border-blue-500"
            : "hover:bg-gray-50"
        }
      `}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <UserAvatar
          avatar={avatarUrl}
          display_name={conversation.display_name}
          size={isCompact ? 36 : 44}
        />
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>

      {/* Content - Hide when compact */}
      {!isCompact && width > 100 && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 truncate">
              {conversation.display_name}
            </p>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {conversation.last_date &&
                timeAgo.format(new Date(conversation.last_date))}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600 truncate flex-1">
              {getLastMessageText()}
            </p>
            {conversation.unread_count > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                {conversation.unread_count > 9
                  ? "9+"
                  : conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(ChannelItem);
