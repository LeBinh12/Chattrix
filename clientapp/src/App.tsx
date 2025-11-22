import { Route, Routes } from "react-router-dom";
import AuthLayout from "./layouts/AuthLayout";
import LoginScreen from "./pages/LoginScreen";
import MainLayout from "./layouts/MainLayout";
import HomeScreen from "./pages/HomeScreen";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PrivateRoute, PublicRoute } from "./routes/Guard";
import RegisterScreen from "./pages/RegisterScreen";
import SuggestionScreen from "./pages/SuggestionScreen";
import { useLoadUser } from "./hooks/useLoadUser";
import SuggestionLayout from "./layouts/SuggestionLayout";
import { useRecoilValue } from "recoil";
import { userAtom } from "./recoil/atoms/userAtom";
import { useEffect } from "react";
import { socketManager } from "./api/socket";
import AdminLayout from "./layouts/AdminLayout";
import AdminHomeScreen from "./pages/admin/AdminHomeScreen";
import AuthOpenDictCallback from "./pages/AuthOpenDictCallback";
import CompleteProfileScreen from "./pages/RegisterOAuth2Screen";
import GroupScreen from "./pages/GroupScreen";
import ContactsScreen from "./pages/ContactsScreen";
import UserManagementScreen from "./pages/admin/UserManagementScreen";
import GroupChanelManagerScreen from "./pages/admin/GroupChanelManagerScreen";
import GroupDetailScreen from "./pages/admin/GroupDetailScreen";
import UsersPage from "./pages/admin/UsersPage";

function App() {
  useLoadUser();
  const user = useRecoilValue(userAtom);

  useEffect(() => {
    if (user?.data.id) {
      socketManager.connect(user.data.id);
      sessionStorage.setItem("socket_user", user.data.id);
    }
  }, [user?.data.id]);
  return (
    <>
      <Routes>
        <Route
          element={
            <PublicRoute>
              <AuthLayout />
            </PublicRoute>
          }
        >
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
        </Route>
        <Route
          element={
            <PrivateRoute>
              <AuthLayout />
            </PrivateRoute>
          }
        >
          <Route path="/register-oauth" element={<CompleteProfileScreen />} />
        </Route>

        <Route
          element={
            <PrivateRoute>
              <SuggestionLayout />
            </PrivateRoute>
          }
        >
          <Route path="/suggestion" element={<SuggestionScreen />} />
        </Route>

        <Route
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<HomeScreen />} />
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/group" element={<GroupScreen />} />
          <Route path="/contact" element={<ContactsScreen />} />
        </Route>
        <Route
          path="/auth/opendict/callback"
          element={<AuthOpenDictCallback />}
        />

        {/* Page Admin */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminHomeScreen />} />
          <Route path="/admin/dashboard" element={<AdminHomeScreen />} />
          <Route
            path="/admin/user-manager"
            element={<UserManagementScreen />}
          />
          <Route
            path="/admin/group-manager"
            element={<GroupChanelManagerScreen />}
          />
          <Route path="/admin/group-detail" element={<GroupDetailScreen />} />
          <Route path="/admin/user-page" element={<UsersPage />} />
        </Route>
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
        toastClassName="bg-white shadow-lg rounded-lg p-4 sm:p-5 text-sm sm:text-base"
      />
    </>
  );
}

export default App;
