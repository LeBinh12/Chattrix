import React, { useState, useEffect, useRef } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  Upload,
  Camera,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  ArrowLeft,
} from "lucide-react";
import { CheckPicker, DatePicker, SelectPicker } from "rsuite";
import "rsuite/dist/rsuite.min.css";
import { useRecoilValue } from "recoil";
import { userAtom } from "../../../recoil/atoms/userAtom";
import type { UserAdmin } from "../../../types/admin/user";
import { API_ENDPOINTS } from "../../../config/api";
import { useEmailValidation } from "../../../hooks/useEmailValidation";
import { roleAdminApi } from "../../../api/admin/roleAdminApi";
import type { Role } from "../../../types/admin/role";
import defaultProfileImg from "../../../assets/default-profile.jpg";

interface UpdateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAdmin | null;
  onSubmit: (userId: string, formData: FormData) => Promise<void>;
}

export default function UpdateUserModal({
  isOpen,
  onClose,
  user,
  onSubmit,
}: UpdateUserModalProps) {
  // Get current logged-in user from Recoil
  const currentUserResponse = useRecoilValue(userAtom);
  const currentUser = currentUserResponse?.data;

  // Use email validation hook
  const { validate: validateEmailWithHook } = useEmailValidation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string>("");
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  
  // Role-related states
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    display_name: "",
    birthday: "",
    gender: "other",
    type: "normal",
    description: "",
    role_ids: [] as string[], // Thay đổi từ role_id sang role_ids (array)
  });

  const [errors, setErrors] = useState({
    username: "",
    email: "",
    phone: "",
    display_name: "",
    birthday: "",
    gender: "",
  });

  // Warning states for suggestions (non-blocking)
  const [emailWarning, setEmailWarning] = useState("");

  const [touched, setTouched] = useState({
    username: false,
    email: false,
    phone: false,
    display_name: false,
    birthday: false,
    gender: false,
  });

  // Fetch roles when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  // Fetch roles list
  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const response = await roleAdminApi.getListForUpdate();
      setRoles(response.data.items);
    } catch (error) {
      console.error("Error fetching roles:", error);
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Helper: Check if current user is System Admin
  // Check directly from currentUser.roles without depending on roles state
  const isCurrentUserSystemAdmin = (): boolean => {
    if (!currentUser?.roles || currentUser.roles.length === 0) return false;
    
    const rolesData = currentUser.roles;
    
    // Case 1: roles is array of objects (RoleInfo with code/name fields)
    if (typeof rolesData[0] === "object") {
      return (rolesData as any[]).some((role: any) => 
        role.code === "system_admin" || role.name === "System Admin"
      );
    }
    
    // Case 2: roles is array of strings (role names or IDs)
    // Check if any matches system admin keywords
    return (rolesData as string[]).some((role: string) => 
      role === "System Admin" || 
      role === "system_admin" || 
      role.toLowerCase().includes("system") && role.toLowerCase().includes("admin")
    );
  };

  // Helper: Filter roles based on current user permission
  const getFilteredRoles = (): Role[] => {
    if (!currentUser) return roles;
    
    // If current user is system admin, show all roles
    if (isCurrentUserSystemAdmin()) {
      return roles;
    }
    
    // Otherwise, hide "system_admin" role
    return roles.filter(role => role.code !== "system_admin");
  };

  // Helper: Check if editing self
  const isEditingSelf = (): boolean => {
    return currentUser?.id === user?.id;
  };

  useEffect(() => {
    if (user && isOpen) {
      console.log(" [DEBUG] User data:", user);
      
      // Handle roles - extract role IDs from user.roles array
      let userRoleIds: string[] = [];
      if (user.roles && user.roles.length > 0) {
        userRoleIds = user.roles.map((role: any) => {
          if (typeof role === "string") return role;
          return role.id || role._id || "";
        }).filter(Boolean);
      }
      
      setFormData({
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        display_name: user.display_name || "",
        birthday: user.birthday ? user.birthday.split("T")[0] : "",
        gender: user.gender || "other",
        type: "normal",
        description: user.description || "",
        role_ids: userRoleIds, // Array of role IDs
      });

      if (user.avatar && user.avatar.trim() && user.avatar !== "null" && user.avatar !== "undefined" && user.avatar !== "https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin") {
        setAvatarPreview(`${API_ENDPOINTS.UPLOAD_MEDIA}/${user.avatar}`);
      } else {
        setAvatarPreview(defaultProfileImg);
      }
      setAvatarFile(null);
      setErrors({
        username: "",
        email: "",
        phone: "",
        display_name: "",
        birthday: "",
        gender: "",
      });
      setEmailWarning(""); // Clear warning
      setTouched({
        username: false,
        email: false,
        phone: false,
        display_name: false,
        birthday: false,
        gender: false,
      });
    }
  }, [user, isOpen]);

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
    if (!value.trim()) {
      setEmailWarning(""); 
      return "Email không được để trống!";
    }
    
    const result = validateEmailWithHook(value);
    
  
    if (!result.isValid && !result.hasTypo) {
      setEmailWarning(""); 
      return result.message || "Email không đúng định dạng!";
    }
    
    
    if (result.hasTypo && result.message) {
      setEmailWarning(result.message);
    } else {
      setEmailWarning("");
    }
    
    return ""; 
  };

  const validatePhone = (value: string) => {
    if (!value.trim()) {
      return "Số điện thoại không được để trống!";
    }
    const phoneRegex = /^(0|\+84)[0-9]{9}$/;
    if (!phoneRegex.test(value)) {
      return "Số điện thoại không hợp lệ (VD: 0912345678)";
    }
    return "";
  };

  const validateBirthday = (value: string) => {
    if (!value) {
      return "Ngày sinh không được để trống!";
    }
    const birthDate = new Date(value);
    const today = new Date();
    if (birthDate >= today) {
      return "Ngày sinh không hợp lệ!";
    }
    return "";
  };

  const validateGender = (value: string) => {
    if (!value) return "Vui lòng chọn giới tính!";
    return "";
  };

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (touched[field as keyof typeof touched]) {
      let error = "";
      switch (field) {
        case "username":
          error = validateUsername(value);
          break;
        case "display_name":
          error = validateDisplayName(value);
          break;
        case "email":
          error = validateEmail(value);
          break;
        case "phone":
          error = validatePhone(value);
          break;
        case "birthday":
          error = validateBirthday(value);
          break;
        case "gender":
          error = validateGender(value);
          break;
      }
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleFieldBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    let error = "";
    switch (field) {
      case "username":
        error = validateUsername(formData.username);
        break;
      case "display_name":
        error = validateDisplayName(formData.display_name);
        break;
      case "email":
        error = validateEmail(formData.email);
        break;
      case "phone":
        error = validatePhone(formData.phone);
        break;
      case "birthday":
        error = validateBirthday(formData.birthday);
        break;
      case "gender":
        error = validateGender(formData.gender);
        break;
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

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
            setAvatarFile(file);
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
      alert("Ão khi cắt ảnh. Vui lòng thử lại!");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      username: true,
      email: true,
      phone: true,
      display_name: true,
      birthday: true,
      gender: true,
    });

    const usernameError = validateUsername(formData.username);
    const displayNameError = validateDisplayName(formData.display_name);
    const emailError = validateEmail(formData.email);
    const phoneError = validatePhone(formData.phone);
    const birthdayError = validateBirthday(formData.birthday);
    const genderError = validateGender(formData.gender);

    setErrors({
      username: usernameError,
      display_name: displayNameError,
      email: emailError,
      phone: phoneError,
      birthday: birthdayError,
      gender: genderError,
    });

    // Only require username, display_name, email, phone, birthday, gender - role_ids is optional
    if (usernameError || displayNameError || emailError || phoneError || birthdayError || genderError) {
      return;
    }

    if (!user) return;

    setIsSubmitting(true);

    try {
      const submitFormData = new FormData();

      if (formData.username !== user.username) {
        submitFormData.append("username", formData.username);
      }
      if (formData.email !== user.email) {
        submitFormData.append("email", formData.email);
      }
      if (formData.phone !== user.phone) {
        submitFormData.append("phone", formData.phone);
      }
      if (formData.display_name !== user.display_name) {
        submitFormData.append("display_name", formData.display_name);
      }
      if (
        formData.birthday &&
        formData.birthday !== user.birthday?.split("T")[0]
      ) {
        submitFormData.append("birthday", formData.birthday);
      }
      if (formData.gender !== user.gender) {
        submitFormData.append("gender", formData.gender);
      }
      if (formData.type) {
        submitFormData.append("type", formData.type);
      }
      if (formData.description) {
        submitFormData.append("description", formData.description);
      }
      
      // Append roles (multiple) - check if changed
      if (formData.role_ids.length > 0) {
        // Get current role IDs from user
        let currentRoleIds: string[] = [];
        if (user.roles && user.roles.length > 0) {
          currentRoleIds = user.roles.map((role: any) => {
            if (typeof role === "string") return role;
            return role.id || role._id || "";
          }).filter(Boolean);
        }
        
        // Check if roles changed (compare sorted arrays)
        const rolesChanged = 
          formData.role_ids.length !== currentRoleIds.length ||
          !formData.role_ids.every((id) => 
            currentRoleIds.includes(id)
          );
        
        if (rolesChanged) {
          // Append each role ID
          formData.role_ids.forEach(roleId => {
            submitFormData.append("roles", roleId);
          });
        }
      }
      
      if (avatarFile) {
        submitFormData.append("avatar", avatarFile);
      }

      await onSubmit(user.id, submitFormData);
      handleClose();
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!user || !isOpen) return null;

  const maxDescriptionLength = 200;
  const descriptionLength = formData.description.length;

  return (
    <>
      {/* Minimal RSuite overrides consistent with RegisterForm */}
      <style>{`
        /* Popup positioning */
        .rs-picker-date-menu, 
        .rs-picker-select-menu, 
        .rs-picker-menu, 
        .rs-picker-popup,
        .rs-picker-check-menu {
          z-index: 20000 !important;
        }
        
        /* Drawer z-index fix */
        .rs-drawer-wrapper {
          z-index: 20000 !important;
        }

        /* Unified input height & spacing for RSuite components */
        .rs-input,
        .rs-picker-toggle {
          height: 38px !important;
          font-size: 14px !important;
        }

        /* Consistent border color on focus */
        .rs-input:focus,
        .rs-picker-toggle:focus,
        .rs-picker-toggle.rs-btn-focus {
          border-color: #00568c !important;
          box-shadow: 0 0 0 1px #00568c !important;
          outline: none !important;
        }

        /* Error state */
        .rs-input.rs-input-error,
        .rs-picker-toggle.rs-input-error {
          border-color: #ef4444 !important;
        }
        
        /* Content inside Pickers alignment */
        .rs-picker-toggle.rs-btn {
          display: flex !important;
          align-items: center !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        
        /* Tag styling for CheckPicker - keeping to match neutral theme */
        .rs-picker-tag {
          background-color: #f3f4f6 !important; 
          color: #374151 !important; 
          border-radius: 4px !important;
          height: 24px !important;
          line-height: 24px !important;
          margin: 2px 4px 2px 0 !important;
        }
      `}</style>

      {/* Edit Modal - Hidden when crop modal is open */}
      {!showCropModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[820px] bg-white rounded-lg shadow-xl z-[10000] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <p className="text-xl font-semibold text-gray-800">
                Cập nhật người dùng
              </p>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Form Content */}
              <form
                onSubmit={handleSubmit}
                className="flex flex-col flex-1 overflow-hidden"
              >
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 md:gap-y-5">
                    {/* Left Column */}
                    <div className="space-y-3 md:space-y-5">
                      {/* Username */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tên đăng nhập <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="text"
                            value={formData.username}
                            onChange={(e) =>
                              handleFieldChange("username", e.target.value)
                            }
                            onBlur={() => handleFieldBlur("username")}
                            placeholder="username123"
                            disabled={isSubmitting}
                            className={`w-full pl-10 pr-3 h-[38px] border rounded-md focus:outline-none focus:ring-1 text-sm ${
                              touched.username && errors.username
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:border-[#966e3d] focus:ring-[#966e3d]"
                            } disabled:bg-gray-50 disabled:text-gray-500`}
                          />
                        </div>
                        {touched.username && errors.username && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.username}
                          </p>
                        )}
                      </div>

                      {/* Display Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tên hiển thị <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="text"
                            value={formData.display_name}
                            onChange={(e) =>
                              handleFieldChange("display_name", e.target.value)
                            }
                            onBlur={() => handleFieldBlur("display_name")}
                            placeholder="Nguyễn Văn A"
                            disabled={isSubmitting}
                            className={`w-full pl-10 pr-3 h-[38px] border rounded-md focus:outline-none focus:ring-1 text-sm ${
                              touched.display_name && errors.display_name
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:border-[#966e3d] focus:ring-[#966e3d]"
                            } disabled:bg-gray-50 disabled:text-gray-500`}
                          />
                        </div>
                        {touched.display_name && errors.display_name && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.display_name}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              handleFieldChange("email", e.target.value)
                            }
                            onBlur={() => handleFieldBlur("email")}
                            placeholder="example@email.com"
                            disabled={isSubmitting}
                            className={`w-full pl-10 pr-3 h-[38px] border rounded-md focus:outline-none focus:ring-1 text-sm ${
                              touched.email && errors.email
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:border-[#966e3d] focus:ring-[#966e3d]"
                            } disabled:bg-gray-50 disabled:text-gray-500`}
                          />
                        </div>
                        {touched.email && errors.email && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.email}
                          </p>
                        )}
                        {!errors.email && emailWarning && (
                          <p className="text-xs text-red-500 mt-1">
                            {emailWarning}
                          </p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Số điện thoại <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) =>
                              handleFieldChange("phone", e.target.value)
                            }
                            onBlur={() => handleFieldBlur("phone")}
                            placeholder="0912345678"
                            disabled={isSubmitting}
                            className={`w-full pl-10 pr-3 h-[38px] border rounded-md focus:outline-none focus:ring-1 text-sm ${
                              touched.phone && errors.phone
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:border-[#966e3d] focus:ring-[#966e3d]"
                            } disabled:bg-gray-50 disabled:text-gray-500`}
                          />
                        </div>
                      
                          <p className="text-xs text-red-500 mt-1">
                            {errors.phone}
                          </p>
                      
                      </div>

                      {/* Birthday */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ngày sinh <span className="text-red-500">*</span>
                        </label>
                        <div style={{ width: '100%' }}>
                          <DatePicker
                            value={formData.birthday ? new Date(formData.birthday) : null}
                            onChange={(date) => {
                              handleFieldChange("birthday", date ? date.toISOString().split('T')[0] : "");
                            }}
                            onBlur={() => handleFieldBlur("birthday")}
                            format="dd/MM/yyyy"
                            block
                            placement="bottomStart"
                            placeholder="Chọn ngày sinh"
                            disabled={isSubmitting}
                          />
                        </div>
                        {touched.birthday && errors.birthday && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.birthday}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3 md:space-y-5">
                      {/* Gender */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Giới tính <span className="text-red-500">*</span>
                        </label>
                        <div style={{ width: '100%' }}>
                          <SelectPicker
                            data={[
                              { label: "Nam", value: "male" },
                              { label: "Nữ", value: "female" },
                              { label: "Khác", value: "other" },
                            ]}
                            value={formData.gender}
                            onChange={(value) =>
                              handleFieldChange("gender", value || "")
                            }
                            onBlur={() => handleFieldBlur("gender")}
                            disabled={isSubmitting}
                            block
                            placement="bottomStart"
                            searchable={false}
                            cleanable={false}
                            menuAutoWidth={false}
                            locale={{
                              searchPlaceholder: "Tìm kiếm...",
                              noResultsText: "Không tìm thấy",
                            }}
                          />
                        </div>
                        {touched.gender && errors.gender && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.gender}
                          </p>
                        )}
                      </div>
                      {/* Role - Multi-select với CheckPicker - chỉ hiển thị khi KHÔNG edit self */}
                      {!isEditingSelf() && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vai trò
                        </label>
                        {loadingRoles ? (
                          <div className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-500 flex items-center h-[40px]">
                            <span className="inline-block">Đang tải vai trò...</span>
                          </div>
                        ) : (
                          <div style={{ width: '100%' }}>
                          <CheckPicker
                              data={getFilteredRoles().map(role => ({
                                label: role.name,
                                value: role.id,
                              }))}
                              value={formData.role_ids}
                              onChange={(value) => {
                                handleFieldChange("role_ids", value || []);
                              }}
                              renderValue={(values, items) => (
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "nowrap",
                                    overflowX: "auto",
                                    gap: "4px",
                                    maxWidth: "100%",
                                    scrollbarWidth: "none",
                                  }}
                                >
                                  {(items as { label: string; value: string }[]).map((item) => (
                                    <span
                                      key={item.value}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: "2px 8px",
                                        background: "#dbeafe",
                                        color: "#00568c",
                                        borderRadius: "9999px",
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        whiteSpace: "nowrap",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {item.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                              placeholder="Chọn vai trò"
                              searchable={true}
                              disabled={isSubmitting || roles.length === 0}
                              block
                              cleanable={false}
                              menuMaxHeight={280}
                              placement="bottomStart"
                              menuAutoWidth={false}
                              locale={{
                                searchPlaceholder: "Tìm kiếm...",
                                noResultsText: "Không tìm thấy",
                                placeholder: "Chọn vai trò",
                              }}
                            />
                          </div>
                        )}
                       
                      </div>
                      )}

                      {/* Description */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Mô tả
                          </label>
                          <span className="text-xs text-gray-500">
                            {descriptionLength} / {maxDescriptionLength}
                          </span>
                        </div>
                        <textarea
                          value={formData.description}
                          onChange={(e) => {
                            if (e.target.value.length <= maxDescriptionLength) {
                              handleFieldChange("description", e.target.value);
                            }
                          }}
                          placeholder="Nhập mô tả (tùy chọn)"
                          disabled={isSubmitting}
                          rows={3}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-[#00568c] focus:ring-1 focus:ring-[#00568c] resize-none disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>

                      {/* Avatar Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ảnh đại diện
                        </label>
                        <div className="flex items-center gap-4">
                          <div
                            className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-[#00568c] transition-all group"
                            onClick={() => setShowImagePreview(true)}
                            title="Click để xem phóng to"
                          >
                            <img
                              src={avatarPreview || defaultProfileImg}
                              alt="Avatar preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                              <Camera
                                size={20}
                                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            </div>
                          </div>
                          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 text-sm text-gray-600 transition">
                            <Upload size={16} />
                            <span>Đổi ảnh</span>
                            <input
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

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-md bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 font-medium transition cursor-pointer disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-md bg-[#00568c] text-white text-sm hover:bg-[#004470] font-medium shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    style={{ color: '#fff' }}
                  >
                    {isSubmitting && (
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        style={{ color: '#fff' }}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    )}
                    Cập nhật
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Image Preview Modal */}
      {showImagePreview && (
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
                  src={avatarPreview || defaultProfileImg}
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
                  className="px-4 py-2 bg-[#00568c] hover:bg-[#004470] text-white rounded-md transition flex items-center gap-1.5 text-sm font-medium"
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
