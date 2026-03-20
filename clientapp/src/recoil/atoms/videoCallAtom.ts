import { atom } from "recoil";

export interface VideoCallState {
    isCalling: boolean;
    roomId: string | null;
    chatId: string | null; // user_id or group_id
    chatType: "user" | "group" | null;
}

export const videoCallState = atom<VideoCallState>({
    key: "videoCallState",
    default: {
        isCalling: false,
        roomId: null,
        chatId: null,
        chatType: null,
    },
});
