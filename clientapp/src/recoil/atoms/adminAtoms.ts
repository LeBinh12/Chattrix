import { atom } from 'recoil';

interface UserAdmin {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  email: string;
}

interface GroupDetail {
  id: string;
  name: string;
  image: string | null;
  members_count: number;
}

export const adminUsersState = atom<UserAdmin[]>({
  key: 'adminUsersState',
  default: [],
});

export const adminGroupsState = atom<GroupDetail[]>({
  key: 'adminGroupsState',
  default: [],
});

export const adminUsersPageState = atom<number>({
  key: 'adminUsersPageState',
  default: 1,
});

export const adminGroupsPageState = atom<number>({
  key: 'adminGroupsPageState',
  default: 1,
});

export const adminUsersHasMoreState = atom<boolean>({
  key: 'adminUsersHasMoreState',
  default: true,
});

export const adminGroupsHasMoreState = atom<boolean>({
  key: 'adminGroupsHasMoreState',
  default: true,
});