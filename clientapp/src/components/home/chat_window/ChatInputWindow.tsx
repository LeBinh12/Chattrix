import { useEffect, useRef, useState } from "react";
import {
  Send,
  Smile,
  Image,
  ThumbsUp,
  FileText,
  X,
  Paperclip,
  ContactRound,
  Scan,
  Type,
  Zap,
  MoreHorizontal,
  MoreVertical,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { uploadAPI } from "../../../api/upload";
import type { Media } from "../../../types/upload";
import EmojiPicker, { Theme, type EmojiClickData } from "emoji-picker-react";
import { socketManager } from "../../../api/socket";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";
import StarterKit from "@tiptap/starter-kit";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import Paragraph from "@tiptap/extension-paragraph";
import ImageExt from "@tiptap/extension-image";
import MenuBar from "./MenuBar";
import Placeholder from "@tiptap/extension-placeholder";

import { useRecoilValue, useSetRecoilState, useRecoilState } from "recoil";
import ReplyPreview from "./ReplyPreview";
import { replyMessageState, richTextVisibleAtom } from "../../../recoil/atoms/uiAtom";
import Mention from "@tiptap/extension-mention";
import { useMentionSuggestion } from "../../../hooks/useMentionSuggestion";
import { userAtom } from "../../../recoil/atoms/userAtom";

import { taskApi } from "../../../api/taskApi";
import type { TaskData } from "./AssignTaskForm";
import AssignTaskForm from "./AssignTaskForm";
import { BUTTON_HOVER } from "../../../utils/className";
import { isMobileDevice } from "../../../utils/mobileDetect";
// import { groupMembersAtom } from "../../../recoil/atoms/groupAtom";

type ChatInputWindowProps = {
  user_id: string;
  receiver_id: string;
  group_id: string;
  hasLeftGroup: boolean;
  display_name: string;
  avatar?: string;
  sender_avatar?: string;
  isDeleted?: boolean;
};

export default function ChatInputWindow({
  user_id,
  receiver_id,
  group_id,
  hasLeftGroup,
  display_name,
  avatar,
  sender_avatar,
  isDeleted,
}: ChatInputWindowProps) {
  const user = useRecoilValue(userAtom);

  // const [message, setMessage] = useState(""); // Message content state -> UNUSED
  const [showPicker, setShowPicker] = useState(false);
  const [showRichText, setShowRichText] = useRecoilState(richTextVisibleAtom);
  const [hasText, setHasText] = useState(false); // Track text content state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false); // Mobile toolbar state
  const [uploading, setUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(isMobileDevice()); // Track mobile device
  const pickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editorHeight, setEditorHeight] = useState<"compact" | "expanded">(
    "compact"
  );
  // const groupMembersMap = useRecoilValue(groupMembersAtom);
  // const groupMembers = groupMembersMap[group_id] || []; -> UNUSED
  // Recoil state to get reply info
  const replyTo = useRecoilValue(replyMessageState);
  const setReplyTo = useSetRecoilState(replyMessageState);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isTaskSubmitting, setIsTaskSubmitting] = useState(false);
  const [taskTitle, setTaskTitle] = useState(""); // State for task title from command
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const toggleEditorHeight = () => {
    setEditorHeight((prev) => (prev === "compact" ? "expanded" : "compact"));
  };

  // Ref pattern to solve stale closure in useEditor
  const stateRef = useRef({
    hasLeftGroup,
    selectedFiles,
    replyTo,
    hasText,
    isMentionOpen,
    isMobile,
  });

  useEffect(() => {
    stateRef.current = {
      hasLeftGroup,
      selectedFiles,
      replyTo,
      hasText,
      isMentionOpen,
      isMobile,
    };
  }, [hasLeftGroup, selectedFiles, replyTo, hasText, isMentionOpen, isMobile]);

  // Forward declaration for handleSend so we can use it in useEditor
  const handleSendRef = useRef<() => void>(() => { });
  
  const mentionSuggestion = useMentionSuggestion(
    group_id, 
    () => setShowTaskForm(true),
    () => setIsMentionOpen(true),
    () => setIsMentionOpen(false)
  );

  const editor = useEditor(
    {
      extensions: [
        Placeholder.configure({
          placeholder: isDeleted
            ? "Tài khoản này đã bị xóa"
            : hasLeftGroup
              ? "Bạn đã rời nhóm..."
              : `Nhập @, tin nhắn tới ${display_name}`,
          showOnlyWhenEditable: true,
        }),
        // Custom Document: allow any block nodes (paragraph, bulletList, orderedList, blockquote, heading)
        Document.extend({
          content: "block*",
        }),
        // Use StarterKit but override Heading, Paragraph, and Document
        StarterKit.configure({
          heading: false, // Disable default heading from StarterKit
          paragraph: false, // Disable default paragraph from StarterKit
          document: false, // Disable default document from StarterKit
        }),
        // Custom Heading: allow seamless heading/paragraph transition without extra nodes
        Heading.extend({
          addCommands() {
            return {
              setHeading: (attributes) => ({ commands }) => {
                return commands.setNode(this.name, attributes);
              },
              toggleHeading: (attributes) => ({ commands, can }) => {
                if (can().setNode(this.name, attributes)) {
                  return commands.setNode(this.name, attributes);
                } else {
                  return commands.setParagraph();
                }
              },
            };
          },
        }).configure({
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: { class: 'heading' },
        }),
        // Custom Paragraph: minimal margins, prevent auto-insertion
        Paragraph.extend({
          parseHTML() {
            return [{ tag: 'p' }];
          },
          renderHTML() {
            return ['p', 0];
          },
        }).configure({
          HTMLAttributes: {},
        }),
        ImageExt,
        Mention.configure({
          suggestion: mentionSuggestion,
        }),
        // Prevent auto-insertion of empty paragraphs after format changes
        Extension.create({
          name: 'noAutoEmptyParagraph',
          addProseMirrorPlugins() {
            return [
              new Plugin({
                appendTransaction: (transactions, _oldState, newState) => {
                    if (transactions.length === 0) return null;

                    const doc = newState.doc;
                    let tr = newState.tr;
                    const nodesToDelete: Array<{ pos: number; size: number }> = [];

                    // Find empty paragraphs that come right after headings
                    doc.descendants((node, pos) => {
                      if (node.type.name === 'heading') {
                        const nextPos = pos + node.nodeSize;
                        // Check if there's a next node
                        if (nextPos < doc.content.size) {
                          const nextNode = doc.nodeAt(nextPos);
                          // If next node is an empty paragraph, mark for deletion
                          if (nextNode && 
                              nextNode.type.name === 'paragraph' && 
                              nextNode.content.size === 0) {
                            nodesToDelete.push({ 
                              pos: nextPos, 
                              size: nextNode.nodeSize 
                            });
                          }
                        }
                      }
                    });

                    // Delete in reverse order
                    for (let i = nodesToDelete.length - 1; i >= 0; i--) {
                      const { pos, size } = nodesToDelete[i];
                      tr.delete(pos, pos + size);
                    }

                    return nodesToDelete.length > 0 ? tr : null;
                },
              }),
            ];
          },
        }),
      ],
      content: "",
      onUpdate: ({ editor }) => {
        const text = editor.getText().replace(/\s+/g, "").trim();
        const html = editor.getHTML().trim();
        const emptyHtmlPatterns = ["<p></p>", "<p><br></p>", "<p>&nbsp;</p>"];
        const isNotEmpty = text !== "" && !emptyHtmlPatterns.includes(html);
        setHasText(isNotEmpty);
      },
      editorProps: {
        attributes: {
          class:
            "focus:outline-none prose prose-sm max-w-none text-gray-700 p-3",
        },
        handleKeyDown: (view, event) => {
          const currentState = stateRef.current;

          if (currentState.hasLeftGroup) return true;
          // Ignore if user is composing text (IME)
          if (event.isComposing) return false;
          
          // Let Mention extension handle Enter if open
          if (currentState.isMentionOpen && event.key === "Enter") return false;

          // MOBILE: Only Shift+Enter creates newline, simple Enter just creates newline
          // DESKTOP: Shift+Enter creates newline, simple Enter submits
          if (event.key === "Enter" && !event.shiftKey) {
            // On mobile: Enter only creates newline, don't submit
            if (currentState.isMobile) {
              return false; // Let default behavior (newline) happen
            }
            // On desktop: Enter submits the message
            event.preventDefault();
            handleSendRef.current();
            return true;
          }

          return false;
        },
      },
    },
    [group_id, receiver_id, display_name]
  );

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      console.log(`[ChatInput] receiver_id: ${receiver_id}, isDeleted: ${isDeleted}, hasLeftGroup: ${hasLeftGroup}`);
      editor.setEditable(!hasLeftGroup && !isDeleted);
   
    }
  }, [hasLeftGroup, isDeleted, editor, receiver_id, group_id]);

  // Detect mobile device and viewport changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

    // Check on mount
    setIsMobile(isMobileDevice());

    // Listen to window resize
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const hasValidContent = () => {
    const text = editor?.getText().replace(/\s+/g, "").trim(); // remove both spaces and nbsp
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


  const handleLike = async () => {
    if (hasLeftGroup) return;

    try {
      setUploading(true);
      const thumbsUpEmoji = "👍";

      
      socketManager.sendMessage(
        user_id,
        receiver_id,
        group_id,
        thumbsUpEmoji,
        [],
        display_name,
        avatar,
        sender_avatar,
        replyTo ?? undefined
      );

    
      setReplyTo(null);
      setUploading(false);
    } catch (error) {
      console.error("Error sending like:", error);
      toast.error("Không thể gửi like");
      setUploading(false);
    }
  };

  const handleTaskSubmit = async (taskData: TaskData) => {
    try {
      setIsTaskSubmitting(true);
      const attachmentIDs = taskData.attachment_ids || [];

      const res = await taskApi.createTask({
        ...taskData,
        group_id: taskData.group_id || "000000000000000000000000",
        attachment_ids: attachmentIDs,
        priority: taskData.priority
      });

      // Backend trả về mảng tasks (atomic bulk)
      const createdTasks: any[] = Array.isArray(res.data.data)
        ? res.data.data
        : [res.data.data];

      if (!createdTasks || createdTasks.length === 0)
        throw new Error("Task creation returned no data");

      // Gửi socket cho mỗi task
      createdTasks.forEach((createdTask) => {
        if (!createdTask) return;
        const finalGroupId =
          createdTask.group_id === "000000000000000000000000" ? "" : createdTask.group_id;

        if (createdTask.assignees && createdTask.assignees.length > 0) {
          // GROUP TASK
          if (finalGroupId) {
            // Có group_id → 1 message duy nhất vào group
            socketManager.sendTask(
              user_id,
              "",
              finalGroupId,
              createdTask,
              createdTask.assignee_name,
              "",
              sender_avatar
            );
          } else {
            // DM context → gửi riêng từng assignee
            createdTask.assignees.forEach((a: any) => {
              socketManager.sendTask(
                user_id,
                a.assignee_id,
                "",
                createdTask,
                a.assignee_name,
                "",
                sender_avatar
              );
            });
          }
        } else {
          // SINGLE-ASSIGNEE: giữ nguyên
          const finalReceiverId = finalGroupId ? "" : createdTask.assignee_id;
          socketManager.sendTask(
            user_id,
            finalReceiverId,
            finalGroupId,
            createdTask,
            createdTask.assignee_name,
            "",
            sender_avatar
          );
        }
      });

      setShowTaskForm(false);
      stateRef.current.hasText = false;
      toast.success(
        createdTasks.length > 1
          ? `Đã giao việc cho ${createdTasks.length} người thành công!`
          : "Giao việc thành công!"
      );
    } catch (error) {
      console.error("Failed to create task", error);
      toast.error("Không thể tạo công việc");
    } finally {
      setIsTaskSubmitting(false);
    }
  };

  const isSendingRef = useRef(false);

  const handleSend = async () => {
    // 1. Check for @giaoviec command
    const textContent = editor?.getText() || "";
    const TASK_REGEX = /@giaoviec\s*(.*)/i;
    const taskMatch = textContent.match(TASK_REGEX);

    if (taskMatch) {
      setTaskTitle(taskMatch[1] || "");
      setShowTaskForm(true);
      editor?.commands.clearContent(); // Clear command from editor
      return;
    }

    if (!hasValidContent()) {
      return;
    }

    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setUploading(true);

    try {
      let uploaded: Media[] = [];

      if (selectedFiles.length > 0) {
        try {
          uploaded = await uploadAPI.uploadFiles(
            selectedFiles,
            () => {
              // setProgress((prev) => {
              //   const updated = [...prev];
              //   updated[index] = percent;
              //   return updated;
              // });
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
          isSendingRef.current = false;
          return;
        }
      }

      const messageContent = editor?.getHTML() || "";

      // Send message - ONLY SEND reply message ID, not the whole object
      socketManager.sendMessage(
        user_id,
        receiver_id,
        group_id,
        messageContent,
        uploaded,
        display_name,
        avatar,
        sender_avatar,
        replyTo ?? undefined
      );

      // Reset all
      if (editor) editor.commands.clearContent();
      // setMessage("");
      setSelectedFiles([]);
      // setProgress([]);
      setShowRichText(false);
      setReplyTo(null); // Clear reply state
      editor?.commands.focus();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Gửi tin nhắn thất bại");
    } finally {
      setUploading(false);
      isSendingRef.current = false;
    }
  };

  // Update ref whenever handleSend changes (which happens on every render actually, but that's fine)
  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...files]);
    // setProgress((prev) => [...prev, ...files.map(() => 0)]);

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

  const canSend = (hasText || selectedFiles.length > 0) && !hasLeftGroup && !uploading;

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
      label: "Gửi ảnh",
      action: () => fileInputRef.current?.click(),
    },
    {
      id: "file",
      icon: <Paperclip size={20} />,
      label: "Đính kèm file",
      action: () => fileInputRef.current?.click(),
    },
        {
      id: "format",
      icon: <Type size={20} />,
      label: "Định dạng tin nhắn (ctrl + shift + X)",
      action: () => {
        if (hasLeftGroup) return;
        setShowRichText((prev) => !prev);
        editor?.commands.focus();
      },
    },
  ];

  return (
        <div className="bg-white border-t border-[#e4e8f1] relative pb-[env(safe-area-inset-bottom)]">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={handleFileSelect}
        disabled={hasLeftGroup}
      />

      {/* ReplyPreview automatically displays when replyTo is present in Recoil */}
      <ReplyPreview />

      {hasLeftGroup && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 sm:mb-4 mx-2 sm:mx-6 p-2.5 sm:p-3 !bg-red-50 !border !border-red-300/50 !rounded-xl !backdrop-blur-sm"
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

      {/* Toolbar - Separated and Compact */}
      <AnimatePresence>
        {isToolbarOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 bg-white overflow-hidden"
          >
            {toolbarButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => {
                  if (hasLeftGroup) return;
                  editor?.commands.focus();
                  btn.action();
                }}
                disabled={hasLeftGroup}
                className={`!flex !items-center !justify-center !w-8 !h-8 !rounded !transition-colors !cursor-pointer !text-gray-500 hover:!bg-blue-50 hover:!text-[#00568c] ${hasLeftGroup ? "!opacity-50 !cursor-not-allowed" : ""
                  }`}
                title={btn.label}
              >
                {btn.icon}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
        <div className="flex items-center px-2 py-2 bg-white">
        {/* Mobile Toolbar Toggle */}
        <button
           onClick={() => setIsToolbarOpen(!isToolbarOpen)}
           className={`!flex !items-center !justify-center !w-7 !h-7 !rounded-full !transition-colors !cursor-pointer !text-gray-500 hover:!bg-blue-50 hover:!text-[#00568c]`}
        >
             <MoreVertical size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <motion.div
            animate={{
              minHeight: editorHeight === "compact" ? "24px" : "150px", // Reduced min-height
              maxHeight: editorHeight === "compact" ? "150px" : "300px",
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={`overflow-y-auto ${hasLeftGroup ? "text-gray-400" : "text-[#1a1b1e]"
              }`}
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#cbd5e1 transparent",
            }}
          >
            <EditorContent
              editor={editor}
              className="prose prose-sm max-w-full focus:outline-none min-h-[24px] leading-6"
            />
          </motion.div>
        </div>

        {/* Right Actions: Emoji & Send */}
        <div className="flex items-center gap-2">
          {/* Emoji button */}
          <button
            onClick={() => !hasLeftGroup && setShowPicker((prev) => !prev)}
            disabled={hasLeftGroup}
            className={`!p-1.5 !rounded-full !text-gray-400 hover:!bg-blue-50 hover:!text-[#00568c] !transition-colors !cursor-pointer ${hasLeftGroup ? "!opacity-50 !cursor-not-allowed" : ""
              }`}
          >
            <Smile size={22} strokeWidth={1.5} />
          </button>

          {/* Send / Like button */}
          <AnimatePresence mode="wait">
            {canSend ? (
              <motion.button
                key="send"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={handleSend}
                className="!p-1.5 !rounded-full !text-gray-400 hover:!bg-blue-50 hover:!text-[#00568c] !transition-colors !cursor-pointer"
              >
                <Send size={24} strokeWidth={2} />
              </motion.button>
            ) : (
              <motion.button
                key="like"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={handleLike}
                disabled={hasLeftGroup || uploading}
                className={`!p-1.5 !rounded-full !text-gray-400 hover:!bg-blue-50 hover:!text-[#00568c] !transition-colors !cursor-pointer ${hasLeftGroup || uploading ? "!opacity-50 !cursor-not-allowed" : ""
                  }`}
              >
                <ThumbsUp size={24} strokeWidth={1.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* File Preview Section - Zalo Style */}
      {selectedFiles.length > 0 && !hasLeftGroup && (
        <div className="px-4 pb-3 bg-white">
          {/* Header: Count & Clear All */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              {selectedFiles.length} {selectedFiles.some(f => f.type.startsWith('image/')) ? 'ảnh' : 'file'}
            </span>
            <button
              onClick={() => {
                setSelectedFiles([]);
                // setProgress([]);
              }}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors cursor-pointer font-medium"
            >
              Xoá tất cả
            </button>
          </div>

          {/* Thumbnails List */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedFiles.map((file, index) => {
              const isImage = file.type.startsWith("image/");
              const isVideo = file.type.startsWith("video/");
              return (
                <div
                  key={index}
                  className="!relative !group !w-16 !h-16 !rounded-lg !overflow-hidden !border !border-gray-200"
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
                    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50">
                      <FileText size={24} className="text-gray-400" />
                    </div>
                  )}

                  {/* Hover Overlay with Remove Button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {!uploading && (
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="text-white hover:text-red-400 p-1"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>

                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add More Button (Square Plus) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="!flex !items-center !justify-center !w-16 !h-16 !rounded-lg !border-2 !border-dashed !border-gray-300 !bg-gray-50 !text-gray-500 hover:!text-[#00568c] hover:!border-blue-300 hover:!bg-blue-50 !transition-colors !cursor-pointer"
              title="Thêm file"
            >
              <span className="text-2xl font-light">+</span>
            </button>
          </div>
        </div>
      )}

      <AssignTaskForm
        isOpen={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        onSubmit={handleTaskSubmit}
        isLoading={isTaskSubmitting}
        groupId={group_id}
        initialTitle={taskTitle}
        receiver={
          (!group_id || group_id === "000000000000000000000000") 
            ? {
                user_id: receiver_id,
                display_name: display_name,
                avatar: avatar || "",
              }
            : undefined
        }
        currentUser={{
          user_id: user_id,
          display_name: user?.data.display_name || "",
          avatar: user?.data.avatar || sender_avatar || "",
        }}
      />

      {showRichText && !hasLeftGroup && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-[#f8f9ff]"
        >
          <MenuBar editor={editor} toggleHeight={toggleEditorHeight} />
        </motion.div>
      )}

      {showPicker && !hasLeftGroup && (
        <div
          ref={pickerRef}
          className="!absolute !bottom-14 !right-4 !z-50 !shadow-xl !rounded-lg !overflow-hidden !border !border-gray-100 !bg-white"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.LIGHT}
            searchDisabled={false}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
            height={400}
            width={350}
            lazyLoadEmojis
          />
        </div>
      )}
    </div>
  );
}
