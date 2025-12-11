import type { ReplyMessage } from "../types/Message";
import type { Media } from "../types/upload";

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
    this.socket = new WebSocket(`ws://localhost:3000/v1/chat/ws?id=${userId}`);

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
    mediaIDs: Media[], display_name?: string, avatar?: string, sender_avatar?: string, reply?: ReplyMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg: MessagePayload = {
      type: "chat",
      message: {
        sender_id: senderId,
        receiver_id: receiverId || undefined,
        group_id: groupID,
        content,
        media_ids: mediaIDs,
        type: mediaIDs.length > 0 ? "file" : "text",
        display_name: display_name,
        avatar: avatar,
        sender_avatar: sender_avatar,
        reply: reply
      },
    };
    this.socket.send(JSON.stringify(msg));
  }

  sendAddGroupMember(senderId: string, display_name: string, groupID: string, groupName: string,
    groupAvatar: string, members: { user_id: string; role: string }[]) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg: MessagePayload = {
      type: "add-group-member",
      group_member: {
        sender_id: senderId,
        group_id: groupID,
        display_name: display_name,
        group_name: groupName,
        group_avatar: groupAvatar,
        members: members
      },
    };
    this.socket.send(JSON.stringify(msg));
  }


  sendMemberLeft(senderId?: string, groupID?: string, displayName?: string, avatar?: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const msg = {
      type: "member_left",
      message: {
        sender_id: senderId,
        group_id: groupID,
        content: `Người dùng ${displayName} đã thoát nhóm`,
        avatar: avatar,
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
        group_id: group_id,
        recalled_by: sender_id,
        id: message_id,
      },
    };
    this.socket.send(JSON.stringify(msg));
  };

  sendPinnedMessage(message_id: string, sender_id: string, receiver_id?: string, group_id?: string, content?: string,
    sender_name?: string, pinned_by_name?: string, message_type?: string, created_at?: string
  ) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const msg = {
      type: "pinned-message",
      message: {
        sender_id: sender_id,
        receiver_id: receiver_id || undefined,
        group_id: group_id,
        id: message_id,
      },
      message_res: {
        message_id: message_id,
        content: content,
        sender_id: sender_id,
        sender_name: sender_name,
        pinned_by_id: sender_id,
        pinned_by_name: pinned_by_name,
        message_type: message_type,
        created_at: created_at
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
        group_id: group_id,
        id: message_id,
      },
      message_res: {
        message_id: message_id,
        conversation_id: conversation_id
      }
    };
    this.socket.send(JSON.stringify(msg));
  };



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
