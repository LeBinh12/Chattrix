import { MessageSquare, Users, Settings, LogOut, Phone } from "lucide-react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { socketManager } from "../../api/socket";
import ConfirmModal from "../notification/ConfirmModal";
import { userAtom } from "../../recoil/atoms/userAtom";

type TabType = "messages" | "contacts" | null;

export default function Sidebar() {
  const setSelectedChat = useSetRecoilState(selectedChatState);
  const user = useRecoilValue(userAtom);
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
      <div className="flex flex-col items-center justify-between w-20 bg-gradient-to-b from-[#0057d9] via-[#0067f3] to-[#0d52c9] text-white py-6 px-3 shadow-2xl h-full">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden ring-4 ring-white/20 shadow-lg bg-white/10">
              <img
                src={
                  user?.data.avatar
                    ? `http://localhost:3000/v1/upload/media/${user.data.avatar}`
                    : "/assets/logo.png"
                }
                alt={user?.data.display_name || "avatar"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/assets/logo.png";
                }}
              />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-[#0d52c9] rounded-full"></span>
            </div>
            <div className="h-1 w-6 rounded-full bg-white/40"></div>
          </div>

          <div className="flex flex-col gap-3">
            <SidebarButton
              icon={<MessageSquare size={22} />}
              label="Tin nhắn"
              active={activeTab === "messages"}
              onClick={() => handleTabClick("messages")}
            />
            <SidebarButton
              icon={<Users size={22} />}
              label="Danh bạ"
              active={activeTab === "contacts"}
              onClick={() => handleTabClick("contacts")}
            />
            <SidebarButton
              icon={<Phone size={22} />}
              label="Cuộc gọi"
              active={false}
              onClick={() => {}}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full">
          <SidebarButton
            icon={<Settings size={22} />}
            label="Cài đặt"
            active={showSettings}
            onClick={handleSettingsClick}
          />
          {showSettings && (
            <SidebarButton
              icon={<LogOut size={22} />}
              label="Đăng xuất"
              danger
              onClick={() => setShowConfirm(true)}
            />
          )}
        </div>
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

type SidebarButtonProps = {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  danger?: boolean;
};

function SidebarButton({
  icon,
  label,
  active,
  onClick,
  danger,
}: SidebarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 shadow-lg ${
        danger
          ? "bg-red-500/30 text-red-50 hover:bg-red-500/60"
          : active
          ? "bg-white text-[#0d52c9]"
          : "bg-white/10 text-white/90 hover:bg-white/20"
      }`}
      title={label}
    >
      {icon}
      <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-gray-900/95 text-white text-xs py-1 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
        {label}
      </span>
    </button>
  );
}
