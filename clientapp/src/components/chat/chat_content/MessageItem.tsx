import {
  Check,
  CheckCheck,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Play,
  Reply,
  Smile,
  Plus,
  Heart,
  MessageSquare
} from "lucide-react";
import EmojiPicker, { Theme, type EmojiClickData } from "emoji-picker-react";
import type { Messages } from "../../../types/Message";
import MessageMenu from "./MessageMenu";
import { motion, AnimatePresence } from "framer-motion";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { API_ENDPOINTS } from "../../../config/api";
import { socketManager } from "../../../api/socket";
import { toast } from "react-toastify";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { replyMessageState, activePanelAtom, threadTargetAtom, threadTargetTypeAtom } from "../../../recoil/atoms/uiAtom";
import { messageIDAtom } from "../../../recoil/atoms/messageAtom";
import { userAtom } from "../../../recoil/atoms/userAtom";
import SystemGroup from "./logic/SystemGroup";
import LongMessageContent from "./LongMessageContent";
import TaskCard from "./TaskCard"; // Import TaskCard
import { BUTTON_HOVER } from "../../../utils/className";
import UserAvatar from "../../UserAvatar";
import { taskApi, type TaskStatus } from "../../../api/taskApi";
import { selectedChatState } from "../../../recoil/atoms/chatAtom";
import { forceDownload } from "../../../utils/downloadUtil";

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
  onForward?: (msgId: string) => void;
};

const statusMap: Record<string, StatusConfig> = {
  sent: { icon: Check, label: "Đã gửi" },
  delivered: { icon: CheckCheck, label: "Đã nhận" },
  received: { icon: CheckCheck, label: "Đã nhận" },
  seen: { icon: Eye, label: "Đã xem" },
};

