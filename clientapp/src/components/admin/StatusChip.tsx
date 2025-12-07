import React from "react";
import Chip from "@mui/joy/Chip";

interface StatusChipProps {
  status: string;
}

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const colorMap: Record<string, "success" | "neutral" | "danger"> = {
    Paid: "success",
    Refunded: "neutral",
    Cancelled: "danger",
  };

  const color = colorMap[status] ?? "neutral";

  return (
    <Chip size="sm" variant="soft" color={color}>
      {status}
    </Chip>
  );
};

export default StatusChip;
