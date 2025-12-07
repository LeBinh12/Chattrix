import { Outlet } from "react-router-dom";
import Sidebar from "../components/admin/Sidebar";
import Box from "@mui/joy/Box";

export default function AdminLayout() {
  return (
    <Box
      sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.body" }}
    >
      <Sidebar />
      <Outlet />
    </Box>
  );
}