export default function MessageItem({
  msg,
  index,
  currentUserId,
  onPreviewMedia,
  messages,
  display_name,
  size = "large",
  isHighlighted = false,
  onForward,
}: Props) {
  const isMine = msg.sender_id === currentUserId;
  const isLastMineMessage =
    isMine &&
    messages &&
    messages.length > 0 &&
    messages[messages.length - 1].id === msg.id;

  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const reactionDetailsRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const selectedChat = useRecoilValue(selectedChatState);
  // Recoil state để set reply
  const setReplyTo = useSetRecoilState(replyMessageState);
  const setMessageID = useSetRecoilState(messageIDAtom);
  const setActivePanel = useSetRecoilState(activePanelAtom);
  const setThreadTarget = useSetRecoilState(threadTargetAtom);
  const setThreadTargetType = useSetRecoilState(threadTargetTypeAtom);

  const handleThread = useCallback(() => {
    setActivePanel("thread");
    setThreadTarget(msg);
    setThreadTargetType("message");
    setShowMenu(false);
  }, [msg, setActivePanel, setThreadTarget, setThreadTargetType]);

  // Mobile long press logic
  const [isMobile, setIsMobile] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleTouchStart = useCallback(() => {
    if (!isMobile) return;
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true);
      // Vibrate for feedback if available
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500); // 500ms for long press
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  }, []);

  const hasMedia = (msg.media_ids || []).length > 0;
  const user = useRecoilValue(userAtom);

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

  const handleDownloadAll = async () => {
    if (!hasMedia) return;
    
    const mediaList = msg.media_ids || [];
    
    // Notify user that download is starting
    toast.info("Đang bắt đầu tải xuống...");

    try {
        // Handle sequentially for better reliability and browser behavior
        for (let i = 0; i < mediaList.length; i++) {
            const m = mediaList[i];
            const url =
              m.type === "video"
                ? `${API_ENDPOINTS.STREAM_MEDIA}/${m.id}`
                : `${API_ENDPOINTS.UPLOAD_MEDIA}/${m.url}`;
            
            await forceDownload(url, m.filename);
            
            // Small delay to prevent browser overload/blocking
            if (i < mediaList.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        toast.success("Đã tải xong tất cả media!");
    } catch (error) {
        console.error("Batch download error:", error);
        toast.error("Có lỗi xảy ra khi tải file!");
    }
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(false);
        setShowFullPicker(false);
      }
    };

    if (showReactionPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReactionPicker]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reactionDetailsRef.current && !reactionDetailsRef.current.contains(event.target as Node)) {
        setShowReactionDetails(false);
      }
    };

    if (showReactionDetails) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReactionDetails]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    socketManager.sendReaction(msg.id, currentUserId ?? "", emojiData.emoji, "add",
      user?.data.display_name ?? "Không tên");
    setShowMenu(false); // Auto-close menu
    setShowReactionPicker(false);
    setShowFullPicker(false);
  };

  const handleQuickReaction = (emoji: string) => {
    socketManager.sendReaction(msg.id, currentUserId ?? "", emoji, "add",
      user?.data.display_name ?? "Không tên");
    setShowMenu(false); // Auto-close menu
    setShowReactionPicker(false); // Close if open
    setShowFullPicker(false);
  }

  const handleRemoveAllReactions = () => {
    socketManager.sendReaction(msg.id, currentUserId ?? "", "", "remove_all",
      user?.data.display_name ?? "Không tên");
    setShowReactionDetails(false);
  }

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

  // NEW: Kiểm tra xem tin nhắn này có phải là tin cuối cùng trong chuỗi liên tiếp của cùng sender
  const isLastInSequence = useMemo(() => {
    if (isMine) return true; // Tin của mình luôn hiển thị thời gian ở tin cuối

    // Nếu là tin cuối cùng trong danh sách messages
    if (index === messages.length - 1) return true;

    const nextMsg = messages[index + 1];

    // Nếu tin tiếp theo không cùng sender → đây là tin cuối của chuỗi
    return !nextMsg || nextMsg.sender_id !== msg.sender_id;
  }, [isMine, msg.sender_id, index, messages]);

  // NEW: Chỉ hiển thị tên người gửi ở tin đầu tiên của chuỗi (nếu là nhóm)
  const shouldShowSenderName = useMemo(() => {
    if (isMine) return false;

    // Chỉ hiển thị tên ở tin đầu tiên của chuỗi liên tiếp
    if (index === 0) return true;

    const prevMsg = messages[index - 1];
    return !prevMsg || prevMsg.sender_id !== msg.sender_id;
  }, [isMine, msg.sender_id, index, messages]);

  const fileItems = useMemo(
    () => (msg.media_ids || []).filter((m) => m.type === "file"),
    [msg.media_ids]
  );
  const shouldShowTimestamp = useMemo(() => {
    // Always show timestamp for the first message
    if (index === 0) return true;

    const previousMsg = messages[index - 1];

    if (!previousMsg || previousMsg.type === "system") {
      return false;
    }

    const currentTime = new Date(msg.created_at).getTime();
    const previousTime = new Date(previousMsg.created_at).getTime();

    const THREE_HOURS_IN_MS = 3 * 60 * 60 * 1000;

    return currentTime - previousTime > THREE_HOURS_IN_MS;
  }, [msg.created_at, messages, index]);

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

  const formatTimestamp = (date: string): string => {
    const now = new Date();
    const msgDate = new Date(date);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const msgDay = new Date(
      msgDate.getFullYear(),
      msgDate.getMonth(),
      msgDate.getDate()
    );

    const timeStr = msgDate.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Today → only show time
    if (msgDay.getTime() === today.getTime()) {
      return timeStr;
    }

    // Yesterday → time + "Hôm qua"
    if (msgDay.getTime() === yesterday.getTime()) {
      return `${timeStr} Hôm qua`;
    }

    // Older → time + date
    const dateStr = msgDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return `${timeStr} ${dateStr}`;
  };

  const handleReport = () => {
    alert(`Đã báo cáo tin nhắn từ ${display_name}`);
    setShowMenu(false);
  };

  const handleCopy = () => {
    const plainText = getTextContent(msg.content);
    navigator.clipboard.writeText(plainText);
    toast.success("Đã copy tin nhắn!");
    setShowMenu(false);
  };

  const getTextContent = (html: string) => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  const handlePin = () => {
    // Determine the correct receiver_id for 1-1 chats.
    // In 1-1, selectedChat.user_id is always the other person.
    const receiverId = selectedChat?.group_id ? undefined : selectedChat?.user_id;

    socketManager.sendPinnedMessage(
      msg.id,
      currentUserId ?? "", // Pinner ID
      msg.sender_id,       // Original message sender ID
      receiverId,          // Correct 1-1 recipient or undefined for group
      msg.group_id,
      msg.content,
      msg.sender_name,     // Original sender name
      user?.data.display_name, // Pinner name
      msg.type,
      msg.created_at
    );
    setShowMenu(false);
  };

  const handleStar = () => {
    console.log("Đánh dấu tin nhắn:", msg.id);
    toast.info("Tính năng đang phát triển");
    setShowMenu(false);
  };

  const handleSelectMultiple = () => {
    console.log("Chọn nhiều tin nhắn");
    toast.info("Tính năng đang phát triển");
    setShowMenu(false);
  };

  const handleViewDetail = () => {
    console.log("Xem chi tiết tin nhắn:", msg.id);
    toast.info("Tính năng đang phát triển");
    setShowMenu(false);
  };

  const handleRecall = () => {
    socketManager.sendRecallMessage(
      msg.id,
      currentUserId ?? "",
      msg.receiver_id,
      msg.group_id
    );
    // toast.info("Tin năng đang phát triễn");
    setShowMenu(false);
  };

  const handleDeleteForMe = () => {
    onDeleteMessage(msg.id);
    setShowMenu(false);
  };

  // --- CHECK IF MESSAGE IS RECALLED ---
  if (msg.recalled_at) {
    return (
      <div
        className={`flex gap-2.5 ${isMine ? "justify-end" : "justify-start"
          } relative`}
      >
        {isLastInSequence && !isMine ? (
          <UserAvatar
            avatar={msg.sender_avatar}
            display_name={msg.sender_name}
            showOnlineStatus={false}
            size={32}
          />
        ) : (
          <div className="w-8 md:w-9" />
        )}

        <div
          className={`px-3 py-2 rounded-sm border text-sm italic
          ${isMine
              ? "bg-gray-100 border-none text-gray-700"
              : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
        >
          {isMine ? "Bạn đã thu hồi một tin nhắn" : "Tin nhắn đã bị thu hồi"}
        </div>
      </div>
    );
  }

  // Render reply preview trong message bubble (khi tin nhắn này reply tin khác)
  const renderReplyPreview = () => {
    if (!msg.reply || msg.reply.id === "000000000000000000000000") return null;

    const hasReplyMedia = ["image", "video", "file"].includes(msg.reply.type);

    return (
      <div
        onClick={() => setMessageID(msg.reply?.id ?? "")}
        className="mb-3 w-full cursor-pointer"
      >
        <div className="flex gap-3 p-3 rounded-lg bg-gray-50 border-l-4 border-gray-300 hover:bg-gray-100 transition-colors">
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
            <div className="text-sm font-semibold text-gray-900 truncate">
              {msg.reply.sender}
            </div>

            <div className="text-sm text-gray-900 line-clamp-2 break-words">
              {msg.reply.type === "image" && "[Hình Ảnh]"}
              {msg.reply.type === "video" && "[Video]"}
              {msg.reply.type === "file" && (
                <span className="text-gray-900">
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
    const systemGroup = [];
    let currentIndex = index;

    while (
      currentIndex < messages.length &&
      messages[currentIndex].type === "system"
    ) {
      systemGroup.push(messages[currentIndex]);
      currentIndex++;
    }

    const isFirstInGroup = index === 0 || messages[index - 1].type !== "system";

    if (!isFirstInGroup) return null;

    return <SystemGroup systemGroup={systemGroup} />;
  }

  // --- RENDER TASK CARD ---

  if (msg.type === "task") {
    const task = msg.task;
    if (!task) {
      return (
        <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm max-w-[300px] text-center">
          <p className="text-gray-500 text-sm">
            Thông tin công việc không khả dụng
          </p>
        </div>
      );
    }

    const isGroupTask = (task.assignees?.length ?? 0) > 0;
    const myAssigneeEntry = isGroupTask
      ? task.assignees?.find(a => a.assignee_id === user?.data?.id)
      : null;
    const isTaskAssignedToMe = isGroupTask
      ? (myAssigneeEntry?.status === "pending_acceptance")
      : user?.data?.id === task.assignee_id;

    const handleAccept = async () => {
      if (isUpdating) return;

      setIsUpdating(true);
      try {
        const assigneeId = isGroupTask ? (user?.data?.id ?? undefined) : undefined;
        await taskApi.updateTaskStatus(task.id, "accepted", assigneeId);

        toast.success("✓ Bạn đã tiếp nhận công việc!");

        socketManager.sendRepTask(
          user?.data.id ?? "",
          selectedChat?.user_id ?? "",
          selectedChat?.group_id ?? "",
          { ...task, status: "accepted" as TaskStatus },
        );
      } catch (error) {
        console.error("Accept task failed:", error);
        toast.error("Không thể tiếp nhận công việc. Vui lòng thử lại.");
      } finally {
        setIsUpdating(false);
      }
    };

    const handleReject = async () => {
      if (isUpdating) return;

      setIsUpdating(true);
      try {
        // Group task: truyền assignee_id để backend cập nhật đúng người
        const assigneeId = isGroupTask ? (user?.data?.id ?? undefined) : undefined;
        await taskApi.updateTaskStatus(task.id, "rejected", assigneeId);

        toast.info("✗ Bạn đã từ chối công việc");

        socketManager.sendRepTask(
          user?.data.id ?? "",
          selectedChat?.user_id ?? "",
          selectedChat?.group_id ?? "",
          { ...task, status: "rejected" as TaskStatus }
        );
      } catch (error) {
        console.error("Reject task failed:", error);
        toast.error("Không thể từ chối công việc. Vui lòng thử lại.");
      } finally {
        setIsUpdating(false);
      }
    };
    return (
      <div className="flex flex-col items-center w-full mb-6 group relative">
        <TaskCard
          task={task}
          isMine={isTaskAssignedToMe}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      </div>
    );
  }

  const bubbleStyles = isMine
    ? "bg-blue-50 text-gray-900 border border-blue-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
    : "bg-white text-gray-900 border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

  const statusInfo =
    statusMap[(msg.status as keyof typeof statusMap) ?? "sent"] ||
    statusMap.sent;

  const renderMedia = () => {
    if (!mediaItems.length) return null;
    const count = mediaItems.length;

    // Build URL for each item
    const urls = mediaItems.map(m =>
      m.type === "video"
        ? `${API_ENDPOINTS.STREAM_MEDIA}/${m.id}`
        : `${API_ENDPOINTS.UPLOAD_MEDIA}/${m.url}`
    );

    // 1 item — tall aspect
    if (count === 1) {
      const m = mediaItems[0];
      return (
        <div className="mt-2 rounded-xl overflow-hidden ring-1 ring-black/5 cursor-pointer group" onClick={() => onPreviewMedia(urls[0])}>
          <div className="aspect-[4/3] relative bg-gray-100">
            {m.type === "video" ? (
              <><video src={urls[0]} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" muted preload="metadata" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="backdrop-blur-sm bg-white/20 rounded-full p-3 shadow-md">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
              </div></>
            ) : (
              <img src={urls[0]} alt={m.filename} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
            )}
          </div>
        </div>
      );
    }

    // 2 items — side by side
    if (count === 2) {
      return (
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl overflow-hidden ring-1 ring-black/5">
          {mediaItems.map((m, i) => (
            <div key={m.id} className="aspect-square relative bg-gray-100 cursor-pointer group overflow-hidden" onClick={() => onPreviewMedia(urls[i])}>
              {m.type === "video" ? (
                <><video src={urls[i]} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" muted preload="metadata" />
                <div className="absolute inset-0 flex items-center justify-center"><div className="backdrop-blur-sm bg-white/20 rounded-full p-2.5"><Play className="w-4 h-4 text-white fill-white" /></div></div></>
              ) : (
                <img src={urls[i]} alt={m.filename} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
              )}
            </div>
          ))}
        </div>
      );
    }

    // 3 items — Pinterest: 1 large left spanning 2 rows + 2 stacked right
    if (count === 3) {
      return (
        <div className="mt-2 rounded-xl overflow-hidden ring-1 ring-black/5" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto', gap: '2px' }}>
          {/* Left large */}
          <div className="relative bg-gray-100 cursor-pointer group overflow-hidden rounded-tl-xl rounded-bl-xl" style={{ gridRow: '1 / 3', aspectRatio: '1/1' }} onClick={() => onPreviewMedia(urls[0])}>
            {mediaItems[0].type === "video" ? (
              <><video src={urls[0]} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" muted preload="metadata" />
              <div className="absolute inset-0 flex items-center justify-center"><div className="backdrop-blur-sm bg-white/20 rounded-full p-3"><Play className="w-5 h-5 text-white fill-white" /></div></div></>
            ) : (
              <img src={urls[0]} alt={mediaItems[0].filename} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
            )}
          </div>
          {/* Top right */}
          <div className="relative bg-gray-100 cursor-pointer group overflow-hidden rounded-tr-xl aspect-square" onClick={() => onPreviewMedia(urls[1])}>
            {mediaItems[1].type === "video" ? (
              <><video src={urls[1]} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" muted preload="metadata" />
              <div className="absolute inset-0 flex items-center justify-center"><div className="backdrop-blur-sm bg-white/20 rounded-full p-2"><Play className="w-4 h-4 text-white fill-white" /></div></div></>
            ) : (
              <img src={urls[1]} alt={mediaItems[1].filename} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
            )}
          </div>
          {/* Bottom right */}
          <div className="relative bg-gray-100 cursor-pointer group overflow-hidden rounded-br-xl aspect-square" onClick={() => onPreviewMedia(urls[2])}>
            {mediaItems[2].type === "video" ? (
              <><video src={urls[2]} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" muted preload="metadata" />
              <div className="absolute inset-0 flex items-center justify-center"><div className="backdrop-blur-sm bg-white/20 rounded-full p-2"><Play className="w-4 h-4 text-white fill-white" /></div></div></>
            ) : (
              <img src={urls[2]} alt={mediaItems[2].filename} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
            )}
          </div>
        </div>
      );
    }

    // 4 items — clean 2×2 grid
    if (count === 4) {
      return (
        <div className="mt-2 grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden ring-1 ring-black/5">
          {mediaItems.map((m, i) => (
            <div key={m.id} className={`aspect-square relative bg-gray-100 cursor-pointer group overflow-hidden ${
              i === 0 ? 'rounded-tl-xl' : i === 1 ? 'rounded-tr-xl' : i === 2 ? 'rounded-bl-xl' : 'rounded-br-xl'
            }`} onClick={() => onPreviewMedia(urls[i])}>
              {m.type === "video" ? (
                <><video src={urls[i]} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" muted preload="metadata" />
                <div className="absolute inset-0 flex items-center justify-center"><div className="backdrop-blur-sm bg-white/20 rounded-full p-2"><Play className="w-4 h-4 text-white fill-white" /></div></div></>
              ) : (
                <img src={urls[i]} alt={m.filename} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
              )}
            </div>
          ))}
        </div>
      );
    }

    // 5+ items — 3-column grid, last slot shows overflow count
    const visible = mediaItems.slice(0, 6);
    const overflow = count - 6;
    return (
      <div className="mt-2 grid grid-cols-3 gap-0.5 rounded-xl overflow-hidden ring-1 ring-black/5">
        {visible.map((m, i) => (
          <div key={m.id} className="aspect-square relative bg-gray-100 cursor-pointer group overflow-hidden" onClick={() => onPreviewMedia(urls[i])}>
            {m.type === "video" ? (
              <><video src={urls[i]} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" muted preload="metadata" />
              <div className="absolute inset-0 flex items-center justify-center"><div className="backdrop-blur-sm bg-white/20 rounded-full p-2"><Play className="w-4 h-4 text-white fill-white" /></div></div></>
            ) : (
              <img src={urls[i]} alt={m.filename} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
            )}
            {i === 5 && overflow > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-xl font-bold">+{overflow}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderFiles = () => {
    if (!fileItems.length) return null;

    return (
      <div className="mt-2 space-y-1.5">
        {fileItems.map((file) => {
          const mediaUrl = `${API_ENDPOINTS.UPLOAD_MEDIA}/${file.url}`;
          const ext = file.filename.split(".").pop()?.toUpperCase() ?? "FILE";
          return (
            <div
              key={file.id}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border bg-gray-50 border-gray-200 hover:border-gray-300 transition-colors duration-150 max-w-full"
            >
              {/* File icon */}
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white border border-gray-200 flex flex-col items-center justify-center">
                <FileText className="w-4 h-4 text-gray-700" />
                <span className="text-[7px] font-bold text-gray-700 leading-none mt-0.5">{ext}</span>
              </div>

              {/* Filename */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 font-medium truncate" title={file.filename}>
                  {file.filename}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">{ext}</p>
              </div>

              {/* Download button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  forceDownload(mediaUrl, file.filename);
                }}
                className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-gray-900 opacity-60 hover:opacity-100 transition-opacity !bg-transparent !border-none !p-0"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {shouldShowTimestamp && (
        <div className="flex justify-center my-4">
          <span className="text-xs text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
            {formatTimestamp(msg.created_at)}
          </span>
        </div>
      )}

      <AnimatePresence initial={false}>
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={`flex gap-2.5 items-end ${isMine ? "justify-end" : "justify-start"
            } relative`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
          }}
        >
          {isLastInSequence && !isMine ? (
            <UserAvatar
              avatar={msg.sender_avatar}
              display_name={msg.sender_name}
              showOnlineStatus={false}
              size={32}
            />
          ) : (
            <div className="w-8 md:w-9" />
          )}

          <div
            className={`flex flex-col ${isMine ? "items-end" : "items-start"
              } ${
                mediaItems.length > 0 
                  ? "max-w-[75%] sm:max-w-[60%] md:max-w-[50%]" 
                  : "max-w-[85%] sm:max-w-[75%] md:max-w-[68%]"
              } gap-1 relative mb-5 group/bubble`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
          >
            {/* Footer: Reactions & Comment Count */}
            {((msg.reactions && msg.reactions.length > 0) || Number(msg.comment_count) > 0) && (
              <div className={`
                absolute -bottom-6 left-0 right-0 flex items-center justify-between z-10
              `}>
                {/* Reactions (Left side if received, group with link if sent) */}
                <div className={`flex items-center gap-1 ${isMine ? "flex-1 justify-end mr-2" : ""}`}>
                  {msg.reactions && msg.reactions.length > 0 && Object.entries(
                    (msg.reactions || []).reduce((acc: Record<string, number>, r) => {
                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([emoji, count]) => {
                    const reactors = (msg.reactions || [])
                      .filter(r => r.emoji === emoji)
                      .map(r => r.user_name || "Unknown")
                      .join(", ");

                    return (
                      <button
                        key={emoji}
                        onClick={() => setShowReactionDetails(!showReactionDetails)}
                        className="bg-white border border-gray-200 rounded-full px-2 py-0.5 shadow-sm text-[12px] flex items-center gap-1 cursor-pointer hover:shadow-md transition-shadow"
                        title={reactors}
                      >
                        <span>{emoji}</span>
                        <span className="text-gray-600 font-medium tabular-nums">{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Comment Link (Always far right) */}
                {Number(msg.comment_count) > 0 && (
                  <button 
                    onClick={handleThread}
                    className="flex items-center gap-1 bg-blue-50 text-[#00568c] border border-[#00568c]/30 rounded-full px-2.5 py-0.5 text-[11px] font-semibold hover:bg-blue-100 transition-colors"
                  >
                    <MessageSquare size={10} />
                    <span>{msg.comment_count} {isMobile ? "" : "bình luận"}</span>
                  </button>
                )}

                {/* Reaction Details Popover */}
                {showReactionDetails && (
                  <div
                    ref={reactionDetailsRef}
                    className="absolute bottom-full mb-3 bg-white/95 backdrop-blur-md !rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] !border !border-white/20 !p-4 !w-72 !z-50 !transition-all"
                    style={{ left: isMine ? "auto" : 0, right: isMine ? 0 : "auto" }}
                  >
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-800">Biểu cảm tin nhắn</p>
                      <button
                        onClick={() => setShowReactionDetails(false)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <Plus className="w-4 h-4 rotate-45" />
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                      {(msg.reactions || []).map((reaction, idx) => (
                        <div key={idx} className="flex items-center gap-3 group">
                          <div className="!w-10 !h-10 !rounded-full !bg-gray-50 !flex !items-center !justify-center !text-xl !shadow-sm group-hover:!scale-110 !transition-transform">
                            {reaction.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-800 truncate" title={reaction.user_name}>
                              {reaction.user_name || "Người dùng"}
                            </div>
                            <div className="text-[11px] text-gray-400">Đã thả cảm xúc</div>
                          </div>
                          {reaction.user_id === currentUserId && (
                            <button
                              onClick={() => socketManager.sendReaction(msg.id, currentUserId ?? "", reaction.emoji, "remove", user?.data.display_name ?? "")}
                              className="text-[10px] text-red-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Gỡ
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Remove All Button - Only if current user has reactions */}
                    {(msg.reactions || []).some(r => r.user_id === currentUserId) && (
                      <button
                        onClick={handleRemoveAllReactions}
                        className="mt-4 !w-full !py-2 !text-xs !font-medium !text-red-500 !bg-red-50 !rounded-xl hover:!bg-red-100 !transition-colors !border !border-red-100"
                      >
                        Gỡ tất cả cảm xúc của tôi
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Hover actions */}
            {isHovered && !showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -3 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -3 }}
                className={`
                  absolute bottom-1 -translate-y-1 hidden md:flex items-center gap-1.5 z-20
                  ${isMine ? "right-full mr-2" : "left-full ml-2"}
                `}
              >
                {/* Reply button */}
                <button
                  onClick={handleReply}
                  className="w-7 h-7 flex items-center justify-center !rounded-full bg-white border border-gray-200 shadow-sm hover:translate-y-[-2px] hover:shadow-md transition-all duration-200"
                  title="Trả lời"
                >
                  <Reply className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {/* More button */}
                <button
                  onClick={() => setShowMenu(true)}
                  className="w-7 h-7 flex items-center justify-center !rounded-full bg-white border border-gray-200 shadow-sm hover:translate-y-[-2px] hover:shadow-md transition-all duration-200"
                >
                  <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {/* Reaction button */}
                <button
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  className="w-7 h-7 flex items-center justify-center !rounded-full bg-white border border-gray-200 shadow-sm hover:translate-y-[-2px] hover:shadow-md transition-all duration-200"
                  title="Thả cảm xúc"
                >
                  <Smile className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {/* Thread button */}
                <button
                  onClick={handleThread}
                  className="w-7 h-7 flex items-center justify-center !rounded-full bg-white border border-gray-200 shadow-sm hover:translate-y-[-2px] hover:shadow-md transition-all duration-200"
                  title="Bình luận (Thread)"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {/* Emoji Picker Popover */}
                {showReactionPicker && (
                  <motion.div
                    ref={reactionPickerRef}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className={`absolute bottom-full mb-2 z-50 w-auto
                    ${isMine ? "right-0" : "left-0"}
                !rounded !shadow-2xl !overflow-hidden !border !border-gray-200`}
                  >
                    <div className="!bg-white !rounded-lg !shadow-xl !border !border-gray-200 !p-1">
                      {!showFullPicker ? (
                        <div className="flex items-center gap-0.5">
                          {["👍", "❤️", "😂", "😮", "😢", "😠"].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleQuickReaction(emoji)}
                              className="text-xl hover:!bg-gray-100 !p-0.5 !rounded !transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            onClick={() => setShowFullPicker(true)}
                            className="!p-1 hover:!bg-gray-100 !rounded-full !transition-colors"
                          >
                            <Plus className="w-5 h-5 text-gray-500" />
                          </button>
                        </div>
                      ) : (
                        <EmojiPicker
                          onEmojiClick={handleEmojiClick}
                          theme={Theme.LIGHT}
                          width={330}
                          height={350}
                          previewConfig={{ showPreview: false }}
                          skinTonesDisabled
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Menu dropdown */}
            {showMenu && (
              <div className={!isMobile ? `absolute bottom-4 z-[110] ${isMine ? "right-full mr-1" : "left-full ml-1"}` : ""}>
                <MessageMenu
                  msg={msg}
                  showMenu={showMenu}
                  setShowMenu={setShowMenu}
                  isMine={isMine}
                  isMobile={isMobile}
                  senderName={msg.sender_name || display_name}
                  senderAvatar={msg.sender_avatar}
                  onReaction={handleQuickReaction}
                  onReply={handleReply}
                  onCopy={handleCopy}
                  onCopyMedia={handleCopyMedia}
                  onDownloadAll={handleDownloadAll}
                  onPin={handlePin}
                  onStar={handleStar}
                  onSelectMultiple={handleSelectMultiple}
                  onViewDetail={handleViewDetail}
                  onRecall={handleRecall}
                  onReport={handleReport}
                  onDeleteForMe={handleDeleteForMe}
                  onForward={() => onForward?.(msg.id)}
                  onThread={handleThread}
                />
              </div>
            )}

            {/* Message bubble */}
            <div
              className={`px-3 py-2 md:px-4 md:py-2.5 rounded-2xl border max-w-full leading-relaxed transition-all duration-300 break-words ${bubbleStyles} ${size === "small" || isMobile ? "text-sm" : "text-[15px]"
                } ${isHighlighted
                  ? "ring-2 ring-blue-400 shadow-lg z-[10]"
                  : ""
                } ${showMenu ? "opacity-50 md:opacity-100 z-[10]" : ""}`}
            >
              {shouldShowSenderName && (
                <div className="text-[13px] font-semibold text-[#5c3d1e] mb-1">
                  {msg.sender_name || display_name}
                </div>
              )}
              {/* Hiển thị reply preview nếu tin nhắn này reply tin khác */}
              {renderReplyPreview()}

              {renderMedia()}
              {renderFiles()}
              {msg.content && editor && (
                <LongMessageContent
                  content={msg.content}
                  isMine={isMine}
                  maxLength={1000} // Ngưỡng để xem là tin nhắn dài
                />
              )}
            </div>


            {/* Quick Heart Reaction (Desktop & Mobile Opponent Only) */}
            {(() => {
              const hasMyHeart = msg.reactions?.some(r => r.emoji === "❤️" && r.user_id === currentUserId);
              return !isMine && !msg.recalled_at && (isHovered || hasMyHeart) && (
                <button
                  onClick={() => handleQuickReaction("❤️")}
                  className={`
                    absolute -bottom-0.5 -right-2 !flex !items-center !justify-center 
                    !rounded-full !border !transition-all !duration-200 !z-20 group/heart !cursor-pointer
                    ${hasMyHeart
                      ? "!bg-red-500 !border-red-500 !opacity-100 !shadow-md !scale-110 !w-4 !h-4"
                      : `!bg-gray-100/80 !border-gray-200 hover:!bg-red-500 hover:!border-red-500 !shadow-sm !w-5 !h-5 ${isMobile ? "!opacity-0" : (isHovered ? "!opacity-100" : "!opacity-0")}`
                    }
                  `}
                >
                  <Heart
                    className={`transition-colors duration-200 ${hasMyHeart
                      ? "text-white fill-current w-2 h-2"
                      : "text-gray-400 group-hover/heart:text-white w-2.5 h-2.5"
                      }`}
                  />
                </button>
              );
            })()}

            {isLastInSequence && (
              <div className="flex items-center gap-1.5 pl-1 pr-1 mt-0.5">
                {isMine && isLastMineMessage && (
                  <>
                    <span className="text-[11px] text-gray-400">{formatTime(msg.created_at)}</span>
                    <span className="flex items-center gap-0.5 text-gray-400">
                      <statusInfo.icon className="w-2.5 h-2.5" />
                      <span className="text-[11px]">{statusInfo.label}</span>
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
