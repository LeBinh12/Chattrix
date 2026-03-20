import type { ReplyMessage } from "../types/Message";
import type { Media } from "../types/upload";
import type { Task } from "./taskApi";
import { API_BASE_URL } from "../config/api";
import type { TaskComment } from "../types/task-comment";

type MessagePayload = Record<string, unknown>;
type MessageCallback = (data: MessagePayload) => void;

class SocketManager {
  private socket: WebSocket | null = null;
  private heartbeatInterval: number | null = null;
  // private userId: string | null = null;
  private listeners: MessageCallback[] = [];
  connect(userId: string) {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) return;
    console.log("người dùng trước socket:", userId)
    // this.userId = userId;
    // Convert API_BASE_URL (http/https) to WebSocket URL (ws/wss)
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws');
    this.socket = new WebSocket(`${wsUrl}/chat/ws?id=${userId}`);

    this.socket.onopen = () => {
      console.log("Socket connected");

      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = window.setInterval(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "pong") return;
        if (data.type === "ping" && this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: "pong" }));
          return;
        }

        if (data.type === "account_deleted") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          // Dispatch a custom event so other parts of the app can react if needed
          window.dispatchEvent(new Event('account_deleted'));
          alert(data.message || "Tài khoản của bạn đã bị xóa khỏi hệ thống.");
          window.location.href = "/login";
          return;
        }

        this.listeners.forEach((cb) => cb(data));
      } catch (e) {
        console.warn("Lỗi parse JSON từ server:", e);
      }
    };

    this.socket.onclose = () => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      console.log("Socket disconnected");
    };

    this.socket.onerror = (err) => console.error("Socket error:", err);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.listeners = [];
    // this.userId = null;
  }

  sendMessage(senderId: string, receiverId: string, groupID: string, content: string,
    mediaIDs: Media[], display_name?: string, avatar?: string, sender_avatar?: string, reply?: ReplyMessage, type?: string, parent_id?: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const messageType = type
      ? type
      : mediaIDs.length > 0
        ? "file"
        : "text";

    const msg: MessagePayload = {
      type: "chat",
      message: {
        sender_id: senderId,
        receiver_id: receiverId || undefined,
        group_id: groupID || undefined,
        content,
        media_ids: mediaIDs,
        type: messageType,
        display_name: display_name,
        avatar: avatar,
        sender_avatar: sender_avatar,
        reply: reply,
        parent_id: parent_id
      },
    };


    this.socket.send(JSON.stringify(msg));
  }

  sendNotification(senderId: string, receiverId: string[], groupID: string[], content: string,
    mediaIDs: Media[], display_name?: string, sender_avatar?: string, type?: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const messageType = type
      ? type
      : mediaIDs.length > 0
        ? "file"
        : "text";

    const msg: MessagePayload = {
      type: "notification",
      notification: {
        sender_id: senderId,
        receiver_id: receiverId,
        group_id: groupID,
        content,
        media_ids: mediaIDs,
        type: messageType,
        sender_name: display_name,
        sender_avatar: sender_avatar,
        notification_type: "system"
      },
    };

    console.log("msg_notification", msg)

    this.socket.send(JSON.stringify(msg));
  }

  sendTask(senderId: string, receiverId: string, groupID: string, task: Task, display_name?: string, avatar?: string, sender_avatar?: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg: MessagePayload = {
      type: "chat",
      message: {
        sender_id: senderId,
        receiver_id: receiverId || undefined,
        group_id: groupID || undefined,
        content: `Đã tạo công việc: ${task.title}`,
        type: "task",
        task: task,
        display_name: display_name,
        avatar: avatar,
        sender_avatar: sender_avatar
      },
    };
    this.socket.send(JSON.stringify(msg));
  }

  sendRepTask(senderId: string, receiverId: string, groupID: string, task: Task) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg: MessagePayload = {
      type: "rep-task",
      message: {
        sender_id: senderId,
        receiver_id: receiverId || undefined,
        group_id: groupID || undefined,
        task: task,
      },
    };
    this.socket.send(JSON.stringify(msg));
  }

  sendAddGroupMember(senderId: string, display_name: string, groupID: string, groupName: string,
    groupAvatar: string, members: { user_id: string; role: string; user_name?: string }[], action: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg: MessagePayload = {
      type: "add-group-member",
      group_member: {
        sender_id: senderId,
        group_id: groupID,
        display_name: display_name,
        group_name: groupName,
        avatar: groupAvatar,
        members: members,
        action: action
      },
    };
    this.socket.send(JSON.stringify(msg));
  }

  sendTaskComment(taskComment: TaskComment) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg: MessagePayload = {
      type: "task_comment",
      task_comment: taskComment
    };
    this.socket.send(JSON.stringify(msg));
  }

  sendPromoteAdmin(groupID: string, targetUserID: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg: MessagePayload = {
      type: "group_member_promoted",
      payload: {
        group_id: groupID,
        user_id: targetUserID,
        role: "admin",
      },
    };
    this.socket.send(JSON.stringify(msg));
  }

  sendMemberLeft(senderId?: string, groupID?: string, displayName?: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const msg = {
      type: "member_left",
      message: {
        sender_id: senderId,
        group_id: groupID,
        content: `Người dùng ${displayName} đã thoát nhóm`,
        type: "system",
      },
    };

    this.socket.send(JSON.stringify(msg));
  }

  sendDeleteMessageForMe(userId: string, messageIds: string[]) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const msg = {
      type: "delete_for_me", // trùng với topic Kafka
      delete_msg: {
        user_id: userId,
        message_ids: messageIds,
      },
    };

    this.socket.send(JSON.stringify(msg));
  }

  sendSeenMessage(lastSeenMessageId: string, selectedChat?: string, userID?: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg = {
      type: "update_seen", // type mà backend hiểu để update chat_seen_status
      message_status: {
        last_seen_message_id: lastSeenMessageId,
        sender_id: userID,  // người nhắn tin
        receiver_id: selectedChat,        // mình đang xem
      },
    };
    this.socket.send(JSON.stringify(msg));
  };

  sendRecallMessage(message_id: string, sender_id: string, receiver_id?: string, group_id?: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg = {
      type: "recall-message",
      message: {
        sender_id: sender_id,
        receiver_id: receiver_id || undefined,
        group_id: group_id || undefined,
        recalled_by: sender_id,
        id: message_id,
      },
    };
    this.socket.send(JSON.stringify(msg));
  };

  sendEditMessage(messageId: string, senderId: string, content: string, receiverId?: string, groupId?: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg = {
      type: "edit-message",
      edit_message: {
        id: messageId,
        sender_id: senderId,
        receiver_id: receiverId || "",
        group_id: groupId || "",
        content: content,
      },
    };
    this.socket.send(JSON.stringify(msg));
  };

  sendPinnedMessage(message_id: string, pinner_id: string, message_sender_id: string, receiver_id?: string, group_id?: string, content?: string,
    message_sender_name?: string, pinner_name?: string, message_type?: string, created_at?: string
  ) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg = {
      type: "pinned-message",
      message: {
        sender_id: pinner_id, // Who performed the action
        receiver_id: receiver_id || undefined,
        group_id: group_id || undefined,
        id: message_id,
      },
      message_res: {
        message_id: message_id,
        pin_id: message_id, // Initial pin_id fallback for immediate unpin
        content: content,
        sender_id: message_sender_id,
        sender_name: message_sender_name,
        pinned_by_id: pinner_id,
        pinned_by_name: pinner_name,
        message_type: message_type,
        created_at: created_at,
        pinned_at: new Date().toISOString()
      }
    };
    this.socket.send(JSON.stringify(msg));
  };


  sendUnPinnedMessage(message_id: string, sender_id: string, receiver_id?: string, group_id?: string, conversation_id?: string
  ) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg = {
      type: "un-pinned-message",
      message: {
        sender_id: sender_id,
        receiver_id: receiver_id || undefined,
        group_id: group_id || undefined,
        id: message_id,
      },
      message_res: {
        message_id: message_id,
        conversation_id: conversation_id
      }
    };

    this.socket.send(JSON.stringify(msg));
  };

  sendReaction(messageId: string, userId: string, emoji: string, action: "add" | "remove" | "remove_all" = "add", sender_name: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg = {
      type: "send-reaction",
      reaction: {
        sender_name: sender_name,
        message_id: messageId,
        user_id: userId,
        type: emoji,
        action: action
      }
    };
    this.socket.send(JSON.stringify(msg));
  }

  sendForwardMessage(senderId: string, content: string, type: string, mediaIds: any[], receiverIds: string[], groupIds: string[]) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg = {
      type: "forward_message",
      forward: {
        sender_id: senderId,
        content: content,
        type: type,
        media_ids: mediaIds,
        receiver_ids: receiverIds,
        group_ids: groupIds,
      }
    };
    this.socket.send(JSON.stringify(msg));
  }



  addListener(cb: MessageCallback) {
    this.listeners.push(cb);
  }

  removeListener(cb: MessageCallback) {
    this.listeners = this.listeners.filter((fn) => fn !== cb);
  }

  getSocket() {
    return this.socket;
  }
}

export const socketManager = new SocketManager();

// Disconnect khi unload
window.addEventListener("beforeunload", () => socketManager.disconnect());
