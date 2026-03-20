import { useEffect, useState } from "react";
import type { Task } from "../../../api/taskApi";
import TaskDetailModal from "../../home/chat_window/TaskDetailModal";
import { Calendar, Paperclip, Download } from "lucide-react";
import { API_ENDPOINTS } from "../../../config/api";

interface TaskCardProps {
  task: Task;
  isMine: boolean;
  onAccept?: () => Promise<void>;
  onReject?: () => Promise<void>;
  onTaskUpdate?: (updatedTask: Task) => void;
}

export default function TaskCard({
  task,
  isMine,
  onAccept,
  onReject,
  onTaskUpdate,
}: TaskCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [localTask, setLocalTask] = useState(task);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  const isPendingAcceptance = localTask.status === "pending_acceptance";
  const showAcceptanceButtons = isMine && isPendingAcceptance;

  const handleAccept = async () => {
    if (!onAccept) return;
    setIsLoading(true);
    try {
      await onAccept();
      setLocalTask({ ...localTask, status: "accepted" as any });
    } catch (err) {
      console.error("Accept failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setIsLoading(true);
    try {
      await onReject();
      setLocalTask({ ...localTask, status: "rejected" as any });
    } catch (err) {
      console.error("Reject failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "Không có hạn";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dayStr = date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return isToday ? `Hôm nay, ${timeStr}` : `${dayStr}, ${timeStr}`;
  };

  return (
    <>
      {/* Card chính */}
      <div
        className="my-3 mx-auto max-w-sm w-full !bg-white !rounded-lg !shadow-2xl !overflow-hidden !border !border-gray-100"
        style={{
          boxShadow:
            "0 10px 25px -5px rgba(190, 139, 67, 0.15), 0 4px 15px -6px rgba(114, 65, 13, 0.1)",
        }}
      >
        {" "}
        {/* Header: Logo trái + Tiêu đề phải - cùng hàng */}
        <div className="flex items-center justify-center gap-6 px-3 py-2">
          <div className="flex flex-col items-center gap-2">
            {/* Logo */}
            <img
              src="/src/assets/Logo-Dai-hoc-Dong-Thap.png"
              alt="Logo"
              className="w-30 h-12 object-contain"
            />

            {/* Chữ Giao Việc nằm bên dưới logo */}
            <p className="text-lg font-bold text-[#5b2f39] leading-tight m-0">
              Giao việc
            </p>
          </div>
        </div>
        {/* Nội dung chính - căn TRÁI */}
        <div className="px-3 pb-2 space-y-2">
          {/* Tiêu đề nhiệm vụ */}
          <p className="text-sm font-semibold text-gray-900 leading-snug">
            {localTask.title}
          </p>

          {/* Mô tả ngắn (nếu có) */}
          {localTask.description && (
            <div className="text-xs text-gray-600 leading-relaxed">
              {/* Hiển thị đoạn ngắn với line-clamp */}
              <div className="line-clamp-3">{localTask.description}</div>
            </div>
          )}

          {/* Thời hạn - căn trái, có icon */}
          {/* Thời gian bắt đầu và kết thúc - nằm ngang, điều ra 2 góc */}
            {/* Nội dung chính - điều ra 2 góc */}
             <div className="grid grid-cols-2 gap-4">
                <div >
                  <label className="text-xs text-gray-500 font-bold block mb-2">Thời gian bắt đầu</label>
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-900">
                    <Calendar size={18} className="text-blue-600" />
                    {formatTime(task.start_time)}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-2">Hạn hoàn thành</label>
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-900">
                    <Calendar size={18} className="text-blue-600" />
                    {formatTime(task.end_time || task.deadline)}
                  </div>
                </div>
            </div>
            {/* Tệp đính kèm */}
            {localTask.attachments && localTask.attachments.length > 0 && (
              <div className="mt-2">
                 <label className="text-xs text-gray-500 block mb-1">Đính kèm</label>
                 <div className="flex flex-col gap-1">
                    {localTask.attachments.map((file, idx) => (
                      <a 
                        key={idx} 
                        href={`${API_ENDPOINTS.UPLOAD_MEDIA}/${file.url}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2 bg-gray-50 !rounded border border-gray-100 hover:bg-gray-100 transition text-sm group hover:border-gray-200 !no-underline"
                        download // helper for downloading if same origin
                      >
                         <Paperclip size={14} className="text-gray-400" />
                         <span className="flex-1 truncate text-gray-700 font-medium">{file.filename}</span>
                         <Download size={14} className="text-gray-400 group-hover:text-blue-600" />
                      </a>
                    ))}
                 </div>
              </div>
            )}

          {/* Thông báo trạng thái đã xử lý */}
          {localTask.status === "accepted" && (
            <div className="!text-sm !font-medium !text-blue-700 !bg-blue-50 !py-2 !px-4 !rounded-sm !inline-flex !items-center !gap-2">
              ✓{" "}
              {isMine
                ? "Bạn đã tiếp nhận công việc này"
                : `${
                    localTask.assignee_name || "Ai đó"
                  } đã tiếp nhận công việc này`}{" "}
            </div>
          )}

          {localTask.status === "rejected" && (
            <div className="!text-sm !font-medium !text-red-600 !bg-red-50 !py-2 !px-4 !rounded-sm !inline-flex !items-center !gap-2">
              ✗
               {isMine
                ? " Bạn đã từ chối công việc này"
                : `${
                    localTask.assignee_name || "Ai đó"
                  } đã từ chối công việc này`}{" "}
            </div>
          )}
        </div>
        {/* Footer - Nút hành động (giữ nguyên như bạn thiết kế) */}
        <div className="px-3 pb-2 space-y-3">
          {showAcceptanceButtons && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleReject}
                disabled={isLoading}
                className="!py-2 !px-3 !border !border-red-600 !text-red-600 !rounded-sm !font-medium !text-sm hover:!bg-red-50 disabled:!opacity-60 !transition !cursor-pointer"
              >
                {isLoading ? "Đang xử lý..." : "Từ chối"}
              </button>
              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="!py-2 !px-3 !bg-blue-600 !border !border-blue-600 !text-white !rounded-sm !font-medium !text-sm hover:!bg-white hover:!text-blue-600 disabled:!opacity-60 !transition !shadow-md !cursor-pointer"
              >
                {isLoading ? "Đang xử lý..." : "Tiếp nhận"}
              </button>
            </div>
          )}

          <button
            onClick={() => setShowDetails(true)}
            className="!w-full !py-2 !px-4 !bg-[#0073bc] !text-white !rounded-sm !font-medium !text-sm hover:!bg-[#00568c] !transition !cursor-pointer !shadow-md"
          >
            Xem chi tiết công việc
          </button>
        </div>
      </div>

      <TaskDetailModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        task={localTask}
        onTaskUpdate={(updated) => {
          setLocalTask(updated);
          onTaskUpdate?.(updated);
        }}
      />
    </>
  );
}
