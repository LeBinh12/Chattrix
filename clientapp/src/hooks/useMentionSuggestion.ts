import { useRecoilValue, useSetRecoilState } from "recoil";
import { groupMembersAtom } from "../recoil/atoms/groupAtom";
import { createMentionSuggestion } from "../components/home/chat_window/mentionSuggestion";
import type { GroupMember } from "../types/group-member";

export const useMentionSuggestion = (groupId: string) => {
  const groupMembersMap = useRecoilValue(groupMembersAtom);
  const setGroupMembers = useSetRecoilState(groupMembersAtom);

  const cachedMembers = groupMembersMap[groupId] || [];
  const setCache = (members: GroupMember[]) =>
    setGroupMembers((prev) => ({ ...prev, [groupId]: members }));

  return createMentionSuggestion({
    groupId,
    cachedMembers,
    setCache,
  });
};
