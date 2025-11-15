import { useEffect, useRef, useState } from "react";
import { Send, Smile, Image, ThumbsUp, FileText, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { uploadAPI } from "../../../api/upload";
import type { Media } from "../../../types/upload";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { socketManager } from "../../../api/socket";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
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
  const [editorHeight, setEditorHeight] = useState(60);

  const editor = useEditor({
    extensions: [
      Placeholder.configure({
        placeholder: hasLeftGroup ? "Bạn đã rời nhóm..." : "Nhập tin nhắn...",
        showOnlyWhenEditable: true,
      }),
      StarterKit,
      Link,
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
    setEditorHeight((prev) => (prev === 60 ? 300 : 60));
  };

  const canSend = hasValidContent() && !hasLeftGroup;

  return (
    <div className="p-4 mb-7 bg-[#1150af] border-t border-blue-100">
      {/* Thông báo đã rời nhóm */}
      {hasLeftGroup && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-50 border border-red-300/50 rounded-xl backdrop-blur-sm"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-500"
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
            <div className="ml-3">
              <p className="text-sm font-semibold text-red-800">
                Bạn đã rời khỏi nhóm này
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                Bạn không thể gửi tin nhắn
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* File preview */}
      {selectedFiles.length > 0 && !hasLeftGroup && (
        <div className="flex overflow-x-auto gap-2 mb-3 pb-2">
          {selectedFiles.map((file, index) => {
            const isImage = file.type.startsWith("image/");
            const isVideo = file.type.startsWith("video/");
            return (
              <div
                key={index}
                className="relative w-20 h-20 border-2 border-blue-400 rounded-xl overflow-hidden flex-shrink-0 bg-blue-50"
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
                  <div className="flex items-center justify-center h-full bg-blue-100">
                    <FileText size={24} className="text-blue-600" />
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
                    <div className="w-8 h-8 border-3 border-t-blue-400 border-blue-200 rounded-full animate-spin mb-1"></div>
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

      {/* Main Input Area */}
      <div className="flex items-end gap-2">
        {/* Left Actions */}
        <div className="flex items-center gap-1 pb-1">
          {/* Upload Button */}
          <motion.label
            whileHover={{ scale: hasLeftGroup ? 1 : 1.1 }}
            whileTap={{ scale: hasLeftGroup ? 1 : 0.95 }}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
              hasLeftGroup
                ? "cursor-not-allowed opacity-40 bg-gray-100"
                : "cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-600"
            }`}
          >
            <Image size={22} />
            <input
              type="file"
              multiple
              hidden
              onChange={handleFileSelect}
              disabled={hasLeftGroup}
            />
          </motion.label>

          {/* Emoji Button */}
          <motion.button
            whileHover={{ scale: hasLeftGroup ? 1 : 1.1 }}
            whileTap={{ scale: hasLeftGroup ? 1 : 0.95 }}
            onClick={() => !hasLeftGroup && setShowPicker((p) => !p)}
            disabled={hasLeftGroup}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
              hasLeftGroup
                ? "cursor-not-allowed opacity-40 bg-gray-100"
                : "bg-blue-50 hover:bg-blue-100 text-blue-600"
            }`}
          >
            <Smile size={22} />
          </motion.button>
        </div>

        {/* Input Editor */}
        <div className="flex-1">
          <div
            className={`flex flex-col rounded-2xl overflow-hidden border-2 transition-all ${
              hasLeftGroup
                ? "border-gray-200 bg-gray-50 opacity-60"
                : "border-blue-300 bg-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200"
            }`}
          >
            <div
              className={`overflow-y-auto prose prose-sm max-w-none
                prose-headings:font-bold prose-headings:text-lg prose-headings:my-2
                prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4
                prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4
                prose-code:bg-blue-100 prose-code:px-1 prose-code:rounded prose-code:text-sm
                prose-p:my-1 ${
                  hasLeftGroup ? "text-gray-400" : "text-gray-700"
                }`}
              style={{ height: `${editorHeight}px` }}
            >
              <EditorContent editor={editor} />
            </div>

            {/* Toolbar */}
            <AnimatePresence>
              {showRichText && !hasLeftGroup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-blue-200"
                >
                  <MenuBar editor={editor} toggleHeight={toggleHeight} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Send/Like Button */}
        <motion.button
          whileHover={{ scale: canSend ? 1.05 : 1 }}
          whileTap={{ scale: canSend ? 0.95 : 1 }}
          onClick={handleSend}
          disabled={!canSend}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
            canSend
              ? "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-2xs shadow-blue-100 cursor-pointer"
              : "cursor-not-allowed opacity-40 bg-gray-100 text-gray-400"
          }`}
        >
          {canSend ? <Send size={20} /> : <ThumbsUp size={20} />}
        </motion.button>
      </div>

      {/* Emoji Picker */}
      {showPicker && !hasLeftGroup && (
        <div
          ref={pickerRef}
          className="absolute bottom-20 right-6 z-50 shadow-2xl rounded-2xl overflow-hidden"
        >
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
  );
}
