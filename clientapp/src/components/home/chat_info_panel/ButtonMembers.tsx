import { useSetRecoilState } from "recoil";
import { activePanelAtom } from "../../../recoil/atoms/uiAtom";
import { LogOut } from "lucide-react";

interface ButtonMembersProps {
  isGroup: boolean;
  userId?: string;
  groupId?: string;
}

export default function ButtonMembers({
  isGroup,
}: ButtonMembersProps) {
  const setActivePanel = useSetRecoilState(activePanelAtom);

  return (
    <div className="flex flex-col space-y-2.5">
      {isGroup && (
        <button
          onClick={() => setActivePanel("members")}
          className="w-full flex items-center justify-center gap-2 py-2 px-3
                     rounded-2xl border border-blue-200
                     text-blue-600 text-[13px]
                     hover:bg-blue-50 transition cursor-pointer"
        >
          <LogOut size={16} />
          <span className="font-medium">Danh sách thành viên</span>
        </button>
      )}
    </div>
  );
}
