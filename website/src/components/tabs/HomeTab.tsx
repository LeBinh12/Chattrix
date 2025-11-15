import { User } from "lucide-react";

export default function HomeTab() {
  return (
    <div className="p-6 space-y-6">
      {/* Header: Logo + Avatar */}
      <div className="flex items-center justify-between mx-4 sm:mx-10">
        {/* Logo Web */}
        <div className="flex items-center space-x-2">
          <img
            src="assets/logo.png"
            alt="Logo"
            className="w-12 h-12 rounded-lg"
          />
        </div>

        {/* Avatar User */}
        <div className="w-12 h-12 rounded-full bg-[#9dbaf8] flex items-center justify-center shadow-md">
          <User className="w-6 h-6 text-[#0f3461]" />
        </div>
      </div>

      {/* Welcome text */}
      <h1 className="text-2xl sm:text-4xl font-extrabold text-[#ecf1fe] text-center">
        Welcome Home
      </h1>

      {/* Thông báo mới */}
      <div className="bg-gradient-to-r from-[#ecf1fe] to-purple-50 p-4 rounded-xl shadow-sm">
        <h2 className="font-semibold text-[#2665b1] text-lg mb-2">
          🔔 Thông báo mới
        </h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          <li>
            Bản cập nhật <b>v1.0.1</b> đã ra mắt
          </li>
          <li>
            Tính năng mới: Hỗ trợ <b>Dark Mode</b>
          </li>
          <li>Sửa lỗi & cải thiện hiệu năng</li>
        </ul>
      </div>

      {/* Mẹo nhanh */}
      <div className="bg-[#ecf1fe] p-4 rounded-xl shadow-sm">
        <h2 className="font-semibold text-[#2665b1] text-lg mb-2">
          💡 Mẹo nhanh
        </h2>
        <p className="text-gray-600 leading-relaxed">
          Nhấn vào tab{" "}
          <span className="font-semibold text-[#307bd7]">Messages</span> để xem
          danh sách tin nhắn của bạn. Bạn cũng có thể kiểm tra mục{" "}
          <span className="font-semibold text-[#307bd7]">News</span> để cập nhật
          tin tức mới nhất.
        </p>
      </div>
    </div>
  );
}
