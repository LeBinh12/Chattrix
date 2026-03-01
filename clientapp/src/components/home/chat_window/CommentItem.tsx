import { useState, useCallback, useMemo } from "react";
import { MoreVertical, Edit2, Trash2, Reply } from "lucide-react";
import type { TaskComment } from "../../../types/task-comment";
import UserAvatar from "../../UserAvatar";

interface CommentItemProps {
  comment: TaskComment;
  currentUserId: string;
  onEdit: (comment: TaskComment) => void;
  onDelete: (comment: TaskComment) => void;
  onReply: (comment: TaskComment) => void;
}

export default function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
}: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showActionsManual, setShowActionsManual] = useState(false);

  const isOwner = comment.user_id === currentUserId;

  const handleBubbleClick = useCallback(() => {
    if (isOwner) {
      setShowActionsManual((prev) => !prev);
    }
  }, [isOwner]);

  const formattedTime = useMemo(() => {
    const date = new Date(comment.created_at);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;

    return date.toLocaleDateString("vi-VN");
  }, [comment.created_at]);

  const handleEdit = useCallback(() => {
    onEdit(comment);
    setShowMenu(false);
  }, [comment, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(comment);
    setShowMenu(false);
  }, [comment.id, onDelete]);

  const handleReply = useCallback(() => {
    onReply(comment);
  }, [comment, onReply]);

  // Status colors mapping matching statusOptions in TaskDetailModal
  const statusColors: Record<string, string> = {
    "Chờ tiếp nhận": "text-yellow-600",
    "Đã tiếp nhận": "text-orange-600",
    "Chưa bắt đầu": "text-orange-500",
    "Đang thực hiện": "text-blue-600",
    "Đã hoàn thành": "text-green-600",
    "Đã từ chối": "text-red-600",
    "Đã hủy": "text-gray-600",
  };

  const renderColorizedContent = useCallback((content: string) => {
    const statusLabel = Object.keys(statusColors).find(label => content.includes(label));
    if (statusLabel) {
      const parts = content.split(statusLabel);
      return (
        <span className="text-[10px] text-[#8b5a2b] italic leading-tight">
          {parts[0]}
          <span className={`${statusColors[statusLabel]} font-bold non-italic mx-0.5`}>
            {statusLabel}
          </span>
          {parts[1]}
        </span>
      );
    }
    return <span className="text-[10px] text-slate-500 italic">{content}</span>;
  }, []);

  if (comment.type_act === "system") {
    return (
      <div className="flex justify-center my-2 animate-in fade-in slide-in-from-bottom-1 duration-500 w-full px-4">
        <div className="flex items-center gap-2.5 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-200 shadow-sm transition-all hover:shadow-md max-w-full">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span className="text-[10px] font-bold text-gray-600 whitespace-nowrap uppercase tracking-wider">
              {comment.user_name}
            </span>
          </div>
          
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {renderColorizedContent(comment.content)}
            <span className="text-[9px] text-gray-400 font-medium whitespace-nowrap opacity-80 border-l border-gray-200 pl-2">
              {formattedTime}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Avatar */}
      <div className="flex-shrink-0 pt-1">
        <UserAvatar
          avatar={comment.user_avatar}
          display_name={comment.user_name}
          showOnlineStatus={false}
          size={32}
        />
      </div>

      {/* Content Container */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 group/bubble">
          {/* Main Bubble */}
          <div
            onClick={handleBubbleClick}
            className={`
              bg-white rounded-xl px-4 py-2 border border-gray-100 transition-colors shadow-sm w-fit max-w-[80%]
              ${
                isOwner
                  ? "active:scale-[0.98] transition-transform cursor-pointer"
                  : ""
              }
            `}
          >
            {/* Header: Name + Time */}
            <div className="flex items-center justify-between gap-4 mb-1">
              <span className="font-bold text-xs text-gray-900 truncate">
                {comment.user_name}
              </span>
              <span className="text-[9px] text-gray-400 font-medium tracking-wider">
                {formattedTime}
              </span>
            </div>

            {/* Reply Context (If it's a reply) */}
            {comment.reply_to_id && (
              <div className="mb-1.5 px-1">
                <div className="flex items-center gap-2 mb-0.5 bg-gray-50 rounded-lg border border-gray-100 px-2 py-0.5 text-[10px] text-gray-400 italic">
                  <Reply size={10} className="text-gray-400 rotate-180" />
                  <span>Phản hồi tới:</span>

                  <UserAvatar
                    avatar={comment.reply_to_avatar}
                    display_name={comment.reply_to_username}
                    size={14}
                    showOnlineStatus={false}
                  />
                </div>

                {/* Preview nội dung reply */}
                {comment.reply_to_content && (
                  <div className="ml-5 mt-0.5 text-[11px] text-gray-500 italic line-clamp-2">
                    “{comment.reply_to_content}”
                  </div>
                )}
              </div>
            )}

            {/* Comment Body */}
            <p className="text-[13px] text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
              {comment.content}
            </p>
          </div>

          {/* 3-dot Menu (Hover on desktop, Tap on mobile for owner) */}
          {isOwner && (
            <div
              className={`
              relative transition-opacity duration-200
              ${
                showActionsManual
                  ? "opacity-100"
                  : "opacity-0 group-hover/bubble:opacity-100"
              }
            `}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu((prev) => !prev);
                }}
                className="p-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                aria-label="Comment actions"
              >
                <MoreVertical size={14} />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-36 z-20 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={handleEdit}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 text-gray-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Edit2 size={14} className="text-gray-500" />
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-red-50 text-red-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                      Xóa
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions below bubble */}
        <div className="mt-1 ml-2">
          <button
            onClick={handleReply}
            className="text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-tight cursor-pointer"
          >
            Trả lời
          </button>
        </div>
      </div>
    </div>
  );
}
