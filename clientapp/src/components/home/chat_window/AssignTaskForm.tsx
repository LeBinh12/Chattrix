import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, User, Paperclip, Trash2, Search, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRecoilValue } from "recoil";
import { toast } from "react-toastify";
import { uploadAPI } from "../../../api/upload";
import { groupMembersAtom } from "../../../recoil/atoms/groupAtom";
import { groupApi } from "../../../api/group";
import { userApi } from "../../../api/userApi";
import type { GroupMember } from "../../../types/group-member";
import type { Group } from "../../../types/group";
import UserAvatar from "../../UserAvatar";
import { Users, Users2, ChevronDown } from "lucide-react";
import type { Media } from "../../../types/upload";
import { DatePicker, SelectPicker } from "rsuite";

interface AssignTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskData) => void;
  groupId?: string;
  receiver?: {
    user_id: string;
    display_name: string;
    avatar: string;
    username?: string;
    online_status?: string;
  };
  initialTitle?: string;
  currentUser?: {
    user_id: string;
    display_name: string;
    avatar: string;
  };
  isLoading?: boolean;
}

export interface TaskData {
  title: string;
  description: string;
  assignee_id: string;
  assignee_name: string;
  /** Danh sách nhiều người nhận (dùng khi multi-select). Backend sẽ ưu tiên trường này */
  assignees?: { user_id: string; display_name: string }[];
  /** Loại giao việc: "personal" = N task riêng biệt, "group" = 1 task chung */
  assign_type?: "personal" | "group";
  start_time?: string;
  end_time?: string;
  priority: string;
  files?: File[];
  attachment_ids?: string[];
  group_id?: string;
  creator_name?: string;
}

