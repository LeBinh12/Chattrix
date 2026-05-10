import { useEffect, useState, useRef } from "react";
import { useRecoilValue, useSetRecoilState, useRecoilState } from "recoil";
import { userAtom } from "../recoil/atoms/userAtom";
import { socketManager } from "../api/socket";
import { incomingCallAtom } from "../recoil/atoms/incomingCallAtom";
import { activeCallsAtom } from "../recoil/atoms/activeCallsAtom";
import { videoCallState } from "../recoil/atoms/videoCallAtom";
import { selectedChatState } from "../recoil/atoms/chatAtom";
import { groupListState } from "../recoil/atoms/groupAtom";
import { groupApi } from "../api/group";
import { userApi } from "../api/userApi";
import { isMobileDevice } from "../utils/mobileDetect";
import { toast } from "react-toastify";
import { groupMembersAtom, groupTotalMembersAtom } from "../recoil/atoms/groupAtom";
import { deduplicateMembers } from "../utils/groupUtils";
import type { GroupMember, GroupRole } from "../types/group-member";

export const useAppSocket = () => {
  const user = useRecoilValue(userAtom);
  const setIncomingCall = useSetRecoilState(incomingCallAtom);
  const setActiveCalls = useSetRecoilState(activeCallsAtom);
  const [videoCall, setVideoCall] = useRecoilState(videoCallState);
  const [selectedChat, setSelectedChat] = useRecoilState(selectedChatState);
  const setGroups = useSetRecoilState(groupListState);
  const setGroupMembersMap = useSetRecoilState(groupMembersAtom);
  const setGroupTotalMembers = useSetRecoilState(groupTotalMembersAtom);

  const [mobileNotif, setMobileNotif] = useState<{ title: string; body: string; onClick?: () => void } | null>(null);
  const isMobile = isMobileDevice();

  useEffect(() => {
    if (mobileNotif) {
      const timer = setTimeout(() => {
        setMobileNotif(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [mobileNotif]);

  useEffect(() => {
    if (user?.data.id) {
      socketManager.connect(user.data.id);
      sessionStorage.setItem("socket_user", user.data.id);

      const listener = (data: any) => {
        if (data.type === "video-call" && data.message) {
          const payload = data.message;
          const {
            status,
            group_id,
            receiver_id,
            caller_id,
            room_name,
            caller_name,
            caller_avatar,
          } = payload;
          const myId = user.data.id;

          const amIBusy = videoCall.isCalling;
          const isSameRoom = videoCall.roomId === room_name;

          if (amIBusy && isSameRoom) return;

          let key = "";
          if (group_id) key = group_id;
          else {
            if (myId === caller_id) key = receiver_id;
            else if (myId === receiver_id) key = caller_id;
          }
          if (key) {
            setActiveCalls((prev) => ({
              ...prev,
              [key]: status === "started",
            }));
          }

          if (status === "started" && myId !== caller_id) {
            const isForMe = receiver_id === myId;
            const isGroup = !!group_id;

            if (isForMe || isGroup) {
              setIncomingCall({
                callerId: caller_id,
                callerName: caller_name || "Unknown",
                callerAvatar: caller_avatar || "",
                roomName: room_name,
                chatId: group_id || caller_id,
                isGroup: isGroup,
              });
            }
          }
        }

        if (data.type === "rep-task" && data.message) {
          const updatedTask = data.message.task;
          const senderId = data.message.sender_id;
          const myId = user.data.id;

          if (updatedTask && (updatedTask.creator_id === myId || updatedTask.assignee_id === myId)) {
            if (senderId !== myId) {
              const statusLabels: Record<string, string> = {
                pending_acceptance: "Chờ tiếp nhận",
                accepted: "Đã tiếp nhận",
                todo: "Chưa bắt đầu",
                in_progress: "Đang thực hiện",
                done: "Đã hoàn thành",
                rejected: "Đã từ chối",
                cancel: "Đã hủy",
              };

              const title = "Thông báo công việc";
              let body = `Công việc "${updatedTask.title}" đã chuyển sang trạng thái: ${statusLabels[updatedTask.status] || updatedTask.status}`;

              if (updatedTask.status === "pending_acceptance") {
                body = `Bạn có một công việc mới: "${updatedTask.title}"`;
              }

              const handleNotifClick = () => {
                window.focus();
                const isNilId = (id?: string) => !id || id === "000000000000000000000000";
                const isGroup = !isNilId(updatedTask.group_id);
                const chatId = isGroup
                  ? updatedTask.group_id
                  : (updatedTask.creator_id === myId ? updatedTask.assignee_id : updatedTask.creator_id);

                window.location.href = `/?id=${chatId}&isGroup=${isGroup}`;
                setMobileNotif(null);
              };

              if (isMobile) {
                setMobileNotif({ title, body, onClick: handleNotifClick });
              }

              if (Notification.permission === "granted") {
                const notification = new Notification(title, {
                  body,
                  icon: "src/assets/logo.png",
                });
                notification.onclick = handleNotifClick;
              }
            }
          }
        }

        if (data.type === "group_dissolved" && data.payload) {
          const { group_id, group_name } = data.payload;
          const myId = user.data.id;

          const title = "Thông báo nhóm";
          const body = `Nhóm "${group_name}" đã bị giải tán.`;

          const handleDissolveNotifClick = () => {
            window.focus();
            window.location.href = "/";
            setMobileNotif(null);
          };

          // Trigger Mobile/Desktop Notifications
          if (isMobile) {
            setMobileNotif({ title, body, onClick: handleDissolveNotifClick });
          }

          if (Notification.permission === "granted") {
            const notification = new Notification(title, {
              body,
              icon: "/assets/logo.png",
            });
            notification.onclick = handleDissolveNotifClick;
          }

          toast.info(body);

          // 1. Clear selected chat if it's this group
          if (selectedChat?.group_id === group_id) {
            setSelectedChat(null);
            window.location.href = "/";
          }

          // 2. Stop video call if active in this group
          if (videoCall.isCalling && videoCall.roomId === group_id) {
            setVideoCall((prev) => ({
              ...prev,
              isCalling: false,
              roomId: null,
              participants: [],
            }));
            setActiveCalls((prev) => ({
              ...prev,
              [group_id]: false,
            }));
          }

          // 3. Refresh group list
          groupApi.getGroup().then((res) => {
            setGroups(res.data);
          });
        }

        // --- Group Member Events ---
        if (data.type === "group_member_added") {
          const payload = data.message;
          const groupId = payload.group_id;
          if (groupId) {
            // Update Total Members Count (Authority from server if available, else incremental)
            setGroupTotalMembers((prev) => {
              if (prev[groupId] === undefined && payload.total_members === undefined) return prev;
              
              const newTotal = payload.total_members !== undefined 
                ? payload.total_members 
                : (prev[groupId] || 0) + (payload.members?.length || 0);

              return {
                ...prev,
                [groupId]: newTotal,
              };
            });

            // Update Members List
            const newMembers: GroupMember[] = (payload.members || []).map((m: any) => ({
              id: m.id || `temp-${m.user_id}-${Date.now()}`,
              group_id: groupId,
              user_id: m.user_id,
              display_name: m.display_name,
              username: m.user_name || "",
              role: (m.role as GroupRole) || "member",
              avatar: m.avatar || null,
              status: "active",
              joined_at: new Date().toISOString(),
              online_status: "offline",
              last_online_at: null,
              email: m.email || "",
              phone: m.phone || "",
            }));

            setGroupMembersMap((prev) => {
              const current = prev[groupId];
              if (current === undefined) return prev; 
              return {
                ...prev,
                [groupId]: deduplicateMembers([...current, ...newMembers]),
              };
            });
          }
        }

        if (data.type === "group_member_removed" || data.type === "member_left") {
          const payload = data.message;
          const groupId = payload.group_id;
          const userId = payload.user_id || payload.sender_id;

          if (groupId && userId) {
            let wasMember = false;

            // 1. Update Members List and determine if user was actually a member
            setGroupMembersMap((prev) => {
              const current = prev[groupId];
              if (current === undefined) return prev;
              
              const filtered = current.filter((m) => m.user_id !== userId);
              if (filtered.length === current.length) {
                wasMember = false;
                return prev;
              }
              
              wasMember = true;
              return {
                ...prev,
                [groupId]: filtered,
              };
            });

            // 2. Update Total Members Count (Authority from server if available)
            setGroupTotalMembers((prev) => {
              if (prev[groupId] === undefined && payload.total_members === undefined) return prev;
              
              const currentTotal = prev[groupId] || 0;
              const newTotal = payload.total_members !== undefined 
                ? payload.total_members 
                : (wasMember ? Math.max(0, currentTotal - 1) : currentTotal);

              return {
                ...prev,
                [groupId]: newTotal,
              };
            });

            // If I am the one removed, clear chat and refresh list
            if (userId === user.data.id) {
              if (selectedChat?.group_id === groupId) {
                setSelectedChat(null);
              }
              groupApi.getGroup().then((res) => {
                setGroups(res.data);
              });
            }
          }
        }
      };

      socketManager.addListener(listener);

      const messageListener = (data: any) => {
        if (data.type === "conversations" && data.message) {
          const msg = data.message;
          const myId = user.data.id;
          const isOwnMessage = msg.sender_id === myId;

          if (isOwnMessage || msg.last_message_type === "system") return;

          const isGroup = !!msg.group_id && msg.group_id !== "000000000000000000000000";
          const targetId = isGroup ? msg.group_id : (msg.user_id === myId ? msg.sender_id : msg.user_id);
          
          const isCurrentChat = isGroup 
            ? selectedChat?.group_id === targetId 
            : selectedChat?.user_id === targetId;
          
          if (isCurrentChat && document.visibilityState === "visible") return;

          userApi.getSetting(targetId, isGroup).then((res) => {
            if (res.data && !res.data.is_muted) {
              const title = msg.display_name || "Tin nhắn mới";
              const body = msg.last_message_type === "text"
                ? (msg.last_message ? msg.last_message.replace(/<[^>]+>/g, "").trim() : "Bạn có tin nhắn mới")
                : msg.last_message_type === "task"
                  ? `[Công việc] ${msg.last_message ? msg.last_message.replace(/<[^>]+>/g, "").trim() : "Bạn nhận được một công việc mới"}`
                  : `[${msg.last_message_type === "image" ? "Hình ảnh" : msg.last_message_type === "video" ? "Video" : "Tệp đính kèm"}]`;

              const handleNotifClick = () => {
                window.focus();
                window.location.href = `/?id=${targetId}&isGroup=${isGroup}`;
                setMobileNotif(null);
              };

              if (isMobile) {
                setMobileNotif({ title, body, onClick: handleNotifClick });
              }

              if (Notification.permission === "granted") {
                const notification = new Notification(title, {
                  body,
                  icon: "/assets/logo.png",
                });
                notification.onclick = handleNotifClick;
              }
            }
          }).catch((err) => {
            console.error("[useAppSocket] Error checking notification settings:", err);
          });
        }
      };

      socketManager.addListener(messageListener);

      return () => {
        socketManager.removeListener(listener);
        socketManager.removeListener(messageListener);
      };
    }
  }, [
    user?.data.id,
    setIncomingCall,
    setActiveCalls,
    videoCall.isCalling,
    videoCall.roomId,
    selectedChat,
    isMobile,
  ]);

  return { mobileNotif, setMobileNotif, isMobile };
};
