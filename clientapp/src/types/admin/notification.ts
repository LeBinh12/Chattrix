export interface ChannelNotification {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  description?: string;      // optional vì có thể để trống
  type?: string;             // thường là "notification"
  created_at: number;        // unix timestamp (seconds)
  updated_at: number;        // unix timestamp (seconds)
}

export interface ChannelNotificationResponse {
  status: number;
  message: string;
  data: ChannelNotification[];
}