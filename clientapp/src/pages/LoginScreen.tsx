import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSetRecoilState } from "recoil";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";

import AuthForm from "../components/auth/AuthForm";
import AuthInput from "../components/auth/AuthInput";
import AuthButton from "../components/auth/AuthButton";

import { authApi } from "../api/authApi";
import { userApi } from "../api/userApi";
import { useAuth } from "../hooks/useAuth";

import { userAtom } from "../recoil/atoms/userAtom";

type LoginResponse = {
  message: string;
  data: string;
};

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [apiError, setApiError] = useState("");

  const navigate = useNavigate();
  const { saveToken } = useAuth();
  const setUser = useSetRecoilState(userAtom);

  // --------------------------
  // Validation
  // --------------------------
  const validateForm = (): boolean => {
    const newErrors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      newErrors.username = "Vui lòng nhập tài khoản";
    }

    if (!password.trim()) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --------------------------
  // Common Success Handler
  // --------------------------
  const handleAfterLoginSuccess = async (res: LoginResponse) => {
    toast.success(res.message);
    saveToken(res.data);

    try {
      const user = await userApi.getProfile();
      setUser(user);
    } catch {
      console.warn("Không thể lấy profile sau đăng nhập");
    }

    navigate("/home");
  };

  // --------------------------
  // Username/Password Login
  // --------------------------
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

    // Clear previous API errors
    setApiError("");
    setIsLoading(true);

    authApi
      .login({ username: username.trim(), password })
      .then(handleAfterLoginSuccess)
      .catch((err) => {
        const message =
          err.response?.data?.message || err.message || "Đăng nhập thất bại";
        
        // Show error message below the button instead of toast
        setApiError(message);
        console.error(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // --------------------------
  // Render
  // --------------------------
  return (
      <AuthForm title="Đăng nhập" onSubmit={handleSubmit}>

        {apiError && (
          <div className="mt-3 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 font-medium">{apiError}</p>
          </div>
        )}
        <AuthInput
          label="Tài Khoản"
          type="text"
          placeholder="Nhập tài khoản..."
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            // Clear error when user starts typing
            if (errors.username) {
              setErrors({ ...errors, username: undefined });
            }
            // Clear API error when user starts typing
            if (apiError) {
              setApiError("");
            }
          }}
          error={errors.username}
        />

   

        <AuthInput
          label="Mật Khẩu"
          type={showPassword ? "text" : "password"}
          placeholder="Nhập mật khẩu..."
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            // Clear error when user starts typing
            if (errors.password) {
              setErrors({ ...errors, password: undefined });
            }
            // Clear API error when user starts typing
            if (apiError) {
              setApiError("");
            }
          }}
          error={errors.password}
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[#00568c] hover:text-[#003d63] focus:outline-none focus:ring-2 focus:ring-[#00568c]/30 rounded p-1 transition-colors"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
        />
        
        <div className="flex items-center justify-between !mt-[-5px]">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="!w-4 !h-4 !rounded !border-gray-300 !text-[#00568c] focus:!ring-[#00568c] !cursor-pointer"
            />
            <span className="text-sm font-medium text-[#00568c]">Ghi nhớ mật khẩu</span>
          </label>
        </div>

        <motion.div 
          whileHover={!isLoading ? { scale: 1.02 } : {}} 
          whileTap={!isLoading ? { scale: 0.98 } : {}}
        >
          <AuthButton type="submit" isLoading={isLoading}>Đăng nhập</AuthButton>
        </motion.div>

        {/* <div className="flex justify-end !mt-3">
          <button
            type="button"
            onClick={() => toast.info("Tính năng đang phát triển!")}
            className="text-sm !font-medium !text-[#a87c44] hover:text-[#72410d] !transition-colors cursor-pointer"
          >
            Quên mật khẩu?
          </button>
        </div> */}
      </AuthForm>
  );
}
