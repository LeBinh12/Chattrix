import { activePanelAtom, threadTargetAtom, threadTargetTypeAtom } from "../../recoil/atoms/uiAtom";
import { userAtom } from "../../recoil/atoms/userAtom";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { socketManager } from "../../api/socket";
import type { Messages } from "../../types/Message";
import UserAvatar from "../UserAvatar";
import { toast } from "react-toastify";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import EmojiPicker, { Theme, type EmojiClickData } from "emoji-picker-react";
import { uploadAPI } from "../../api/upload";
import type { Media } from "../../types/upload";
import type { UserResponse } from "../../types/user";
import { API_ENDPOINTS } from "../../config/api";
import { messageAPI } from "../../api/messageApi";
import { FileText, Image as ImageIcon, MessageSquare, Paperclip, Play, Send, Smile, ThumbsUp, X, Heart, Plus, Reply } from "lucide-react";
import MessageContent from "../chat/chat_content/MessageContent";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { mediaViewerAtom } from "../../recoil/atoms/mediaViewerAtom";
import MediaViewerModal from "./MediaViewerModal";
import type { MediaItem } from "../../types/media";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function ThreadPanel() {
  const [activePanel, setActivePanel] = useRecoilState(activePanelAtom);
  const [threadTarget, setThreadTarget] = useRecoilState(threadTargetAtom);
  const threadTargetType = useRecoilValue(threadTargetTypeAtom);
  const currentUser = useRecoilValue<UserResponse | null>(userAtom);
  const selectedChat = useRecoilValue(selectedChatState);
  
  const [comments, setComments] = useState<Messages[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editorHasContent, setEditorHasContent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // States for Reactions
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null);
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [detailsTargetId, setDetailsTargetId] = useState<string | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const reactionDetailsRef = useRef<HTMLDivElement>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const editingMessageIdRef = useRef<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<Messages | null>(null);
  const [menuTargetId, setMenuTargetId] = useState<string | null>(null);

  const [localParentMsg, setLocalParentMsg] = useState<Messages | null>(threadTarget as Messages);
  const currentUserId = currentUser?.data.id;
  const setMediaViewer = useSetRecoilState(mediaViewerAtom);

  // Sync localParentMsg with threadTarget when it changes
  useEffect(() => {
    setLocalParentMsg(threadTarget as Messages);
  }, [threadTarget]);

  // Handle syncing ref with state
  useEffect(() => {
    editingMessageIdRef.current = editingMessageId;
  }, [editingMessageId]);


  // Editor setup for thread input
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Viết bình luận...",
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      setEditorHasContent(!!editor.getText().trim());
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none prose prose-sm max-w-none text-gray-700 p-3 min-h-[40px] max-h-[150px] overflow-y-auto",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          // Use handleSendMessage instead of handleSubmitComment to respect edit mode
          // We need handleSendMessage to be accessible or logic to be here
          // Since handleSendMessage is defined below, we can use a small delay 
          // or move the logic. Actually, we can just call handleSendMessage() if it's available.
          // But since handleSendMessage is a const defined later, we might need to wrap it.
          // Better: use handleSendMessage directly if we can, but it's not defined yet.
          // I will move handleSendMessage up or use a proxy.
          
          // Actually, let's just trigger the send button click or call the function
          // To avoid "not defined" errors, I'll move handleSendMessage and its deps up.
          window.dispatchEvent(new CustomEvent('thread-panel-send'));
          return true;
        }
        return false;
      },
    },
  });

  // Load real comments from BE
  useEffect(() => {
    if (activePanel === "thread" && localParentMsg?.id) {
       setLoadingComments(true);
       const fetchComments = async () => {
         try {
           const res = await messageAPI.getMessage(
             selectedChat?.user_id ?? "",
             selectedChat?.group_id ?? "",
             100, // limit
             undefined, // beforeTime
             localParentMsg.id // parent_id
           );
           
            if (res.data && Array.isArray(res.data.data)) {
              const sorted = [...res.data.data].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              setComments(sorted);
            }
         } catch (error) {
           console.error("Fetch comments error:", error);
         } finally {
           setLoadingComments(false);
         }
       };
       fetchComments();
    }
  }, [activePanel, localParentMsg?.id, selectedChat]);

  // Real-time updates via socket for new comments
  useEffect(() => {
    if (!localParentMsg?.id) return;

    const handleSocketMessage = (data: any) => {
      if (data.type === "chat") {
        const socketMsg = data.message as Messages;
        if (socketMsg.parent_id === localParentMsg.id) {
          setComments((prev: Messages[]) => {
            if (prev.find(c => c.id === socketMsg.id)) return prev;
            return [...prev, socketMsg];
          });
        }
      } else if (data.type === "reaction_update") {
        const payload = data.message as {
          type: "add" | "remove" | "remove_all";
          message_id: string;
          user_id: string;
          user_name: string;
          emoji: string;
        };

        const updateReactions = (m: Messages): Messages => {
          if (m.id !== payload.message_id) return m;
          
          let newReactions = m.reactions ? [...m.reactions] : [];
          if (payload.type === "add") {
            if (!newReactions.some(r => r.user_id === payload.user_id && r.emoji === payload.emoji)) {
              newReactions.push({
                user_id: payload.user_id,
                user_name: payload.user_name,
                emoji: payload.emoji
              });
            }
          } else if (payload.type === "remove") {
            newReactions = newReactions.filter(r => !(r.user_id === payload.user_id && r.emoji === payload.emoji));
          } else if (payload.type === "remove_all") {
            newReactions = newReactions.filter(r => r.user_id !== payload.user_id);
          }
          return { ...m, reactions: newReactions };
        };

        setLocalParentMsg((prev: Messages | null) => prev ? updateReactions(prev) : null);
        setComments((prev: Messages[]) => prev.map(updateReactions));
      } else if (data.type === "edit_message_update") {
        const payload = (data as any).payload as {
          id: string;
          content: string;
          edited_at: string;
        };
        if (payload && payload.id) {
          setComments((prev: Messages[]) => prev.map(c =>
            c.id === payload.id ? { ...c, content: payload.content, edited_at: payload.edited_at } : c
          ));
          setLocalParentMsg((prev: Messages | null) =>
            prev?.id === payload.id ? { ...prev, content: payload.content, edited_at: payload.edited_at } : prev
          );
          setThreadTarget((prev: any) => 
            prev?.id === payload.id ? { ...prev, content: payload.content, edited_at: payload.edited_at } : prev
          );
        }
      }
    };

    socketManager.addListener(handleSocketMessage);
    return () => socketManager.removeListener(handleSocketMessage);
  }, [localParentMsg?.id]);

  useEffect(() => {
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [comments]);

  const handleSubmitComment = useCallback(async () => {
    const content = editor?.getHTML() || "";
    const text = editor?.getText().trim();
    if (!text && selectedFiles.length === 0) return;
    if (sendingComment || uploading) return;

    setSendingComment(true);
    setUploading(true);
    try {
      let uploaded: Media[] = [];
      if (selectedFiles.length > 0) {
        uploaded = await uploadAPI.uploadFiles(selectedFiles, () => {});
      }

      const replyPayload = replyTarget ? {
        id: replyTarget.id,
        sender: replyTarget.sender_id === currentUserId ? "Bạn" : replyTarget.sender_name,
        content: replyTarget.content,
        type: replyTarget.type || "text",
        media_url: replyTarget.media_ids?.[0]?.url || ""
      } : undefined;

      socketManager.sendMessage(
        currentUserId ?? "",
        selectedChat?.user_id || "",
        selectedChat?.group_id || "",
        content,
        uploaded,
        currentUser?.data.display_name,
        "", // avatar (group/receiver avatar)
        currentUser?.data.avatar,
        replyPayload, // reply
        undefined, // type
        localParentMsg?.id || ""    // PARENT_ID
      );

      editor?.commands.clearContent();
      setSelectedFiles([]);
      setShowPicker(false);
      setReplyTarget(null);
    } catch (error) {
      console.error("Submit comment error:", error);
      toast.error("Không thể gửi bình luận");
    } finally {
      setSendingComment(false);
      setUploading(false);
    }
  }, [editor, selectedFiles, sendingComment, uploading, replyTarget, currentUserId, selectedChat, currentUser, localParentMsg]);

  const handleClose = () => {
    setActivePanel("none");
    setThreadTarget(null);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    editor?.commands.insertContent(emojiData.emoji);
    // setShowPicker(false);
  };

  const handlePreviewMedia = (url: string) => {
    // 1. Collect parent media
    const parentMedia: MediaItem[] = (localParentMsg?.media_ids || [])
      .filter(m => m.type === 'image' || m.type === 'video')
      .map(m => ({
        id: m.id || m.url, // Ensure id is present
        type: m.type as 'image' | 'video',
        url: m.url,
        filename: m.filename || 'media',
        timestamp: localParentMsg ? new Date(localParentMsg.created_at).toLocaleString() : ''
      }));

    // 2. Collect comments media
    const commentsMedia: MediaItem[] = (comments || []).flatMap(c => 
      (c.media_ids || [])
        .filter(m => m.type === 'image' || m.type === 'video')
        .map(m => ({
          id: m.id || m.url,
          type: m.type as 'image' | 'video',
          url: m.url,
          filename: m.filename || 'media',
          timestamp: new Date(c.created_at).toLocaleString()
        }))
    );

    const allMediaInThread = [...parentMedia, ...commentsMedia];
    
    // Find index by checking if the URL contains the media URL or matches the ID
    const index = allMediaInThread.findIndex(m => url.includes(m.url) || (m.id && url.includes(m.id)));

    setMediaViewer({
      isOpen: true,
      mediaItems: allMediaInThread,
      currentIndex: index >= 0 ? index : 0
    });
  };

  const handleSendMessage = useCallback(async (customContent?: string) => {
    if (sendingComment || uploading) return;
    
    // Nếu có customContent (như emoji 👍), gửi ngay
    if (customContent) {
      try {
        const replyPayload = replyTarget ? {
          id: replyTarget.id,
          sender: replyTarget.sender_id === currentUserId ? "Bạn" : replyTarget.sender_name,
          content: replyTarget.content,
          type: replyTarget.type || "text",
          media_url: replyTarget.media_ids?.[0]?.url || ""
        } : undefined;

        socketManager.sendMessage(
          currentUserId ?? "",
          selectedChat?.user_id ?? "",
          selectedChat?.group_id ?? "",
          customContent,
          [],
          currentUser?.data.display_name,
          undefined,
          currentUser?.data.avatar,
          replyPayload,
          "text",
          localParentMsg?.id || ""
        );
        setReplyTarget(null);
      } catch (error) {
        toast.error("Không thể gửi tin nhắn nhanh");
      }
      return;
    }

    // Editing mode: send edit instead of new comment
    const currentEditingId = editingMessageIdRef.current;
    if (currentEditingId) {
      const content = editor?.getHTML() || "";
      const text = editor?.getText().trim();
      if (!text) return;

      // Optimistic update UI immediately
      const now = new Date().toISOString();
      setComments((prev: Messages[]) => prev.map(c =>
        c.id === currentEditingId ? { ...c, content, edited_at: now } : c
      ));
      if (localParentMsg?.id === currentEditingId) {
        setLocalParentMsg((prev: Messages | null) => prev ? { ...prev, content, edited_at: now } : null);
      }

      socketManager.sendEditMessage(
        currentEditingId,
        currentUserId ?? "",
        content,
        selectedChat?.user_id || "",
        selectedChat?.group_id || ""
      );

      editor?.commands.clearContent();
      setEditingMessageId(null);
      editingMessageIdRef.current = null;
      return;
    }

    handleSubmitComment();
  }, [sendingComment, uploading, replyTarget, currentUserId, selectedChat, currentUser, localParentMsg, handleSubmitComment]);

  // Listen for Enter key from editor via custom event
  useEffect(() => {
    const handleSendEvent = () => {
      handleSendMessage();
    };
    window.addEventListener('thread-panel-send', handleSendEvent);
    return () => window.removeEventListener('thread-panel-send', handleSendEvent);
  }, [handleSendMessage]);

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRecallMessage = (targetMsgId: string) => {
    // Optimistic update for recall (though usually wait for socket, but user wants "immediate")
    if (localParentMsg?.id === targetMsgId) {
      handleClose();
    }
    setComments((prev: Messages[]) => prev.filter(c => c.id !== targetMsgId));

    socketManager.sendRecallMessage(
      currentUserId ?? "",
      selectedChat?.user_id || "",
      selectedChat?.group_id || "",
      targetMsgId
    );
    setMenuTargetId(null);
  };

  const handleDeleteMessage = (targetMsgId: string) => {
    // UI immediate update
    if (localParentMsg?.id === targetMsgId) {
      handleClose();
    } else {
      setComments((prev: Messages[]) => prev.filter(c => c.id !== targetMsgId));
    }

    if (currentUserId) {
      socketManager.sendDeleteMessageForMe(currentUserId, [targetMsgId]);
    }
    setMenuTargetId(null);
  };

  const handleEditMessage = (targetMsgId: string) => {
     // For now just set the state, implementation of editor will come later if needed
     setEditingMessageId(targetMsgId);
     setMenuTargetId(null);
  };

  const handleQuickReaction = (targetMsgId: string, emoji: string) => {
    socketManager.sendReaction(
      targetMsgId,
      currentUserId ?? "",
      emoji,
      "add",
      currentUser?.data.display_name ?? "Người dùng"
    );
    setShowReactionPicker(false);
    setPickerTargetId(null);
  };

  const handleRemoveAllReactions = (targetMsgId: string) => {
    socketManager.sendReaction(
      targetMsgId,
      currentUserId ?? "",
      "",
      "remove_all",
      currentUser?.data.display_name ?? ""
    );
    setShowReactionDetails(false);
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(false);
        setPickerTargetId(null);
      }
      if (reactionDetailsRef.current && !reactionDetailsRef.current.contains(event.target as Node)) {
        setShowReactionDetails(false);
        setDetailsTargetId(null);
      }
      // Menu target ID cleanup is usually handled by MessageMenu internal click outside 
      // but we can add a simple check if needed OR rely on MessageMenu's setShowMenu prop
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  // Helper to render reactions — pill-shaped badges with soft per-emoji coloring
  const renderReactions = (targetMsg: Messages) => {
    if (!targetMsg.reactions || targetMsg.reactions.length === 0) return null;

    const grouped = targetMsg.reactions.reduce((acc: Record<string, Messages['reactions']>, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = [];
      acc[r.emoji]?.push(r);
      return acc;
    }, {});

    const myReaction = targetMsg.reactions.some(r => r.user_id === currentUserId);

    return (
      <div className="flex flex-wrap items-center gap-1 mt-0.5 max-w-full">
        {Object.entries(grouped).map(([emoji, reactions]) => {
          const hasMyReaction = reactions?.some(re => re.user_id === currentUserId);
          const uniqueNames = Array.from(new Set(reactions?.map(re => re.user_name))).join(", ");

          return (
            <button
              key={emoji}
              onClick={() => {
                setDetailsTargetId(targetMsg.id);
                setShowReactionDetails(true);
              }}
              className={`
                px-1.5 py-0.5 rounded-full border text-[10px] flex items-center gap-1 transition-all
                ${hasMyReaction 
                   ? "bg-blue-50 border-[#00568c]/30 text-[#00568c] shadow-sm" 
                   : "bg-white border-gray-100 text-gray-600 hover:border-gray-200"
                }
              `}
              title={uniqueNames}
            >
              <span className="text-[11px]">{emoji}</span>
              <span className="font-semibold tabular-nums">{reactions?.length}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderReactionPicker = (targetId: string) => {
    if (!showReactionPicker || pickerTargetId !== targetId) return null;

    return (
      <motion.div
        ref={reactionPickerRef}
        initial={{ opacity: 0, scale: 0.85, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="absolute bottom-full mb-2 left-0 z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 px-2 py-1.5 flex gap-0.5"
      >
        {["👍", "❤️", "😂", "😮", "😢", "😠"].map(emoji => (
          <button
            key={emoji}
            onClick={() => handleQuickReaction(targetId, emoji)}
            className="text-xl hover:bg-gray-100 p-1.5 rounded-xl transition-all duration-150 hover:scale-125 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </motion.div>
    );
  };

  const renderReactionDetails = (targetMsg: Messages) => {
    if (!showReactionDetails || detailsTargetId !== targetMsg.id) return null;

    return (
      <div
        ref={reactionDetailsRef}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm"
        onClick={() => setShowReactionDetails(false)}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl w-80 max-h-[70vh] flex flex-col overflow-hidden border border-gray-200"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Cảm xúc</h3>
            <button onClick={() => setShowReactionDetails(false)} className="text-gray-400 hover:text-gray-600"><Plus size={20} className="rotate-45" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {targetMsg.reactions?.map((r, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl border border-gray-100">{r.emoji}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{r.user_name}</p>
                </div>
                {r.user_id === currentUserId && (
                  <button 
                    onClick={() => handleQuickReaction(targetMsg.id, r.emoji)}
                    className="text-[10px] text-red-500 hover:underline"
                  >Gỡ</button>
                )}
              </div>
            ))}
          </div>
          {targetMsg.reactions?.some(r => r.user_id === currentUserId) && (
             <button 
                onClick={() => handleRemoveAllReactions(targetMsg.id)}
                 className="m-4 p-2 bg-blue-50 text-[#00568c] text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors"
             >Gỡ tất cả cảm xúc của tôi</button>
          )}
        </div>
      </div>
    );
  };

  if (activePanel !== "thread" || !localParentMsg) return null;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col h-full bg-white border-l border-gray-100 w-full lg:w-100 shadow-2xl relative z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <MessageSquare size={14} className="text-[#00568c]" />
          </div>
          <div>
            <span className="text-[15px] font-bold text-gray-900 leading-tight">Bình luận</span>
            <p className="text-[11px] text-gray-400 truncate max-w-[200px] leading-tight">
              {localParentMsg.sender_name} · {new Date(localParentMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all duration-150"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fafafa]">
        {/* Original Message — highlighted origin block */}
        <div className=" bg-white overflow-hidden">
          {/* Top accent strip */}
          <div className="h-px w-full bg-gradient-to-r from-[#00568c] via-[#0073bc] to-transparent" />
          <div className="p-1.5">
            <div className="flex gap-2 items-start">
               <UserAvatar
                  avatar={localParentMsg.sender_avatar}
                  display_name={localParentMsg.sender_name}
                  size={36}
                  showOnlineStatus={false}
               />
                <div 
                  className="flex-1 min-w-0 group/msg relative"
                  onMouseEnter={() => setHoveredMsgId(localParentMsg.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-[13px] text-gray-900 leading-none">{localParentMsg.sender_name}</span>
                      <span className="text-[11px] text-gray-400 leading-none">{new Date(localParentMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {/* Actions for Original Msg */}
                    <div className={`flex items-center gap-0.5 transition-opacity duration-150 ${hoveredMsgId === localParentMsg.id ? "opacity-100" : "opacity-0"}`}>
                       <button 
                          onClick={() => {
                            setReplyTarget(localParentMsg);
                            setEditingMessageId(null);
                            editor?.commands.focus();
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                          title="Phản hồi"
                       >
                          <Reply size={14} />
                       </button>
                       <button 
                          onClick={() => {
                            setPickerTargetId(localParentMsg.id);
                            setShowReactionPicker(true);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#00568c] transition-colors"
                          title="Thêm cảm xúc"
                       >
                          <Smile size={14} />
                       </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-800 leading-relaxed max-w-full overflow-hidden">
                     <MessageContent 
                        msg={localParentMsg} 
                        onPreviewMedia={handlePreviewMedia} 
                        getTextContent={(html: string) => {
                          const temp = document.createElement("div");
                          temp.innerHTML = html;
                          return temp.textContent || temp.innerText || "";
                        }}
                     />
                  </div>
                  {renderReactions(localParentMsg)}
                  {renderReactionPicker(localParentMsg.id)}
                  {renderReactionDetails(localParentMsg)}
                </div>
            </div>
          </div>
        </div>

        {/* Divider with comment count label */}
        <div className="flex items-center gap-3 px-4 py-1.5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <MessageSquare size={10} />
            {comments.length > 0 ? `${comments.length} bình luận` : "Bình luận"}
          </span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Comments List */}
        <div className="px-3 pb-4 space-y-0.5">
          {loadingComments ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin w-7 h-7 border-[2.5px] border-[#00568c] border-t-transparent rounded-full" />
              <p className="text-xs text-gray-400">Đang tải bình luận...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-300 space-y-2">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <MessageSquare size={24} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-400">Chưa có bình luận nào</p>
              <p className="text-xs text-gray-300 leading-none">Hãy là người đầu tiên bình luận!</p>
            </div>
          ) : (
            comments.map((comment, ci) => (
              <div key={comment.id} id={`comment-${comment.id}`} className="flex gap-2 group/row">
                {/* Avatar column */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <UserAvatar avatar={comment.sender_avatar} display_name={comment.sender_name} size={26} showOnlineStatus={false} />
                </div>

                {/* Content column */}
                <div 
                  className="flex-1 min-w-0 pb-1"
                  onMouseEnter={() => setHoveredMsgId(comment.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                >
                  {/* Name + time + action row */}
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-[11px] text-gray-900 leading-none">{comment.sender_name}</span>
                      <span className="text-[10px] text-gray-400 leading-none">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {/* Actions */}
                    <div className={`flex items-center gap-0.5 transition-all duration-150 ${hoveredMsgId === comment.id ? "opacity-100 translate-x-0" : "opacity-0 translate-x-1"}`}>
                      <button 
                          onClick={() => {
                            setReplyTarget(comment);
                            setEditingMessageId(null);
                            editor?.commands.focus();
                          }}
                           className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                           title="Phản hồi"
                      >
                          <Reply size={13} />
                      </button>
                      {comment.sender_id === currentUserId && (
                        <button 
                            onClick={() => {
                              setEditingMessageId(comment.id);
                              setReplyTarget(null);
                              editor?.commands.setContent(comment.content);
                              editor?.commands.focus();
                            }}
                             className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#00568c] transition-colors"
                             title="Sửa tin nhắn"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      )}
                      <button 
                          onClick={() => {
                            setPickerTargetId(comment.id);
                            setShowReactionPicker(true);
                          }}
                           className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#00568c] transition-colors"
                           title="Thêm cảm xúc"
                      >
                          <Smile size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Bubble */}
                  <div className="relative">
                    <div className="inline-block max-w-full bg-white border border-gray-100 rounded-xl rounded-tl-sm px-2 py-0.5 transition-shadow duration-200">
                      {comment.reply && comment.reply.id !== "000000000000000000000000" && (
                        <div 
                          onClick={() => {
                             const target = document.getElementById(`comment-${comment.reply?.id}`);
                             if (target) {
                               target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                               target.classList.add('!bg-blue-50');
                               setTimeout(() => target.classList.remove('!bg-blue-50'), 2000);
                             }
                          }}
                          className="mb-2 flex items-start gap-2 pl-2 border-l-2 border-[#00568c] bg-blue-50/60 rounded-r-lg py-1.5 pr-2 cursor-pointer hover:bg-blue-50 transition-colors"
                        >
                           <Reply size={10} className="text-[#00568c] flex-shrink-0 mt-0.5" />
                           <div className="min-w-0">
                             <p className="text-[10px] font-bold text-[#00568c] leading-tight truncate">{comment.reply.sender}</p>
                             <p className="text-[10px] text-gray-500 truncate italic leading-tight">
                               {(() => { 
                                 const t = document.createElement("div"); 
                                 t.innerHTML = comment.reply.content; 
                                 const text = t.textContent || t.innerText || "";
                                 if (text) return text;
                                 if (comment.reply.type === "image") return "[Hình ảnh]";
                                 if (comment.reply.type === "video") return "[Video]";
                                 if (comment.reply.type === "file") return "[Tệp tin]";
                                 return "";
                               })()}
                             </p>
                           </div>
                        </div>
                      )}
                      <MessageContent 
                        msg={comment} 
                        onPreviewMedia={handlePreviewMedia} 
                        getTextContent={(html: string) => {
                          const temp = document.createElement("div");
                          temp.innerHTML = html;
                          return temp.textContent || temp.innerText || "";
                        }}
                      />
                    </div>
                    {/* Reaction picker anchored */}
                    <div className="relative">
                      {renderReactionPicker(comment.id)}
                    </div>
                  </div>

                  {/* Reactions row */}
                  {renderReactions(comment)}
                  {renderReactionDetails(comment)}
                </div>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>
      </div>

      {/* Input Box */}
      <div className="border-t border-gray-100 bg-white">

        {/* Reply / Edit Context Banner */}
        <AnimatePresence>
          {replyTarget && (
            <motion.div
              key="reply-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2 px-4 pt-3 pb-1">
                <div className="flex-1 flex items-start gap-2 pl-3 border-l-2 border-[#00568c] bg-gray-50 rounded-r-lg py-2 pr-2 min-w-0 border-y border-r border-[#00568c]/10 shadow-sm">
                  <Reply size={14} className="text-[#00568c] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#00568c]">Đang trả lời {replyTarget.sender_name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {(() => { 
                        const t = document.createElement("div"); 
                        t.innerHTML = replyTarget.content; 
                        const text = t.textContent || t.innerText || "";
                        if (text) return text;
                        const mediaType = replyTarget.media_ids?.[0]?.type;
                        if (mediaType === "image") return "[Hình ảnh]";
                        if (mediaType === "video") return "[Video]";
                        if (mediaType === "file") return "[Tệp tin]";
                        return "";
                      })()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReplyTarget(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full flex-shrink-0 mt-1"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
          {editingMessageId && (
            <motion.div
              key="edit-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <div className="flex-1 flex items-center gap-2 pl-3 border-l-2 border-[#00568c] bg-gray-50 rounded-r-lg py-2 pr-2 border-y border-r border-[#00568c]/10 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00568c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  <p className="text-[11px] font-semibold text-[#00568c]">Đang chỉnh sửa tin nhắn</p>
                </div>
                <button
                  onClick={() => setEditingMessageId(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className=" relative">
          {/* File Preview */}
          {selectedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2 p-2.5 bg-gray-50 rounded-xl border border-dashed border-gray-200">
               {selectedFiles.map((file, idx) => (
                  <div key={idx} className="relative w-12 h-12 rounded-xl border border-gray-200 overflow-hidden group shadow-sm">
                     {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white text-gray-400"><FileText size={16} /></div>
                     )}
                     <button 
                      onClick={() => handleRemoveFile(idx)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-150"
                     >
                       <X size={13} />
                     </button>
                  </div>
               ))}
            </div>
          )}

          {/* Composer */}
          <div className="border border-gray-200 rounded-sm overflow-hidden focus-within:border-[#00568c] focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white shadow-sm">
            {/* Editor */}
            <div className="min-h-[42px] bg-white">
               <EditorContent editor={editor} />
            </div>

            {/* Action Toolbar */}
            <div className="flex items-center gap-1 px-2 py-1 border-t border-gray-50">
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-gray-400 hover:text-[#00568c] hover:bg-blue-50 rounded-xl transition-all duration-150"
                  title="Đính kèm tệp"
               >
                 <Paperclip size={18} />
               </button>
               <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPicker(!showPicker);
                  }}
                  className={`p-1.5 rounded-xl transition-all duration-150 ${showPicker ? 'text-[#00568c] bg-blue-50' : 'text-gray-400 hover:text-[#00568c] hover:bg-blue-50'}`}
               >
                 <Smile size={18} />
               </button>
                <div className="flex-1" />
                {/* Nếu không có nội dung → ThumbsUp, nếu có → Send */}
                {(!editorHasContent && selectedFiles.length === 0) ? (
                  <button
                    onClick={() => handleSendMessage("👍")}
                    className="p-1.5 text-gray-400 hover:text-[#00568c] hover:bg-blue-50 rounded-xl transition-all duration-150"
                    title="Thả Like nhanh"
                  >
                    <ThumbsUp size={18} />
                  </button>
                ) : (
                  <button
                    disabled={sendingComment || uploading}
                    onClick={() => handleSendMessage()}
                    className="flex items-center justify-center w-8 h-8 bg-[#00568c] text-white rounded-xl hover:bg-[#004775] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-sm hover:shadow-md active:scale-95"
                  >
                    {sendingComment || uploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                )}
            </div>
          </div>
          <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileSelect} />
          
          {/* Emoji Picker */}
          {showPicker && (
            <div 
              className="absolute bottom-full right-4 mb-2 z-[100]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="fixed inset-0" onClick={() => setShowPicker(false)} />
              <div className="relative shadow-2xl border border-gray-200 rounded-lg overflow-hidden bg-white">
                 <EmojiPicker
                   onEmojiClick={(emojiData) => {
                     editor?.commands.insertContent(emojiData.emoji);
                     setShowPicker(false);
                   }}
                   theme={Theme.LIGHT}
                  width={320}
                  height={350}
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <MediaViewerModal />
    </motion.div>
  );
}
