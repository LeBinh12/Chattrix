import { Filter } from "lucide-react";

interface HeaderWithFilterIconProps {
  title: string;
}

const HeaderWithFilterIcon: React.FC<HeaderWithFilterIconProps> = ({
  title,
}) => (
  <div className="flex items-center gap-1">
    <span>{title}</span>
    <Filter size={14} className="text-gray-400" />
  </div>
);

export default HeaderWithFilterIcon;
