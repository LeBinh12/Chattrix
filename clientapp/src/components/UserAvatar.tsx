import React from "react";
import { LOGO } from "../assets/paths";
import { API_ENDPOINTS } from "../config/api";

type UserAvatarProps = {
  avatar?: string | null;
  isOnline?: boolean;
  size?: number; // kích thước avatar (px)
};

const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  isOnline = false,
  size = 48,
}) => {
  const avatarUrl =
    avatar && avatar.trim() !== "" && avatar !== "null"
      ? `${API_ENDPOINTS.UPLOAD_MEDIA}/${avatar}`
      : LOGO;

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/20 transition-all">
        <img
          src={avatarUrl}
          alt="User Avatar"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = LOGO;
          }}
        />
      </div>

      {/* Status dot với animation */}
      {isOnline ? (
        <span
          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-brand-700 bg-green-500"
          title="Đang hoạt động"
        />
      ) : (
        <span
          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-brand-700 bg-gray-400"
          title="Đang hoạt động"
        />
      )}
    </div>
  );
};

export default UserAvatar;
