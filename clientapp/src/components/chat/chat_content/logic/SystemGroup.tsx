import { useState } from "react";
import type { Messages } from "../../../../types/Message";

const SystemGroup = ({ systemGroup }: { systemGroup: Messages[] }) => {
  const [showAll, setShowAll] = useState(false);

  if (systemGroup.length <= 2) {
    return (
      <div className="flex flex-col items-center my-4 gap-2">
        {systemGroup.map((sysMsg) => (
          <div
            key={sysMsg.id}
            className="px-4 py-2 rounded-full bg-white border border-[#e4e8f1] text-xs text-[#707b97] shadow-sm"
          >
            {sysMsg.content}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center my-4 gap-2">
      {/* Nút mở rộng */}
      <button
        onClick={() => setShowAll(!showAll)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#e4e8f1] text-xs text-[#4a90e2] hover:bg-[#f5f7fb] transition-colors shadow-sm cursor-pointer"
      >
        {showAll ? (
          <span>Thu gọn</span>
        ) : (
          <span>Xem tất cả ({systemGroup.length - 1} tin nhắn)</span>
        )}
      </button>

      {/* Danh sách mở rộng */}
      {showAll && (
        <div className="flex flex-col items-center gap-2 w-full">
          {systemGroup.slice(0, -1).map((sysMsg) => (
            <div
              key={sysMsg.id}
              className="px-4 py-2 rounded-full bg-white border border-[#e4e8f1] text-xs text-[#707b97] shadow-sm"
            >
              {sysMsg.content}
            </div>
          ))}
        </div>
      )}

      {/* Tin system cuối */}
      <div className="px-4 py-2 rounded-full bg-white border border-[#e4e8f1] text-xs text-[#707b97] shadow-sm">
        {systemGroup[0].content}
      </div>
    </div>
  );
};

export default SystemGroup;
