import React from "react";
import { LOGO } from "../assets/paths";
import { API_ENDPOINTS } from "../config/api";

type UserAvatarProps = {
  avatar?: string | null;
  display_name: string; // thêm display_name
  isOnline?: boolean;
  isGroup?: boolean;
  size?: number; // kích thước avatar (px)
};

const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  display_name,
  isOnline = false,
  isGroup = false,
  size = 48,
}) => {
  const avatarUrl =
    avatar && avatar.trim() !== "" && avatar !== "null"
      ? `${API_ENDPOINTS.UPLOAD_MEDIA}/${avatar}`
      : null; // không lấy LOGO nữa

  const firstLetter = display_name?.[0]?.toUpperCase() || "?";

    const shapeClass = isGroup ? "rounded-xl" : "rounded-full";

   return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className={`w-full h-full overflow-hidden border-2 border-white/20 transition-all flex items-center justify-center bg-gray-200 text-white font-semibold text-lg ${shapeClass}`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = LOGO;
            }}
          />
        ) : (
          <span>{firstLetter}</span>
        )}
      </div>

      {!isGroup && (
        <span
          className={`absolute bottom-0 right-1 w-3 h-3 rounded-full border border-brand-700 ${
            isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
          title={isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
        />
      )}
    </div>
  );
};

export default UserAvatar;
