
import React, { useState, useRef } from "react";
import { X, User, Mail, Phone, Lock, Eye, EyeOff, Upload, Image, Camera, RotateCw, ZoomIn, ZoomOut, Check, ArrowLeft } from "lucide-react";
import { DatePicker, SelectPicker, Input, InputGroup } from "rsuite";
import "rsuite/dist/rsuite.min.css";
import { useEmailValidation } from "../../hooks/useEmailValidation";

interface RegisterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}


const parseLocalDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  
  return new Date(year, month - 1, day);
};


const dateToLocalString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function RegisterForm({ isOpen, onClose, onSubmit }: RegisterFormProps) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [changePassword, setChangePassword] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Use email validation hook
  const { validate: validateEmailWithHook } = useEmailValidation();

  const [showPassword, setShowPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // Crop states
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string>("");
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Error states
  const [errors, setErrors] = useState({
    username: "",
    displayName: "",
    email: "",
    phone: "",
    password: "",
    changePassword: "",
    birthday: "",
    gender: ""
  });

  // Warning states for suggestions (non-blocking)
  const [emailWarning, setEmailWarning] = useState("");

  // Touched states (để chỉ hiện lỗi sau khi user tương tác)
  const [touched, setTouched] = useState({
    username: false,
    displayName: false,
    email: false,
    phone: false,
    password: false,
    changePassword: false,
    birthday: false,
    gender: false
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Vui lòng chọn file ảnh!");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Kích thước file không được vượt quá 5MB!");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        setTempImageSrc(reader.result as string);
        setRotation(0);
        setZoom(1);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
    // Reset input value
    e.target.value = "";
  };

  const handleCropSave = () => {
    if (!imageRef.current) return;

    try {
      const img = imageRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // Use natural image dimensions (original file size)
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;

      // Calculate dimensions based on rotation
      const angle = (rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(angle));
      const cos = Math.abs(Math.cos(angle));

      const rotatedWidth = naturalW * cos + naturalH * sin;
      const rotatedHeight = naturalW * sin + naturalH * cos;

      // Set canvas size for rotation
      canvas.width = rotatedWidth;
      canvas.height = rotatedHeight;

      // Apply rotation
      ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
      ctx.rotate(angle);
      ctx.drawImage(img, -naturalW / 2, -naturalH / 2);

      // Create final square crop (center crop)
      const size = Math.min(rotatedWidth, rotatedHeight);
      const cropCanvas = document.createElement("canvas");
      const cropCtx = cropCanvas.getContext("2d");

      if (!cropCtx) return;

      cropCanvas.width = 400;
      cropCanvas.height = 400;

      const sx = (rotatedWidth - size) / 2;
      const sy = (rotatedHeight - size) / 2;

      cropCtx.drawImage(canvas, sx, sy, size, size, 0, 0, 400, 400);

      cropCanvas.toBlob(
        (blob: Blob | null) => {
          if (blob) {
            const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
            setAvatar(file);
            setAvatarPreview(cropCanvas.toDataURL());
            setShowCropModal(false);
            setTempImageSrc("");
            setRotation(0);
          }
        },
        "image/jpeg",
        0.95
      );
    } catch (error) {
      console.error("Error cropping image:", error);
      alert("Lỗi khi cắt ảnh. Vui lòng thử lại!");
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setTempImageSrc("");
    setRotation(0);
    setZoom(1);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  };

  // Validation functions
  const validateUsername = (value: string) => {
    if (!value.trim()) return "Tên đăng nhập không được để trống!";
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(value)) return "Chỉ chữ, số, dấu chấm (.) và gạch dưới (_)";
    if (value.length < 3) return "Tên đăng nhập phải có ít nhất 3 ký tự!";
    return "";
  };

  const validateDisplayName = (value: string) => {
    if (!value.trim()) return "Tên hiển thị không được để trống!";
    return "";
  };

  const validateEmail = (value: string) => {
    if (!value.trim()) return "Email không được để trống!";
    
    const result = validateEmailWithHook(value);
    
    // Only block if basic format is invalid (missing @ or invalid structure)
    if (!result.isValid && !result.hasTypo) {
      setEmailWarning(""); // Clear warning
      return result.message || "Email không đúng định dạng!";
    }
    
    // Set warning for typo but don't block submit
    if (result.hasTypo && result.message) {
      setEmailWarning(result.message);
    } else {
      setEmailWarning("");
    }
    
    return ""; // Don't block submit
  };

  const validatePhone = (value: string) => {
    if (!value.trim()) return "Số điện thoại không được để trống!";
    const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
    if (!phoneRegex.test(value)) return "Số điện thoại không hợp lệ!";
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) return "Mật khẩu không được để trống!";
    if (value.length < 6) return "Mật khẩu tối thiểu 6 ký tự!";
    return "";
  };

  const validateChangePassword = (value: string) => {
    if (!value) return "Vui lòng nhập lại mật khẩu!";
    if (value !== password) return "Mật khẩu nhập lại không khớp!";
    return "";
  };

  const validateBirthday = (value: string) => {
    if (!value) return "Vui lòng chọn ngày sinh!";
    const birthDate = new Date(value);
    const today = new Date();
    if (birthDate >= today) return "Ngày sinh không hợp lệ!";
    return "";
  };

  const validateGender = (value: string) => {
    if (!value) return "Vui lòng chọn giới tính!";
    return "";
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    
    let error = "";
    switch (field) {
      case "username": error = validateUsername(username); break;
      case "displayName": error = validateDisplayName(displayName); break;
      case "email": error = validateEmail(email); break;
      case "phone": error = validatePhone(phone); break;
      case "password": error = validatePassword(password); break;
      case "changePassword": error = validateChangePassword(changePassword); break;
      case "birthday": error = validateBirthday(birthday); break;
      case "gender": error = validateGender(gender); break;
    }
    setErrors({ ...errors, [field]: error });
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (touched.username) setErrors({ ...errors, username: validateUsername(value) });
  };

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (touched.displayName) setErrors({ ...errors, displayName: validateDisplayName(value) });
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      const error = validateEmail(value);
      setErrors({ ...errors, email: error });
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (touched.phone) setErrors({ ...errors, phone: validatePhone(value) });
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) setErrors({ ...errors, password: validatePassword(value) });
    if (touched.changePassword) setErrors({ ...errors, changePassword: value !== changePassword ? "Mật khẩu nhập lại không khớp!" : "" });
  };

  const handleChangePasswordChange = (value: string) => {
    setChangePassword(value);
    if (touched.changePassword) setErrors({ ...errors, changePassword: validateChangePassword(value) });
  };

  const handleBirthdayChange = (value: string) => {
    setBirthday(value);
    if (touched.birthday) setErrors({ ...errors, birthday: validateBirthday(value) });
  };

  const validateForm = () => {
    setTouched({
      username: true,
      displayName: true,
      email: true,
      phone: true,
      password: true,
      changePassword: true,
      birthday: true,
      gender: true
    });

    const newErrors = {
      username: validateUsername(username),
      displayName: validateDisplayName(displayName),
      email: validateEmail(email),
      phone: validatePhone(phone),
      password: validatePassword(password),
      changePassword: validateChangePassword(changePassword),
      birthday: validateBirthday(birthday),
      gender: validateGender(gender)
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== "");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setUsername("");
    setDisplayName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setChangePassword("");
    setBirthday("");
    setGender("");
    setDescription("");
    setAvatar(null);
    setAvatarPreview(null);
    setEmailWarning(""); // Clear warning
    setErrors({
      username: "",
      displayName: "",
      email: "",
      phone: "",
      password: "",
      changePassword: "",
      birthday: "",
      gender: ""
    });
    setTouched({
      username: false,
      displayName: false,
      email: false,
      phone: false,
      password: false,
      changePassword: false,
      birthday: false,
      gender: false
    });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("display_name", displayName);
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("password", password);
      formData.append("birthday", birthday);
      formData.append("gender", gender);
      if (description) formData.append("description", description);
      if (avatar) formData.append("avatar", avatar);
      // Không gửi role - backend sẽ tự động gán role USER mặc định

      await onSubmit(formData);
      
      // Only close modal if onSubmit succeeds (no error thrown)
      handleClose();
    } catch (error) {
      // Error is thrown from parent - don't close modal
      // Toast is already shown in parent handler
      console.error("Error creating user:", error);
      // Don't call handleClose() - keep modal open for user to fix errors
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const maxDescriptionLength = 200;

  return (
    <>
      {/* Minimal RSuite styling - only essential overrides */}
      <style>{`
        /* Popup positioning */
        .rs-picker-date-menu,
        .rs-picker-select-menu,
        .rs-picker-menu,
        .rs-picker-popup,
        .rs-picker-check-menu {
          z-index: 10005;
        }

        /* Unified input height & spacing for RSuite components */
        .rs-input,
        .rs-picker-toggle {
          height: 38px;
          font-size: 14px;
        }

        /* Consistent border color on focus */
        .rs-input:focus,
        .rs-picker-toggle:focus {
          border-color: #00568c;
          box-shadow: 0 0 0 1px #00568c;
        }

        /* Error state */
        .rs-input.rs-input-error,
        .rs-picker-toggle.rs-input-error {
          border-color: #ef4444;
        }
 

      `}</style>
      
      <div className="fixed inset-0 bg-black/50 z-[9999]" onClick={handleClose} />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[820px] bg-white rounded-lg shadow-xl z-[10000] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <p className="text-xl font-semibold text-gray-800">Tạo tài khoản mới</p>
          <button onClick={handleClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 transition disabled:opacity-50">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 md:gap-y-5">
                {/* Left Column */}
                <div className="space-y-3 md:space-y-5">
                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên đăng nhập <span className="text-red-500">*</span></label>
                    <InputGroup>
                      <InputGroup.Addon><User size={16} /></InputGroup.Addon>
                      <Input
                        value={username}
                        onChange={(value) => handleUsernameChange(value)}
                        onBlur={() => handleBlur("username")}
                        placeholder="username123"
                        disabled={isSubmitting}
                      />
                    </InputGroup>
                    {touched.username && errors.username && (
                      <p className="text-xs text-red-500 mt-1">{errors.username}</p>
                    )}
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên hiển thị <span className="text-red-500">*</span></label>
                    <InputGroup>
                      <InputGroup.Addon><User size={16} /></InputGroup.Addon>
                      <Input
                        value={displayName}
                        onChange={(value) => handleDisplayNameChange(value)}
                        onBlur={() => handleBlur("displayName")}
                        placeholder="Nguyễn Văn A"
                        disabled={isSubmitting}
                      />
                    </InputGroup>
                    {touched.displayName && errors.displayName && (
                      <p className="text-xs text-red-500 mt-1">{errors.displayName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                    <InputGroup>
                      <InputGroup.Addon><Mail size={16} /></InputGroup.Addon>
                      <Input
                        type="email"
                        value={email}
                        onChange={(value) => handleEmailChange(value)}
                        onBlur={() => handleBlur("email")}
                        placeholder="example@email.com"
                        disabled={isSubmitting}
                      />
                    </InputGroup>
                    {touched.email && errors.email && (
                      <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                    )}
                    {!errors.email && emailWarning && (
                      <p className="text-xs text-red-500 mt-1">{emailWarning}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu <span className="text-red-500">*</span></label>
                    <InputGroup>
                      <InputGroup.Addon><Lock size={16} /></InputGroup.Addon>
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(value) => handlePasswordChange(value)}
                        onBlur={() => handleBlur("password")}
                        placeholder="••••••••"
                        disabled={isSubmitting}
                      />
                      <InputGroup.Button onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </InputGroup.Button>
                    </InputGroup>
                    {touched.password && errors.password && (
                      <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nhập lại mật khẩu <span className="text-red-500">*</span></label>
                    <InputGroup>
                      <InputGroup.Addon><Lock size={16} /></InputGroup.Addon>
                      <Input
                        type={showChangePassword ? "text" : "password"}
                        value={changePassword}
                        onChange={(value) => handleChangePasswordChange(value)}
                        onBlur={() => handleBlur("changePassword")}
                        placeholder="••••••••"
                        disabled={isSubmitting}
                      />
                      <InputGroup.Button onClick={() => setShowChangePassword(!showChangePassword)}>
                        {showChangePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </InputGroup.Button>
                    </InputGroup>
                    {touched.changePassword && errors.changePassword && (
                      <p className="text-xs text-red-500 mt-1">{errors.changePassword}</p>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3 md:space-y-5">
                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính <span className="text-red-500">*</span></label>
                    <SelectPicker
                      data={[
                        { label: "Nam", value: "male" },
                        { label: "Nữ", value: "female" },
                        { label: "Khác", value: "other" },
                      ]}
                      value={gender}
                      onChange={(value) => {
                        setGender(value || "");
                        if (touched.gender) setErrors({ ...errors, gender: validateGender(String(value || "")) });
                      }}
                      onBlur={() => handleBlur("gender")}
                      disabled={isSubmitting}
                      block
                      placement="bottomStart"
                      placeholder="Chọn giới tính"
                      searchable={false}
                      cleanable={false}
                      menuAutoWidth={false}
                      className="w-full"
                    />
                    {touched.gender && errors.gender && (
                      <p className="text-xs text-red-500 mt-1">{errors.gender}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại <span className="text-red-500">*</span></label>
                    <InputGroup>
                      <InputGroup.Addon><Phone size={16} /></InputGroup.Addon>
                      <Input
                        value={phone}
                        onChange={(value) => handlePhoneChange(value)}
                        onBlur={() => handleBlur("phone")}
                        placeholder="0912345678"
                        disabled={isSubmitting}
                      />
                    </InputGroup>
                    {touched.phone && errors.phone && (
                      <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                    )}
                  </div>

                  {/* Birthday */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày sinh <span className="text-red-500">*</span></label>
                    <DatePicker
                      value={parseLocalDate(birthday)}
                      onChange={(date) => {
                        handleBirthdayChange(date ? dateToLocalString(date) : "");
                      }}
                      onBlur={() => handleBlur("birthday")}
                      format="dd/MM/yyyy"
                      block
                      placement="bottomStart"
                      placeholder="Chọn ngày sinh"
                      disabled={isSubmitting}
                      className="w-full"
                    />
                    {touched.birthday && errors.birthday && (
                      <p className="text-xs text-red-500 mt-1">{errors.birthday}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                      <span className="text-xs text-gray-500">{description.length} / {maxDescriptionLength}</span>
                    </div>
                    <Input
                      as="textarea"
                      rows={5}
                      value={description}
                      onChange={(value) => value.length <= maxDescriptionLength && setDescription(value)}
                      placeholder="Nhập mô tả (tùy chọn)"
                      disabled={isSubmitting}
                      className="w-full min-h-[120px]"
                    />
                  </div>

                  {/* Avatar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh đại diện</label>
                    <div className="flex items-center gap-4">
                      {avatarPreview ? (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 group cursor-pointer hover:border-[#966e3d] transition-all flex-shrink-0 p-0 bg-transparent border-0 outline-none"
                          style={{ width: '80px', height: '80px', borderRadius: '50%', padding: 0, border: '2px solid #e5e7eb' }}
                          title="Click để thay đổi ảnh"
                        >
                          <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover rounded-full" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center rounded-full">
                            <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="relative flex items-center justify-center group cursor-pointer transition-all flex-shrink-0"
                          style={{ width: '80px', height: '80px', borderRadius: '50%', padding: 0, backgroundColor: '#f3f4f6', border: '2px dashed #d1d5db' }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00568c'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                          title="Click để chọn ảnh"
                        >
                          <Image size={24} className="text-gray-400" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center rounded-full">
                            <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      )}
                      <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 text-sm text-gray-600 transition">
                        <Upload size={16} />
                        <span>Chọn ảnh</span>
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleAvatarChange} 
                          disabled={isSubmitting} 
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={handleClose} disabled={isSubmitting} className="px-6 py-2.5 rounded-md bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 font-medium transition disabled:opacity-50">Hủy</button>
              <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-md bg-[#00568c] text-white text-sm hover:bg-[#004470] font-medium shadow-sm transition disabled:opacity-50 flex items-center gap-2" style={{ color: '#fff' }}>
                {isSubmitting && <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />}
                Tạo tài khoản
              </button>
            </div>
          </form>
        </div>
      </div>
      {/* Image Preview Modal */}
      {showImagePreview && avatarPreview && (
        <>
          <div
            className="fixed inset-0 bg-black/80 z-[10001]"
            onClick={() => setShowImagePreview(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[10002] max-w-3xl max-h-[90vh] w-full p-4">
            <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Xem ảnh đại diện
                </h3>
                <button
                  onClick={() => setShowImagePreview(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex items-center justify-center bg-gray-100">
                <img
                  src={avatarPreview}
                  alt="Avatar full preview"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Crop Modal - Smaller Centered */}
      {showCropModal && tempImageSrc && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 z-[10003]"
            onClick={handleCropCancel}
          />

          {/* Modal */}
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[10004] w-full max-w-md bg-white rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCropCancel}
                  className="text-gray-600 hover:text-gray-800 transition flex items-center gap-2"
                  title="Quay lại"
                >
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-lg font-semibold text-gray-800">
                  Cắt và xoay ảnh
                </h3>
              </div>
            </div>

            {/* Crop Area */}
            <div className="relative bg-gray-50 p-4">
              <div className="relative w-full max-w-[320px] aspect-square bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center mx-auto">
                {/* Image */}
                <img
                  ref={imageRef}
                  src={tempImageSrc}
                  alt="Crop preview"
                  style={{
                    width: "auto",
                    height: "auto",
                    maxWidth: `${zoom * 100}%`,
                    maxHeight: `${zoom * 100}%`,
                    transform: `rotate(${rotation}deg)`,
                    transition: "transform 0.3s ease",
                    display: "block",
                    objectFit: "contain",
                  }}
                />

                {/* Circular Crop Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <svg className="w-full h-full">
                    <defs>
                      <mask id="cropMask">
                        <rect width="100%" height="100%" fill="white" />
                        <circle cx="50%" cy="50%" r="45%" fill="black" />
                      </mask>
                    </defs>
                    <rect
                      width="100%"
                      height="100%"
                      fill="rgba(0,0,0,0.5)"
                      mask="url(#cropMask)"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="45%"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="px-5 py-4 border-t border-gray-200 bg-white">
              {/* Zoom & Rotate Controls */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <button
                  onClick={handleZoomOut}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-700"
                  title="Thu nhỏ"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-sm text-gray-600 min-w-[55px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-700"
                  title="Phóng to"
                >
                  <ZoomIn size={16} />
                </button>
                <div className="w-px h-7 bg-gray-300 mx-1"></div>
                <button
                  onClick={handleRotate}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-700"
                  title="Xoay 90°"
                >
                  <RotateCw size={16} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCropCancel}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCropSave}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition flex items-center gap-1.5 text-sm font-medium"
                >
                  <Check size={16} />
                  Lưu ảnh
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}