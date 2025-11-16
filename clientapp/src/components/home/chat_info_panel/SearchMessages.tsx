import { Search } from "lucide-react";

interface SearchMessagesProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SearchMessages({
  searchQuery,
  onSearchChange,
}: SearchMessagesProps) {
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-[#1f2a44] mb-2">
        Tìm kiếm tin nhắn
      </h4>
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8893b2]"
          size={15}
        />
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-[#f5f6fb] border border-transparent text-[12px] text-[#1f2a44] placeholder:text-[#8b94b1] focus:border-[#6f8cff] focus:bg-white focus:ring-4 focus:ring-[#e2e9ff] transition"
        />
      </div>
    </div>
  );
}
