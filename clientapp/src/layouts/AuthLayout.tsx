import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <main className="h-screen w-full flex overflow-hidden bg-gray-50">
      {/* LEFT SIDE - BLUE THEME */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        {/* Logo */}
        <div className="absolute top-8 left-8 z-10">
          <img
            src="/src/assets/Logo-Dai-hoc-Dong-Thap.png"
            alt="Logo"
            className="h-12 w-auto object-contain"
          />
        </div>
        
        {/* Background Image */}
        <img
          src="/src/assets/banner-login.png"
          alt="Banner Login"
          className="w-full h-full object-cover"
        />
      </div>

      {/* RIGHT SIDE - BLUE THEME (FORM) */}
      <div
        className="w-full lg:w-[40%] flex flex-col relative overflow-hidden
        bg-gradient-to-br from-[#00568c]/10 via-white to-[#00568c]/5"
      >
        {/* Blob nền */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#00568c]/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#00568c]/10 rounded-full blur-[120px]"></div>

        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-20 sm:top-28 left-1/2 -translate-x-1/2 z-10">
          <img
            src="/src/assets/Logo-Dai-hoc-Dong-Thap.png"
            alt="Logo"
            className="h-24 sm:h-32 w-auto object-contain"
          />
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12 xl:px-20 pt-24 sm:pt-32 relative z-10">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>

        {/* Footer */}
        <div className="py-10 text-center text-lg font-semibold text-[#00568c] relative z-10">
          © {new Date().getFullYear()}, Đại Học Đông Tháp
        </div>
      </div>
    </main>
  );
}
