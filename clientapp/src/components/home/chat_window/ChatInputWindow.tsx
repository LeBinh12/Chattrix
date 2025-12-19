import { useEffect, useRef, useState } from "react";
import {
  Send,
  Smile,
  Image,
  ThumbsUp,
  FileText,
  X,
  Paperclip,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { uploadAPI } from "../../../api/upload";
import type { Media } from "../../../types/upload";
import EmojiPicker, { Theme, type EmojiClickData } from "emoji-picker-react";
import { socketManager } from "../../../api/socket";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import MenuBar from "./MenuBar";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { useRecoilValue, useSetRecoilState } from "recoil";
import ReplyPreview from "./ReplyPreview";
import { replyMessageState } from "../../../recoil/atoms/uiAtom";
import Mention from "@tiptap/extension-mention";
import { useMentionSuggestion } from "../../../hooks/useMentionSuggestion";

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
  const [editorHeight, setEditorHeight] = useState<"compact" | "expanded">(
    "compact"
  );
  // Recoil state để lấy thông tin reply
  const replyTo = useRecoilValue(replyMessageState);
  const setReplyTo = useSetRecoilState(replyMessageState);

  const toggleEditorHeight = () => {
    setEditorHeight((prev) => (prev === "compact" ? "expanded" : "compact"));
  };

  const editor = useEditor({
    extensions: [
      Placeholder.configure({
        placeholder: hasLeftGroup
          ? "Bạn đã rời nhóm..."
          : "Nhấn Ctrl + Shift + X để định dạng tin nhắn",
        showOnlyWhenEditable: true,
      }),
      StarterKit,
      ImageExt,
      Underline,
      Mention.configure({
        suggestion: useMentionSuggestion(group_id),
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => setMessage(editor.getHTML()),
    editorProps: {
  attributes: {
    class: "focus:outline-none prose prose-sm max-w-none text-gray-700 p-3",
  },
  handleKeyDown: (view, event) => {
    if (hasLeftGroup) return true;
    
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      const html = editor?.getHTML().trim();
      const hasText = !!editor?.getText().replace(/\s+/g, "").trim();
      const isEmptyHtml = [
        "<p></p>",
        "<p><br></p>",
        "<p>&nbsp;</p>",
      ].includes(html);

      if (!hasText && isEmptyHtml && selectedFiles.length === 0) {
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
    const text = editor?.getText().replace(/\s+/g, "").trim(); // xoá cả space và nbsp
    const html = editor?.getHTML().trim();

    const emptyHtmlPatterns = ["<p></p>", "<p><br></p>", "<p>&nbsp;</p>"];

    const hasRealText = text !== "" && !emptyHtmlPatterns.includes(html);

    return hasRealText || selectedFiles.length > 0;
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (!editor) return;

    editor.commands.focus();
    editor.commands.insertContent(emojiData.emoji);
  };

  const handleSend = async () => {
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

    // Gửi message - CHỈ GỬI ID của tin nhắn reply, không gửi toàn bộ object
    socketManager.sendMessage(
      user_id,
      receiver_id,
      group_id,
      showRichText ? editor?.getHTML() || "" : message,
      uploaded,
      display_name,
      avatar,
      sender_avatar,
      replyTo ?? undefined
    );

    // Reset tất cả
    if (editor) editor.commands.clearContent();
    setMessage("");
    setSelectedFiles([]);
    setProgress([]);
    setUploading(false);
    setShowRichText(false);
    setReplyTo(null); // Clear reply state
    editor?.commands.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...files]);
    setProgress((prev) => [...prev, ...files.map(() => 0)]);

    e.target.value = "";
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
    // {
    //   id: "members",
    //   icon: <Users size={20} />,
    //   label: "Thành viên",
    //   action: () => toast.info("Tính năng đang phát triển!"),
    // },
    // {
    //   id: "format",
    //   icon: <PenSquare size={20} />,
    //   label: "Định dạng",
    //   action: () => setShowRichText((prev) => !prev),
    // },
    // {
    //   id: "quick",
    //   icon: <MessageSquare size={20} />,
    //   label: "Tin nhắn nhanh",
    //   action: () => toast.info("Tính năng đang phát triển!"),
    // },
    // {
    //   id: "zap",
    //   icon: <Zap size={20} />,
    //   label: "Tính năng",
    //   action: () => toast.info("Tính năng đang phát triển!"),
    // },
    // {
    //   id: "more",
    //   icon: <MoreHorizontal size={20} />,
    //   label: "Khác",
    //   action: () => toast.info("Tính năng đang phát triển!"),
    // },
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

      {/* ReplyPreview tự động hiển thị khi có replyTo trong Recoil */}
      <ReplyPreview />

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
        <div className="flex overflow-x-auto gap-2 mb-2 sm:mb-3 pb-2 px-2 sm:px-6 scrollbar-thin scrollbar-thumb-[#d0d7e9]">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 
             border border-dashed border-[#b6c2ff] rounded-xl text-[#4e5eb8]
             hover:bg-[#f0f3ff] transition flex-shrink-0 cursor-pointer"
          >
            <Paperclip size={20} />
            <span className="text-[10px] mt-1">Thêm file</span>
          </button>
          {selectedFiles.map((file, index) => {
            const isImage = file.type.startsWith("image/");
            const isVideo = file.type.startsWith("video/");
            return (
              <div key={index} className="flex flex-col gap-1 flex-shrink-0 cursor-pointer">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 border border-[#c8d5ff] rounded-xl overflow-hidden bg-[#f0f4ff]">
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
                    <div className="flex flex-col items-center justify-center h-full bg-brand-100 p-2">
                      <FileText size={20} className="text-brand-600 mb-1" />
                    </div>
                  )}
                  {!uploading && (
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md z-10"
                    >
                      <X size={12} />
                    </button> 
                  )}
                  {uploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-3 border-t-brand-400 border-brand-200 rounded-full animate-spin mb-1"></div>
                      <div className="text-[10px] sm:text-xs font-semibold">
                        {progress[index] ?? 0}%
                      </div>
                    </div>
                  )}
                </div>
                <p
                  className="text-[10px] text-[#5a6b8c] w-20 sm:w-24 truncate text-center px-1"
                  title={file.name}
                >
                  {file.name}
                </p>
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
                editor?.commands.focus();
                btn.action();
              }}
              disabled={hasLeftGroup}
              className={`flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-lg border border-transparent hover:border-[#d5e0ff] hover:bg-white transition cursor-pointer ${
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
            <motion.div
              animate={{
                minHeight: editorHeight === "compact" ? "50px" : "250px",
                maxHeight: editorHeight === "compact" ? "200px" : "400px",
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={`px-2 sm:px-3 py-2 overflow-y-auto ${
                hasLeftGroup ? "text-gray-400" : "text-gray-700"
              }`}
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#cbd5e1 transparent",
              }}
            >
              <EditorContent
                editor={editor}
                className="prose prose-sm max-w-full"
              />
            </motion.div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <motion.button
              whileHover={{ scale: hasLeftGroup ? 1 : 1.05 }}
              whileTap={{ scale: hasLeftGroup ? 1 : 0.95 }}
              onClick={() => !hasLeftGroup && setShowPicker((prev) => !prev)}
              disabled={hasLeftGroup}
              className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#d2dbef] text-[#082550] bg-white hover:bg-[#f1f4fb] transition cursor-pointer ${
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
              {canSend ? (
                <Send size={18} className="sm:w-5 sm:h-5" />
              ) : (
                <ThumbsUp size={18} className="sm:w-5 sm:h-5" />
              )}
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
            <MenuBar editor={editor} toggleHeight={toggleEditorHeight} />
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