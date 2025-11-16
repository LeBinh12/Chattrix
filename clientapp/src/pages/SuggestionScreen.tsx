import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import type { UserData } from "../types/suggestion";
import { useRecoilValue } from "recoil";
import { userAtom } from "../recoil/atoms/userAtom";
import { suggestionApi } from "../api/suggestion";

export default function SuggestionScreen() {
  const user = useRecoilValue(userAtom);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UserData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [page] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    if (!user?.data?.id) return;

    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const res = await suggestionApi.getSuggestion(
          user.data.id,
          query,
          page,
          limit
        );
        setUsers(res.data.data || []);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách gợi ý:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user, query, page, limit]);

  const handleSelect = (u: UserData) => {
    if (!selected.find((s) => s.id === u.id) && selected.length < 5) {
      setSelected([...selected, u]);
    }
  };

  const handleRemove = (id: string) => {
    setSelected(selected.filter((u) => u.id !== id));
  };

  const handleAddFriends = () => {
    console.log("Bạn bè ", selected);
    alert(`Đã gửi lời mời kết bạn đến ${selected.length} người!`);
    setSelected([]);
  };

  return (
    <>
      <div className="text-white flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-center mb-4">Gợi ý kết bạn</h1>

        {/* Thanh tìm kiếm */}
        <motion.div
          className="relative w-full sm:w-2/3 mx-auto"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-gray-300" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm bạn bè..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-white placeholder-gray-300 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all"
            />
          </div>
        </motion.div>

        {/* Danh sách gợi ý */}
        <div className="bg-white rounded-lg p-3 max-h-56 overflow-y-auto text-gray-800 shadow-lg">
          {loading ? (
            <p className="text-center text-gray-500">Đang tải...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500">
              Không tìm thấy người dùng
            </p>
          ) : (
            users.map((u) => (
              <motion.div
                key={u.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(u)}
                className={`flex items-center gap-3 cursor-pointer p-2 rounded-lg ${
                  selected.find((s) => s.id === u.id)
                    ? "bg-brand-100"
                    : "hover:bg-gray-100"
                }`}
              >
                <img
                  src={
                    u.avatar && u.avatar.trim() !== ""
                      ? u.avatar
                      : "assets/logo.png"
                  }
                  alt={u.username}
                  className="w-10 h-10 rounded-full"
                  onError={(e) => (e.currentTarget.src = "assets/logo.png")}
                />

                <span className="font-medium">{u.username}</span>
              </motion.div>
            ))
          )}
        </div>

        {/* Danh sách đã chọn */}
        <div>
          <h2 className="text-lg font-semibold mb-2">
            Đã chọn ({selected.length}/5)
          </h2>
          <AnimatePresence>
            {selected.length === 0 ? (
              <p className="opacity-80">Chưa chọn ai cả.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {selected.map((u) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2 bg-white text-gray-800 rounded-lg px-3 py-2 shadow-md"
                  >
                    <img
                      src={
                        u.avatar && u.avatar.trim() !== ""
                          ? u.avatar
                          : "assets/logo.png"
                      }
                      alt={u.username}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => (e.currentTarget.src = "assets/logo.png")}
                    />
                    <span>{u.username}</span>
                    <button
                      onClick={() => handleRemove(u.id)}
                      className="text-red-500 font-bold hover:text-red-700 ml-1"
                    >
                      ×
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Nút thêm bạn bè */}
        <AnimatePresence>
          {selected.length === 5 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center mt-4"
            >
              <button
                onClick={handleAddFriends}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-2 rounded-xl shadow-lg transition-all"
              >
                Thêm bạn bè
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
