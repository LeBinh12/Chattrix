import type { JSX } from "react";
import { Navigate } from "react-router-dom";

function PublicRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("access_token");
  if (token) {
    // Nếu đã có token thì tự động chuyển hướng về home
    return <Navigate to="/" replace />;
  }
  return children;
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  // const user = useRecoilValue(userAtom);
  const token = localStorage.getItem("access_token");
  // const location = useLocation();

  if (!token) {
    // Nếu chưa login thì về trang login
    return <Navigate to="/login" replace />;
  }

  // if (
  //   user?.data.is_completed_friend_setup === false &&
  //   location.pathname !== "/suggestion"
  // ) {
  //   toast.info(`Bạn cần kết bạn ít nhất 5 người`);
  //   return <Navigate to="/suggestion" replace />;
  // }
  return children;
}

export { PublicRoute, PrivateRoute };
