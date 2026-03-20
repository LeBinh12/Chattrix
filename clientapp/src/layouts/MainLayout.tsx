import { Outlet } from "react-router-dom";
import { useRecoilValue, useRecoilState } from "recoil";
import Sidebar from "../components/home/Sidebar";
import { selectedChatState } from "../recoil/atoms/chatAtom";
import { useEffect } from "react";
import { PanelLeftOpen } from "lucide-react";
import { sidebarCollapsedAtom } from "../recoil/atoms/uiAtom";

export default function MainLayout() {
  const selectedChat = useRecoilValue(selectedChatState);
  const [sidebarCollapsed, setSidebarCollapsed] = useRecoilState(sidebarCollapsedAtom);

  // Persist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  return (
    <div className="h-[100dvh] w-screen flex overflow-hidden bg-[#00568c]">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* Main content */}
      <div
        className={`
          flex-1 min-w-0 overflow-y-auto
          ${!selectedChat ? 'pb-[60px] md:pb-0' : ''}
        `}
      >
        <Outlet />
      </div>
    </div>
  );
}
