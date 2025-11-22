import { atom } from "recoil";
import type { Messages } from "../../types/Message";

export type MessagesCache = {
    [conversationKey: string]: Messages[];
};

export const messagesCacheAtom = atom<MessagesCache>({
    key: "messagesCacheAtom",
    default: {},
});