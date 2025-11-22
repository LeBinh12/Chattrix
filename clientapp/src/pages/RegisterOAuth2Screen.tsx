import AuthInput from "../components/auth/AuthInput";
import AuthButton from "../components/auth/AuthButton";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { useRecoilState } from "recoil";
import { userAtom } from "../recoil/atoms/userAtom";
import { useAuth } from "../hooks/useAuth";
import { userApi } from "../api/userApi";

export default function CompleteProfileScreen() {
  const [user, setUser] = useRecoilState(userAtom);
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("other");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const { saveToken } = useAuth();

  const navigation = useNavigate();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const validateStep1 = () => {
    if (!displayName.trim()) {
      toast.error("Tên hiển thị không được để trống!");
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
  console.log("user", user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) return;

    const formData = new FormData();
    formData.append("display_name", displayName);
    formData.append("phone", phone);
    formData.append("birthday", birthday);
    formData.append("gender", gender);
    if (avatar) {
      formData.append("avatar", avatar);
    }

    try {
      console.log("Data:", formData);
      const res = await authApi.regissterOAuth(formData, user?.data.id || "");
      saveToken(res.data);

      try {
        const user = await userApi.getProfile(); // Gọi API lấy thông tin người dùng
        setUser(user);
      } catch {
        console.warn("Không thể lấy profile sau đăng nhập");
      }

      toast.success(res.message || "Hoàn thiện hồ sơ thành công!");
      navigation("/home"); // hoặc trang chủ của bạn
    } catch (err) {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(error.response?.data?.message || "Hoàn thiện hồ sơ thất bại");
      console.log(error.response?.data || error.message);
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
          Hoàn Thiện Hồ Sơ
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-white/80 text-sm"
        >
          Cung cấp thêm thông tin để hoàn tất tài khoản
        </motion.p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <motion.div
          className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all duration-300 ${
            step >= 1
              ? "bg-white text-brand-700 shadow-lg"
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
              ? "bg-white text-brand-700 shadow-lg"
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
                label="Tên hiển thị"
                type="text"
                placeholder="Nguyễn Văn A"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
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
                        className="w-4 h-4 text-brand-600 focus:ring-brand-600 cursor-pointer"
                      />
                      <span className="text-gray-700 group-hover:text-brand-700 font-medium transition-colors">
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
                    className="w-full bg-white/80 backdrop-blur-sm text-brand-700 py-2 px-4 rounded-lg hover:bg-white shadow-md transition font-semibold"
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
                  <AuthButton type="submit">Hoàn Thành</AuthButton>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
