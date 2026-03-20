import type { JSX } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useRecoilValue } from "recoil";
import { userAtom, isAuthLoadingAtom } from "../recoil/atoms/userAtom";
import { canAccessAdminPanel } from "../constants/menuPermissions";

function PublicRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("access_token");
  const isAuthLoading = useRecoilValue(isAuthLoadingAtom);
  const user = useRecoilValue(userAtom);

  if (isAuthLoading) return null;

  if (token && user) {
    // Nếu đã có token và user thì tự động chuyển hướng về home
    return <Navigate to="/" replace />;
  }
  return children;
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("access_token");
  const isAuthLoading = useRecoilValue(isAuthLoadingAtom);
  const user = useRecoilValue(userAtom);

  if (isAuthLoading) return null;

  if (!token || !user) {
    // Nếu chưa login hoặc chưa có user thì về trang login
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function AdminGuard({ children }: { children: JSX.Element }) {
  const user = useRecoilValue(userAtom);
  const isAuthLoading = useRecoilValue(isAuthLoadingAtom);
  const token = localStorage.getItem("access_token");

  if (isAuthLoading) return null; // Or a loading spinner

  if (!token || !user) {
    toast.error("Bạn cần phải đăng nhập");
    return <Navigate to="/login" replace />;
  }

  if (!canAccessAdminPanel((user.data as any)?.permissions)) {
    toast.error("Bạn không có quyền truy cập trang quản trị");
    return <Navigate to="/" replace />;
  }

  return children;
}

export { PublicRoute, PrivateRoute };
