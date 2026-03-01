import { atom } from "recoil";

export interface IncomingCallData {
    callerId: string;
    callerName: string;
    callerAvatar: string;
    roomName: string;
    chatId: string; // group_id or user_id
    isGroup: boolean;
}

export const incomingCallAtom = atom<IncomingCallData | null>({
    key: "incomingCallAtom",
    default: null,
});
