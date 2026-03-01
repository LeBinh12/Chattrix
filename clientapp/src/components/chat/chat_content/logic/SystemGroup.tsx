import { useState } from "react";
import type { Messages } from "../../../../types/Message";

const SystemGroup = ({ systemGroup }: { systemGroup: Messages[] }) => {
  const [showAll, setShowAll] = useState(false);

  if (systemGroup.length <= 2) {
    return (
      <div className="!flex !flex-col !items-center !my-4 !gap-2">
        {systemGroup.map((sysMsg) => (
          <div
            key={sysMsg.id}
            className="!px-2 !py-1 !rounded-full !bg-white !text-xs !text-[#707b97]"
          >
            {sysMsg.content}
          </div>
        ))}
      </div>
    );
  }

  const latestMessage = systemGroup[systemGroup.length - 1];
  const previousMessages = systemGroup.slice(0, -1);

  return (
    <div className="!flex !flex-col !items-center !my-4 !gap-2">
      {/* Nút mở rộng */}
      <button
        onClick={() => setShowAll(!showAll)}
        className="!flex !items-center !gap-1.5 !px-3 !py-1.5 !text-xs !text-blue-700 hover:!bg-blue-50 !transition-colors !cursor-pointer"
      >
        {showAll ? (
          <span>Thu gọn</span>
        ) : (
          <span>Xem tất cả ({previousMessages.length} tin nhắn)</span>
        )}
      </button>

      {/* Danh sách mở rộng (các tin nhắn cũ hơn) */}
      {showAll && (
        <div className="!flex !flex-col !items-center !gap-2 !w-full">
          {previousMessages.map((sysMsg) => (
            <div
              key={sysMsg.id}
              className="!px-4 !py-2 !rounded-full !bg-white !border !border-[#e4e8f1] !text-xs !text-[#707b97] !shadow-sm"
            >
              {sysMsg.content}
            </div>
          ))}
        </div>
      )}

      {/* Tin system mới nhất - Luôn hiển thị ở cuối */}
      <div className="!px-4 !py-2 !rounded-full !bg-white !border !border-[#e4e8f1] !text-xs !text-[#707b97] !shadow-sm">
        {latestMessage.content}
      </div>
    </div>
  );
};

export default SystemGroup;
