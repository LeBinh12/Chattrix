import { LogOut, Settings, GripVertical } from "lucide-react";
import { useRecoilValue } from "recoil";
import { useLoadUser } from "../../hooks/useLoadUser";
import { userAtom } from "../../recoil/atoms/userAtom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { socketManager } from "../../api/socket";
import UserAvatar from "../UserAvatar";
import ConfirmModal from "../notification/ConfirmModal";
import { groupModalAtom } from "../../recoil/atoms/uiAtom";

export default function UserPanel() {
  useLoadUser();
  const user = useRecoilValue(userAtom);
  const isGroupModalOpen = useRecoilValue(groupModalAtom);

  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    toast.info(`Đăng xuất thành công!`);
    socketManager.disconnect();
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <>
      <div
        className={`bg-[#2b2d31] text-white w-60 sm:w-72 rounded-2xl shadow-2xl border border-[#1e1f22] ${
          isGroupModalOpen ? "blur-sm pointer-events-none opacity-60" : ""
        } `}
      >
        {/* Drag Handle */}
        <div className="drag-handle cursor-move bg-[#1e1f22] px-4 py-2 rounded-t-2xl flex items-center justify-between border-b border-[#35363c]">
          <GripVertical size={20} className="text-gray-400" />
        </div>

        {/* Content */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <UserAvatar avatar={user?.data.avatar} isOnline={true} />
            <div className="flex flex-col leading-tight">
              <span className="text-sm sm:text-base font-semibold">
                {user?.data.display_name}
              </span>
              <span className="text-xs sm:text-sm text-green-500">Online</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-lg hover:bg-[#35363c] transition">
              <Settings size={20} />
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="p-2 rounded-lg hover:bg-red-500 transition"
            >
              <LogOut size={20} />
            </button>
          </div>
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
