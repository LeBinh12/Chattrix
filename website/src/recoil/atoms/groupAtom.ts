import { atom } from "recoil";
import type { Group } from "../../types/group";

export const groupListState = atom<Group[]>({
    key: "groupListState",
    default: [],
});

// State for CreateGroupModal open/close
export const groupModalState = atom<boolean>({
    key: "groupModalState",
    default: false,
});