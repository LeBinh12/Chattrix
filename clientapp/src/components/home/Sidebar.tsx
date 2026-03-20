import {
  Settings,
  MessageSquareText,
  User,
  ClipboardList,
  ShieldUser,
  PanelLeftClose,
} from "lucide-react";
import { useRecoilValue } from "recoil";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ConfirmModal from "../notification/ConfirmModal";
import { userAtom } from "../../recoil/atoms/userAtom";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { API_ENDPOINTS } from "../../config/api";
import ProfileModal from "./settings/ProfileModal";
import SettingsModal from "./settings/SettingsModal";
import { usePermissions } from "../../hooks/usePermissions";
import { useAuth } from "../../hooks/useAuth";


type TabType = "messages" | "groups" | "contacts" | "admin" | "settings" | null;

const ICON_SIZE = 24;

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const user = useRecoilValue(userAtom);
  const { canAccessAdminPanel: checkAdminAccess } = usePermissions();


  const selectedChat = useRecoilValue(selectedChatState);
  const [activeTab, setActiveTab] = useState<TabType>("messages");
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Kiểm tra user có quyền truy cập admin panel không
  const hasAdminAccess = checkAdminAccess();

  const navigate = useNavigate();

  // Handle active tab based on path
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/" || path.startsWith("/c/")) setActiveTab("messages");
    else if (path.startsWith("/todo")) setActiveTab("contacts");
    else if (path.startsWith("/admin")) setActiveTab("admin");
    else if (path.startsWith("/settings")) setActiveTab("settings");
  }, []);

  const handleSettingsClick = () => {
    if (window.innerWidth < 768) {
      navigate("/settings");
      setActiveTab("settings");
    } else {
      setShowSettings(!showSettings);
    }
  };

  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.info(`Đăng xuất thành công!`);
    navigate("/login");
  };

  return (
    <>
      {/* Desktop sidebar - hidden when collapsed */}
      <div
        className={`
          !z-50 !flex-shrink-0
          md:!h-full md:!flex md:!flex-col md:!py-3 md:!static md:!bg-white md:!border-r md:!border-gray-100 md:!text-gray-500
          md:!transition-all md:!duration-300 md:!overflow-hidden
          ${collapsed ? "md:!w-0 md:!py-0 md:!border-r-0" : "md:!w-[70px]"}
          ${selectedChat ? "!hidden md:!flex" : "!flex"}
          !fixed !bottom-0 !w-full !h-[60px] !flex-row !items-center !justify-between !bg-white !border-t !border-gray-200 !text-gray-400
        `}
      >
        <div className={`!grid ${hasAdminAccess ? "!grid-cols-4" : "!grid-cols-3"} !w-full !h-full md:!flex md:!flex-col md:!items-center md:!gap-4 md:!justify-start`}>
          {/* Avatar Section - Desktop Only */}
          <div className="!hidden md:!flex !flex-col !items-center !gap-2 !mb-1">
            <div
              onClick={() => {
                setActiveTab("messages");
                navigate("/");
              }}
              className="!relative !w-10 !h-10 !rounded-full !overflow-hidden !cursor-pointer hover:!opacity-90 !transition-opacity !border-2 !border-white/20"
            >
              {user?.data.avatar ? (
                <img
                  src={`${API_ENDPOINTS.UPLOAD_MEDIA}/${user.data.avatar}`}
                  alt={user?.data.display_name || "avatar"}
                   className="!w-full !h-full !object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback = document.createElement("div");
                    fallback.className =
                      "w-full h-full flex items-center justify-center bg-[#00568c] text-white text-sm font-bold";
                    fallback.textContent = (
                      user?.data.display_name?.charAt(0) || "U"
                    ).toUpperCase();
                    e.currentTarget.parentElement!.appendChild(fallback);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#00568c] text-white text-sm font-bold">
                  {(user?.data.display_name?.charAt(0) || "U").toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Icons */}
          <div className="!contents md:!flex md:!flex-col md:!gap-1 md:!w-full md:!px-2 md:!flex-grow md:!justify-start">
            <SidebarButton
              icon={<MessageSquareText size={ICON_SIZE} />}
              label="Tin nhắn"
              active={activeTab === "messages"}
              onClick={() => {
                setActiveTab("messages");
                navigate("/");
              }}
            />

            <SidebarButton
              icon={<ClipboardList size={ICON_SIZE} />}
              label="Công việc"
              active={activeTab === "contacts"}
              onClick={() => {
                setActiveTab("contacts");
                navigate("/todo");
              }}
            />

            {/* Chỉ hiển thị nút Admin nếu user có quyền */}
            {hasAdminAccess && (
              <SidebarButton
                icon={<ShieldUser size={ICON_SIZE} />}
                label="Quản lý hệ thống"
                active={activeTab === "admin"}
                onClick={() => {
                  setActiveTab("admin");
                  navigate("/admin");
                }}
              />
            )}

            {/* Mobile: Settings becomes "Cá nhân" tab */}
            <div className="!contents md:!hidden">
              <SidebarButton
                icon={<User size={ICON_SIZE} />}
                label="Cá nhân"
                active={activeTab === "settings" || showSettings}
                onClick={handleSettingsClick}
              />
            </div>
          </div>

          {/* Desktop: Bottom Actions */}
          <div className="!hidden md:!flex !flex-col !items-center !gap-3 !w-full !px-2 !mb-4">
            <SidebarButton
              icon={<Settings size={ICON_SIZE} />}
              label="Cài đặt"
              active={showSettings}
              onClick={handleSettingsClick}
            />

            {/* Collapse Toggle Button */}
            {onToggle && (
              <button
                onClick={onToggle}
                title="Ẩn sidebar"
                className="
                  !flex !items-center !justify-center
                  !w-12 !h-12 !rounded-xl !transition-all !duration-200 !cursor-pointer
                  !text-gray-400 hover:!bg-gray-50 hover:!text-[#00568c]
                "
              >
                <PanelLeftClose size={ICON_SIZE} />
              </button>
            )}
          </div>

          {/* Settings Popup */}
          {showSettings && (
            <div
              className={`
                !absolute !bg-white !shadow-[0_-4px_20px_rgba(0,0,0,0.15)] !rounded-lg !py-1 !w-[200px] !z-[9999] !animate-in !fade-in
                md:!left-[60px] md:!bottom-3 md:!slide-in-from-left-2
                !bottom-[70px] !right-4 !slide-in-from-bottom-2
                !border !border-gray-200
              `}
            >
              <div className="flex flex-col text-[#333]">
                {/* Section 1 */}
                <button
                  onClick={() => {
                    setShowProfileModal(true);
                    setShowSettings(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2.5 transition-colors group"
                >
                  <User
                    size={18}
                    className="text-gray-400 group-hover:text-[#00568c] cursor-pointer font-light"
                    strokeWidth={1.5}
                  />
                  <span className="!text-xs !font-normal">
                    Thông tin tài khoản
                  </span>
                </button>
                <button
                  onClick={() => {
                    setShowSettingsModal(true);
                    setShowSettings(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2.5 transition-colors group"
                >
                  <Settings
                    size={18}
                    className="text-gray-400 group-hover:text-[#00568c] cursor-pointer"
                    strokeWidth={1.5}
                  />
                  <span className="!text-xs !font-normal">Cài đặt</span>
                </button>

                <div className="!h-[1px] !bg-gray-100 !my-1 !mx-2" />
                <div className="!h-[1px] !bg-gray-100 !my-1 !mx-2" />

                {/* Section 3 */}
                <button
                  onClick={() => {
                    setShowConfirm(true);
                    setShowSettings(false);
                  }}
                  className="!w-full !text-left !px-3 !py-2 hover:!bg-gray-100 !flex !items-center !gap-2.5 !transition-colors"
                >
                  <span className="!text-xs !text-red-600 !font-normal !ml-[2px]">
                    Đăng xuất
                  </span>
                </button>
              </div>
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

        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />

        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      </div>
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
  onClick,
  active,
  danger,
}: SidebarButtonProps) {
  return (
    <div className="!relative !group !flex !justify-center !flex-col !items-center !w-full md:!w-auto">
      <button
        onClick={onClick}
        className={`
          !relative !flex !items-center !justify-center !rounded-xl !transition-all !duration-200 !cursor-pointer
          md:!w-12 md:!h-12 !w-auto !h-auto !p-1.5
          ${
            danger
              ? "!text-red-400 hover:!bg-red-50 hover:!text-red-600"
              : active
              ? "md:!bg-blue-50 md:!text-[#00568c] !text-[#00568c]"
              : "md:!text-gray-400 md:hover:!bg-gray-50 md:hover:!text-[#00568c] !text-gray-300 hover:!text-[#00568c]"
          }
        `}
      >
        {icon}
      </button>

      {/* Mobile Label */}
      <span
        className={`md:!hidden !text-[10px] !mt-0.5 ${
          active ? "!text-[#00568c] !font-medium" : "!text-gray-400"
        }`}
      >
        {label === "Tin nhắn" ? "Tin nhắn" : label}
      </span>

      {/* Desktop Tooltip */}
      <div className="!hidden md:!group-hover:!block !absolute !left-full !top-1/2 !-translate-y-1/2 !ml-3 !bg-gray-900 !text-white !text-xs !py-1.5 !px-3 !rounded !opacity-100 !pointer-events-none !transition-opacity !whitespace-nowrap !z-[100]">
        {label}
        {/* Arrow */}
        <div className="!absolute !right-full !top-1/2 !-translate-y-1/2 !-mr-1 !border-4 !border-transparent !border-r-gray-900"></div>
      </div>
    </div>
  );
}
