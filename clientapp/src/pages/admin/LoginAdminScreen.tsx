import { useEffect, useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function LoginAdminScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  // Kiểm tra nếu đã login trước đó
  useEffect(() => {
    const isAdmin = localStorage.getItem("admin_auth");
    if (isAdmin === "1") {
      navigate("/admin");
    }
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Hardcode admin/admin
    setTimeout(() => {
      if (username === "admin" && password === "admin") {
        localStorage.setItem("admin_auth", "1");
        toast.success("Đăng nhập thành công!");
        navigate("/admin");
      } else {
        toast.error("Sai tài khoản hoặc mật khẩu!");
      }
      setLoading(false);
    }, 500); // Delay giả lập xử lý
  };

  return (
    <>
      <div className="min-h-screen flex items-stretch font-sans">
        {/* Left Side - Image & Welcome */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-600">
          {/* Background Image với overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1496917756835-298936fd265c?q=80&w=2070&auto=format&fit=crop')`,
            }}
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center items-start p-12 text-white">
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Chào mừng trở lại!
            </h1>
            <p className="text-xl mb-8 max-w-lg opacity-90">
              Đăng nhập để tiếp tục trải nghiệm dịch vụ tuyệt vời của chúng tôi.
            </p>
            <div className="flex space-x-8 mt-12">
              <div className="text-center">
                <div className="text-4xl font-bold">10K+</div>
                <div className="text-sm opacity-80 mt-1">
                  Người dùng hoạt động
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold">99.9%</div>
                <div className="text-sm opacity-80 mt-1">Độ ổn định</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold">24/7</div>
                <div className="text-sm opacity-80 mt-1">Hỗ trợ</div>
              </div>
            </div>
          </div>

          {/* Decorative waves */}
          <svg
            className="absolute bottom-0 left-0 w-full"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path
              fill="rgba(255,255,255,0.1)"
              d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center bg-gray-50 px-6 py-12 lg:px-16">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-2xl font-bold mb-4">
                L
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Đăng nhập</h2>
              <p className="mt-2 text-gray-600">Nhập thông tin để tiếp tục</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    type="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Ghi nhớ đăng nhập
                  </span>
                </label>
                <a
                  href="#"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Quên mật khẩu?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Đăng nhập
              </button>
            </form>
          </div>
        </div>

        {/* Mobile: Background overlay khi nhỏ màn hình */}
        <div className="lg:hidden fixed inset-0 -z-10 bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-600 opacity-80"></div>
      </div>
    </>
  );
}
