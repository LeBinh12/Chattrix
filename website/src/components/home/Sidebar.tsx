import { MessageSquare, Users, Settings, LogOut } from "lucide-react";
import { useSetRecoilState } from "recoil";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { socketManager } from "../../api/socket";
import ConfirmModal from "../notification/ConfirmModal";

type TabType = "messages" | "contacts" | null;

export default function Sidebar() {
  const setSelectedChat = useSetRecoilState(selectedChatState);
  const [activeTab, setActiveTab] = useState<TabType>("messages");
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === "contacts") {
      setSelectedChat(null);
    }
  };

  const handleSettingsClick = () => {
    setShowSettings(!showSettings);
  };

  const handleLogout = () => {
    toast.info(`Đăng xuất thành công!`);
    socketManager.disconnect();
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <>
      <div className="flex flex-col bg-gradient-to-b from-[#1e3a8a] via-[#1e40af] to-[#2563eb] items-center text-white w-16 sm:w-20 h-screen py-4 shadow-2xl border-r border-blue-700/30">
        {/* Logo */}
        <div className="relative group flex-shrink-0 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-blue-300/50">
            <img
              src="/assets/logo.png"
              alt="Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="w-10 h-[2px] bg-gradient-to-r from-transparent via-blue-300/60 to-transparent rounded-full mb-3"></div>

        {/* Navigation Tabs */}
        <div className="flex flex-col space-y-3 flex-shrink-0">
          {/* Tab Tin nhắn */}
          <div
            onClick={() => handleTabClick("messages")}
            className={`relative group p-3 rounded-2xl hover:rounded-xl transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:scale-105 ${
              activeTab === "messages"
                ? "bg-gradient-to-br from-blue-500 to-blue-700 ring-2 ring-blue-300/50"
                : "bg-blue-800/40 backdrop-blur-sm hover:bg-blue-700/60"
            }`}
            title="Tin nhắn"
          >
            <MessageSquare size={24} className="drop-shadow-sm" />
            <span className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900/95 text-white text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
              Tin nhắn
            </span>
          </div>

          {/* Tab Danh bạ */}
          <div
            onClick={() => handleTabClick("contacts")}
            className={`relative group p-3 rounded-2xl hover:rounded-xl transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:scale-105 ${
              activeTab === "contacts"
                ? "bg-gradient-to-br from-blue-500 to-blue-700 ring-2 ring-blue-300/50"
                : "bg-blue-800/40 backdrop-blur-sm hover:bg-blue-700/60"
            }`}
            title="Danh bạ"
          >
            <Users size={24} className="drop-shadow-sm" />
            <span className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900/95 text-white text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
              Danh bạ
            </span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Divider */}
        <div className="w-10 h-[2px] bg-gradient-to-r from-transparent via-blue-300/60 to-transparent rounded-full my-3"></div>

        {/* Nút Cài đặt */}
        <div
          onClick={handleSettingsClick}
          className={`relative group p-3 rounded-2xl hover:rounded-xl transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:scale-105 flex-shrink-0 ${
            showSettings
              ? "bg-gradient-to-br from-blue-500 to-blue-700 ring-2 ring-blue-300/50"
              : "bg-blue-800/40 backdrop-blur-sm hover:bg-blue-700/60"
          }`}
          title="Cài đặt"
        >
          <Settings size={24} className="drop-shadow-sm" />
          <span className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900/95 text-white text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
            Cài đặt
          </span>
        </div>

        {/* Nút Đăng xuất */}
        {showSettings && (
          <div
            onClick={() => setShowConfirm(true)}
            className="relative group bg-red-500/20 backdrop-blur-sm text-red-300 hover:text-white hover:bg-red-600 p-3 rounded-2xl hover:rounded-xl transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:scale-105 flex-shrink-0 mt-2 animate-in fade-in slide-in-from-bottom-2 ring-1 ring-red-400/30"
            title="Đăng xuất"
          >
            <LogOut size={24} className="drop-shadow-sm" />
            <span className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900/95 text-white text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
              Đăng xuất
            </span>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="Xác nhận đăng xuất"
        confirmText="Đăng xuất"
        cancelText="Hủy"
        onConfirm={() => {
          setShowConfirm(false);
          handleLogout();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
