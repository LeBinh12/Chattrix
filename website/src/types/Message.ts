import type { Media } from "./upload";

export type Message = {
  id: number;
  sender: string;
  text: string;
  unread?: number;
  timestamp?: string;
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
  type: string
}




