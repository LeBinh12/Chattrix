import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const images = [
  "/assets/banner-1.jpg",
  "/assets/banner-2.png",
  "/assets/banner-3.jpg",
  "/assets/banner-4.jpg",
];

export default function EmptyChatWindow() {
  const [index, setIndex] = useState(0);

  // Tự động chuyển ảnh sau 4 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setIndex((prev) => (prev + 1) % images.length);
  const prev = () =>
    setIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="relative flex flex-col flex-1 h-screen bg-gradient-to-br from-gray-100 to-gray-200 rounded-tl-2xl rounded-tr-2xl overflow-hidden">
      {/* Ảnh chính full cover */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.img
            key={index}
            src={images[index]}
            alt="chat banner"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Overlay mờ để dễ đọc nút + dot */}
        <div className="absolute inset-0 bg-black/20"></div>

        {/* Nút điều hướng */}
        <div className="absolute inset-0 flex justify-between items-center px-6">
          <button
            onClick={prev}
            className="p-3 rounded-full bg-white/30 hover:bg-white/60 transition backdrop-blur-sm"
          >
            <ChevronLeft className="w-7 h-7 text-gray-800" />
          </button>
          <button
            onClick={next}
            className="p-3 rounded-full bg-white/30 hover:bg-white/60 transition backdrop-blur-sm"
          >
            <ChevronRight className="w-7 h-7 text-gray-800" />
          </button>
        </div>

        {/* Dots chỉ trang */}
        <div className="absolute bottom-8 w-full flex justify-center gap-3">
          {images.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i === index ? "bg-blue-500 scale-125" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
