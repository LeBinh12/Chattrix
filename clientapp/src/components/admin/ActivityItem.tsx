type ActivityItemProps = {
  user: string;
  action: string;
  time: string;
};

export default function ActivityItem({
  user,
  action,
  time,
}: ActivityItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
      <div>
        <span className="font-semibold">{user}</span>
        <span className="text-gray-600"> {action}</span>
      </div>
      <span className="text-sm text-gray-500">{time}</span>
    </div>
  );
}
