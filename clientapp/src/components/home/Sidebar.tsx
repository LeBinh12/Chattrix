import {
  MessageSquare,
  Settings,
  LogOut,
  ShieldUser,
  BookUser,
  Group,
  Zap,
} from "lucide-react";
import { useRecoilValue } from "recoil";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { socketManager } from "../../api/socket";
import ConfirmModal from "../notification/ConfirmModal";
import { userAtom } from "../../recoil/atoms/userAtom";
import { API_ENDPOINTS } from "../../config/api";

type TabType = "messages" | "groups" | "contacts" | "admin" | null;

export default function Sidebar() {
  const user = useRecoilValue(userAtom);
  const [activeTab, setActiveTab] = useState<TabType>("messages");
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

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
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden ring-4 ring-white/20 shadow-lg">
              {user?.data.avatar ? (
                <img
                  src={`${API_ENDPOINTS.UPLOAD_MEDIA}/${user.data.avatar}`}
                  alt={user?.data.display_name || "avatar"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Ẩn ảnh lỗi
                    e.currentTarget.style.display = "none";

                    // Thay bằng chữ cái đầu
                    const fallback = document.createElement("div");
                    fallback.className =
                      "w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 text-white text-lg font-semibold";
                    fallback.textContent = (
                      user?.data.display_name?.charAt(0) || "U"
                    ).toUpperCase();

                    e.currentTarget.parentElement!.appendChild(fallback);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 text-white text-lg font-semibold">
                  {(user?.data.display_name?.charAt(0) || "U").toUpperCase()}
                </div>
              )}

              {/* chấm online */}
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-[#0d52c9] rounded-full"></span>
            </div>

            <div className="h-1 w-6 rounded-full bg-white/40"></div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Tin nhắn */}
            <SidebarButton
              icon={<MessageSquare size={22} />}
              label="Tin nhắn"
              active={activeTab === "messages"}
              onClick={() => {
                setActiveTab("messages");
                navigate("/");
              }}
            />

            {/* Nhóm */}
            <SidebarButton
              icon={<Group size={22} />}
              label="Nhóm"
              active={activeTab === "groups"}
              onClick={() => {
                setActiveTab("groups");
                navigate("/group");
              }}
            />

            {/* Danh bạ */}
            <SidebarButton
              icon={<BookUser size={22} />}
              label="Danh bạ"
              active={activeTab === "contacts"}
              onClick={() => {
                setActiveTab("contacts");
                navigate("/contact");
              }}
            />

            {/* Admin */}
            <SidebarButton
              icon={<ShieldUser size={22} />}
              label="Admin"
              active={activeTab === "admin"}
              onClick={() => {
                setActiveTab("admin");
                navigate("/admin");
              }}
            />

            {/* Admin */}
            <SidebarButton
              icon={<Zap size={22} />}
              label="Admin"
              active={activeTab === "admin"}
              onClick={() => {
                setActiveTab("admin");
                navigate("/admin");
              }}
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
            <>
              <SidebarButton
                icon={<ShieldUser size={22} />}
                label="Admin"
                active={activeTab === "admin"}
                onClick={() => {
                  setActiveTab("admin");
                  navigate("/admin");
                }}
              />

              <SidebarButton
                icon={<LogOut size={22} />}
                active={activeTab === "admin"}
                label="Đăng xuất"
                danger
                onClick={() => setShowConfirm(true)}
              />
            </>
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
