import { useEffect, useMemo, useRef } from "react";
import { X, Clock, User, FileText, Paperclip, Calendar, Send, MessageSquare, Edit2, Download, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task } from "../../../api/taskApi";

import { useState } from "react";
import { taskApi } from "../../../api/taskApi";
import { toast } from "react-toastify";
import CommentItem from "./CommentItem";
import type { TaskComment } from "../../../types/task-comment";
import { useRecoilState, useRecoilValue } from "recoil";
import { taskCommentsAtom } from "../../../recoil/atoms/taskComment";
import { userAtom } from "../../../recoil/atoms/userAtom";
import { selectedChatState } from "../../../recoil/atoms/chatAtom";
import { socketManager } from "../../../api/socket";
import ConfirmModal from "../../notification/ConfirmModal";
import { API_ENDPOINTS } from "../../../config/api";
import { NavLink } from "react-router-dom";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onTaskUpdate?: (updatedTask: Task) => void;
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onTaskUpdate,
}: TaskDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const user = useRecoilValue(userAtom)
  const selectedChat = useRecoilValue(selectedChatState);
  
  // Comment states với Recoil
  const [commentsCache, setCommentsCache] = useRecoilState(taskCommentsAtom);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editingComment, setEditingComment] = useState<TaskComment | null>(null);
  const [sendingComment, setSendingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [currentPage, _] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  console.log("totalComments",totalComments)
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<TaskComment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<TaskComment | null>(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Task["status"] | null>(null);
  // Assignees pagination + filter
  const ASSIGNEE_PAGE_SIZE = 5;
  const [assigneeFilterStatus, setAssigneeFilterStatus] = useState<Task["status"] | "all">("all");
  const [assigneePage, setAssigneePage] = useState(1);
  const [showAssigneeFilterDropdown, setShowAssigneeFilterDropdown] = useState(false);
  const assigneeFilterRef = useRef<HTMLDivElement>(null);
  const currentUserId = user?.data.id;
  const isGroupTask = (task.assignees?.length ?? 0) > 0;
  // Trạng thái hiệu lực: nếu là group task, dùng trạng thái riêng của người dùng hiện tại
  const myAssigneeStatus = isGroupTask
    ? task.assignees?.find(a => a.assignee_id === currentUserId)
    : null;
  const myEffectiveStatus = (isGroupTask && myAssigneeStatus)
    ? myAssigneeStatus.status
    : task.status;
  const isTerminalStatus = myEffectiveStatus === "rejected" || myEffectiveStatus === "cancel" || myEffectiveStatus === "done";
  const isAssigneeOfTask = currentUserId === task.assignee_id || (isGroupTask && myAssigneeStatus != null);
  const canUpdateStatus = (currentUserId === task.creator_id || isAssigneeOfTask) && !isTerminalStatus;

  // Load comments với cache
  const loadComments = async (forceRefresh = false) => {
    if (!task?.id) return;

    // Kiểm tra cache trước
    const cachedComments = commentsCache[task.id];
      if (!forceRefresh && cachedComments && cachedComments.length > 0) {
        setComments(cachedComments);
        return;
      }

    setLoadingComments(true);
    try {
      const response = await taskApi.getTaskComments(task.id, 50, currentPage);
      const rawComments = response.data?.data;
      const newComments = Array.isArray(rawComments) ? rawComments : [];


      setComments(newComments);
      setTotalComments(response.data.total);
      
      // Cập nhật cache
      if (newComments.length > 0) {
        setCommentsCache(prev => ({
          ...prev,
          [task.id]: newComments,
        }));
      }
    } catch (error) {
      console.error("Load comments error:", error);
      toast.error("Không thể tải bình luận");
    } finally {
      setLoadingComments(false);
    }
  };

  // Load comments khi modal mở hoặc task thay đổi
  useEffect(() => {
    if (isOpen && task?.id) {
      loadComments();
    }
  }, [isOpen, task?.id]);

  // Real-time comments listener
  useEffect(() => {
    if (!isOpen || !task?.id) return;

    const handleTaskComment = (data: any) => {
      if (data.type === "task_comment" && data.message) {
        const newComment: TaskComment = data.message;
        
        // Chỉ xử lý nếu comment thuộc task này
        if (newComment.task_id === task.id) {
          if (newComment.type_act === "created" || newComment.type_act === "system") {
            setComments(prev => {
              // Tránh duplicate if we are the sender
              if (prev.some(c => c.id === newComment.id)) return prev;
              const updated = [...prev, newComment];
              
              // Cập nhật cache Recoil
              setCommentsCache(cache => ({
                ...cache,
                [task.id]: updated
              }));
              
              return updated;
            });
          } else if (newComment.type_act === "updated") {
            setComments(prev => {
              const updated = prev.map(c => c.id === newComment.id ? newComment : c);
              setCommentsCache(cache => ({
                ...cache,
                [task.id]: updated
              }));
              return updated;
            });
          } else if (newComment.type_act === "deleted") {
            setComments(prev => {
              const updated = prev.filter(c => c.id !== newComment.id);
              setCommentsCache(cache => ({
                ...cache,
                [task.id]: updated
              }));
              return updated;
            });
          }
        }
      }
    };

    socketManager.addListener(handleTaskComment);
    return () => socketManager.removeListener(handleTaskComment);
  }, [isOpen, task?.id, setCommentsCache]);

  // Scroll to bottom khi comments thay đổi
  useEffect(() => {
    if (showComments) {
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [comments, showComments]);

  // Close status menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    if (showStatusMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStatusMenu]);

  // Close assignee filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeFilterRef.current && !assigneeFilterRef.current.contains(event.target as Node)) {
        setShowAssigneeFilterDropdown(false);
      }
    };
    if (showAssigneeFilterDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssigneeFilterDropdown]);

// Handle update comment
const handleSubmitComment = async () => {
  if (!commentText.trim() || sendingComment) return;

  setSendingComment(true);
  try {
    if (editingComment) {
      const newContent = commentText.trim();
      const now = new Date().toISOString();

      const response = await taskApi.updateTaskComment(
        editingComment.id,
        newContent
      );

      if (response.status === 200 || response.data) {

        // 🔹 Payload gửi socket
        const receiverId = currentUserId === task.creator_id ? task.assignee_id : task.creator_id;
        const socketComment: TaskComment = {
          ...editingComment,
          content: newContent,
          updated_at: now,
          sender_id: currentUserId,
          group_id: task.group_id || selectedChat?.group_id,
          receiver_id: receiverId,
          type_act: "updated",
        };

        socketManager.sendTaskComment(socketComment);

        // 🔹 Update local comments (UI đang mở)
        const updatedComments = comments.map((c) => {
          // Update comment gốc
          if (c.id === editingComment.id) {
            return {
              ...c,
              content: newContent,
              updated_at: now,
            };
          }

          // Update reply_to_content của reply
          if (c.reply_to_id === editingComment.id) {
            return {
              ...c,
              reply_to_content: newContent,
              updated_at: now,
            };
          }

          return c;
        });

        setComments(updatedComments);

        // 🔹 Update Recoil cache (giống logic add)
        setCommentsCache((prev) => {
          // ❌ Task chưa được load → bỏ qua
          if (!prev[task.id]) return prev;

          return {
            ...prev,
            [task.id]: prev[task.id].map((c) => {
              if (c.id === editingComment.id) {
                return {
                  ...c,
                  content: newContent,
                  updated_at: now,
                };
              }

              if (c.reply_to_id === editingComment.id) {
                return {
                  ...c,
                  reply_to_content: newContent,
                  updated_at: now,
                };
              }

              return c;
            }),
          };
        });

        toast.success("Cập nhật bình luận thành công!");
        setEditingComment(null);
      }
    }
  else {
      const payload: any = { 
        task_id: task.id, 
        content: commentText.trim() 
      };
      
      if (replyingTo) {
        payload.reply_to_id = replyingTo.id;
        payload.reply_to_user_id = replyingTo.user_id;
        payload.reply_to_avatar = replyingTo.user_avatar;
        payload.reply_to_content = replyingTo.content;
        payload.reply_to_username = replyingTo.user_name;
      }
      const response = await taskApi.createTaskComment(payload);
      if (response.status === 200) {
        const newComment = response.data;
        const updatedComments = [...comments, newComment];
        
        const receiverId = currentUserId === task.creator_id ? task.assignee_id : task.creator_id;
        const socketComment: TaskComment = {
          ...newComment,
          sender_id: currentUserId,
          group_id: task.group_id || selectedChat?.group_id,
          receiver_id: receiverId,
          type_act: "created",
        };

        socketManager.sendTaskComment(socketComment)
        setComments(updatedComments);
        setCommentsCache(prev => ({
          ...prev,
          [task.id]: updatedComments,
        }));
        
        toast.success(replyingTo ? "Đã phản hồi bình luận!" : "Thêm bình luận thành công!");
        setReplyingTo(null);
      }
    }

    setCommentText("");
  } catch (error) {
    console.error("Submit comment error:", error);
    toast.error(
      editingComment ? "Không thể cập nhật bình luận" : "Không thể thêm bình luận"
    );
  } finally {
    setSendingComment(false);
  }
};

// Handle delete comment
const handleDeleteComment = (comment: TaskComment) => {
  setCommentToDelete(comment);
  setShowDeleteConfirm(true);
};

const confirmDeleteComment = async () => {
  if (!commentToDelete) return;

  try {
    // Gọi API xóa comment
    const response = await taskApi.deleteTaskComment(commentToDelete.id);

    if (response.status === 200 || response.data) {
      // Xóa comment khỏi state local
      const receiverId = currentUserId === task.creator_id ? task.assignee_id : task.creator_id;
      const socketComment: TaskComment = {
            ...commentToDelete,
            sender_id: currentUserId,
            group_id: task.group_id || selectedChat?.group_id,
            receiver_id: receiverId,
            type_act: "deleted",
        };
      
      socketManager.sendTaskComment(socketComment)
      const updatedComments = comments.filter((c) => c.id !== commentToDelete.id);
      setComments(updatedComments);
      setTotalComments((prev) => prev - 1);

      // Cập nhật cache Recoil
      setCommentsCache((prev) => ({
        ...prev,
        [task.id]: updatedComments,
      }));

      toast.success("Xóa bình luận thành công!");

      // Nếu đang edit comment bị xóa, hủy edit
      if (editingComment?.id === commentToDelete.id) {
        handleCancelEdit();
      }
    }
  } catch (error) {
    console.error("Delete comment error:", error);
    toast.error("Không thể xóa bình luận");
  } finally {
    setShowDeleteConfirm(false);
    setCommentToDelete(null);
  }
};

  // Handle edit comment
  const handleEditComment = (comment: TaskComment) => {
    setEditingComment(comment);
    setReplyingTo(null);
    setCommentText(comment.content);
    setShowComments(true);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 100);
  };

  // Handle reply comment
  const handleReplyComment = (comment: TaskComment) => {
    setReplyingTo(comment);
    setEditingComment(null);
    setCommentText("");
    setShowComments(true);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 100);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingComment(null);
    setCommentText("");
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
    setCommentText("");
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "Chưa xác định";
    return new Date(dateStr).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPriorityColor = (p?: string) => {
    switch (p) {
      case "high": return "text-red-600 bg-red-50";
      case "critical": return "text-red-700 bg-red-100";
      case "low": return "text-gray-600 bg-gray-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getPriorityLabel = (p?: string) => {
    switch (p) {
      case "high": return "Cao";
      case "critical": return "Khẩn cấp";
      case "low": return "Thấp";
      default: return "Trung bình";
    }
  };

  const statusOptions: { value: Task["status"]; label: string; color: string }[] = [
    { value: "pending_acceptance", label: "Chờ tiếp nhận", color: "text-yellow-600" },
    { value: "accepted", label: "Đã tiếp nhận", color: "text-orange-600" },
    { value: "todo", label: "Chưa bắt đầu", color: "text-orange-500" },
    { value: "in_progress", label: "Đang thực hiện", color: "text-blue-600" },
    { value: "done", label: "Đã hoàn thành", color: "text-green-600" },
    { value: "rejected", label: "Đã từ chối", color: "text-red-600" },
    { value: "cancel", label: "Đã hủy", color: "text-gray-600" },
  ];

  const filteredStatusOptions = useMemo(() => {
    // Nếu trạng thái hiện tại là Từ chối, Hủy hoặc Hoàn thành -> Không cho phép thay đổi gì nữa
    if (isTerminalStatus) {
      return [];
    }

    const isAssignee = isAssigneeOfTask;
    const isCreator = currentUserId === task.creator_id;
    let options: typeof statusOptions = [];

    // 1. Đối với Người nhận: Theo workflow cụ thể (dùng myEffectiveStatus cho group task)
    if (isAssignee) {
      if (myEffectiveStatus === "pending_acceptance") {
        options = statusOptions.filter(opt => opt.value === "accepted" || opt.value === "rejected");
      } else if (myEffectiveStatus === "accepted") {
        options = statusOptions.filter(opt => opt.value === "todo" || opt.value === "in_progress");
      } else if (myEffectiveStatus === "todo") {
        options = statusOptions.filter(opt => opt.value === "in_progress");
      } else if (myEffectiveStatus === "in_progress") {
        options = statusOptions.filter(opt => opt.value === "done");
      }
    }

    // 2. Đối với Người tạo (nếu chưa terminal): Luôn có quyền Hủy
    if (isCreator) {
      const hasCancel = options.some(opt => opt.value === "cancel");
      if (!hasCancel) {
        const cancelOpt = statusOptions.find(opt => opt.value === "cancel");
        if (cancelOpt) {
          options = [...options, cancelOpt];
        }
      }
    }

    return options;
  }, [myEffectiveStatus, currentUserId, task.creator_id, task.assignee_id, isTerminalStatus, isAssigneeOfTask]);

  const handleUpdateStatus = async (newStatus: Task["status"]) => {
    if (!canUpdateStatus || isLoading) return;

    // Yêu cầu xác nhận cho các trạng thái terminal (Từ chối, Hủy)
    if ((newStatus === "rejected" || newStatus === "cancel") && !showStatusConfirm) {
      setPendingStatus(newStatus);
      setShowStatusConfirm(true);
      return;
    }

    setIsLoading(true);
    try {
      // Group task: truyền assignee_id của người dùng hiện tại
      const assigneeIdForUpdate = isGroupTask && myAssigneeStatus ? currentUserId : undefined;
      const response = await taskApi.updateTaskStatus(task.id, newStatus, assigneeIdForUpdate);
      const systemComment = response.data?.comment;
      
      // Cập nhật local task: group task → cập nhật assignees[], single → cập nhật status
      let updatedTask: Task;
      if (isGroupTask && myAssigneeStatus) {
        updatedTask = {
          ...task,
          assignees: task.assignees?.map(a =>
            a.assignee_id === currentUserId ? { ...a, status: newStatus } : a
          ),
        };
      } else {
        updatedTask = { ...task, status: newStatus };
      }

      if (onTaskUpdate) {
        onTaskUpdate(updatedTask);
      }
      
      // Emit socket event for realtime updates and notifications
      if (user?.data.id) {
        // Group task: luôn notify creator; single task: notify phía còn lại
        const notifyTarget = isGroupTask
          ? task.creator_id
          : (task.assignee_id === user.data.id ? task.creator_id : task.assignee_id);

        socketManager.sendRepTask(
          user.data.id,
          notifyTarget,
          task.group_id,
          updatedTask
        );

        // Broadcast system comment if it exists
        if (systemComment) {
          const receiverId = isGroupTask ? task.creator_id : (user.data.id === task.creator_id ? task.assignee_id : task.creator_id);
          const socketComment: TaskComment = {
            ...systemComment,
            sender_id: user.data.id,
            group_id: task.group_id,
            receiver_id: receiverId,
            type_act: "system",
          };
          socketManager.sendTaskComment(socketComment);

          // Update local state and cache
          setComments(prev => {
            if (prev.some(c => c.id === socketComment.id)) return prev;
            const updated = [...prev, socketComment];
            setCommentsCache(cache => ({
              ...cache,
              [task.id]: updated
            }));
            return updated;
          });
        }
      }

      toast.success("Cập nhật trạng thái thành công");
      setShowStatusMenu(false);
    } catch (error) {
      console.error("Update status error:", error);
      toast.error("Không thể cập nhật trạng thái");
    } finally {
      setIsLoading(false);
    }
  };

  const currentStatusLabel = statusOptions.find((o) => o.value === myEffectiveStatus)?.label || "Không xác định";
  const currentStatusColor = statusOptions.find((o) => o.value === myEffectiveStatus)?.color || "text-gray-600";

  if (!task) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[450px] bg-white shadow-2xl z-[101] overflow-hidden flex flex-col h-full"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <p className="text-lg font-bold text-gray-900">Chi tiết công việc</p>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={22} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Title & Priority */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-xl font-bold text-gray-900 leading-tight pr-2">
                    {task.title}
                  </p>
                  {task.priority && (
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Trạng thái: <span className={`font-bold ${currentStatusColor}`}>{currentStatusLabel}</span>
                </p>
              </div>

              {/* Description */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3 text-gray-800 font-semibold text-sm">
                  <FileText size={18} />
                  Mô tả công việc
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {task.description || "Không có mô tả chi tiết."}
                </p>
              </div>

              {/* Time info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-gray-200 bg-white">
                  <label className="text-sm text-gray-700 font-medium block mb-2">Thời gian bắt đầu</label>
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
                    <Calendar size={18} className="text-gray-400" />
                    {formatDateTime(task.start_time)}
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-gray-200 bg-white">
                  <label className="text-sm text-gray-700 font-medium block mb-2">Hạn hoàn thành</label>
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
                    <Clock size={18} className="text-gray-400" />
                    {formatDateTime(task.end_time || task.deadline)}
                  </div>
                </div>
              </div>

              {/* Assignee */}
              {isGroupTask ? (() => {
                const allAssignees = task.assignees ?? [];
                const filtered = assigneeFilterStatus === "all"
                  ? allAssignees
                  : allAssignees.filter(a => a.status === assigneeFilterStatus);
                const totalPages = Math.max(1, Math.ceil(filtered.length / ASSIGNEE_PAGE_SIZE));
                const safePage = Math.min(assigneePage, totalPages);
                const paged = filtered.slice((safePage - 1) * ASSIGNEE_PAGE_SIZE, safePage * ASSIGNEE_PAGE_SIZE);

                // Count per status for badge
                const countByStatus = (s: string) => allAssignees.filter(a => a.status === s).length;

                const filterOpts: { value: Task["status"] | "all"; label: string }[] = [
                  { value: "all", label: `Tất cả (${allAssignees.length})` },
                  { value: "pending_acceptance", label: `Chờ (${countByStatus("pending_acceptance")})` },
                  { value: "accepted", label: `Đã nhận (${countByStatus("accepted")})` },
                  { value: "rejected", label: `Từ chối (${countByStatus("rejected")})` },
                  { value: "done", label: `Hoàn thành (${countByStatus("done")})` },
                ];

                const activeFilterLabel = filterOpts.find(o => o.value === assigneeFilterStatus)?.label ?? "Tất cả";

                return (
                  <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    {/* Header với filter dropdown inline */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <User size={18} className="text-gray-700" />
                        <span className="text-sm font-semibold text-gray-700">
                          Danh sách người thực hiện ({allAssignees.length} người)
                        </span>
                      </div>
                      {/* Filter dropdown trigger */}
                      <div className="relative" ref={assigneeFilterRef}>
                        <button
                          onClick={() => setShowAssigneeFilterDropdown(v => !v)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            assigneeFilterStatus !== "all"
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                          }`}
                        >
                          <span>{activeFilterLabel}</span>
                          <ChevronDown size={12} className={`transition-transform ${showAssigneeFilterDropdown ? "rotate-180" : ""}`} />
                        </button>
                        {showAssigneeFilterDropdown && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                            {filterOpts.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  setAssigneeFilterStatus(opt.value);
                                  setAssigneePage(1);
                                  setShowAssigneeFilterDropdown(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                                  assigneeFilterStatus === opt.value
                                    ? "bg-gray-100 text-gray-800 font-semibold"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <span className="flex items-center justify-between">
                                  {opt.label}
                                  {assigneeFilterStatus === opt.value && <span className="text-blue-600">✓</span>}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* List */}
                    <div className="divide-y divide-gray-100">
                      {paged.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-4">Không có kết quả</p>
                      ) : paged.map((a) => {
                        const statusMeta = statusOptions.find(o => o.value === a.status);
                        return (
                          <div key={a.assignee_id} className="flex items-center justify-between px-4 py-3">
                            <span className="text-sm font-medium text-gray-800">{a.assignee_name}</span>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 ${statusMeta?.color ?? "text-gray-600"}`}>
                              {statusMeta?.label ?? a.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                        <span className="text-xs text-gray-500">
                          {(safePage - 1) * ASSIGNEE_PAGE_SIZE + 1}–{Math.min(safePage * ASSIGNEE_PAGE_SIZE, filtered.length)} / {filtered.length}
                        </span>
                        <div className="flex gap-1">
                          <button
                            disabled={safePage === 1}
                            onClick={() => setAssigneePage(p => p - 1)}
                            className="px-2 py-1 rounded text-xs border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition"
                          >
                            ‹
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                              key={p}
                              onClick={() => setAssigneePage(p)}
                              className={`px-2.5 py-1 rounded text-xs border transition ${
                                p === safePage
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "border-gray-200 hover:bg-gray-100 text-gray-600"
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            disabled={safePage === totalPages}
                            onClick={() => setAssigneePage(p => p + 1)}
                            className="px-2 py-1 rounded text-xs border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition"
                          >
                            ›
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center gap-3">
                    <User size={20} className="text-gray-800" />
                    <span className="text-sm text-gray-700 font-medium">Người thực hiện:</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {task.assignee_name || "Chưa giao"}
                  </span>
                </div>
              )}

              {/* Attachments */}
              {task.attachments && task.attachments.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 text-gray-800 font-semibold text-sm">
                    <Paperclip size={18} />
                    File đính kèm ({task.attachments.length})
                  </div>
                  <div className="space-y-2">
                    {task.attachments.map((file, idx) => (
                      <NavLink
                        key={idx}
                        to={`${API_ENDPOINTS.UPLOAD_MEDIA}/${file.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-sm group hover:border-blue-300 !no-underline"
                        download
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Paperclip size={16} className="text-gray-500 shrink-0" />
                          <span className="truncate text-gray-700 font-medium">{file.filename}</span>
                        </div>
                        <Download size={16} className="text-gray-400 group-hover:text-blue-600 shrink-0" />
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t border-gray-200 pt-5">
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-2 text-gray-800 font-semibold">
                    <MessageSquare size={18} />
                    Bình luận ({comments.length})
                  </div>
                  <motion.div
                    animate={{ rotate: showComments ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    ▼
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showComments && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-4">
                        {loadingComments ? (
                          <div className="text-center py-8 text-gray-500">
                            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                            Đang tải bình luận...
                          </div>
                        ) : comments.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            Chưa có bình luận nào
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                            {comments.map((comment) => (
                              <CommentItem
                                key={comment.id}
                                comment={comment}
                                currentUserId={currentUserId ?? ""}
                                onEdit={handleEditComment}
                                onDelete={handleDeleteComment}
                                onReply={handleReplyComment}
                              />
                            ))}
                            <div ref={commentsEndRef} />
                          </div>
                        )}

                        {/* Comment Input */}
                          <div className="sticky bottom-0 bg-white pb-1">
                            {editingComment && (
                              <div className="mb-2 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2">
                                  <Edit2 size={14} className="text-gray-700" />
                                  <span className="text-sm text-gray-700 font-medium">
                                    Đang chỉnh sửa bình luận
                                  </span>
                                </div>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-xs text-gray-500 hover:text-red-600 transition"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )}

                            {replyingTo && (
                              <div className="mb-2 flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-2 text-sm text-blue-700">
                                  <MessageSquare size={14} />
                                  <span>Đang phản hồi <strong>{replyingTo.user_name}</strong></span>
                                </div>
                                <button
                                  onClick={handleCancelReply}
                                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )}
                            
                            <div className="flex gap-2 px-2">
                              <textarea
                                ref={commentInputRef}
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmitComment();
                                  }
                                }}
                                placeholder={replyingTo ? `Phản hồi ${replyingTo.user_name}...` : "Viết bình luận..."}
                                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none text-sm placeholder:text-gray-400"
                                rows={2}
                                disabled={sendingComment}
/>

                            <button
                              onClick={handleSubmitComment}
                              disabled={!commentText.trim() || sendingComment}
                              className="!px-4 !py-3 !bg-blue-600 !text-white !rounded-lg hover:!bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {sendingComment ? (
                                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                              ) : (
                                <Send size={18} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 bg-white border-t border-gray-100 flex justify-between gap-4 sticky bottom-0">
              {showStatusMenu && (
                <div 
                  ref={statusMenuRef}
                  className="absolute bottom-full right-5 mb-3 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden w-56 z-30"
                >
                  {filteredStatusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        handleUpdateStatus(option.value);
                      }}
                      disabled={isLoading}
                      className={`w-full px-5 py-3 text-left text-sm hover:focus:bg-gray-50 flex items-center justify-between transition-colors ${
                        task.status === option.value ? "bg-gray-100 font-semibold" : ""
                      }`}
                    >
                      <span className={option.color}>{option.label}</span>
                      {task.status === option.value && (
                        <span className="text-blue-600 font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="px-6 py-3 !rounded-lg !bg-gray-100 !text-gray-700 text-sm font-medium hover:bg-gray-200 transition"
              >
                Đóng
              </button>

              {canUpdateStatus && filteredStatusOptions.length > 0 && (
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  disabled={isLoading}
                  className="px-6 py-3 !rounded-lg bg-blue-600 !text-white text-sm font-medium hover:bg-blue-700 transition shadow-md disabled:opacity-60"
                >
                  {isLoading ? "Đang xử lý..." : "Cập nhật trạng thái"}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Xác nhận xóa"
        description="Bạn có chắc chắn muốn xóa bình luận này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={confirmDeleteComment}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setCommentToDelete(null);
        }}
      />

      <ConfirmModal
        isOpen={showStatusConfirm}
        title="Xác nhận thay đổi trạng thái"
        description={`Bạn có chắc chắn muốn chuyển trạng thái công việc sang "${statusOptions.find(o => o.value === pendingStatus)?.label}" không? Sau khi xác nhận, bạn sẽ không thể thay đổi trạng thái được nữa.`}
        confirmText="Xác nhận"
        onConfirm={() => {
          if (pendingStatus) {
            handleUpdateStatus(pendingStatus);
            setShowStatusConfirm(false);
            setPendingStatus(null);
          }
        }}
        onCancel={() => {
          setShowStatusConfirm(false);
          setPendingStatus(null);
        }}
      />
    </AnimatePresence>
  );
}
