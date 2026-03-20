import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, MessageSquare, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

// Slide Data
const slides = [
  {
    id: 1,
    title: "Chúc mừng năm mới",
    description: "Kính chúc quý thầy cô, sinh viên và đối tác một năm mới An khang – Thịnh vượng – Thành công rực rỡ.🌸 Chúc Đại học Đồng Tháp ngày càng phát triển, vững bước trên hành trình nâng tầm tri thức và hội nhập.",
    icon: <MessageSquare className="!w-6 !h-6 !text-white" />,
    color: "!bg-[#0073bc]",
    theme: "blue"
  },
  {
    id: 2,
    title: "Đại Học Đồng Tháp",
    description: "Đại học Đồng Tháp là trường đại học công lập trực thuộc Bộ Giáo dục và Đào tạo, tọa lạc tại thành phố Cao Lãnh, tỉnh Đồng Tháp. Trường có thế mạnh trong đào tạo sư phạm, khoa học xã hội, kinh tế và kỹ thuật, hướng đến cung cấp nguồn nhân lực chất lượng cao cho khu vực Đồng bằng sông Cửu Long và cả nước.",
    icon: <CheckCircle2 className="!w-6 !h-6 !text-white" />,
    color: "!bg-[#00568c]",
    theme: "blue-dark"
  },
  {
    id: 3,
    title: "Tuyển sinh",
    description: "Đại học Đồng Tháp thông báo tuyển sinh các ngành đào tạo đa dạng thuộc lĩnh vực sư phạm, kinh tế, kỹ thuật, khoa học xã hội và ngoại ngữ. Nhà trường áp dụng nhiều phương thức xét tuyển linh hoạt, tạo điều kiện thuận lợi cho thí sinh trên cả nước.",
    icon: <ShieldCheck className="!w-6 !h-6 !text-white" />,
    color: "!bg-[#003f6c]",
    theme: "blue-darker"
  }
];

// --- Custom Illustrations Components ---

const ChatIllustration = () => (
  <div className="!relative !w-full !h-full !bg-[#0073bc]/10 !flex !items-center !justify-center !overflow-hidden !rounded-2xl">
    {/* Background blur nhẹ */}
    <div className="!absolute !inset-0 !bg-gradient-to-br !from-[#0073bc]/20 !to-transparent"></div>

    {/* Ảnh chính: người đang chat/tư vấn */}
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="!relative !z-10"
    >
      <img
        src="src/assets/banner-1.jpg" // ← Thay bằng ảnh thực tế: bác sĩ tư vấn khách hàng
        alt="Tư vấn nha khoa"
        className="!w-80 !max-w-full !h-auto !rounded-2xl !shadow-2xl !border-8 !border-white"
      />
    </motion.div>

    {/* Ảnh phụ nhỏ nổi (tùy chọn) */}
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="!absolute !top-8 !left-8 !z-20"
    >
      <img
        src="src/assets/banner-2.jpg" // ← Ảnh nhỏ: nụ cười, tin nhắn, icon chat bubble...
        alt="Chat"
        className="!w-24 !h-24 !rounded-full !shadow-xl !border-4 !border-white"
      />
    </motion.div>
  </div>
);

const TaskIllustration = () => (
  <div className="!relative !w-full !h-full !bg-[#00568c]/10 !flex !items-center !justify-center !overflow-hidden !rounded-2xl">
    <div className="!absolute !inset-0 !bg-gradient-to-tl !from-[#00568c]/20 !to-transparent"></div>

    {/* Ảnh chính: bác sĩ đang trồng implant hoặc khám răng */}
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="!relative !z-10"
    >
      <img
        src="src/assets/banner-3.png" // ← Ảnh bác sĩ đang làm implant
        alt="Trồng răng Implant"
        className="!w-80 !max-w-full !h-auto !rounded-2xl !shadow-2xl !border-8 !border-white"
      />
    </motion.div>
  </div>
);

