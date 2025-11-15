// src/state/chatState.ts
import { atom } from "recoil";

export type SelectedChat = {
    user_id: string;
    group_id: string;
    avatar: string;
    display_name: string;
    status: string;
    update_at: string;
};

export const selectedChatState = atom<SelectedChat | null>({
    key: "selectedChatState",
    default: null,
});
