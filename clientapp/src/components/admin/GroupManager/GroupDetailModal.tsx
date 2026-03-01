import {
  Modal,
  ModalDialog,
  ModalClose,
  Box,
  Typography,
  Avatar,
  Divider,
} from "@mui/joy";
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
          borderRadius: "2px",
        }}
      >
        <ModalClose />
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              size="lg"
              src={group.image || undefined}
              sx={{ width: 56, height: 56, borderRadius: "2px" }}
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
          </Box>
        </Box>

        <Divider />
        <GroupMembersTable groupId={group.id} />
      </ModalDialog>
    </Modal>
  );
}
