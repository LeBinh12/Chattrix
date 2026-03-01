import EmojiPicker, { Theme, type EmojiClickData } from "emoji-picker-react";
import { motion } from "framer-motion";
import { Image, Send, Smile, ThumbsUp, FileText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { uploadAPI } from "../../api/upload";
import { toast } from "react-toastify";
import type { Media } from "../../types/upload";
import { socketManager } from "../../api/socket";

import { taskApi } from "../../api/taskApi";
import AssignTaskForm, { type TaskData } from "../home/chat_window/AssignTaskForm"; // Adjust path if needed
import { isMobileDevice } from "../../utils/mobileDetect";

type ChatInputProps = {
  senderID: { id: string };
  receiverID: {
    user_id: string;
    GroupID?: string;
    display_name: string;
    avatar: string;
    online_status?: string;
  };
};

export default function ChatInput({ senderID, receiverID }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // tạm lưu file
  const [previewFile, setPreviewFile] = useState<File | null>(null); // xem lớn
  const [progress, setProgress] = useState<number[]>([]);
  const [isMobile, setIsMobile] = useState(isMobileDevice()); // Track mobile device
  const pickerRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);

  // Task Modal State
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  // const [taskTitle, setTaskTitle] = useState(""); // Init logic if needed

  const handleEmojiClick = (emojiData: EmojiClickData) =>
    setMessage((prev) => prev + emojiData.emoji);

  const handleSend = async () => {
    // 1. Check for @giaoviec command
    const TASK_REGEX = /@giaoviec\s*(.*)/i;
    const taskMatch = message.match(TASK_REGEX);

    if (taskMatch) {
      // setTaskTitle(taskMatch[1] || ""); // Set title from command
      setIsTaskFormOpen(true);
      return;
    }

    if (message.trim() === "" && selectedFiles.length === 0) return;

    setUploading(true);
    let uploaded: Media[] = [];

    if (selectedFiles.length > 0) {
      try {
        uploaded = await uploadAPI.uploadFiles(
          selectedFiles,
          (percent, index) => {
            setProgress((prev) => {
              const updated = [...prev];
              updated[index] = percent;
              return updated;
            });
          }
        );
      } catch (err) {
        const error = err as {
          response?: { data?: { error?: string } };
          message?: string;
        };
        console.error("Upload lỗi:", error);
        toast.error(
          `Upload file lỗi: ${error.response?.data?.error || error.message}`
        );
        setUploading(false);
        return;
      }
    }

    socketManager.sendMessage(
      senderID.id,
      receiverID.user_id,
      receiverID.GroupID || "",
      message,
      uploaded
    );

    setMessage("");
    setSelectedFiles([]);
    setProgress([]);
    setPreviewFile(null);
    setUploading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setSelectedFiles(files);
    setProgress(files.map(() => 0));
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateTask = async (data: TaskData) => {
    try {
      const res = await taskApi.createTask({
        ...data,
        group_id: receiverID.GroupID || "000000000000000000000000",
      });
      const createdTasks: any[] = Array.isArray(res.data.data)
        ? res.data.data
        : [res.data.data];
      toast.success(
        createdTasks.length > 1
          ? `Đã giao việc cho ${createdTasks.length} người thành công!`
          : "Đã giao việc thành công!"
      );
      setMessage("");
      setIsTaskFormOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Giao việc thất bại, vui lòng thử lại");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

 
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

  
    setIsMobile(isMobileDevice());

   
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="p-2 sm:p-3 flex flex-col bg-white shadow-[0_-2px_6px_rgba(0,0,0,0.1)]">
      {/* Preview file */}
      {selectedFiles.length > 0 && (
        <div className="flex overflow-x-auto gap-2 mb-2 py-1">
          {selectedFiles.map((file, index) => {
            const isImage = file.type.startsWith("image/");
            const isVideo = file.type.startsWith("video/");
            const fileUploading = uploading;

            return (
              <div
                key={index}
                className="relative w-24 h-24 border rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
              >
                {isImage || isVideo ? (
                  <div
                    className="w-full h-full"
                    onClick={() => setPreviewFile(file)}
                  >
                    {isImage ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={URL.createObjectURL(file)}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center h-full bg-gray-100 text-sm cursor-pointer"
                    onClick={() => alert(`Xem file: ${file.name}`)}
                  >
                    <FileText size={28} />
                  </div>
                )}

                {/* Nút xóa */}
                {!uploading && (
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}

                {/* Loading overlay với % */}
                {fileUploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white text-xs">
                    <div className="w-12 h-12 border-4 border-t-brand-500 border-gray-200 rounded-full animate-spin mb-1"></div>
                    <div>{progress[index] ?? 0}%</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal xem file lớn */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-h-[90%] max-w-[90%]">
            {previewFile.type.startsWith("image/") ? (
              <img
                src={URL.createObjectURL(previewFile)}
                className="max-h-full max-w-full"
              />
            ) : (
              <video
                src={URL.createObjectURL(previewFile)}
                controls
                className="max-h-full max-w-full"
              />
            )}
            <button
              className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-red-500"
              onClick={() => setPreviewFile(null)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center">
        <motion.label
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="relative flex items-center justify-center w-9 h-9 rounded-full cursor-pointer transition-all bg-transparent hover:bg-gray-200"
        >
          <Image size={20} className="text-gray-600" />
          <input type="file" multiple hidden onChange={handleFileSelect} />
        </motion.label>

        {/* Emoji */}

        {/* Text input */}
        <div className="flex-1 flex items-center bg-gray-200 rounded-full px-3 py-2 ml-2 relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
        
                if (!isMobile) {
                  e.preventDefault();
                  handleSend();
                }

              }
            }}
            className="flex-1 bg-transparent outline-none text-sm sm:text-base"
            placeholder="Nhắn tin..."
          />
          <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}>
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="relative flex items-center justify-center w-9 h-9 rounded-full cursor-pointer transition-all bg-transparent hover:bg-gray-300"
            >
              <Smile size={20} className="text-gray-600" />
            </button>
          </motion.div>
          {showPicker && (
            <div ref={pickerRef} className="absolute bottom-12 right-0 z-50">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={Theme.LIGHT}
                searchDisabled
                previewConfig={{ showPreview: false }}
                height={350}
                width={300}
              />
            </div>
          )}
        </div>

        {/* Send */}
        <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}>
          {message.trim().length > 0 || selectedFiles.length > 0 ? (
            <button
              onClick={handleSend}
              disabled={uploading}
              className={`ml-2 p-2 rounded-full text-[#1b4c8a] hover:bg-[#0f3461] cursor-pointer  hover:text-white transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              <Send size={20} />
            </button>
          ) : (
            <button className="ml-2 p-2 rounded-full text-[#1b4c8a] hover:bg-[#0f3461] cursor-pointer hover:text-white transition-colors duration-200">
              <ThumbsUp size={22} />
            </button>
          )}
        </motion.div>
      </div>

      {/* Task Assignment Modal */}
      {isTaskFormOpen && (
        <AssignTaskForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={handleCreateTask}
          groupId={receiverID.GroupID}
          receiver={
            !receiverID.GroupID
              ? {
                user_id: receiverID.user_id,
                display_name: receiverID.display_name,
                avatar: receiverID.avatar,
                online_status: receiverID.online_status,
              }
              : undefined
          }
        />
      )}
    </div>
  );
}
