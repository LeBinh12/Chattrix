import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <main className="h-screen w-full relative overflow-hidden bg-gradient-to-br from-[#2665b1] to-blue-400">
      <img
        src="/assets/logo.png"
        alt="Chattrix Logo"
        className="
    absolute top-3 left-3
    w-14 h-14
    sm:w-16 sm:h-16
    md:w-20 md:h-20
    lg:w-24 lg:h-24
    object-contain drop-shadow-lg
  "
      />

      {/* Nội dung */}
      <div className="relative flex flex-col items-center justify-center h-full px-4">
        {/* Tiêu đề Chattrix */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 sm:mb-8 tracking-wide drop-shadow-lg text-center">
          Chattrix
        </h1>

        {/* Form / nội dung */}
        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
