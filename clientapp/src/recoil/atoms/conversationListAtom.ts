import { atom } from "recoil";
import type { Conversation } from "../../types/conversation";

export const conversationListAtom = atom<Conversation[]>({
    key: "conversationListAtom",
    default: [],
});