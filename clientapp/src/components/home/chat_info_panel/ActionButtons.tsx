import { LogOut, Trash2 } from "lucide-react";
import ConfirmModal from "../../notification/ConfirmModal";
import { useState } from "react";
import { socketManager } from "../../../api/socket";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { userAtom } from "../../../recoil/atoms/userAtom";
import { groupListState } from "../../../recoil/atoms/groupAtom";
import { groupApi } from "../../../api/group";
import { activePanelAtom } from "../../../recoil/atoms/uiAtom";

interface ActionButtonsProps {
  isGroup: boolean;
  onLeaveGroup?: () => void;
  onDeleteHistory?: () => void;
  userId?: string;
  groupId?: string;
}

export default function ActionButtons({
  isGroup,
  onLeaveGroup,
  onDeleteHistory,
  userId,
  groupId,
}: ActionButtonsProps) {
  const setGroups = useSetRecoilState(groupListState);
  const user = useRecoilValue(userAtom);
  const setActivePanel = useSetRecoilState(activePanelAtom);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const handleLeaveGroup = async () => {
    try {
      onLeaveGroup?.();
      if (socketManager.getSocket()) {
        socketManager.sendMemberLeft(
          userId,
          groupId,
          user?.data.display_name,
          user?.data.avatar
        );
      }

      const res = await groupApi.getGroup();
      setGroups(res.data);
      setShowLeaveConfirm(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* Leave Group Button */}
      <div className="flex flex-col space-y-2.5">
        {/* Rời khỏi nhóm */}
        {isGroup && (
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3
                     rounded-2xl border border-red-200
                     text-red-600 text-[13px]
                     hover:bg-red-50 transition cursor-pointer"
          >
            <LogOut size={16} />
            <span className="font-medium">Rời khỏi nhóm</span>
          </button>
        )}

        {/* Danh sách thành viên */}
        {isGroup && (
          <button
            onClick={() => setActivePanel("members")}
            className="w-full flex items-center justify-center gap-2 py-2 px-3
                     rounded-2xl border border-blue-200
                     text-blue-600 text-[13px]
                     hover:bg-blue-50 transition cursor-pointer"
          >
            <LogOut size={16} />
            <span className="font-medium">Danh sách thành viên</span>
          </button>
        )}

        {/* Xóa lịch sử */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3
                   rounded-2xl border border-red-300
                   text-red-700 text-[13px]
                   hover:bg-red-100 transition cursor-pointer"
        >
          <Trash2 size={16} />
          <span className="font-medium">Xóa lịch sử trò chuyện</span>
        </button>
      </div>
      {/* Modal xác nhận xóa */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Xóa lịch sử trò chuyện"
        description="Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={() => {
          onDeleteHistory?.();
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Modal xác nhận rời nhóm */}
      <ConfirmModal
        isOpen={showLeaveConfirm}
        title="Rời khỏi nhóm"
        description="Bạn có chắc muốn rời khỏi nhóm này?"
        confirmText="Rời nhóm"
        cancelText="Hủy"
        onConfirm={handleLeaveGroup}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </>
  );
}
