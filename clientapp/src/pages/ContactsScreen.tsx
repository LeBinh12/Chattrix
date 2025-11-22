import React, { useState, useEffect } from "react";
import {
  Search,
  MessageCircle,
  Mail,
  X,
  Users,
  UserCheck,
  UserX,
  Zap,
} from "lucide-react";
import { mockContacts } from "../mockups/contact";

// Mock data cho danh bạ

export default function ContactsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hoveredCard, setHoveredCard] = useState(null);
  const [animatedCards, setAnimatedCards] = useState([]);

  useEffect(() => {
    // Animate cards on mount
    mockContacts.forEach((_, index) => {
      setTimeout(() => {
        setAnimatedCards((prev) => [...prev, index]);
      }, index * 50);
    });
  }, []);

  const filteredContacts = mockContacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "online" && contact.isOnline) ||
      (statusFilter === "offline" && !contact.isOnline);

    return matchesSearch && matchesStatus;
  });

  const onlineCount = mockContacts.filter((c) => c.isOnline).length;
  const offlineCount = mockContacts.filter((c) => !c.isOnline).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-indigo-400 to-blue-400 opacity-10"
            style={{
              width: `${Math.random() * 100 + 50}px`,
              height: `${Math.random() * 100 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${
                5 + Math.random() * 10
              }s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-700">
                Danh bạ
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {mockContacts.length} liên hệ • {onlineCount} đang online
              </p>
            </div>
          </div>

          {/* Search & Filter Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/50">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-all duration-300 bg-white"
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

            {/* Status Filter */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setStatusFilter("all")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                  statusFilter === "all"
                    ? "bg-gradient-to-r from-indigo-600 to-blue-700 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Users className="w-4 h-4" />
                Tất cả ({mockContacts.length})
              </button>
              <button
                onClick={() => setStatusFilter("online")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                  statusFilter === "online"
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Online ({onlineCount})
              </button>
              <button
                onClick={() => setStatusFilter("offline")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                  statusFilter === "offline"
                    ? "bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <UserX className="w-4 h-4" />
                Offline ({offlineCount})
              </button>
            </div>
          </div>
        </div>

        {/* Contacts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredContacts.map((contact, index) => (
            <div
              key={contact.id}
              className={`bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 transform overflow-hidden border border-gray-100 ${
                animatedCards.includes(index)
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              } ${
                hoveredCard === contact.id
                  ? "scale-105 -rotate-1"
                  : "hover:scale-102"
              }`}
              onMouseEnter={() => setHoveredCard(contact.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                transitionDelay: `${index * 30}ms`,
              }}
            >
              {/* Card Header with Avatar */}
              <div className="relative p-6 pb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/10 to-purple-400/10" />

                <div className="relative flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg">
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                    </div>
                    {/* Online Status Badge */}
                    <div
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white shadow-lg ${
                        contact.isOnline ? "bg-green-500" : "bg-gray-400"
                      }`}
                    >
                      {contact.isOnline && (
                        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                      )}
                    </div>
                  </div>

                  {/* Name & Status */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-lg truncate mb-1">
                      {contact.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {contact.isOnline ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                          <Zap className="w-3 h-3" />
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          Không hoạt động
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-6 pb-6 space-y-3">
                {/* Email */}
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Mail className="w-4 h-4 flex-shrink-0 text-indigo-600" />
                  <span className="truncate">{contact.email}</span>
                </div>

                {/* Last Message */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1 font-medium">
                    Tin nhắn gần nhất:
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-1">
                    {contact.lastMessage}
                  </p>
                </div>

                {/* Message Button */}
                <button className="w-full bg-gradient-to-r from-indigo-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-blue-300 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-1">
                  <MessageCircle className="w-4 h-4" />
                  Nhắn tin
                </button>
              </div>

              {/* Hover Glow Effect */}
              {hoveredCard === contact.id && (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 pointer-events-none" />
              )}
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredContacts.length === 0 && (
          <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">
              Không tìm thấy liên hệ
            </h3>
            <p className="text-gray-500">
              Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-30px) translateX(5px);
          }
        }
      `}</style>
    </div>
  );
}
