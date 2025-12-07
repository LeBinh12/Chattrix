// src/components/admin/group/GroupListTable.tsx
import { Sheet, Table, Avatar, Typography, Chip, Button, Box } from "@mui/joy";
import { Users, MessageCircle } from "lucide-react";
import type { GroupDetail } from "../../../types/admin/group";

interface Props {
  groups: GroupDetail[];
  onViewGroup: (group: GroupDetail) => void;
}

export default function GroupListTable({ groups, onViewGroup }: Props) {
  if (groups.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Users
          size={48}
          style={{ opacity: 0.4, color: "var(--joy-palette-neutral-400)" }}
        />
        <Typography level="body-md" mt={2}>
          Không tìm thấy nhóm nào
        </Typography>
      </Box>
    );
  }

  return (
    <Sheet variant="outlined" sx={{ borderRadius: "sm", overflow: "hidden" }}>
      <Table hoverRow>
        <thead>
          <tr>
            <th>Nhóm</th>
            <th style={{ textAlign: "center" }}>Thành viên</th>
            <th style={{ textAlign: "center" }}>Tin nhắn</th>
            <th style={{ textAlign: "center" }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id}>
              <td>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar size="lg" src={group.image || undefined}>
                    {group.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography level="body-sm" fontWeight="md">
                      {group.name}
                    </Typography>
                    <Typography level="body-xs" textColor="text.tertiary">
                      ID: {group.id.slice(0, 8)}...
                    </Typography>
                  </Box>
                </Box>
              </td>
              <td style={{ textAlign: "center" }}>
                <Chip
                  variant="soft"
                  color="primary"
                  startDecorator={<Users size={14} />}
                >
                  {group.members_count}
                </Chip>
              </td>
              <td style={{ textAlign: "center" }}>
                <Chip
                  variant="soft"
                  color="neutral"
                  startDecorator={<MessageCircle size={14} />}
                >
                  {group.messages_count.toLocaleString()}
                </Chip>
              </td>
              <td style={{ textAlign: "center" }}>
                <Button
                  size="sm"
                  variant="outlined"
                  color="primary"
                  onClick={() => onViewGroup(group)}
                >
                  Xem chi tiết
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Sheet>
  );
}
