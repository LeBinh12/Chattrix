import type { GroupMember } from "../types/group-member";

export const deduplicateMembers = (members: GroupMember[]) => {
  const roleWeight: Record<string, number> = { owner: 3, admin: 2, member: 1 };
  const emailMap = new Map<string, GroupMember>();

  members.forEach((member) => {
    if (!member.email) {
      emailMap.set(`no-email-${member.user_id}`, member);
      return;
    }

    const existing = emailMap.get(member.email);
    
    if (!existing || roleWeight[member.role] > roleWeight[existing.role]) {
      emailMap.set(member.email, member);
    }
  });

  return Array.from(emailMap.values());
};
