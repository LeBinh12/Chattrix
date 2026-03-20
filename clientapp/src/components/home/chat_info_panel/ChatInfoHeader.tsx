import { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { Bell, BellOff, UserPlus, Users, ChevronLeft } from "lucide-react";
import { bellStateAtom } from "../../../recoil/atoms/bellAtom";
import { selectedChatState } from "../../../recoil/atoms/chatAtom";
import { userApi } from "../../../api/userApi";
import { toast } from "react-toastify";
import { userAtom } from "../../../recoil/atoms/userAtom";
import { API_ENDPOINTS } from "../../../config/api";
import { LOGO } from "../../../assets/paths";
import AddMemberModal from "../../group/AddMemberModal";
import { activePanelAtom } from "../../../recoil/atoms/uiAtom";
import UserAvatar from "../../UserAvatar";
// import { BUTTON_HOVER } from "../../../utils/className";
// import { motion } from "framer-motion";

interface ChatInfoHeaderProps {
  avatar: string;
  displayName: string;
  isGroup: boolean;
  isOwner?: boolean;
  canAdd?: boolean;
}

export default function ChatInfoHeader({
  avatar,
  displayName,
  isGroup,
  isOwner = false,
  canAdd = false,
}: ChatInfoHeaderProps) {
  const [bell, setBell] = useRecoilState(bellStateAtom);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const selectedChat = useRecoilValue(selectedChatState);
  const [loading, setLoading] = useState(false);
  const user = useRecoilValue(userAtom);
  // const [] = useRecoilState(chatInfoPanelVisibleAtom);
  const setActivePanel = useSetRecoilState(activePanelAtom);
  console.log("isOwner", isOwner)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const isGroup =
          !!selectedChat?.group_id &&
          selectedChat.group_id !== "000000000000000000000000";
        const targetId = isGroup
          ? selectedChat.group_id
          : selectedChat?.user_id;

        if (!targetId) {
          toast.error("Không có targetId hợp lệ");
          return;
        }

        const res = await userApi.getSetting(targetId, isGroup);
        setBell(res.data);
      } catch (err) {
        console.log(err);
      }
      setLoading(false);
    })();
  }, [selectedChat, setBell]);

  const handleBellClick = () => {
    if (!bell?.is_muted) {
      setShowMuteModal(true);
    } else {
      handleUnmute();
    }
  };

  const handleUnmute = async () => {
    if (!bell || !selectedChat || !user?.data.id) return;

    try {
      const isGroupChat =
        !!selectedChat.group_id &&
        selectedChat.group_id !== "000000000000000000000000";
      const targetId = isGroupChat
        ? selectedChat.group_id
        : selectedChat.user_id;

      await userApi.upsertSetting({
        user_id: user?.data.id,
        target_id: targetId ?? "",
        is_group: isGroupChat,
        is_muted: false,
        mute_until: undefined,
      });

      setBell({ ...bell, is_muted: false, mute_until: "" });
      toast.success("Đã bật thông báo");
    } catch {
      toast.error("Không thể bật lại thông báo");
    }
  };

  const handleMuteOption = async (label: string, duration?: number) => {
    if (!bell || !selectedChat || !user?.data.id) return;

    const isGroupChat =
      !!selectedChat.group_id &&
      selectedChat.group_id !== "000000000000000000000000";
    const targetId = isGroupChat ? selectedChat.group_id : selectedChat.user_id;

    const muteUntil =
      label === "untilOn"
        ? "9999-12-31T23:59:59Z"
        : new Date(Date.now() + (duration || 0)).toISOString();

    try {
      await userApi.upsertSetting({
        user_id: user?.data.id,
        target_id: targetId ?? "",
        is_group: isGroupChat,
        is_muted: true,
        mute_until: muteUntil,
      });

      setBell({
        ...bell,
        is_muted: true,
        mute_until: muteUntil,
      });

      toast.success(
        label === "untilOn"
          ? "Đã tắt thông báo vĩnh viễn"
          : `Đã tắt thông báo trong ${label}`
      );
    } catch {
      toast.error("Không thể tắt thông báo");
    } finally {
      setShowMuteModal(false);
    }
  };

  const avatarUrl =
    avatar && avatar.trim() !== "" && avatar !== "null"
      ? `${API_ENDPOINTS.UPLOAD_MEDIA}/${avatar}`
      : LOGO;

  if (loading) {
    return <div>Đang tải dữ liệu....</div>;
  }
  return (
    <>
      <div className="flex flex-col items-center pt-6 relative">
        {/* Close button - only shown on mobile */}
        <button
          onClick={() => setActivePanel("none")}
          className="absolute top-3 left-3 lg:hidden w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center transition z-10"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Avatar */}
        <div className="relative">
            <UserAvatar 
              avatar={avatar}
              display_name={displayName}
              showOnlineStatus={false}
              size={65}
            />
        </div>

        {/* Name */}
        <p className="mt-3 text-lg font-bold text-gray-900 text-center w-full px-6 break-words">{displayName}</p>

        {/* Action buttons */}
        <div className="flex justify-center gap-6 mt-5 mb-2 w-full px-4">
          {/* Toggle notifications button */}
          <button
            onClick={handleBellClick}
            className="flex flex-col items-center gap-2 group w-16"
            title={bell?.is_muted ? "Bật thông báo" : "Tắt thông báo"}
          >
            <div
              className={`w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 group-hover:bg-gray-200 transition-all`}
            >
              {bell?.is_muted ? (
                <BellOff className="w-5 h-5 text-gray-700" />
              ) : (
                <Bell className="w-5 h-5 text-gray-700" />
              )}
            </div>
            <span className="text-[11px] text-gray-700 font-medium text-center">
              {bell?.is_muted ? "Bật" : "Tắt"} TB
            </span>
          </button>

          {/* Add member (if permitted) or Create group (personal) button */}
          {isGroup && canAdd && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="flex flex-col items-center gap-2 group w-16"
                title="Thêm thành viên"
              >
                <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 group-hover:bg-gray-200 transition-all">
                  <UserPlus className="w-5 h-5 text-gray-700" />
                </div>
                <span className="text-[11px] text-gray-700 font-medium leading-none">
                  Thêm TV
                </span>
              </button>
            )}
        </div>


      </div>

      {/* Mute notifications modal - also slightly scaled down */}
      {showMuteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={() => setShowMuteModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-[101]">
            <p className="text-sm font-medium text-gray-800 mb-3">
              Tắt thông báo trong:
            </p>

            {["1 tiếng", "24 tiếng", "1 tháng", "Vĩnh viễn"].map(
              (label, idx) => (
                <button
                  key={idx}
                  className="w-full px-3 py-2.5 text-left rounded-lg hover:bg-gray-100 text-sm transition-colors text-gray-700 flex justify-between items-center"
                  onClick={() => {
                    if (label === "1 tiếng") handleMuteOption("1h", 3600000);
                    if (label === "24 tiếng") handleMuteOption("24h", 86400000);
                    if (label === "1 tháng")
                      handleMuteOption("30d", 2592000000);
                    if (label === "Vĩnh viễn") handleMuteOption("untilOn");
                  }}
                >
                  <span>{label}</span>
                  {label === "Vĩnh viễn" && (
                    <span className="text-xs text-gray-400">∞</span>
                  )}
                </button>
              )
            )}

            <hr className="my-3 border-gray-200" />

            <button
              className="w-full px-3 py-2.5 text-left rounded-lg hover:bg-red-50 text-sm text-red-600 transition-colors"
              onClick={() => setShowMuteModal(false)}
            >
              Hủy
            </button>
          </div>
        </>
      )}

      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        groupId={selectedChat?.group_id || ""}
        onAddMembers={() => console.log("Đã thêm thành viên")}
      />
    </>
  );
}
