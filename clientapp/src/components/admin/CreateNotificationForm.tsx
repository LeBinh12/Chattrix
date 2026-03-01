import React, { useState, useEffect, useRef } from "react";
import { X, Megaphone, Upload, Paperclip, Bell, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useRecoilState } from "recoil";

import { userAdminApi } from "../../api/admin/userAdminApi";
import { groupAdminApi } from "../../api/admin/groupAdminApi";
import UserAvatar from "../UserAvatar";
import {
  adminGroupsHasMoreState,
  adminGroupsPageState,
  adminGroupsState,
  adminUsersHasMoreState,
  adminUsersPageState,
  adminUsersState,
} from "../../recoil/atoms/adminAtoms";
import { notificationApi } from "../../api/admin/notificationApi";
import { socketManager } from "../../api/socket";
import type { Media } from "../../types/upload";

type LocalMedia = Media & { file?: File };

interface CreateNotificationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}

interface GroupDetail {
  id: string;
  name: string;
  image: string | null;
  members_count: number;
}

interface UserAdmin {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  email: string;
}

export default function CreateNotificationForm({
  isOpen,
  onClose,
  onSubmit,
}: CreateNotificationFormProps) {
  console.log("onSubmit",onSubmit)
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationContent, setNotificationContent] = useState("");

  const [channelAvatar, setChannelAvatar] = useState<LocalMedia | null>(null);
  const [channelAvatarPreview, setChannelAvatarPreview] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<LocalMedia[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);

  const [recipientType, setRecipientType] = useState<
    "all" | "groups" | "users"
  >("all");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Recoil states
  const [groups, setGroups] = useRecoilState(adminGroupsState);
  const [users, setUsers] = useRecoilState(adminUsersState);
  const [groupPage, setGroupPage] = useRecoilState(adminGroupsPageState);
  const [userPage, setUserPage] = useRecoilState(adminUsersPageState);
  const [hasMoreGroups, setHasMoreGroups] = useRecoilState(
    adminGroupsHasMoreState
  );
  const [hasMoreUsers, setHasMoreUsers] = useRecoilState(
    adminUsersHasMoreState
  );

  const [groupSearch, setGroupSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const groupListRef = useRef<HTMLDivElement>(null);
  const userListRef = useRef<HTMLDivElement>(null);

  const [errors, setErrors] = useState({
    channelName: "",
    notificationTitle: "",
    recipient: "",
  });

  const loadGroups = async (page: number, search = "", resetCache = false) => {
    // Nếu reset cache hoặc search, xóa dữ liệu cũ
    if (resetCache || search) {
      setGroups([]);
      setGroupPage(1);
      page = 1;
    }

    setLoadingGroups(true);
    try {
      const res = await groupAdminApi.getPagination(page, 20);
      const newGroups = res.data.data;

      setGroups((prev) => {
        // Tránh duplicate
        const existingIds = new Set(prev.map((g) => g.id));
        const uniqueNewGroups = newGroups.filter(
          (g: GroupDetail) => !existingIds.has(g.id)
        );
        return page === 1 ? newGroups : [...prev, ...uniqueNewGroups];
      });

      setHasMoreGroups(newGroups.length === 20);
      setGroupPage(page);
    } catch (error) {
      console.error("Load groups error:", error);
      toast.error("Không tải được danh sách nhóm");
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadUsers = async (page: number, search = "", resetCache = false) => {
    // Nếu reset cache hoặc search, xóa dữ liệu cũ
    if (resetCache || search) {
      setUsers([]);
      setUserPage(1);
      page = 1;
    }

    setLoadingUsers(true);
    try {
      const res = await userAdminApi.getPagination(page, 20);
      const newUsers = res.data.users.map((u: any) => u.user);

      setUsers((prev) => {
        // Tránh duplicate
        const existingIds = new Set(prev.map((u) => u.id));
        const uniqueNewUsers = newUsers.filter(
          (u: UserAdmin) => !existingIds.has(u.id)
        );
        return page === 1 ? newUsers : [...prev, ...uniqueNewUsers];
      });

      setHasMoreUsers(newUsers.length === 20);
      setUserPage(page);
    } catch (error) {
      console.error("Load users error:", error);
      toast.error("Không tải được danh sách người dùng");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (isOpen && recipientType === "groups" && groups.length === 0) {
      loadGroups(1);
    }
    if (isOpen && recipientType === "users" && users.length === 0) {
      loadUsers(1);
    }
  }, [isOpen, recipientType]);

  const handleGroupScroll = () => {
    if (!groupListRef.current || loadingGroups || !hasMoreGroups) return;
    const { scrollTop, scrollHeight, clientHeight } = groupListRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      loadGroups(groupPage + 1, groupSearch);
    }
  };

  const handleUserScroll = () => {
    if (!userListRef.current || loadingUsers || !hasMoreUsers) return;
    const { scrollTop, scrollHeight, clientHeight } = userListRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      loadUsers(userPage + 1, userSearch);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const local: LocalMedia = {
        id: undefined,
        type: file.type,
        filename: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        file,
      };
      setChannelAvatar(local);
      setChannelAvatarPreview(local.url);
    }
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const locals: LocalMedia[] = files.map((file) => ({
      id: undefined,
      type: file.type,
      filename: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      file,
    }));

    setMediaFiles((prev) => [...prev, ...locals]);
    locals.forEach((l) => {
      if (l.type.startsWith("image/") || l.type.startsWith("video/")) {
        setMediaPreviews((prev) => [...prev, l.url]);
      }
    });
  };

  const validateForm = () => {
    const newErrors: any = {
      channelName: channelName.trim()
        ? channelName.trim().length < 3
          ? "Tên kênh ít nhất 3 ký tự!"
          : ""
        : "Tên kênh bắt buộc!",
      notificationTitle: notificationTitle.trim()
        ? notificationTitle.trim().length < 5
          ? "Tiêu đề ít nhất 5 ký tự!"
          : ""
        : "Tiêu đề bắt buộc!",
      recipient: "",
    };

    if (recipientType === "groups" && selectedGroupIds.length === 0) {
      newErrors.recipient = "Vui lòng chọn ít nhất một nhóm!";
    } else if (recipientType === "users" && selectedUserIds.length === 0) {
      newErrors.recipient = "Vui lòng chọn ít nhất một người dùng!";
    }

    setErrors(newErrors);

    if (Object.values(newErrors).some((e) => e)) {
      alert(
        Object.values(newErrors).find((e) => e) || "Vui lòng kiểm tra lại form"
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
  if (!validateForm()) return;

  const formData = new FormData();

  // Chỉ gửi các field backend đang nhận để tạo kênh
  formData.append("display_name", channelName.trim());

  if (channelDescription.trim()) {
    formData.append("description", channelDescription.trim());
  }

    if (channelAvatar?.file) {
      formData.append("avatar", channelAvatar.file); // tên field đúng với backend: "avatar"
    }

    // Append media files if any
    mediaFiles.forEach((m) => {
      if (m.file) formData.append("media", m.file);
    });
  try {
    const response = await notificationApi.registerChannel(formData);
    console.log("response", response)
    if (response.status === 200) {
      const newChannel = response.data[0];
      socketManager.sendNotification(
        newChannel.id,
        selectedUserIds,
        selectedGroupIds,
        notificationContent,
        mediaFiles,
        newChannel.display_name,
        newChannel.avatar
      );
      toast.success(`Tạo kênh thành công: ${newChannel.display_name}`);
    }
  } catch (error: any) {
    console.error("Lỗi khi tạo kênh thông báo:", error);
    toast.error("Không thể tạo kênh thông báo");
  }

  handleClose();
};

  const handleClose = () => {
    setChannelName("");
    setChannelDescription("");
    setNotificationTitle("");
    setNotificationContent("");
    setChannelAvatar(null);
    setChannelAvatarPreview(null);
    setMediaFiles([]);
    setMediaPreviews([]);
    setRecipientType("all");
    setSelectedGroupIds([]);
    setSelectedUserIds([]);
    setErrors({ channelName: "", notificationTitle: "", recipient: "" });
    onClose();
  };

  // Filter users/groups based on search
  const filteredGroups = groupSearch
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(groupSearch.toLowerCase())
      )
    : groups;

  const filteredUsers = userSearch
    ? users.filter(
        (u) =>
          u.display_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[9999]"
        onClick={handleClose}
      />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-white rounded-sm shadow-2xl z-[10000] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-[#966e3d]" />
            <p className="text-2xl font-semibold">Tạo kênh & Gửi thông báo</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-5">
            {/* Channel Info & Notification Content */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column - Channel Info */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Tên kênh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="Khuyến mãi, Hệ thống..."
                    className={`w-full px-3 py-2 text-sm border rounded-sm focus:outline-none focus:ring-1 ${
                      errors.channelName
                        ? "border-red-500"
                        : "border-gray-300 focus:border-[#966e3d]"
                    }`}
                  />
                  {errors.channelName && (
                    <p className="text-xs text-red-500 mt-0.5">
                      {errors.channelName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Mô tả kênh
                  </label>
                  <textarea
                    value={channelDescription}
                    onChange={(e) => setChannelDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm resize-none focus:outline-none focus:ring-1 focus:border-[#966e3d]"
                  />
                </div>

                {/* Ảnh kênh + Đối tượng gửi - Nằm ngang hàng nhau */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* Bên trái: Đối tượng gửi thông báo */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Gửi thông báo đến <span className="text-red-500">*</span>
                    </label>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="recipientType"
                          checked={recipientType === "all"}
                          onChange={() => setRecipientType("all")}
                          className="w-4 h-4 text-[#966e3d] focus:ring-[#966e3d]"
                        />
                        <span className="text-sm font-medium">
                          Tất cả người dùng
                        </span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="recipientType"
                          checked={recipientType === "groups"}
                          onChange={() => setRecipientType("groups")}
                          className="w-4 h-4 text-[#966e3d] focus:ring-[#966e3d]"
                        />
                        <span className="text-sm font-medium">
                          Các nhóm chỉ định
                        </span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="recipientType"
                          checked={recipientType === "users"}
                          onChange={() => setRecipientType("users")}
                          className="w-4 h-4 text-[#966e3d] focus:ring-[#966e3d]"
                        />
                        <span className="text-sm font-medium">
                          Người dùng cụ thể
                        </span>
                      </label>
                    </div>

                    {errors.recipient && (
                      <p className="text-xs text-red-500 mt-2">
                        {errors.recipient}
                      </p>
                    )}
                  </div>

                  {/* Bên phải: Ảnh kênh */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Ảnh đại diện kênh
                    </label>

                    <div className="flex items-center justify-end gap-5">
                      {/* Nút chọn ảnh */}
                      <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium text-gray-700 transition whitespace-nowrap">
                        <Upload size={16} />
                        <span>Tải</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </label>

                      {/* Preview ảnh */}
                      <div className="relative">
                        {channelAvatarPreview ? (
                          <img
                            src={channelAvatarPreview}
                            alt="Channel preview"
                            className="w-20 h-20 rounded-lg object-cover border-2 border-[#966e3d]/30 shadow-md"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <Bell size={28} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 text-right">
                      Kích thước khuyến nghị: 400x400px
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Notification Content */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Tiêu đề thông báo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Ưu đãi đặc biệt..."
                    className={`w-full px-3 py-2 text-sm border rounded-sm focus:outline-none focus:ring-1 ${
                      errors.notificationTitle
                        ? "border-red-500"
                        : "border-gray-300 focus:border-[#966e3d]"
                    }`}
                  />
                  {errors.notificationTitle && (
                    <p className="text-xs text-red-500 mt-0.5">
                      {errors.notificationTitle}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Nội dung
                  </label>
                  <textarea
                    value={notificationContent}
                    onChange={(e) => setNotificationContent(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm resize-none focus:outline-none focus:ring-1 focus:border-[#966e3d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Đính kèm media
                  </label>
                  <label className="block cursor-pointer border border-dashed border-gray-300 rounded-sm p-4 text-center hover:border-[#966e3d]">
                    <Paperclip
                      size={20}
                      className="mx-auto text-gray-400 mb-1"
                    />
                    <p className="text-xs text-gray-600">Tải lên file</p>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleMediaChange}
                    />
                  </label>
                  {mediaPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {mediaPreviews.map((src, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-sm overflow-hidden border border-gray-300"
                        >
                          {mediaFiles[i]?.type.startsWith("video/") ? (
                            <video
                              src={src}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={src}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Groups/Users Selection - Full width below */}
            {recipientType === "groups" && (
              <div className="p-3 bg-gray-50 rounded-sm border border-gray-200">
                <div className="relative mb-2">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Tìm nhóm..."
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:border-[#966e3d]"
                  />
                </div>
                <div
                  ref={groupListRef}
                  onScroll={handleGroupScroll}
                  className="max-h-48 overflow-y-auto border border-gray-300 rounded-sm bg-white"
                >
                  {filteredGroups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroupIds.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroupIds((prev) => [...prev, group.id]);
                          } else {
                            setSelectedGroupIds((prev) =>
                              prev.filter((id) => id !== group.id)
                            );
                          }
                        }}
                        className="w-3.5 h-3.5 text-[#966e3d]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {group.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {group.members_count} thành viên
                        </p>
                      </div>
                    </label>
                  ))}
                  {loadingGroups && (
                    <p className="text-center py-2 text-xs text-gray-500">
                      Đang tải...
                    </p>
                  )}
                  {!loadingGroups && filteredGroups.length === 0 && (
                    <p className="text-center py-4 text-xs text-gray-500">
                      Không tìm thấy nhóm
                    </p>
                  )}
                </div>
              </div>
            )}

            {recipientType === "users" && (
              <div className="p-3 bg-gray-50 rounded-sm border border-gray-200">
                <div className="relative mb-2">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Tìm người dùng..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:border-[#966e3d]"
                  />
                </div>
                <div
                  ref={userListRef}
                  onScroll={handleUserScroll}
                  className="max-h-48 overflow-y-auto border border-gray-300 rounded-sm bg-white"
                >
                  {filteredUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds((prev) => [...prev, user.id]);
                          } else {
                            setSelectedUserIds((prev) =>
                              prev.filter((id) => id !== user.id)
                            );
                          }
                        }}
                        className="w-3.5 h-3.5 text-[#966e3d]"
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <UserAvatar
                          avatar={user.avatar}
                          display_name={user.display_name}
                          showOnlineStatus={false}
                          size={28}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {user.display_name || user.username}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                  {loadingUsers && (
                    <p className="text-center py-2 text-xs text-gray-500">
                      Đang tải...
                    </p>
                  )}
                  {!loadingUsers && filteredUsers.length === 0 && (
                    <p className="text-center py-4 text-xs text-gray-500">
                      Không tìm thấy người dùng
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-sm hover:bg-gray-100"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-sm bg-[#966e3d] text-white rounded-sm hover:bg-[#a87c44] flex items-center gap-1.5"
            style={{ color: '#fff' }}
          >
            <Megaphone size={16} />
            Tạo & Gửi
          </button>
        </div>
      </div>
    </>
  );
}
