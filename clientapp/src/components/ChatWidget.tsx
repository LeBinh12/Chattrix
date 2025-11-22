import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatHeader from "./ChatHeader";
import ChatBody from "./ChatBody";
import ChatFooter from "./ChatFooter";
import { MessageCircle, X } from "lucide-react";
import ChatMessage from "./chat/ChatMessage";
import type { Conversation } from "../types/conversation";
import { useRecoilValue } from "recoil";
import { groupModalAtom } from "../recoil/atoms/uiAtom";

export default function ChatWidget() {
  const isGroupModalOpen = useRecoilValue(groupModalAtom);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "home" | "messages" | "help" | "news"
  >("home");
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [selectedID, setSelectedID] = useState("");

  const handleSelectConversation = (friend: Conversation) => {
    setSelectedChat(friend);
    setSelectedID(friend.user_id);
    console.log("selectedID", selectedID);
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 transition-all duration-300 ${
        isGroupModalOpen ? "blur-sm pointer-events-none opacity-60" : ""
      }`}
    >
      {/* Floating Button */}
      <motion.div
        whileHover={{
          scale: [null, 1.1, 1.6],
          transition: {
            duration: 0.5,
            times: [0, 0.6, 1],
            ease: ["easeInOut", "easeOut"],
          },
        }}
        transition={{
          duration: 0.3,
          ease: "easeOut",
        }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#4490f4]  text-white shadow-lg hover:bg-[#307bd7] flex items-center justify-center"
        >
          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.span
                key="close"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <X size={28} />
              </motion.span>
            ) : (
              <motion.span
                key="chat"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <MessageCircle size={28} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </motion.div>

      {/* Chat Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-20 right-0 
              w-[90vw] h-[70vh] sm:w-[400px] sm:h-[600px] md:w-[475px] md:h-[580px] 
              bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            {!selectedChat && (
              <ChatHeader
                onClose={() => {
                  setIsOpen(false);
                  setSelectedChat(null); // reset khi đóng
                  setSelectedID("");
                }}
              />
            )}
            {/* Body */}
            <div
              className="flex-1 overflow-y-auto 
                bg-gradient-to-b from-brand-600 
                scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-transparent"
            >
              {selectedChat ? (
                <ChatMessage
                  onFriend={selectedChat}
                  onBack={() => setSelectedChat(null)}
                />
              ) : (
                <ChatBody
                  activeTab={activeTab}
                  onOpenId={setSelectedID}
                  onFriend={handleSelectConversation}
                />
              )}
            </div>

            {/* Footer */}
            {!selectedChat && (
              <ChatFooter activeTab={activeTab} onChangeTab={setActiveTab} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
