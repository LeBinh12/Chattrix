// components/group/GroupDetail.tsx
import { motion } from "framer-motion";
import { Users, Edit2, Trash2, ExternalLink, MoreVertical } from "lucide-react";
import { useState } from "react";

// Mock data
const mockGroup = {
  id: "GRP001",
  name: "Nhóm Sinh viên K66 - CNTT",
  description:
    "Nhóm sinh viên lớp Công nghệ thông tin khóa 2022-2026, Đại học Duy Tân",
  avatar: null,
  category: "Sinh viên",
  memberCount: 48,
  createdAt: "15/03/2023",
  isPublic: true,
};

const mockMembers = [
  { id: "1", name: "Nguyễn Văn An", avatar: null, status: "online" as const },
  {
    id: "2",
    name: "Trần Thị Bình",
    avatar: "/api/placeholder/40/40",
    status: "online" as const,
  },
  { id: "3", name: "Lê Minh Châu", avatar: null, status: "offline" as const },
  { id: "4", name: "Phạm Quốc Dũng", avatar: null, status: "online" as const },
  {
    id: "5",
    name: "Hoàng Thị Ngọc Ánh",
    avatar: null,
    status: "offline" as const,
  },
  { id: "6", name: "Vũ Văn Hải", avatar: null, status: "online" as const },
  { id: "7", name: "Đỗ Thị Kim Liên", avatar: null, status: "online" as const },
  { id: "8", name: "Bùi Xuân Nam", avatar: null, status: "offline" as const },
  // ... thêm 40 người nữa để test scroll
  ...Array.from({ length: 40 }, (_, i) => ({
    id: String(i + 9),
    name: `Thành viên ${i + 9}`,
    avatar: null,
    status: Math.random() > 0.5 ? ("online" as const) : ("offline" as const),
  })),
];

export default function GroupDetailScreen() {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* CỘT TRÁI - THÔNG TIN NHÓM */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <motion.div
              whileHover={{
                y: -4,
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
              }}
              className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100"
            >
              {/* Avatar lớn */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 pb-12">
                <div className="mx-auto w-40 h-40 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center">
                  {mockGroup.avatar ? (
                    <img
                      src={mockGroup.avatar}
                      alt={mockGroup.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <Users size={64} className="text-white/80" />
                  )}
                </div>
              </div>

              <div className="px-8 pb-8 -mt-6">
                <div className="bg-white rounded-2xl shadow-lg p-6 -mt-12 relative z-10">
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    {mockGroup.name}
                  </h1>

                  <p className="text-gray-600 leading-relaxed mb-6">
                    {mockGroup.description}
                  </p>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">Mã nhóm</span>
                      <span className="font-semibold text-gray-900">
                        {mockGroup.id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">Danh mục</span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {mockGroup.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">Thành viên</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {mockGroup.memberCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-gray-500">Ngày tạo</span>
                      <span className="font-medium text-gray-900">
                        {mockGroup.createdAt}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
                      <ExternalLink size={18} />
                      Xem nhóm
                    </button>
                    <button className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all">
                      <Edit2 size={18} className="text-gray-700" />
                    </button>
                    <button className="p-3 bg-red-100 rounded-xl hover:bg-red-200 transition-all group">
                      <Trash2
                        size={18}
                        className="text-red-600 group-hover:text-red-700"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* CỘT PHẢI - DANH SÁCH THÀNH VIÊN */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Thành viên nhóm
                  </h2>
                  <span className="text-sm text-gray-500">
                    {selectedMembers.length > 0
                      ? `${selectedMembers.length} được chọn`
                      : `${mockMembers.length} thành viên`}
                  </span>
                </div>
              </div>

              <div className="max-h-96 lg:max-h-full overflow-y-auto custom-scrollbar">
                <div className="p-4 space-y-3">
                  {mockMembers.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      whileHover={{
                        x: 4,
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                      }}
                      className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl hover:bg-white transition-all cursor-pointer border border-transparent hover:border-gray-200"
                      onClick={() => toggleMember(member.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={() => {}}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className="relative">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-12 h-12 rounded-full object-cover ring-4 ring-white"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg ring-4 ring-white">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            member.status === "online"
                              ? "bg-emerald-500"
                              : "bg-gray-400"
                          }`}
                        />
                      </div>

                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {member.name}
                        </h4>
                        <p className="text-sm text-gray-500">Thành viên</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            member.status === "online"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {member.status === "online" ? "Hoạt động" : "Offline"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            alert(`Xem hồ sơ ${member.name}`);
                          }}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical size={16} className="text-gray-500" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Custom Scrollbar */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.4);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.6);
        }
      `}</style>
    </div>
  );
}
