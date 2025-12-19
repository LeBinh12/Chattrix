import { atom } from "recoil";
import type { Group } from "../../types/group";
import type { GroupMember } from "../../types/group-member";

export const groupListState = atom<Group[]>({
    key: "groupListState",
    default: [],
});

// State for CreateGroupModal open/close
export const groupModalState = atom<boolean>({
    key: "groupModalState",
    default: false,
});


export type GroupMembersState = {
  [groupId: string]: GroupMember[];
};

export const groupMembersAtom = atom<GroupMembersState>({
  key: "groupMembersAtom",
  default: {},
});