import { useRecoilValue, useSetRecoilState } from "recoil";
import { groupMembersAtom } from "../recoil/atoms/groupAtom";
import { createMentionSuggestion } from "../components/home/chat_window/mentionSuggestion";
import type { GroupMember } from "../types/group-member";
import { userAtom } from "../recoil/atoms/userAtom";

export const useMentionSuggestion = (
  groupId: string,
  onAssignTask?: () => void,
  onOpen?: () => void,
  onClose?: () => void
) => {
  const groupMembersMap = useRecoilValue(groupMembersAtom);
  const setGroupMembers = useSetRecoilState(groupMembersAtom);
  const currentUser = useRecoilValue(userAtom);

  const currentUserId = currentUser?.data?.id;
  const cachedMembers = groupMembersMap[groupId] || [];
  
  const setCache = (members: GroupMember[]) =>
    setGroupMembers((prev) => ({ ...prev, [groupId]: members }));

  return createMentionSuggestion({
    groupId,
    cachedMembers,
    setCache,
    currentUserId,
    onAssignTask,
    onOpen,
    onClose,
  });
};
