import { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { Bell, BellOff, UserPlus } from "lucide-react";
import { bellStateAtom } from "../../../recoil/atoms/bellAtom";
import { selectedChatState } from "../../../recoil/atoms/chatAtom";
import { userApi } from "../../../api/userApi";
import { toast } from "react-toastify";
import { userAtom } from "../../../recoil/atoms/userAtom";
import { API_ENDPOINTS } from "../../../config/api";
import AddMemberModal from "../../group/AddMemberModal";

interface ChatInfoHeaderProps {
  avatar: string;
  displayName: string;
  status?: string;
  isGroup: boolean;
}

export default function ChatInfoHeader({
  avatar,
  displayName,
  status,
  isGroup,
}: ChatInfoHeaderProps) {
  const [bell, setBell] = useRecoilState(bellStateAtom);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const selectedChat = useRecoilValue(selectedChatState);
  const [loading, setLoading] = useState(false);
  const user = useRecoilValue(userAtom);

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
  }, [selectedChat]);

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
        target_id: targetId,
        is_group: isGroupChat,
        is_muted: false,
        mute_until: undefined,
      });

      setBell({ ...bell, is_muted: false, mute_until: "" });
      toast.success("Đã bật thông báo");
    } catch (err) {
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
        target_id: targetId,
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
    } catch (err) {
      toast.error("Không thể tắt thông báo");
    } finally {
      setShowMuteModal(false);
    }
  };

  const handleAddMembers = () => {
    // Callback khi thêm thành viên thành công
    // Có thể refresh danh sách thành viên hoặc làm gì đó ở đây
    console.log("Đã thêm thành viên thành công");
  };

  const avatarUrl =
    avatar && avatar.trim() !== "" && avatar !== "null"
      ? `${API_ENDPOINTS.UPLOAD_MEDIA}/${avatar}`
      : "/assets/logo.png";

  if (loading) {
    return <div>Đang tải dữ liệu....</div>;
  }
  return (
    <>
      <div className="flex flex-col items-center py-6 px-4 border-b border-blue-700/30 relative z-10">
        <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-blue-400/50 ring-2 ring-blue-500/20">
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        </div>

        <h3 className="font-semibold text-lg text-white">{displayName}</h3>

        {!isGroup && status && (
          <span className="text-xs text-blue-200 mt-1">
            {status === "online" ? "Đang hoạt động" : "Không hoạt động"}
          </span>
        )}

        <div className="mt-4 flex items-center gap-3">
          {/* Icon chuông */}
          <button
            className="p-2 rounded-full bg-blue-800/40 hover:bg-blue-700/60 transition-colors backdrop-blur-sm"
            onClick={handleBellClick}
            title={bell?.is_muted ? "Bật thông báo" : "Tắt thông báo"}
          >
            {bell?.is_muted ? (
              <BellOff className="w-6 h-6 text-blue-300" />
            ) : (
              <Bell className="w-6 h-6 text-blue-300" />
            )}
          </button>

          {/* Icon thêm thành viên – chỉ hiện trong group */}
          {isGroup && (
            <button
              className="p-2 rounded-full bg-blue-800/40 hover:bg-blue-700/60 transition-colors backdrop-blur-sm"
              onClick={() => setShowAddMemberModal(true)}
              title="Thêm thành viên"
            >
              <UserPlus className="w-6 h-6 text-blue-300" />
            </button>
          )}
        </div>

        {bell?.is_muted && (
          <span className="text-xs text-blue-300 mt-2">Đã tắt thông báo</span>
        )}
      </div>

      {/* Modal tắt thông báo */}
      {showMuteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={() => setShowMuteModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg shadow-2xl border border-blue-600/30 p-2 z-[101]">
            <div className="text-sm font-medium text-blue-100 mb-2 px-2">
              Tắt thông báo trong:
            </div>

            <button
              className="w-full px-3 py-2 text-left rounded hover:bg-blue-700/50 text-sm transition-colors text-white"
              onClick={() => handleMuteOption("1h", 60 * 60 * 1000)}
            >
              <div className="flex justify-between items-center">
                <span>1 tiếng</span>
                <span className="text-xs text-blue-300">1h</span>
              </div>
            </button>

            <button
              className="w-full px-3 py-2 text-left rounded hover:bg-blue-700/50 text-sm transition-colors text-white"
              onClick={() => handleMuteOption("24h", 24 * 60 * 60 * 1000)}
            >
              <div className="flex justify-between items-center">
                <span>24 tiếng</span>
                <span className="text-xs text-blue-300">24h</span>
              </div>
            </button>

            <button
              className="w-full px-3 py-2 text-left rounded hover:bg-blue-700/50 text-sm transition-colors text-white"
              onClick={() => handleMuteOption("30d", 30 * 24 * 60 * 60 * 1000)}
            >
              <div className="flex justify-between items-center">
                <span>1 tháng</span>
                <span className="text-xs text-blue-300">30 ngày</span>
              </div>
            </button>

            <button
              className="w-full px-3 py-2 text-left rounded hover:bg-blue-700/50 text-sm transition-colors text-white"
              onClick={() => handleMuteOption("untilOn")}
            >
              <div className="flex justify-between items-center">
                <span>Vĩnh viễn</span>
                <span className="text-xs text-blue-300">∞</span>
              </div>
            </button>

            <hr className="my-1 border-blue-600/30" />

            <button
              className="w-full px-3 py-2 text-left rounded hover:bg-red-700/50 text-sm text-red-300 transition-colors"
              onClick={() => setShowMuteModal(false)}
            >
              Hủy
            </button>
          </div>
        </>
      )}

      {/* Modal thêm thành viên */}
      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        groupId={selectedChat?.group_id || ""}
        onAddMembers={handleAddMembers}
      />
    </>
  );
}
