import { Outlet } from "react-router-dom";
import Sidebar from "../components/home/Sidebar";

export default function MainLayout() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#dfe6f5]">
      {/* Sidebar nằm bên trái cố định */}
      <Sidebar />

      {/* Nội dung trang */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
