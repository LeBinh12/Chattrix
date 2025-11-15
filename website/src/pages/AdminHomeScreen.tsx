import DashboardOverview from "../components/admin/DashboardOverview";
import RecentActivities from "../components/admin/RecentActivities";

export default function AdminHomeScreen() {
  return (
    <div className="p-6">
      <DashboardOverview />
      <RecentActivities />
    </div>
  );
}
