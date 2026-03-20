import type { Conversation } from "../../types/conversation";
import { useState, useEffect } from "react";
import { Camera } from "lucide-react";
import { conversationApi } from "../../api/conversation";
import { toast } from "react-toastify";
import { groupApi } from "../../api/group";
import { socketManager } from "../../api/socket";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { userAtom } from "../../recoil/atoms/userAtom";
import UserSelectionModal, { type User } from "./UserSelectionModal";
import { conversationListAtom } from "../../recoil/atoms/conversationListAtom"; 
// import { BUTTON_HOVER } from "../../utils/className";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
}: CreateGroupModalProps) {
  const userRecoil = useRecoilValue(userAtom);
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const setConversationList = useSetRecoilState(conversationListAtom);

  // Fetch users
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await conversationApi.getConversation(1, 50, searchQuery);
        if (res.status === 200) {
          const mappedUsers: User[] = (res.data.data as Conversation[])
            .filter((item) => !!item.user_id)
            .map((item) => ({
              id: item.user_id!,
              display_name: item.display_name,
              avatar: item.avatar || "https://via.placeholder.com/150",
              online: item.status === "online",
            }));
          setUsers(mappedUsers);
        }
      } catch (error) {
        console.error("Error loading user list:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, searchQuery]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setGroupName("");
      setGroupImage("");
      setImagePreview("");
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setGroupImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (selectedIds: string[]) => {
    if (!groupName.trim()) {
      toast.error("Tên nhóm không được bỏ trống khi tạo nhóm");
      throw new Error("Group name is empty");
    }

    if (selectedIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 thành viên!");
      throw new Error("No members selected");
    }

  const formData = new FormData();
  formData.append("name", groupName);
  formData.append("status", "active");

  if (groupImage) {
    const blob = await fetch(groupImage).then((res) => res.blob());
    const file = new File([blob], "group.jpg", { type: blob.type });
    formData.append("image", file);
  }

  try {
    // Step 1: Create group
    const res = await groupApi.addGroup(formData);

    if (res.status !== 200) {
      toast.error("Không thể tạo nhóm!");
      return;
    }

    const groupId = res.data.id;
    const groupNameRes = res.data.name;
    const groupImageRes = res.data.image || "";
      const newGroupConversation: Conversation = {
      user_id: "",
      group_id: groupId,
      display_name: groupNameRes,
      avatar: groupImageRes,
      last_message: "Nhóm vừa được tạo",
      last_message_type: "system",
      last_message_id: "",
      last_date: new Date().toISOString(),
      unread_count: 0,
      status: "group",
      updated_at: new Date().toISOString(),
      conversation_id: "",
    };

   
    setConversationList((prev) => [newGroupConversation, ...prev]);


    // Step 2: Add each member via REST API (Exclude self as backend automatically adds creator)
    const membersToAdd = selectedIds.filter(id => id !== userRecoil?.data.id);
    const addMemberPromises = membersToAdd.map((userId) =>
      groupApi.addMember({
        group_id: groupId,
        user_id: userId,
        role: "member",
      })
    );

    const addMemberResults = await Promise.allSettled(addMemberPromises);

    // Check if any member failed to be added
    const failedAdds = addMemberResults.filter(
      (result) => result.status === "rejected"
    );

    if (failedAdds.length > 0) {
      toast.warn("Tạo nhóm thành công nhưng một số thành viên chưa được thêm. Bạn có thể thêm lại sau.");
      console.error("Failed to add members:", failedAdds);
      // Continue sending system message as group already exists
    }

    // Step 3: Send socket notification for group creation (real-time for all members)
    // Ensure self (creator) is included with owner role for correct UI permissions update
    const membersPayload = [
      {
        user_id: userRecoil?.data.id ?? "",
        role: "owner",
        display_name: userRecoil?.data.display_name || "Bạn"
      },
      ...selectedIds.map(id => {
        const u = users.find(user => user.id === id);
        return {
          user_id: id,
          role: "member",
          display_name: u?.display_name || ""
        };
      })
    ];

    socketManager.sendAddGroupMember(
      userRecoil?.data.id ?? "",
      userRecoil?.data.display_name || "Bạn",
      groupId,
      groupNameRes,
      groupImageRes,
      membersPayload,
      "create_group"
    );

    toast.success("Tạo nhóm thành công!");
    
    // Reset form or navigate to chat list if needed
    // onClose?.();
    // navigate('/chat');

  } catch (error) {
    console.error("Error creating group:", error);
    toast.error("Đã xảy ra lỗi khi tạo nhóm!");
  }
};

  // Header Section Component
  const headerSection = (
    <div className="!px-4 !py-4 flex items-center gap-4 !bg-white !border-b !border-gray-100">
      <label className="cursor-pointer relative group">
        <div className={`w-14 h-14 !rounded-full flex items-center justify-center !bg-gray-50 !border !border-[#f1ece7] group-hover:!bg-gray-100 transition-colors`}>
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Group"
              className="w-full h-full object-cover !rounded-full"
            />
          ) : (
            <Camera size={24} className="!text-gray-400 group-hover:text-blue-600 transition-colors" />
          )}
        </div>
        <div className="absolute inset-0 !rounded-full border-2 border-transparent group-hover:border-[#00568c] transition-all pointer-events-none"></div>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </label>

      <div className="flex-1">
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Nhập tên nhóm..."
          className="w-full !px-0 !py-2 !bg-transparent !border-0 !border-b !border-gray-200 
                    !text-base !font-medium !text-gray-900 !placeholder-gray-400
                    focus:!outline-none focus:!border-[#00568c] focus:!ring-0
                    !transition-all !duration-200"
          autoFocus
        />
      </div>
    </div>
  );

  return (
    <UserSelectionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo nhóm"
      submitText="Tạo nhóm"
      loadingText="Đang tạo..."
      headerSection={headerSection}
      users={users}
      loading={loading}
      onSubmit={handleSubmit}
      emptyListMessage="Không tìm thấy người dùng nào"
      listTitle="Trò chuyện gần đây"
      showCategories={false}
      minSelection={1}
    />
  );
}