export default function AssignTaskForm({
  isOpen,
  onClose,
  onSubmit,
  groupId,
  receiver,
  initialTitle = "",
  currentUser,
  isLoading = false,
}: AssignTaskFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<GroupMember[]>([]);
  const [start_time, setstart_time] = useState<Date | null>(null);
  const [end_time, setend_time] = useState<Date | null>(null);
  const [priority, setPriority] = useState("medium");
  const [uploadedMedia, setUploadedMedia] = useState<Media[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const isSuccessfullySubmitted = useRef(false);

  const [showMemberList, setShowMemberList] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [assignType, setAssignType] = useState<"personal" | "group">(groupId ? "group" : "personal");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupList, setShowGroupList] = useState(false);
  
  // Lazy loading states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  // Group lazy loading states
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsHasMore, setGroupsHasMore] = useState(true);
  const [isLoadingMoreGroups, setIsLoadingMoreGroups] = useState(false);
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const groupObserverTarget = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const memberDropdownContainerRef = useRef<HTMLDivElement>(null);

  const groupMembersMap = useRecoilValue(groupMembersAtom);

  // Validation states
  const [titleError, setTitleError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const MEMBERS_PER_PAGE = 20;

  // Load initial members or users
  useEffect(() => {
    if (!isOpen) return;

    const fetchInitialData = async () => {
      setIsInitialLoading(true);
      try {
        if (assignType === "personal") {
          const res = await userApi.getPagination(1, MEMBERS_PER_PAGE);
          if (res.data?.users) {
            const mappedUsers = res.data.users
              .filter((u: any) => u.user.id !== currentUser?.user_id)
              .map((u: any) => ({
                user_id: u.user.id,
                display_name: u.user.display_name,
                avatar: u.user.avatar,
                username: u.user.username,
                online_status: u.status || "offline",
                role: "member",
                joined_at: new Date().toISOString()
              }));
            setMembers(mappedUsers);
            setCurrentPage(1);
            setHasMore(res.data.users.length === MEMBERS_PER_PAGE);
          }
        } else if (assignType === "group") {
          // Load my groups
          setGroupsPage(1);
          const resGroups = await groupApi.getGroup(1, MEMBERS_PER_PAGE);
          if (resGroups.data) {
            setGroups(resGroups.data);
            setGroupsHasMore(resGroups.data.length === MEMBERS_PER_PAGE);
            
            // If we have a groupId, auto-select it
            if (groupId) {
              const targetGroup = resGroups.data.find(g => g.id === groupId);
              if (targetGroup) {
                setSelectedGroup(targetGroup);
              }
            }
          }

          // If we have a selectedGroup, load members
          const currentGroupId = selectedGroup?.id || groupId;
          if (currentGroupId) {
            const cached = groupMembersMap[currentGroupId];
            if (cached && cached.length > 0) {
              setMembers(cached);
              setHasMore(cached.length >= MEMBERS_PER_PAGE);
            } else {
              const resMembers = await groupApi.getGroupMembers(currentGroupId, 1, MEMBERS_PER_PAGE);
              if (resMembers.data?.members) {
                setMembers(resMembers.data.members);
                setHasMore(resMembers.data.members.length === MEMBERS_PER_PAGE);
              }
            }
          }
        }
      } catch (err) {
        console.error("Fetch initial data failed:", err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchInitialData();
  }, [isOpen, assignType, selectedGroup?.id, groupId, currentUser?.user_id]);

  // Load more members or users
  const loadMoreMembers = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      if (assignType === "personal") {
        const res = await userApi.getPagination(nextPage, MEMBERS_PER_PAGE);
        if (res.data?.users && res.data.users.length > 0) {
          const mappedUsers = res.data.users
            .filter((u: any) => u.user.id !== currentUser?.user_id)
            .map((u: any) => ({
              user_id: u.user.id,
              display_name: u.user.display_name,
              avatar: u.user.avatar,
              username: u.user.username,
              online_status: u.status || "offline",
              role: "member",
              joined_at: new Date().toISOString()
            }));
          setMembers((prev) => [...prev, ...mappedUsers]);
          setCurrentPage(nextPage);
          setHasMore(res.data.users.length === MEMBERS_PER_PAGE);
        } else {
          setHasMore(false);
        }
      } else if (assignType === "group" && (selectedGroup || groupId)) {
        const currentGroupId = selectedGroup?.id || groupId;
        if (currentGroupId) {
          const res = await groupApi.getGroupMembers(currentGroupId, nextPage, MEMBERS_PER_PAGE);
          if (res.data?.members && res.data.members.length > 0) {
            setMembers((prev) => [...prev, ...res.data.members]);
            setCurrentPage(nextPage);
            setHasMore(res.data.members.length === MEMBERS_PER_PAGE);
          } else {
            setHasMore(false);
          }
        }
      }
    } catch (err) {
      console.error("Load more failed:", err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [assignType, selectedGroup, groupId, currentPage, isLoadingMore, hasMore, currentUser?.user_id]);

  const loadMoreGroups = useCallback(async () => {
    if (isLoadingMoreGroups || !groupsHasMore) return;

    setIsLoadingMoreGroups(true);
    try {
      const nextPage = groupsPage + 1;
      const res = await groupApi.getGroup(nextPage, MEMBERS_PER_PAGE);
      if (res.data && res.data.length > 0) {
        setGroups((prev) => [...prev, ...res.data]);
        setGroupsPage(nextPage);
        setGroupsHasMore(res.data.length === MEMBERS_PER_PAGE);
      } else {
        setGroupsHasMore(false);
      }
    } catch (err) {
      console.error("Load more groups failed:", err);
      setGroupsHasMore(false);
    } finally {
      setIsLoadingMoreGroups(false);
    }
  }, [groupsPage, isLoadingMoreGroups, groupsHasMore]);

  // Observer for groups
  useEffect(() => {
    if (!showGroupList) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && groupsHasMore && !isLoadingMoreGroups) {
          loadMoreGroups();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = groupObserverTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
      observer.disconnect();
    };
  }, [showGroupList, groupsHasMore, isLoadingMoreGroups, loadMoreGroups]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!showMemberList) return;
    const rootEl = listRef.current || dropdownRef.current || null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreMembers();
        }
      },
      { root: rootEl, rootMargin: "0px", threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
      observer.disconnect();
    };
  }, [showMemberList, hasMore, isLoadingMore, loadMoreMembers]);

  // Filter members based on search query
  const filteredMembers = members
    .filter((m) => {
      // Filter out current user
      if (currentUser?.user_id && m.user_id === currentUser.user_id) {
        return false;
      }
      if (assignType === "group" && groupId) {
        return m.user_id !== groupId;
      }
      return true;
    })
    .filter((m) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        m.display_name.toLowerCase().includes(query) ||
        m.username?.toLowerCase().includes(query)
      );
    });

  // Reset logic
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || "");
      setDescription("");
      setPriority("medium");
      setUploadedMedia([]);
      setIsUploading(false);
      isSuccessfullySubmitted.current = false;
      setstart_time(null);
      setend_time(null);
      setSearchQuery("");
      
      // Default to receiver if provided (1-1 chat)
      if (receiver) {
        setSelectedMembers([{
          user_id: receiver.user_id,
          display_name: receiver.display_name,
          avatar: receiver.avatar,
          username: receiver.username,
          online_status: receiver.online_status || "offline",
          role: "member",
          joined_at: new Date().toISOString(),
        } as GroupMember]);
      } else {
        setSelectedMembers([]);
      }
    }
  }, [isOpen, initialTitle, receiver]);

  // Close member list on outside click
  useEffect(() => {
    if (!showMemberList) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        memberDropdownContainerRef.current &&
        !memberDropdownContainerRef.current.contains(e.target as Node)
      ) {
        setShowMemberList(false);
        setSearchQuery("");
      }
    };

    // Add slight delay to prevent immediate closure from the opening click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMemberList]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setIsUploading(true);
      try {
        const results = await uploadAPI.uploadFiles(selectedFiles, (percent) => {
          console.log(`Upload progress: ${percent}%`);
        });
        setUploadedMedia((prev) => [...prev, ...results]);
      } catch (error) {
        console.error("Upload failed", error);
        toast.error("Tải tệp đính kèm thất bại");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleStartTimeChange = (value: Date | null) => {
    setstart_time(value);
    if (value && end_time && value > end_time) {
      toast.error("Thời gian bắt đầu không được lớn hơn thời gian kết thúc");
      setend_time(null);
    }
  };

  const handleEndTimeChange = (value: Date | null) => {
    setend_time(value);
    if (value && start_time && value < start_time) {
      toast.error("Thời gian kết thúc không được nhỏ hơn thời gian bắt đầu");
      setend_time(null);
    }
  };

  const removeFile = async (index: number) => {
    const mediaToRemove = uploadedMedia[index];
    if (mediaToRemove.id) {
      try {
        await uploadAPI.deleteMedia(mediaToRemove.id);
      } catch (error) {
        console.error("Delete media failed", error);
      }
    }
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = async () => {
    if (!isSuccessfullySubmitted.current && uploadedMedia.length > 0) {
      // Cleanup uploaded files on cancel
      for (const media of uploadedMedia) {
        if (media.id) {
          uploadAPI.deleteMedia(media.id).catch(err => console.error("Cleanup failed", err));
        }
      }
    }

    setTitle("");
    setDescription("");
    setSelectedMembers([]);
    setstart_time(null);
    setend_time(null);
    setPriority("medium");
    setUploadedMedia([]);
    setIsUploading(false);
    setShowMemberList(false);
    setSearchQuery("");
    setCurrentPage(1);
    setHasMore(true);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tên công việc");
      return;
    }
    
    if (!description.trim()) {
      toast.error("Vui lòng nhập mô tả công việc");
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error("Vui lòng chọn ít nhất một người thực hiện");
      return;
    }

    if (!start_time) {
      toast.error("Vui lòng chọn thời gian bắt đầu");
      return;
    }

    if (!end_time) {
      toast.error("Vui lòng chọn hạn hoàn thành");
      return;
    }

    if (isUploading) return;

    isSuccessfullySubmitted.current = true;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      // backward-compat: gửi thêm single fields (người đầu tiên)
      assignee_id: selectedMembers[0].user_id,
      assignee_name: selectedMembers[0].display_name,
      // ưu tiên: backend sẽ dùng mảng này cho multi-assign
      assignees: selectedMembers.map((m) => ({ user_id: m.user_id, display_name: m.display_name })),
      start_time: start_time ? start_time.toISOString() : undefined,
      end_time: end_time ? end_time.toISOString() : undefined,
      priority,
      attachment_ids: uploadedMedia.map((m) => m.id!).filter(Boolean),
      assign_type: assignType,
      group_id: assignType === "group" ? (selectedGroup?.id || groupId) : "000000000000000000000000",
      creator_name: currentUser?.display_name,
    } as TaskData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 bg-black/50 z-[100]"
          onClick={handleClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
      {isOpen && (
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] !bg-white !rounded-lg !shadow-xl !z-[101] !overflow-hidden !flex !flex-col !max-h-[90vh]"
        >
          {/* Style fix for rsuite datepicker z-index */}
          <style>{`
            .rs-picker-date-menu, 
            .rs-picker-menu, 
            .rs-picker-popup {
              z-index: 20000 !important;
            }
          `}</style>
          {/* Header */}
          <div className="!px-5 !py-3 !border-b !border-gray-100 !flex !items-center !justify-between">
            <p className="!text-lg !font-bold !text-gray-800">Giao việc mới</p>
            <button
              onClick={handleClose}
              className="!text-gray-400 hover:!text-gray-600 !transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="!p-5 !overflow-y-auto !flex-1 custom-scrollbar !space-y-4">
            {/* Assignment Type Toggle */}
            <div className="flex p-1 !bg-gray-100 !rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setAssignType("personal");
                  setSelectedMembers([]);
                  setSelectedGroup(null);
                  setMembers([]);
                  setHasMore(true);
                  setCurrentPage(1);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium !rounded-md transition ${
                  assignType === "personal"
                    ? "!bg-white !text-blue-600 !shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Users size={16} />
                <span>Gửi cá nhân</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignType("group");
                  setSelectedMembers([]);
                  setMembers([]);
                  setHasMore(true);
                  setCurrentPage(1);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium !rounded-md transition ${
                  assignType === "group"
                    ? "!bg-white !text-blue-600 !shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Users2 size={16} />
                <span>Gửi nhóm</span>
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="!block !text-sm !font-bold !text-gray-700 !mb-1">
                Tên công việc <span className="!text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError("");
                }}
                onBlur={() => {
                  if (!title.trim()) {
                    setTitleError("Vui lòng nhập tên công việc");
                  }
                }}
                placeholder="Nhập tên công việc..."
                className={`w-full text-gray-700 px-3 py-2 !border !rounded-lg focus:!outline-none focus:!border-blue-500 text-base ${
                  titleError ? "!border-red-500" : "!border-gray-200"
                }`}
                autoFocus
              />
              {titleError && (
                <p className="!text-red-500 !text-xs !mt-1">{titleError}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="!block !text-sm !font-bold !text-gray-700 !mb-1">
                Mô tả chi tiết <span className="!text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (descriptionError) setDescriptionError("");
                }}
                onBlur={() => {
                  if (!description.trim()) {
                    setDescriptionError("Vui lòng nhập mô tả công việc");
                  }
                }}
                placeholder="Mô tả công việc..."
                rows={3}
                className={`w-full px-3 py-2 !border !rounded-lg focus:!outline-none focus:!border-blue-500 !resize-none text-sm ${
                  descriptionError ? "!border-red-500" : "!border-gray-200"
                }`}
              />
              {descriptionError && (
                <p className="!text-red-500 !text-xs !mt-1">{descriptionError}</p>
              )}
            </div>

            {/* Group Selection (only for Group type) */}
            {assignType === "group" && (
              <div>
                <label className="!block !text-sm !font-bold !text-gray-700 !mb-1">
                  Chọn nhóm <span className="!text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowGroupList(!showGroupList)}
                    className="w-full px-3 py-2 !border !border-gray-200 !rounded-lg !flex !items-center !justify-between hover:!border-blue-500 !transition !bg-white"
                  >
                    {selectedGroup ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar
                              avatar={selectedGroup.image}
                              display_name={selectedGroup.name}
                              isOnline={false}
                              size={24}
                              showOnlineStatus={false}
                            />
                        <span className="!text-sm !font-medium !text-gray-900">
                          {selectedGroup.name}
                        </span>
                      </div>
                    ) : (
                      <span className="!text-gray-400 !text-sm">Chọn nhóm</span>
                    )}
                    <ChevronDown size={16} className="!text-gray-400" />
                  </button>

                  {showGroupList && (
                    <div className="!absolute !z-30 !top-full !left-0 !right-0 !mt-1 !bg-white !border !border-gray-200 !rounded-lg !shadow-lg !overflow-hidden !max-h-48 !overflow-y-auto">
                      {groups.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => {
                            if (selectedGroup?.id === g.id) {
                              setShowGroupList(false);
                              return;
                            }
                            setSelectedGroup(g);
                            setShowGroupList(false);
                            setSelectedMembers([]);
                            setMembers([]);
                            setHasMore(true);
                            setCurrentPage(1);
                          }}
                          className="w-full p-2.5 flex items-center gap-2 hover:bg-blue-50 text-left transition"
                        >
                           <UserAvatar
                              avatar={g.image}
                              display_name={g.name}
                              isOnline={false}
                              size={24}
                              showOnlineStatus={false}
                            />
                          <span className="text-sm font-medium text-gray-700">
                            {g.name}
                          </span>
                        </button>
                      ))}
                      {/* Lazy Loading Trigger for Groups */}
                      {groupsHasMore && (
                        <div ref={groupObserverTarget} className="p-3 flex justify-center">
                          {isLoadingMoreGroups && (
                            <Loader2 className="animate-spin text-blue-500" size={20} />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assignee */}
            <div>
              <label className="!block !text-sm !font-bold !text-gray-700 !mb-1">
                Người thực hiện <span className="!text-red-500">*</span>
              </label>
              <div className="relative" ref={memberDropdownContainerRef}>
                {/* Trigger button: inline horizontal scroll — không xuống hàng */}
                <button
                  type="button"
                  disabled={assignType === "group" && !selectedGroup}
                  onClick={() => setShowMemberList(!showMemberList)}
                  className="w-full px-3 py-2 !border !border-gray-200 !rounded-lg !flex !items-center !gap-2 hover:!border-blue-500 !transition !bg-white disabled:!bg-gray-50 disabled:!cursor-not-allowed !min-h-[40px]"
                >
                  {/* Khu vực tên — scroll ngang, không wrap */}
                  <div className="flex-1 overflow-x-auto scrollbar-none flex items-center gap-1.5 min-w-0">
                    {selectedMembers.length === 0 ? (
                      <span className="!text-gray-300 !text-sm whitespace-nowrap">
                        Chọn người thực hiện
                      </span>
                    ) : (
                      selectedMembers.map((m) => (
                        <span
                          key={m.user_id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
                        >
                          {m.display_name}
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMembers((prev) =>
                                prev.filter((x) => x.user_id !== m.user_id)
                              );
                            }}
                            className="ml-0.5 text-blue-600 hover:text-red-500 cursor-pointer leading-none"
                          >
                            <X size={10} />
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                  <User size={16} className="!text-gray-400 flex-shrink-0" />
                </button>

                {/* Dropdown with Search, Checkboxes & Lazy Loading */}
                {showMemberList && (
                  <div
                    ref={dropdownRef}
                    className="!absolute !z-20 !top-full !left-0 !right-0 !mt-1 !bg-white !border !border-gray-100 !rounded-lg !shadow-lg !overflow-hidden"
                  >
                    {/* Search Bar */}
                    <div className="!p-2 !border-b !border-gray-100 !sticky !top-0 !bg-white">
                      <div className="!relative">
                        <Search
                          size={16}
                          className="!absolute !left-3 !top-1/2 !-translate-y-1/2 !text-gray-400"
                        />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Tìm kiếm thành viên..."
                          className="!w-full !pl-9 !pr-3 !py-2 !border !border-gray-200 !rounded-lg !text-sm focus:!outline-none focus:!border-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {/* Member List (checkbox multi-select) */}
                    <div ref={listRef} className="!max-h-64 !overflow-y-auto">
                      {isInitialLoading ? (
                        <div className="!flex !items-center !justify-center !p-8">
                          <Loader2 className="!animate-spin !text-blue-500" size={24} />
                        </div>
                      ) : filteredMembers.length > 0 ? (
                        <>
                          {filteredMembers.map((m) => {
                            const isChecked = selectedMembers.some(
                              (s) => s.user_id === m.user_id
                            );
                            return (
                              <button
                                key={m.user_id}
                                type="button"
                                onClick={() => {
                                  setSelectedMembers((prev) =>
                                    isChecked
                                      ? prev.filter((x) => x.user_id !== m.user_id)
                                      : [...prev, m]
                                  );
                                }}
                                className={`!w-full !p-2.5 !flex !items-center !gap-2 !text-left !transition ${
                                  isChecked ? "!bg-[#fdf3e8]" : "hover:!bg-gray-50"
                                }`}
                              >
                                {/* Checkbox visual */}
                                <div
                                  className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                                    isChecked
                                      ? "bg-blue-600 border-blue-600"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {isChecked && <Check size={10} className="text-white" />}
                                </div>
                                <UserAvatar
                                  avatar={m.avatar}
                                  display_name={m.display_name}
                                  size={28}
                                  showOnlineStatus={false}
                                />
                                <div className="!flex !flex-col !overflow-hidden !flex-1">
                                  <span className="!text-sm !font-medium !text-gray-700 !truncate">
                                    {m.display_name}
                                  </span>
                                  {m.username && (
                                    <span className="!text-xs !text-gray-400 !truncate">
                                      @{m.username}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}

                          {/* Lazy Loading Trigger & Indicator */}
                          {!searchQuery && hasMore && (
                            <div ref={observerTarget} className="!p-3 !flex !justify-center">
                              {isLoadingMore && (
                                <Loader2 className="!animate-spin !text-blue-500" size={20} />
                              )}
                            </div>
                          )}

                          {!searchQuery && !hasMore && members.length > MEMBERS_PER_PAGE && (
                            <div className="!p-2 !text-center !text-xs !text-gray-400">
                              Đã tải hết thành viên
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="!p-4 !text-center !text-sm !text-gray-400">
                          {searchQuery ? "Không tìm thấy thành viên" : "Không có thành viên"}
                        </div>
                      )}
                    </div>

                    {/* Footer: count + Xong */}
                    <div className="!px-3 !py-2 !border-t !border-gray-100 !bg-gray-50 !flex !items-center !justify-between">
                      <span className="!text-xs !text-gray-500">
                        {selectedMembers.length > 0
                          ? `Đã chọn ${selectedMembers.length} người`
                          : "Chưa chọn ai"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMemberList(false);
                          setSearchQuery("");
                        }}
                        className="!text-xs !font-semibold !text-[#966e3d] hover:!underline"
                      >
                        Xong
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Times */}
            <div className="!grid !grid-cols-2 !gap-3">
              <div>
                <label className="!block !text-sm !font-bold !text-gray-700 !mb-1">
                  Thời gian bắt đầu <span className="!text-red-500">*</span>
                </label>
                <div className="!relative rsuite-datepicker-container">
                  <DatePicker
                    format="dd/MM/yyyy HH:mm"
                    value={start_time}
                    onChange={handleStartTimeChange}
                    placeholder="Chọn thời gian bắt đầu"
                    block
                    placement="auto"
                  />
                </div>
              </div>
              <div>
                <label className="!block !text-sm !font-bold !text-gray-700 !mb-1">
                  Hạn hoàn thành <span className="!text-red-500">*</span>
                </label>
                <div className="!relative rsuite-datepicker-container">
                  <DatePicker
                    format="dd/MM/yyyy HH:mm"
                    value={end_time}
                    onChange={handleEndTimeChange}
                    placeholder="Chọn hạn hoàn thành"
                    block
                    placement="auto"
                    shouldDisableDate={(date) => {
                      if (!start_time) return false;
                      
                      // Disable dates before start date
                      const startDate = new Date(start_time);
                      startDate.setHours(0, 0, 0, 0);
                      const checkDate = new Date(date);
                      checkDate.setHours(0, 0, 0, 0);
                      
                      return checkDate < startDate;
                    }}
                    shouldDisableHour={(hour, date) => {
                      if (!start_time || !date) return false;
                      
                      // Check if same day
                      const startDate = new Date(start_time);
                      const checkDate = new Date(date);
                      
                      if (
                        startDate.getFullYear() === checkDate.getFullYear() &&
                        startDate.getMonth() === checkDate.getMonth() &&
                        startDate.getDate() === checkDate.getDate()
                      ) {
                        // Disable hours before start hour on same day
                        return hour < startDate.getHours();
                      }
                      
                      return false;
                    }}
                    shouldDisableMinute={(minute, date) => {
                      if (!start_time || !date) return false;
                      
                      // Check if same day and same hour
                      const startDate = new Date(start_time);
                      const checkDate = new Date(date);
                      
                      if (
                        startDate.getFullYear() === checkDate.getFullYear() &&
                        startDate.getMonth() === checkDate.getMonth() &&
                        startDate.getDate() === checkDate.getDate() &&
                        checkDate.getHours() === startDate.getHours()
                      ) {
                        // Disable minutes before start minute on same hour
                        return minute < startDate.getMinutes();
                      }
                      
                      return false;
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="!block !text-sm !font-bold !text-gray-700 !mb-1">
                Mức độ ưu tiên
              </label>
              <SelectPicker
                data={[
                  { label: "Thấp", value: "low" },
                  { label: "Trung bình", value: "medium" },
                  { label: "Cao", value: "high" },
                  { label: "Khẩn cấp", value: "critical" },
                ]}
                value={priority}
                onChange={(value: string | null) => setPriority(value || "medium")}
                cleanable={false}
                searchable={false}
                block
                placement="auto"
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="!block !text-sm !font-bold !text-gray-700 !mb-1">
                Đính kèm
              </label>
              <div className="!flex !flex-col !gap-2">
                <label className="!cursor-pointer !flex !items-center !gap-2 !w-fit !px-3 !py-2 !bg-gray-50 !border !border-gray-200 !rounded-lg hover:!bg-gray-100 !text-sm !text-gray-600 !transition">
                  <Paperclip size={16} /> <span>Chọn tệp tin...</span>
                  <input
                    type="file"
                    multiple
                    className="!hidden"
                    onChange={handleFileChange}
                  />
                </label>
                {isUploading && (
                  <div className="!flex !items-center !gap-2 !text-xs !text-blue-600 !animate-pulse">
                    <Loader2 size={14} className="!animate-spin" />
                    Đang tải lên...
                  </div>
                )}
                {uploadedMedia.length > 0 && (
                  <div className="!flex !flex-col !gap-1 !mt-1">
                    {uploadedMedia.map((file, idx) => (
                      <div
                        key={idx}
                        className="!flex !items-center !justify-between !p-2 !bg-blue-50 !border !border-blue-100 !rounded-md !text-sm"
                      >
                        <span className="!truncate !max-w-[200px] !text-blue-700">
                          {file.filename}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="!text-red-400 hover:!text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-5 py-3 bg-white border-t border-gray-100 flex justify-end gap-3 sticky bottom-0">
            <button
              onClick={handleClose}
              className="!px-5 !py-2 !rounded !bg-gray-100 !text-gray-600 text-sm hover:!bg-gray-200 !font-medium"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || selectedMembers.length === 0 || isLoading}
              className="!px-5 !py-2 !rounded !bg-blue-600 !text-white text-sm hover:!bg-blue-700 !font-medium !shadow-sm disabled:!opacity-50 !flex !items-center !justify-center !gap-2 !min-w-[100px]"
            >
              {isLoading && <Loader2 className="animate-spin" size={16} />}
              {isLoading ? "Đang xử lý..." : "Giao việc"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}