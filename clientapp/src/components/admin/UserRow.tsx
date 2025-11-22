// components/admin/UserRow.tsx
import StatusBadge from "./StatusBadge";
import { motion } from "framer-motion";

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  status: "Hoạt động" | "Không hoạt động";
}

interface Props {
  user: User;
  isSelected: boolean;
  onSelect: () => void;
}

export default function UserRow({ user, isSelected, onSelect }: Props) {
  return (
    <motion.tr
      whileHover={{ backgroundColor: "#f9fafb" }}
      className="border-b border-gray-100"
    >
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
      </td>
      <td className="px-6 py-4 text-gray-900 font-medium">{user.username}</td>
      <td className="px-6 py-4 text-gray-800">{user.name}</td>
      <td className="px-6 py-4 text-blue-600">{user.email}</td>
      <td className="px-6 py-4 text-gray-600">{user.role}</td>
      <td className="px-6 py-4 text-gray-500 text-sm">{user.createdAt}</td>
      <td className="px-6 py-4">
        <StatusBadge status={user.status} />
      </td>
    </motion.tr>
  );
}
