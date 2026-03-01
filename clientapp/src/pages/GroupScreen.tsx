import React, { useEffect, useState } from "react";
import {
  Users,
  Eye,
  UserPlus,
  Search,
  X,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { mockGroups } from "../mockups/group";

const categories = [
  "Tất cả",
  "Công nghệ",
  "Thiết kế",
  "Kinh doanh",
  "Du lịch",
  "Nghệ thuật",
  "Ẩm thực",
  "Sức khỏe",
  "Giáo dục",
  "Giải trí",
  "Tài chính",
];

export default function GroupScreen() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [visibleGroups, setVisibleGroups] = useState(6);
  const [animatedCards, setAnimatedCards] = useState([]);

  useEffect(() => {
    // Animate cards on mount
    mockGroups.forEach((_, index) => {
      setTimeout(() => {
        setAnimatedCards((prev) => [...prev, index]);
      }, index * 100);
    });
  }, []);

  const formatMemberCount = (count) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + "K";
    }
    return count;
  };

  const filteredGroups = mockGroups.filter((group) => {
    const matchesSearch =
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "Tất cả" || group.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const displayedGroups = filteredGroups.slice(0, visibleGroups);
  const hasMore = visibleGroups < filteredGroups.length;

  const loadMore = () => {
    setVisibleGroups((prev) => Math.min(prev + 6, filteredGroups.length));
  };

  return (
    <div className="min-h-screen bg-surface-muted p-4 md:p-8">
      {/* Floating particles animation */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-brand-400 rounded-full opacity-20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header with animation */}
        <div className="mb-8 text-center animate-fade-in">
          <p className="text-4xl md:text-6xl font-bold text-brand-700 mb-3">
            Khám phá nhóm
          </p>
          <p className="text-gray-600 text-lg mb-6">
            Tham gia các cộng đồng để kết nối và chia sẻ đam mê của bạn
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm nhóm theo tên hoặc mô tả..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-gray-200 focus:border-brand-500 focus:outline-none transition-all duration-300 shadow-lg hover:shadow-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2 rounded-full font-medium transition-all duration-300 transform hover:scale-105 ${selectedCategory === category
                    ? "bg-brand-600 text-white shadow-lg"
                    : "bg-white text-gray-700 hover:bg-gray-100 shadow-md"
                  }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Results count */}
          <p className="text-gray-500 text-sm">
            Tìm thấy{" "}
            <span className="font-bold text-brand-600">
              {filteredGroups.length}
            </span>{" "}
            nhóm
          </p>
        </div>

        {/* Grid of group cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {displayedGroups.map((group, index) => (
            <div
              key={group.id}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-500 transform ${animatedCards.includes(index)
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
                } ${hoveredCard === group.id
                  ? "scale-105 shadow-2xl rotate-1"
                  : "hover:scale-102 hover:shadow-xl"
                }`}
              onMouseEnter={() => setHoveredCard(group.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                transitionDelay: `${index * 50}ms`,
              }}
            >
              {/* Trending Badge */}
              {group.trending && (
                <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-orange-400 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg animate-bounce">
                  <TrendingUp className="w-3 h-3" />
                  HOT
                </div>
              )}

              {/* Avatar Image */}
              <div className="relative h-48 overflow-hidden group">
                <img
                  src={group.avatar}
                  alt={group.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-125 group-hover:rotate-2"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                {/* Sparkle effect on hover */}
                {hoveredCard === group.id && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-yellow-300 animate-ping" />
                  </div>
                )}

                <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-semibold mb-2">
                    {group.category}
                  </span>
                  <p className="text-white text-xl font-bold line-clamp-1 drop-shadow-lg">
                    {group.name}
                  </p>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5">
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 h-10">
                  {group.description}
                </p>

                {/* Member Count with animation */}
                <div className="flex items-center text-gray-500 mb-4">
                  <div className="relative">
                    <Users className="w-5 h-5 mr-2 animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping" />
                  </div>
                  <span className="font-semibold text-gray-700">
                    {formatMemberCount(group.memberCount)}
                  </span>
                  <span className="ml-1 text-sm">thành viên</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-semibold hover:bg-brand-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-1">
                    <UserPlus className="w-4 h-4" />
                    Tham gia
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-1">
                    <Eye className="w-4 h-4" />
                    Chi tiết
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="text-center">
            <button
              onClick={loadMore}
              className="px-8 py-4 bg-brand-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              Xem thêm nhóm
            </button>
          </div>
        )}

        {/* No results message */}
        {filteredGroups.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">
              Không tìm thấy nhóm nào
            </h3>
            <p className="text-gray-500">
              Thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
