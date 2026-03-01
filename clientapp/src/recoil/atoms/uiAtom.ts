import { atom } from "recoil";
import type { ReplyMessage } from "../../types/Message";
import type { GroupDetail } from "../../types/admin/group";

export const chatInfoPanelVisibleAtom = atom<boolean>({
    key: "chatInfoPanelVisible",
    default: true, // mặc định hiển thị
});
export const activePanelAtom = atom<"none" | "info" | "search" | "storage" | "members" | "thread">({
    key: "activePanel",
    default: "none", // mặc định không mở gì
});

export const threadTargetAtom = atom<any | null>({
    key: "threadTarget",
    default: null,
});

export const threadTargetTypeAtom = atom<"task" | "message">({
    key: "threadTargetType",
    default: "task",
});
// Atom mới cho ChatSearchModal
export const chatSearchModalVisibleAtom = atom<boolean>({
    key: "chatSearchModalVisible",
    default: false, // mặc định ẩn
});

export const userPanelVisibleAtom = atom<boolean>({
    key: "userPanelVisible",
    default: true,
});

export const userPanelCollapsedAtom = atom({
    key: "userPanelCollapsedAtom",
    default: false, // collapsed = false (rộng) mặc định
});


export const groupModalAtom = atom<boolean>({
    key: "groupModalAtom",
    default: false,
});

export const sidebarCollapsedAtom = atom<boolean>({
    key: "sidebarCollapsedAtom",
    default: (() => {
        try { return localStorage.getItem("sidebarCollapsed") === "true"; } catch { return false; }
    })(),
});

export const addMemberModalAtom = atom({
    key: "addMemberModalAtom",
    default: {
        isOpen: false,
        groupId: "",
    },
});

export const replyMessageState = atom<ReplyMessage | null>({
    key: "replyMessageState",
    default: null,
});

export const groupDetailState = atom<GroupDetail | null>({
    key: "groupDetailState",
    default: null,
});

export const richTextVisibleAtom = atom<boolean>({
    key: "richTextVisibleAtom",
    default: false,
});

export const storageTabAtom = atom<"media" | "files" | "links">({
    key: "storageTabAtom",
    default: "media",
});