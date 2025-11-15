import AuthInput from "../components/auth/AuthInput";
import AuthButton from "../components/auth/AuthButton";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [changePassword, setChangePassword] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("other");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const navigation = useNavigate();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const validateStep1 = () => {
    if (!username.trim()) {
      toast.error("Tên đăng nhập không được để trống!");
      return false;
    }
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(username)) {
      toast.error(
        "Tên đăng nhập chỉ được chứa chữ, số, dấu chấm (.) và gạch dưới (_)!"
      );
      return false;
    }

    if (!displayName.trim()) {
      toast.error("Tên hiển thị không được để trống!");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Email không hợp lệ!");
      return false;
    }

    const phoneRegex = /^[0-9]{9,12}$/;
    if (!phoneRegex.test(phone)) {
      toast.error("Số điện thoại không hợp lệ! (9-12 số)");
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (!password) {
      toast.error("Mật khẩu không được để trống!");
      return false;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu tối thiểu 6 ký tự!");
      return false;
    }
    if (password !== changePassword) {
      toast.error("Mật khẩu nhập lại không khớp!");
      return false;
    }
    if (!birthday) {
      toast.error("Vui lòng chọn ngày sinh!");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) return;

    const formData = new FormData();
    formData.append("username", username);
    formData.append("display_name", displayName);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("password", password);
    formData.append("birthday", birthday);
    formData.append("gender", gender);
    if (avatar) {
      formData.append("avatar", avatar);
    }

    try {
      console.log("Data:", formData);
      const res = await authApi.register(formData);
      toast.success(res.message);
      navigation("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Đăng ký thất bại");
      console.log(err.response?.data || err.message);
    }
  };

  return (
    <div className="w-full">
      {/* Header với Progress */}
      <div className="text-center mb-6">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Đăng Ký Tài Khoản
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-white/80 text-sm"
        >
          Tạo tài khoản để bắt đầu trải nghiệm
        </motion.p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <motion.div
          className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all duration-300 ${
            step >= 1
              ? "bg-white text-[#2665b1] shadow-lg"
              : "bg-white/30 text-white"
          }`}
          whileHover={{ scale: 1.1 }}
        >
          {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : "1"}
        </motion.div>
        <div
          className={`h-1 w-16 rounded-full transition-all duration-300 ${
            step >= 2 ? "bg-white" : "bg-white/30"
          }`}
        ></div>
        <motion.div
          className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all duration-300 ${
            step >= 2
              ? "bg-white text-[#2665b1] shadow-lg"
              : "bg-white/30 text-white"
          }`}
          whileHover={{ scale: step >= 2 ? 1.1 : 1 }}
        >
          2
        </motion.div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Avatar Upload */}
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  {avatarPreview ? (
                    <div className="relative">
                      <img
                        src={avatarPreview}
                        alt="Avatar Preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg cursor-pointer"
                        onClick={() =>
                          document.getElementById("avatarInput")?.click()
                        }
                      />
                      <div
                        className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                        onClick={() =>
                          document.getElementById("avatarInput")?.click()
                        }
                      >
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="avatarInput"
                      className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/30 transition-all border-4 border-white shadow-lg"
                    >
                      <Upload className="w-8 h-8 text-white" />
                    </label>
                  )}
                  <input
                    id="avatarInput"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
              </div>

              <AuthInput
                label="Tên đăng nhập"
                type="text"
                placeholder="username123"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <AuthInput
                label="Tên hiển thị"
                type="text"
                placeholder="Nguyễn Văn A"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />

              <AuthInput
                label="Email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <AuthInput
                label="Số điện thoại"
                type="tel"
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <AuthButton type="button" onClick={handleNext}>
                  <span className="flex items-center justify-center gap-2">
                    Tiếp theo
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </AuthButton>
              </motion.div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Password */}
              <div className="relative">
                <AuthInput
                  label="Mật khẩu"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-9 right-3 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <AuthInput
                  label="Nhập lại mật khẩu"
                  type={showChangePassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={changePassword}
                  onChange={(e) => setChangePassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  className="absolute top-9 right-3 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showChangePassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              <AuthInput
                label="Ngày sinh"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />

              {/* Gender */}
              <div className="mb-4">
                <label className="block mb-3 text-sm font-medium text-gray-700">
                  Giới tính
                </label>
                <div className="flex gap-6 bg-white/50 backdrop-blur-sm rounded-lg p-3">
                  {[
                    { value: "male", label: "Nam" },
                    { value: "female", label: "Nữ" },
                    { value: "other", label: "Khác" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={option.value}
                        checked={gender === option.value}
                        onChange={() => setGender(option.value)}
                        className="w-4 h-4 text-[#2665b1] focus:ring-[#2665b1] cursor-pointer"
                      />
                      <span className="text-gray-700 group-hover:text-[#2665b1] font-medium transition-colors">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <motion.div
                  className="flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full bg-white/80 backdrop-blur-sm text-[#2665b1] py-2 px-4 rounded-lg hover:bg-white shadow-md transition font-semibold"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <ArrowLeft className="w-5 h-5" />
                      Quay lại
                    </span>
                  </button>
                </motion.div>
                <motion.div
                  className="flex-[2]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <AuthButton type="submit">Đăng Ký</AuthButton>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Login Link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-center text-sm text-white/90"
      >
        Đã có tài khoản?{" "}
        <button
          type="button"
          className="text-white font-semibold hover:underline underline-offset-2 transition-all"
          onClick={() => navigation("/login")}
        >
          Đăng nhập ngay
        </button>
      </motion.div>
    </div>
  );
}
