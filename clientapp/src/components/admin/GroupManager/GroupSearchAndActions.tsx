// src/components/admin/group/GroupSearchAndActions.tsx
import { Box, Typography, Input, IconButton } from "@mui/joy";
import { Search, RefreshCw } from "lucide-react";

interface Props {
  totalGroups: number;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export default function GroupSearchAndActions({
  totalGroups,
  searchQuery,
  setSearchQuery,
  isRefreshing,
  onRefresh,
}: Props) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box>
          <Typography level="h2" fontWeight="bold">
            Quản lý nhóm chat
          </Typography>
          <Typography level="body-sm" textColor="text.tertiary">
            Tổng số: {totalGroups} nhóm
          </Typography>
        </Box>
        <IconButton
          variant="outlined"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
        </IconButton>
      </Box>

      <Input
        placeholder="Tìm kiếm nhóm theo tên..."
        startDecorator={<Search size={18} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ maxWidth: "500px" }}
      />
    </Box>
  );
}
