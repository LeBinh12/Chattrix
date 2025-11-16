import { useEffect, useRef, useState } from "react";
import {
  Send,
  Smile,
  Image,
  ThumbsUp,
  FileText,
  X,
  Paperclip,
  Users,
  PenSquare,
  MessageSquare,
  Zap,
  MoreHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { uploadAPI } from "../../../api/upload";
import type { Media } from "../../../types/upload";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { socketManager } from "../../../api/socket";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import MenuBar from "./MenuBar";
import Placeholder from "@tiptap/extension-placeholder";

type ChatInputWindowProps = {
  user_id: string;
  receiver_id: string;
  group_id: string;
  hasLeftGroup: boolean;
  display_name: string;
  avatar?: string;
  sender_avatar?: string;
};

export default function ChatInputWindow({
  user_id,
  receiver_id,
  group_id,
  hasLeftGroup,
  display_name,
  avatar,
  sender_avatar,
}: ChatInputWindowProps) {
  const [message, setMessage] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [showRichText, setShowRichText] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editorHeight, setEditorHeight] = useState(48);

  const editor = useEditor({
    extensions: [
      Placeholder.configure({
        placeholder: hasLeftGroup ? "Bạn đã rời nhóm..." : "Nhập tin nhắn...",
        showOnlyWhenEditable: true,
      }),
      StarterKit,
      ImageExt,
    ],
    content: "",
    onUpdate: ({ editor }) => setMessage(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "focus:outline-none prose prose-sm max-w-none text-gray-700 p-3",
      },
      handleKeyDown: (_, event) => {
        if (hasLeftGroup) return true;

        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();

          const text = editor?.getText().trim();
          const html = editor?.getHTML().trim();
          const hasText =
            text && text !== "" && html !== "<p></p>" && html !== "<p><br></p>";

          if (!hasText && selectedFiles.length === 0) {
            toast.warning("Không thể gửi tin nhắn trống!");
            return false;
          }

          handleSend();
          return true;
        }

        return false;
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!hasLeftGroup);
    }
  }, [hasLeftGroup, editor]);

  const hasValidContent = () => {
    const textContent = showRichText
      ? editor?.getText().trim()
      : message.trim();

    const htmlContent = showRichText ? editor?.getHTML().trim() : "";

    const hasText =
      textContent &&
      textContent !== "" &&
      htmlContent !== "<p></p>" &&
      htmlContent !== "<p><br></p>";

    return hasText || selectedFiles.length > 0;
  };

  const handleEmojiClick = (emojiData: any) => {
    if (showRichText && editor) {
      editor.commands.insertContent(emojiData.emoji);
    } else {
      setMessage((prev) => prev + emojiData.emoji);
    }
  };

  const handleSend = async () => {
    if (message === "") {
      return;
    }
    if (!hasValidContent()) {
      return;
    }

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
        console.log("uploaded:", uploaded);
      } catch (err: any) {
        console.error("Upload lỗi:", err);
        toast.error(
          `Upload file lỗi: ${err.response?.data?.error || err.message}`
        );
        setUploading(false);
        return;
      }
    }

    socketManager.sendMessage(
      user_id,
      receiver_id,
      group_id,
      showRichText ? editor?.getHTML() || "" : message,
      uploaded,
      display_name,
      avatar,
      sender_avatar
    );

    if (editor) editor.commands.clearContent();
    setMessage("");
    setSelectedFiles([]);
    setProgress([]);
    setUploading(false);
    setShowRichText(false);
    setEditorHeight(60);
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
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        setShowRichText((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const toggleHeight = () => {
    setEditorHeight((prev) => (prev === 48 ? 280 : 48));
  };

  const canSend = hasValidContent() && !hasLeftGroup;

  const toolbarButtons = [
    {
      id: "emoji",
      icon: <Smile size={20} />,
      label: "Emoji",
      action: () => setShowPicker((prev) => !prev),
    },
    {
      id: "image",
      icon: <Image size={20} />,
      label: "Ảnh",
      action: () => fileInputRef.current?.click(),
    },
    {
      id: "file",
      icon: <Paperclip size={20} />,
      label: "Đính kèm",
      action: () => fileInputRef.current?.click(),
    },
    {
      id: "members",
      icon: <Users size={20} />,
      label: "Thành viên",
      action: () => toast.info("Tính năng đang phát triển!"),
    },
    {
      id: "format",
      icon: <PenSquare size={20} />,
      label: "Định dạng",
      action: () => setShowRichText((prev) => !prev),
    },
    {
      id: "quick",
      icon: <MessageSquare size={20} />,
      label: "Tin nhắn nhanh",
      action: () => toast.info("Tính năng đang phát triển!"),
    },
    {
      id: "zap",
      icon: <Zap size={20} />,
      label: "Tính năng",
      action: () => toast.info("Tính năng đang phát triển!"),
    },
    {
      id: "more",
      icon: <MoreHorizontal size={20} />,
      label: "Khác",
      action: () => toast.info("Tính năng đang phát triển!"),
    },
  ];

  return (
    <div className="bg-white border-t border-[#e4e8f1] relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={handleFileSelect}
        disabled={hasLeftGroup}
      />

      {hasLeftGroup && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 sm:mb-4 mx-2 sm:mx-6 p-2.5 sm:p-3 bg-red-50 border border-red-300/50 rounded-xl backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5 text-red-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3">
              <p className="text-xs sm:text-sm font-semibold text-red-800">
                Bạn đã rời khỏi nhóm này
              </p>
              <p className="text-[10px] sm:text-xs text-red-600 mt-0.5">
                Bạn không thể gửi tin nhắn
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {selectedFiles.length > 0 && !hasLeftGroup && (
        <div className="flex overflow-x-auto gap-2 mb-2 sm:mb-3 pb-2 px-2 sm:px-6">
          {selectedFiles.map((file, index) => {
            const isImage = file.type.startsWith("image/");
            const isVideo = file.type.startsWith("video/");
            return (
              <div
                key={index}
                className="relative w-16 h-16 border border-[#c8d5ff] rounded-xl overflow-hidden flex-shrink-0 bg-[#f0f4ff]"
              >
                {isImage || isVideo ? (
                  <div className="w-full h-full">
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
                  <div className="flex items-center justify-center h-full bg-brand-100">
                    <FileText size={24} className="text-brand-600" />
                  </div>
                )}
                {!uploading && (
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md"
                  >
                    <X size={14} />
                  </button>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
                    <div className="w-8 h-8 border-3 border-t-brand-400 border-brand-200 rounded-full animate-spin mb-1"></div>
                    <div className="text-xs font-semibold">
                      {progress[index] ?? 0}%
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="px-2 sm:px-4 py-2 sm:py-3 space-y-2 sm:space-y-3">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[#082550] text-sm border-b border-[#edf0f7] pb-2">
          {toolbarButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => {
                if (hasLeftGroup) return;
                btn.action();
              }}
              disabled={hasLeftGroup}
              className={`flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-lg border border-transparent hover:border-[#d5e0ff] hover:bg-white transition ${
                hasLeftGroup ? "opacity-40 cursor-not-allowed" : ""
              }`}
              title={btn.label}
            >
              {btn.icon}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-1.5 sm:gap-3">
          <div className="flex-1 min-w-0 border border-[#e6ebf5] rounded-2xl bg-white shadow-sm">
            <div
              className={`px-2 sm:px-3 py-2 min-h-[36px] ${
                hasLeftGroup ? "text-gray-400" : "text-gray-700"
              }`}
            >
              <EditorContent editor={editor} className="prose prose-sm max-w-full" />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <motion.button
              whileHover={{ scale: hasLeftGroup ? 1 : 1.05 }}
              whileTap={{ scale: hasLeftGroup ? 1 : 0.95 }}
              onClick={() => !hasLeftGroup && setShowPicker((prev) => !prev)}
              disabled={hasLeftGroup}
              className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#d2dbef] text-[#082550] bg-white hover:bg-[#f1f4fb] transition ${
                hasLeftGroup ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <Smile size={18} className="sm:w-5 sm:h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: canSend ? 1.05 : 1 }}
              whileTap={{ scale: canSend ? 0.95 : 1 }}
              onClick={handleSend}
              disabled={!canSend}
              className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all shadow ${
                canSend
                  ? "bg-[#1a6aff] text-white cursor-pointer hover:shadow-lg"
                  : "cursor-not-allowed opacity-50 bg-gray-200 text-gray-400"
              }`}
            >
              {canSend ? <Send size={18} className="sm:w-5 sm:h-5" /> : <ThumbsUp size={18} className="sm:w-5 sm:h-5" />}
            </motion.button>
          </div>
        </div>
      </div>

      {showRichText && !hasLeftGroup && (
        <div className="px-2 sm:px-6 pb-2 sm:pb-4">
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border border-[#e4e8f1] rounded-xl bg-[#f8f9ff]"
          >
            <MenuBar editor={editor} toggleHeight={toggleHeight} />
          </motion.div>
        </div>
      )}

      {showPicker && !hasLeftGroup && (
        <div
          ref={pickerRef}
          className="absolute bottom-20 sm:bottom-28 right-2 sm:right-10 z-50 shadow-2xl rounded-2xl overflow-hidden"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.LIGHT}
            searchDisabled
            previewConfig={{ showPreview: false }}
            height={350}
            width={280}
          />
        </div>
      )}
    </div>
  );
}
