import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";

export default function SuggestionLayout() {
  return (
    <>
      <Header />

      <main className="h-screen w-full relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-500">
        {/* Content */}
        <div className="relative flex flex-col items-center justify-center h-full px-4">
          {/* Chattrix Title */}
          <p className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 sm:mb-4 tracking-wide drop-shadow-lg text-center">
            Chattrix
          </p>

          {/* 🔔 User notification reminder */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white/15 border border-white/20 backdrop-blur-lg text-white text-center rounded-xl px-5 py-3 shadow-lg mb-6 max-w-md"
          >
            <p className="text-base sm:text-lg font-medium leading-relaxed">
              Hãy kết bạn với ít nhất
              <span className="font-semibold text-yellow-300"> 5 người </span>
              để bắt đầu trải nghiệm hệ thống!
            </p>
          </motion.div>

          {/* Form / content */}
          <div className="w-full max-w-sm sm:max-w-md md:max-w-lg bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
            <Outlet />
          </div>
        </div>
      </main>
    </>
  );
}
