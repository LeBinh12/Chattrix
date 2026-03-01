import React from "react";
import { API_ENDPOINTS } from "../config/api";

type UserAvatarProps = {
  avatar?: string | null;
  display_name: string;
  isOnline?: boolean;
  isGroup?: boolean;
  size?: number;
  showOnlineStatus?: boolean;
  isDeleted?: boolean;
};

// Bảng màu theo chữ cái (A-Z, 0-9)
const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  A: { bg: "bg-red-500", text: "text-white" },
  B: { bg: "bg-pink-500", text: "text-white" },
  C: { bg: "bg-purple-500", text: "text-white" },
  D: { bg: "bg-indigo-500", text: "text-white" },
  E: { bg: "bg-blue-500", text: "text-white" },
  F: { bg: "bg-cyan-500", text: "text-white" },
  G: { bg: "bg-teal-500", text: "text-white" },
  H: { bg: "bg-green-500", text: "text-white" },
  I: { bg: "bg-lime-500", text: "text-white" },
  J: { bg: "bg-yellow-500", text: "text-gray-800" },
  K: { bg: "bg-amber-500", text: "text-white" },
  L: { bg: "bg-orange-500", text: "text-white" },
  M: { bg: "bg-red-600", text: "text-white" },
  N: { bg: "bg-pink-600", text: "text-white" },
  O: { bg: "bg-purple-600", text: "text-white" },
  P: { bg: "bg-indigo-600", text: "text-white" },
  Q: { bg: "bg-blue-600", text: "text-white" },
  R: { bg: "bg-cyan-600", text: "text-white" },
  S: { bg: "bg-teal-600", text: "text-white" },
  T: { bg: "bg-green-600", text: "text-white" },
  U: { bg: "bg-lime-600", text: "text-white" },
  V: { bg: "bg-yellow-600", text: "text-gray-800" },
  W: { bg: "bg-amber-600", text: "text-white" },
  X: { bg: "bg-orange-600", text: "text-white" },
  Y: { bg: "bg-rose-500", text: "text-white" },
  Z: { bg: "bg-fuchsia-500", text: "text-white" },
  "0": { bg: "bg-slate-500", text: "text-white" },
  "1": { bg: "bg-gray-500", text: "text-white" },
  "2": { bg: "bg-zinc-500", text: "text-white" },
  "3": { bg: "bg-neutral-500", text: "text-white" },
  "4": { bg: "bg-stone-500", text: "text-white" },
  "5": { bg: "bg-red-400", text: "text-white" },
  "6": { bg: "bg-blue-400", text: "text-white" },
  "7": { bg: "bg-green-400", text: "text-white" },
  "8": { bg: "bg-purple-400", text: "text-white" },
  "9": { bg: "bg-pink-400", text: "text-white" },
};

// Màu mặc định nếu không tìm thấy
const DEFAULT_COLOR = { bg: "bg-gray-500", text: "text-white" };

const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  display_name,
  isOnline = false,
  isGroup = false,
  size = 48,
  showOnlineStatus = false,
  isDeleted = false,
}) => {
  const [imgError, setImgError] = React.useState(false);

  const firstLetter = display_name?.[0]?.toUpperCase() || "?";
  
  // Lấy màu dựa trên chữ cái đầu
  const colorScheme = COLOR_MAP[firstLetter] || DEFAULT_COLOR;

  const shapeClass = isGroup ? "!rounded-xl" : "!rounded-full";

  // Kiểm tra avatar có hợp lệ không
  const hasValidAvatar =
    avatar &&
    avatar.trim() !== "" &&
    avatar !== "null" &&
    avatar !== "undefined";

  const avatarUrl = hasValidAvatar
    ? `${API_ENDPOINTS.UPLOAD_MEDIA}/${avatar}`
    : null;
  const handleImageError = () => {
    setImgError(true);
  };

 
  React.useEffect(() => {
    setImgError(false);
  }, [avatar]);

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className={`!w-full !h-full !overflow-hidden !border-2 !border-white/20 !transition-all !flex !items-center !justify-center !font-semibold ${shapeClass} ${
          isDeleted ? "!grayscale !bg-gray-400 !text-gray-200" :
          avatarUrl && !imgError
            ? "!bg-gray-200"
            : `${colorScheme.bg} ${colorScheme.text}`
        }`}
        style={{ fontSize: size * 0.4 }} // Font size tự động theo size avatar
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={display_name}
            className="w-full h-full object-cover"
            onError={handleImageError} 
          />
        ) : (
          // Fallback: chữ cái đầu với màu tương ứng
          <span>{firstLetter}</span>
        )}
      </div>

      {/* Online status - chỉ hiện nếu không phải group và bật showOnlineStatus và không bị xóa */}
      {showOnlineStatus && !isGroup && !isDeleted && (
        <span
          className={`absolute bottom-0 right-0 !w-3.5 !h-3.5 !rounded-full !border-2 !border-white !shadow-md ${
            isOnline ? "!bg-emerald-500" : "!bg-gray-400"
          }`}
          title={isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
        />
      )}
    </div>
  );
};

export default UserAvatar;