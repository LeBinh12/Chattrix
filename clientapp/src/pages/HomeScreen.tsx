import { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { userAtom } from "../recoil/atoms/userAtom";

import Sidebar from "../components/home/Sidebar";
import ChannelList from "../components/home/ChannelList";
import ChatWindow from "../components/home/ChatWindow";
import ChatInfoPanel from "../components/home/ChatInfoPanel";

import ChannelListWrapper from "../components/home/ChannelListWrapper";
import { chatInfoPanelVisibleAtom } from "../recoil/atoms/uiAtom";
import { selectedChatState } from "../recoil/atoms/chatAtom";
import { AnimatePresence, motion } from "framer-motion";

export default function HomeScreen() {
  const user = useRecoilValue(userAtom);
  const [selectedChat, setSelectedChat] = useRecoilState(selectedChatState);
  const [isPanelVisible, setPanelVisible] = useRecoilState(
    chatInfoPanelVisibleAtom
  );
  const [isCompact, setIsCompact] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      setViewportWidth(window.innerWidth);
      setIsCompact(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!selectedChat && isPanelVisible) {
      setPanelVisible(false);
    }
  }, [selectedChat, isPanelVisible, setPanelVisible]);

  if (!user) {
    return <div>Không có thông tin người dùng</div>;
  }

  // Handler for group created
  // const handleGroupCreated = () => {
  //   setRefreshGroups((prev) => prev + 1);
  // };

  const compactListWidth = Math.min(
    Math.max(viewportWidth - 80, 240),
    360
  );

  const hideSidebar = isCompact && !!selectedChat;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#dfe6f5]">
      {!hideSidebar && <Sidebar />}
      <div className="flex flex-1 min-w-0 bg-[#e9edf5] overflow-hidden">
        {isCompact ? (
          <>
            {!selectedChat && !isPanelVisible && (
              <div className="flex-1 flex bg-white overflow-hidden">
                <div className="flex-1 overflow-y-auto border-l border-[#dbe2ef]">
                  <ChannelList width={compactListWidth || 300} />
                </div>
              </div>
            )}

            {selectedChat && !isPanelVisible && (
              <div className="flex-1 flex bg-[#f5f6fb] border-l border-[#dbe2ef] overflow-hidden">
                <ChatWindow onBack={() => setSelectedChat(null)} />
              </div>
            )}

            {selectedChat && isPanelVisible && (
              <div className="flex-1 bg-white border-l border-[#dbe2ef] overflow-y-auto">
                <ChatInfoPanel />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="hidden lg:block h-full flex-shrink-0 overflow-hidden">
              <ChannelListWrapper>
                {(width) => <ChannelList width={width} />}
              </ChannelListWrapper>
            </div>

            <div className="flex-1 flex bg-[#f5f6fb] border-x border-[#dbe2ef] min-w-0 overflow-hidden">
              <ChatWindow onBack={() => setSelectedChat(null)} />
            </div>

            <AnimatePresence>
              {isPanelVisible && (
                <motion.div
                  key="chat-info-panel"
                  initial={{ opacity: 0, x: 200 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 200 }}
                  transition={{ type: "spring", stiffness: 65, damping: 16 }}
                  className="hidden lg:block flex-shrink-0 border-l border-[#dbe2ef] bg-white w-80"
                >
                  <ChatInfoPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
