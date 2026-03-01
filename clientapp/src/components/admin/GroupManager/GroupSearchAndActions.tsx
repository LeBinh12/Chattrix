// src/components/admin/group/GroupSearchAndActions.tsx
import SearchFilterBar from "../common/SearchFilterBar";

interface Props {
  totalGroups: number;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  minMembers: number | "";
  setMinMembers: (value: number | "") => void;
  maxMembers: number | "";
  setMaxMembers: (value: number | "") => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export default function GroupSearchAndActions({
  totalGroups,
  searchQuery,
  setSearchQuery,
  minMembers,
  setMinMembers,
  maxMembers,
  setMaxMembers,
  isRefreshing,
  onRefresh,
}: Props) {
  console.log("totalGroups", totalGroups);
  return (
    <SearchFilterBar
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      minMembers={minMembers}
      onMinMembersChange={setMinMembers}
      maxMembers={maxMembers}
      onMaxMembersChange={setMaxMembers}
      isRefreshing={isRefreshing}
      onRefresh={onRefresh}
      showRefreshButton={true}
    />
  );
}

