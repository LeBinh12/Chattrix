import { useSetRecoilState } from "recoil";
import { activePanelAtom } from "../../../recoil/atoms/uiAtom";
import { Users, ChevronRight } from "lucide-react";

interface ButtonMembersProps {
  isGroup: boolean;
  memberCount?: number;
}

export default function ButtonMembers({
  isGroup,
  memberCount = 0,
}: ButtonMembersProps) {
  const setActivePanel = useSetRecoilState(activePanelAtom);

  if (!isGroup) return null;

  return (
    <div
      className="p-3 cursor-pointer group hover:bg-gray-50 transition-colors"
      onClick={() => setActivePanel("members")}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900 flex items-center gap-3">
          <Users size={20} className="text-blue-600" />
          Thành viên nhóm
        </p>
        <div className="flex items-center text-gray-500 group-hover:text-blue-600 transition-colors mr-3">
          <span className="text-sm text-gray-500">{memberCount} thành viên</span>
          <ChevronRight size={16} />
        </div>
      </div>
    </div>
  );
}
