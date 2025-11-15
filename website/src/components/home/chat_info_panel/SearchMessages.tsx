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
      <h4 className="text-sm font-semibold text-blue-100 mb-3">
        Tìm kiếm tin nhắn
      </h4>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300"
          size={18}
        />
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-300 backdrop-blur-sm border border-blue-600/40 rounded-lg focus:outline-none focus:border-gray-700 focus:ring-2 focus:ring-gray-600 text-sm text-gray-700 placeholder-gray-700 transition-all"
        />
      </div>
    </div>
  );
}
