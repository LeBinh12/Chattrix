import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { GroupMember } from "../../../types/group-member";
import UserAvatar from "../../UserAvatar";
import { Users, ClipboardList } from "lucide-react";
import { useRecoilValue } from "recoil";
import { selectedChatState } from "../../../recoil/atoms/chatAtom";
import { BUTTON_HOVER } from "../../../utils/className";

export interface MentionListProps {
  items: GroupMember[];
  command: (item: { id: string; label: string }) => void;
  onLoadMore?: () => void;
  onAssignTask?: () => void; // Thêm callback cho Giao Việc
  onClose?: () => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedChat = useRecoilValue(selectedChatState);
  const isGroup = !!selectedChat?.group_id;

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.user_id, label: item.display_name });
    }
  };

  const upHandler = () => setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  const downHandler = () => setSelectedIndex((selectedIndex + 1) % props.items.length);
  const enterHandler = () => selectItem(selectedIndex);

  useEffect(() => setSelectedIndex(0), [props.items]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 20) {
      props.onLoadMore?.();
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }
      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }
      if (event.key === "Enter") {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="w-80 bg-white rounded-lg border border-gray-300 shadow-2xl overflow-hidden">
      {/* Header hint */}
      <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 text-gray-600 text-xs">
        <div className="bg-yellow-100 p-1.5 rounded">
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.953a1 1 0 00.95.69h4.16c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.953c.3.921-.755 1.688-1.538 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.783.57-1.838-.197-1.538-1.118l1.287-3.953a1 1 0 00-.364-1.118L2.05 9.38c-.783-.57-.38-1.81.588-1.81h4.16a1 1 0 00.95-.69l1.286-3.953z" />
          </svg>
        </div>
        <span>Nhấn ↑, ↓ để chọn và Enter để sử dụng.</span>
        <button
          onClick={props.onClose}
          className="ml-auto text-gray-600 hover:text-gray-900 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable list */}
      <div className="max-h-120 overflow-y-auto" onScroll={handleScroll}>
        {/* ✅ Giao Việc Option */}
        {props.onAssignTask && (
          <button
            onClick={() => props.onAssignTask?.()}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-100 border-b border-gray-100`}
          >
            <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <ClipboardList size={20} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-medium">Giao Việc</p>
              <p className="text-gray-500 text-sm">Tạo công việc cho thành viên</p>
            </div>
          </button>
        )}

        {/* @All item */}
        {isGroup && (
          <button
            onClick={() => props.command({ id: "all", label: "cả nhóm" })}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-100 border-b border-gray-100 ${
              selectedIndex === -1 ? "bg-gray-100" : ""
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Users size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-medium">Báo cho cả nhóm</p>
              <p className="text-gray-500 text-sm">@All</p>
            </div>
          </button>
        )}

        {/* Member items */}
        {isGroup ? (
          props.items.length > 0 ? (
            props.items.map((item, index) => (
              <button
                key={item.user_id}
                onClick={() => selectItem(index)}
                className={`w-full flex items-center gap-3 px-4 py-1 text-left transition hover:bg-gray-100 ${
                  index === selectedIndex ? "bg-gray-200" : ""
                }`}
              >
                <div className="flex-shrink-0">
                  <UserAvatar
                    avatar={item.avatar}
                    display_name={item.display_name}
                    isOnline={item.online_status === "online"}
                    showOnlineStatus={false}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium truncate">{item.display_name}</p>
                  {item.username && (
                    <p className="text-gray-500 text-sm truncate">@{item.username}</p>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-gray-500 text-sm">Không tìm thấy thành viên</div>
          )
        ) : null}
      </div>
    </div>
  );
});

MentionList.displayName = "MentionList";

export default MentionList;