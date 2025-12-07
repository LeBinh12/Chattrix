import {
  Modal,
  ModalDialog,
  ModalClose,
  Box,
  Typography,
  Avatar,
  Stack,
  Card,
  Divider,
  IconButton,
} from "@mui/joy";
import { MessageCircle, Settings, Users } from "lucide-react";
import GroupMembersTable from "./GroupMembersTable";
import type { GroupDetail } from "../../../types/admin/group";

interface Props {
  open: boolean;
  group: GroupDetail | null;
  onClose: () => void;
}

export default function GroupDetailModal({ open, group, onClose }: Props) {
  if (!group) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          maxWidth: 900,
          width: "90vw",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ModalClose />
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Avatar
              size="lg"
              src={group.image || undefined}
              sx={{ width: 56, height: 56 }}
            >
              {group.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography level="h4" fontWeight="bold">
                {group.name}
              </Typography>
              <Typography level="body-sm" textColor="text.tertiary">
                ID: {group.id}
              </Typography>
            </Box>
            <IconButton variant="outlined" color="neutral">
              <Settings size={18} />
            </IconButton>
          </Box>

          <Stack direction="row" spacing={2}>
            <Card variant="soft" sx={{ flex: 1 }}>
              <Users size={20} />{" "}
              <Typography level="h4">{group.members_count}</Typography>
            </Card>
            <Card variant="soft" sx={{ flex: 1 }}>
              <MessageCircle size={20} />{" "}
              <Typography level="h4">
                {group.messages_count.toLocaleString()}
              </Typography>
            </Card>
          </Stack>
        </Box>

        <Divider />
        <GroupMembersTable groupId={group.id} />
      </ModalDialog>
    </Modal>
  );
}
