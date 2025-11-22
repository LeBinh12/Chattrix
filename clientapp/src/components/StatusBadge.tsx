// components/admin/StatusBadge.tsx
interface Props {
  status: "Hoạt động" | "Không hoạt động" | "Đã khóa";
}

export default function StatusBadge({ status }: Props) {
  const colors = {
    "Hoạt động": "bg-green-100 text-green-800 border-green-200",
    "Không hoạt động": "bg-red-100 text-red-800 border-red-200",
    "Đã khóa": "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  return (
    <span
      className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${colors[status]}`}
    >
      {status}
    </span>
  );
}
