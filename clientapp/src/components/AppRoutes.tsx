import { Route, Routes } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import LoginScreen from "../pages/LoginScreen";
import MainLayout from "../layouts/MainLayout";
import HomeScreen from "../pages/HomeScreen";
import { PrivateRoute, PublicRoute } from "../routes/Guard";
import RegisterScreen from "../pages/RegisterScreen";
import SuggestionScreen from "../pages/SuggestionScreen";
import SuggestionLayout from "../layouts/SuggestionLayout";
import AdminLayout from "../layouts/AdminLayout";
import AuthOpenDictCallback from "../pages/AuthOpenDictCallback";
import CompleteProfileScreen from "../pages/RegisterOAuth2Screen";
import GroupScreen from "../pages/GroupScreen";
import TodoScreen from "../pages/TodoScreen";
import SettingsScreen from "../pages/SettingsScreen";
import UserManagerScreen from "../pages/admin/UserManagerScreen";
import DashboardScreen from "../pages/admin/DashboardScreen";
import GroupManagerScreen from "../pages/admin/GroupManagerScreen";
import ChatManagerScreen from "../pages/admin/ChatManagerScreen";
import MediaManagerScreen from "../pages/admin/MediaManagerScreen";
import SystemLogManagerScreen from "../pages/admin/SystemLogManagerScreen";
import NotificationManagerScreen from "../pages/admin/NotificationManager";
import LoginAdminScreen from "../pages/admin/LoginAdminScreen";
import RoleManagerScreen from "../pages/admin/RoleManagerScreen";
import PermissionManagerScreen from "../pages/admin/PermissionManagerScreen";
import PermissionMatrixScreen from "../pages/admin/PermissionMatrixScreen";
import ModuleManagerScreen from "../pages/admin/ModuleManagerScreen";
import VideoCallScreen from "../pages/VideoCallScreen";
import TestingDashboard from "./testing/TestingDashboard";
import TestComparisonReport from "./testing/TestComparisonReport";
import StressTestingDashboard from "./testing/StressTestingDashboard";
import MassNotificationTesting from "./testing/MassNotificationTesting";

export const AppRoutes = () => {
  return (
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
        path="/video-call"
        element={
          <PrivateRoute>
            <VideoCallScreen />
          </PrivateRoute>
        }
      />

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
        <Route path="/todo" element={<TodoScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Route>
      <Route
        path="/auth/opendict/callback"
        element={<AuthOpenDictCallback />}
      />
      <Route path="/admin/login" element={<LoginAdminScreen />} />
      <Route
        element={
          <AdminLayout />
        }
      >
        <Route path="/admin" element={<DashboardScreen />} />
        <Route path="/admin/dashboard" element={<DashboardScreen />} />
        <Route path="/admin/manager-user" element={<UserManagerScreen />} />
        <Route path="/admin/manager-group" element={<GroupManagerScreen />} />
        <Route path="/admin/manager-chat" element={<ChatManagerScreen />} />
        <Route path="/admin/manager-media" element={<MediaManagerScreen />} />
        <Route
          path="/admin/manager-system-logs"
          element={<SystemLogManagerScreen />}
        />
        <Route
          path="/admin/manager-notification"
          element={<NotificationManagerScreen />}
        />
        <Route path="/admin/manager-role" element={<RoleManagerScreen />} />
        <Route
          path="/admin/manager-permission"
          element={<PermissionManagerScreen />}
        />
        <Route
          path="/admin/manager-module"
          element={<ModuleManagerScreen />}
        />
        <Route
          path="/admin/permission-matrix"
          element={<PermissionMatrixScreen />}
        />
      </Route>
      <Route path="/testing" element={<TestingDashboard />} />
      <Route path="/testing/comparison" element={<TestComparisonReport />} />
      <Route path="/testing/stress" element={<StressTestingDashboard />} />
      <Route path="/testing/mass-notification" element={<MassNotificationTesting />} />

    </Routes>
  );
};