const SecurityIllustration = () => (
  <div className="!relative !w-full !h-full !bg-[#003f6c]/10 !flex !items-center !justify-center !overflow-hidden !rounded-2xl">
    <div className="!absolute !inset-0 !bg-gradient-to-tl !from-[#003f6c]/20 !to-transparent"></div>
    {/* Ảnh chính: công nghệ hiện đại, máy móc nha khoa, hoặc biểu tượng bảo mật dữ liệu */}
    <motion.div
      initial={{ scale: 0.8, rotate: -10, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 150, delay: 0.2 }}
      className="!relative !z-10"
    >
      <img
        src="src/assets/banner-4.png" // ← Ảnh máy quét 3D, hệ thống bảo mật, hoặc phòng khám hiện đại
        alt="Niềng răng thẩm mỹ"
        className="!w-80 !max-w-full !h-auto !rounded-3xl !shadow-2xl !border-8 !border-white"
      />
    </motion.div>
  </div>
);

export default function EmptyChatWindow() {
  const [index, setIndex] = useState(0);

  // Auto-play
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 5000); // 5s slide
    return () => clearInterval(timer);
  }, []);

  const next = () => setIndex((prev) => (prev + 1) % slides.length);
  const prev = () => setIndex((prev) => (prev - 1 + slides.length) % slides.length);

  const currentSlide = slides[index];

  return (
    <div className="!flex-1 !h-full !bg-[#f8f9fa] !flex !items-center !justify-center !p-4 md:!p-8 !overflow-hidden !font-sans">

      {/* Main Card - Flat Design with Border */}
      <div className="!relative !w-full !max-w-5xl !aspect-[16/9] md:!aspect-[21/9] !bg-white !rounded-2xl !border !border-gray-200 !overflow-hidden !flex !flex-col md:!flex-row !shadow-sm">

        {/* Left Content */}
        <div className="!flex-1 !p-8 md:!p-12 !flex !flex-col !justify-center !relative !z-10 !order-2 md:!order-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
              className="!flex !flex-col !items-start !space-y-6"
            >
              <div className={`!p-3 !rounded-xl ${currentSlide.color} !ring-1 !ring-offset-2 !ring-transparent`}>
                {currentSlide.icon}
              </div>

              <div className="!space-y-4">
                <p className="!text-3xl md:!text-4xl !font-bold !text-gray-900 !tracking-tight !leading-none">
                  {currentSlide.title}
                </p>
                <p className="!text-base md:!text-lg !text-gray-500 !leading-relaxed !max-w-md !font-normal">
                  {currentSlide.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Indicators */}
          <div className="!absolute !bottom-10 !left-12 !flex !items-center !gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`!h-1.5 !rounded-full !transition-all !duration-300 ${i === index ? `!w-8 ${currentSlide.color.replace('bg-', 'bg-')}` : "!w-2 !bg-gray-200 hover:!bg-gray-300"
                  }`}
              />
            ))}
          </div>
        </div>

        {/* Right Illustration (Carousel) */}
        <div className="!flex-1 !relative !bg-gray-50 !overflow-hidden !hidden md:!block !border-l !border-gray-100 !order-1 md:!order-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id}
              className="!absolute !inset-0 !w-full !h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Render the appropriate graphic based on slide ID */}
              {currentSlide.id === 1 && <ChatIllustration />}
              {currentSlide.id === 2 && <TaskIllustration />}
              {currentSlide.id === 3 && <SecurityIllustration />}
            </motion.div>
          </AnimatePresence>

          {/* Nav Buttons - Minimalist */}
          <div className="!absolute !bottom-6 !right-6 !flex !gap-2 !z-20">
            <button onClick={prev} className="!p-2.5 !bg-white/80 !border !border-gray-200 hover:!bg-white !rounded-full !text-gray-700 !transition-all active:!scale-95 !backdrop-blur-sm !shadow-sm">
              <ChevronLeft size={18} />
            </button>
            <button onClick={next} className="!p-2.5 !bg-white/80 !border !border-gray-200 hover:!bg-white !rounded-full !text-gray-700 !transition-all active:!scale-95 !backdrop-blur-sm !shadow-sm">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
