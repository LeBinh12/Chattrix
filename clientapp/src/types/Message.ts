import type { Media } from "./upload";
import type { Task } from "../api/taskApi";

export type Message = {
  id: number;
  sender: string;
  text: string;
  unread?: number;
  timestamp?: string;
};
export type ReplyMessage = {
  id: string;
  sender: string;
  content: string;
  media_url?: string;
  type: string
};


export type MessageResponse = {
  status: number,
  message: string,
  data: {
    count: number,
    limit: number,
    skip: number,
    data: Messages[]
  }
}

export type MessageIDResponse = {
  status: number,
  message: string,
  data: {
    data: Messages[]
  }
}


export type Messages = {
  id: string,
  sender_id: string,
  receiver_id: string,
  group_id: string,
  content: string,
  created_at: string,
  is_read: boolean,
  status: string,
  sender_name: string,
  sender_avatar: string,
  media_ids: Media[],
  type: string,
  reply_to_id: string,
  reply?: ReplyMessage,
  recalled_at: string,
  recalled_by: string,
  task?: Task,
  reactions?: Reaction[],
  system_action?: string,
  old_owner_id?: string,
  new_owner_id?: string,
  parent_id?: string;
  comment_count?: number;
  edited_at?: string;
}

export type Reaction = {
  user_id: string;
  user_name: string;
  emoji: string;
  created_at?: string;
}




