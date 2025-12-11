import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <main className="h-screen w-full flex overflow-hidden bg-gray-50">
      {/* Left Side - Banner Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <img 
          src="src/assets/banner-1.jpg" 
          alt="Chattrix Banner"
          className="w-full h-full object-cover"
        />
        
        {/* Optional: Overlay để tạo hiệu ứng đẹp hơn */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-purple-600/10 to-transparent" />
        
        {/* Logo trên ảnh */}
        <div className="absolute top-8 left-8 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-xl">
              <span className="text-2xl font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                C
              </span>
            </div>
            <span className="text-3xl font-bold text-white drop-shadow-2xl">
              Chattrix
            </span>
          </div>
        </div>

        {/* Optional: Thêm text mô tả */}
        <div className="absolute bottom-12 left-8 right-8 z-10">
          <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
            Kết nối mọi lúc, mọi nơi
          </h2>
          <p className="text-white/90 text-lg drop-shadow-md">
            Trò chuyện với bạn bè, gia đình và cộng đồng của bạn
          </p>
        </div>
      </div>

      {/* Right Side - Form Area */}
      <div className="w-full lg:w-1/2 flex flex-col relative bg-white">
        {/* Mobile Logo - Chỉ hiện trên màn hình nhỏ */}
        <div className="lg:hidden absolute top-6 left-6 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold text-white">C</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Chattrix
            </span>
          </div>
        </div>

        {/* Form Content - Căn giữa */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-16 xl:px-24">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>

        {/* Footer */}
        <div className="py-6 text-center text-sm text-gray-500">
          © 2024 Chattrix. All rights reserved.
        </div>
      </div>
    </main>
  );
}
