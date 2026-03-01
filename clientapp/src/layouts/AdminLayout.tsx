import { Outlet } from "react-router-dom";
import Sidebar from "../components/admin/Sidebar";
import Header from "../components/admin/Header";
import Box from "@mui/joy/Box";
import { useRecoilValue } from "recoil";
import { userAtom, isAuthLoadingAtom } from "../recoil/atoms/userAtom";
import { Navigate } from "react-router-dom";

export default function AdminLayout() {

  const user = useRecoilValue(userAtom);
  const isAuthLoading = useRecoilValue(isAuthLoadingAtom);

  if (isAuthLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.body' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
           <div className="w-10 h-10 border-4 border-[#00568c] border-t-transparent rounded-full animate-spin"></div>
           <Box sx={{ color: '#00568c', fontWeight: 500 }}>Đang tải...</Box>
        </Box>
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Box
      sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.body" }}
    >
      <Header />
      <Sidebar />
      <Box
        component="main"
        sx={{
          pt: {
            xs: "calc(8px + var(--Header-height))",
            sm: "calc(8px + var(--Header-height))",
            md: 1,
          },
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100dvh",
          overflow: "auto",
          gap: 0.75,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

