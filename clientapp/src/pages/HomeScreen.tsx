import ChatWidget from "../components/ChatWidget";
import { useRecoilValue } from "recoil";
import { userAtom } from "../recoil/atoms/userAtom";

import Sidebar from "../components/home/Sidebar";
import ChannelList from "../components/home/ChannelList";
import ChatWindow from "../components/home/ChatWindow";
import ChatInfoPanel from "../components/home/ChatInfoPanel";

import ChannelListWrapper from "../components/home/ChannelListWrapper";
import { chatInfoPanelVisibleAtom } from "../recoil/atoms/uiAtom";
import { AnimatePresence, motion } from "framer-motion";

export default function HomeScreen() {
  const user = useRecoilValue(userAtom);
  const isPanelVisible = useRecoilValue(chatInfoPanelVisibleAtom);

  if (!user) {
    return <div>Không có thông tin người dùng</div>;
  }

  // Handler for group created
  // const handleGroupCreated = () => {
  //   setRefreshGroups((prev) => prev + 1);
  // };

  return (
    <>
      {/* <Header /> */}
      <div className="h-screen flex bg-[#2356a6]">
        {/* Giao diện chính */}
        <Sidebar />
        <div className="flex flex-col flex-1 bg-transparent overflow-hidden shadow-inner">
          {/* Thanh tiêu đề trong suốt với logo */}
          <div className="flex items-center justify-center h-7  text-black font-semibold text-lg tracking-wider">
            {/* <span>Chattrix - {user.data.display_name}</span> */}
          </div>

          <div className="flex flex-1 from-white rounded-tl-2xl rounded-tr-2xl  overflow-hidden">
            <ChannelListWrapper>
              {(width) => <ChannelList width={width} />}
            </ChannelListWrapper>

            <div className="flex-1 flex pb-2 px-2">
              <div className="flex-1 rounded-b-2xl rounded-tl-2xl rounded-tr-2xl overflow-hidden border-2 border-t-0 border-gray-300 bg-white shadow-lg">
                <ChatWindow />
              </div>
            </div>
            <AnimatePresence>
              {isPanelVisible && (
                <motion.div
                  key="chat-info-panel"
                  initial={{ opacity: 0, x: 200 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 200 }}
                  transition={{ type: "spring", stiffness: 70, damping: 15 }}
                  className="flex-shrink-0"
                >
                  <ChatInfoPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chat widget */}
        <ChatWidget />
      </div>
    </>
  );
}
