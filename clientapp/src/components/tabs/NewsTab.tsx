export default function NewsTab() {
  const news = [
    { id: 1, title: "🚀 Ứng dụng đạt 1,000 người dùng", date: "2025-09-01" },
    { id: 2, title: "🔥 Tính năng mới: Chat nhóm", date: "2025-09-10" },
    { id: 3, title: "🌐 Hỗ trợ thêm nhiều ngôn ngữ", date: "2025-09-15" },
  ];

  return (
    <div className="p-4 space-y-3">
      <p className="text-4xl font-bold text-center text-white">Tin Tức</p>
      <p className="text-2xl font-extrabold text-[#ecf1fe] text-center">
        Tin tức và cập nhật mới nhất{" "}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {news.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-purple-50 rounded-lg shadow-sm hover:bg-purple-100 transition"
          >
            <p className="font-semibold">{item.title}</p>
            <p className="text-xs text-gray-500">{item.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
