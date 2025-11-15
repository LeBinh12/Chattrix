import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { userAtom } from "../recoil/atoms/userAtom";
import { useLoadUser } from "../hooks/useLoadUser";
import { toast } from "react-toastify";
import { socketManager } from "../api/socket";

export default function Header() {
  useLoadUser();

  const user = useRecoilValue(userAtom);

  const [open, setOpen] = useState(false);

  const navigate = useNavigate();

  const handleLogout = () => {
    toast.info(`Đăng xuất thành công!`);
    socketManager.disconnect();
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white/10 backdrop-blur-md shadow-lg z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-2">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center">
              <img
                src="assets/logo.png"
                alt="Chattrix Logo"
                className="w-24 h-24 sm:w-20 sm:h-20 object-contain drop-shadow-md"
              />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 font-bold text-lg">
                Chattrix
              </span>
            </Link>
          </div>

          {/* Avatar + tên */}
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 bg-[#4490f4] px-3 py-2 rounded-full hover:bg-[#005be2] transition shadow-sm"
            >
              <img
                src={
                  user?.data?.avatar &&
                  user?.data?.avatar.trim() !== "" &&
                  user?.data?.avatar !== "null"
                    ? user?.data?.avatar
                    : "/assets/logo.png"
                }
                alt={user?.data?.username || "User avatar"}
                className="w-10 h-10 rounded-full border border-white/30 object-cover"
              />

              <span className="text-white font-medium hidden sm:block">
                {user?.data.username}
              </span>
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-40 bg-white/90 backdrop-blur-md rounded-xl shadow-lg overflow-hidden"
                >
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                  >
                    <LogOut size={18} />
                    <span>Đăng xuất</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    </>
  );
}
