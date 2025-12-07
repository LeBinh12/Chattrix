import React from "react";
import Box from "@mui/joy/Box";
import Avatar from "@mui/joy/Avatar";
import Typography from "@mui/joy/Typography";

interface CustomerCellProps {
  name: string;
  email: string;
}

const CustomerCell: React.FC<CustomerCellProps> = ({ name, email }) => {
  const initial = name?.charAt(0)?.toUpperCase() || "?";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Avatar size="sm" sx={{ bgcolor: "primary.500" }}>
        {initial}
      </Avatar>

      <Box>
        <Typography level="body-sm" fontWeight="md">
          {name}
        </Typography>
        <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
          {email}
        </Typography>
      </Box>
    </Box>
  );
};

export default CustomerCell;
