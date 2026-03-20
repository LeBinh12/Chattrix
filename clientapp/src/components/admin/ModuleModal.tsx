import { useState, useEffect } from "react";
import { X, FolderTree } from "lucide-react";
import { Input, InputGroup } from "rsuite";
import "rsuite/dist/rsuite.min.css";
import type {
  PermissionModule,
  CreateModuleRequest,
  UpdateModuleRequest,
} from "../../api/admin/moduleAdminApi";

interface ModuleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateModuleRequest | UpdateModuleRequest) => Promise<void>;
  initialData?: PermissionModule | null;
}

export default function ModuleModal({
  open,
  onClose,
  onSubmit,
  initialData,
}: ModuleModalProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    code: "",
    name: "",
  });
  const [touched, setTouched] = useState({
    code: false,
    name: false,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || "",
        name: initialData.name || "",
        description: initialData.description || "",
      });
    } else {
      setFormData({
        code: "",
        name: "",
        description: "",
      });
    }
    setErrors({ code: "", name: "" });
    setTouched({ code: false, name: false });
  }, [initialData, open]);

  const validateCode = (value: string) => {
    if (!value.trim()) {
      return "Mã module không được để trống!";
    }
    const codeRegex = /^[a-z0-9_]+$/;
    if (!codeRegex.test(value)) {
      return "Chỉ chứa chữ thường, số và gạch dưới (_)";
    }
    return "";
  };

  const validateName = (value: string) => {
    if (!value.trim()) {
      return "Tên module không được để trống!";
    }
    return "";
  };

  const handleCodeChange = (value: string) => {
    const lowerValue = value.toLowerCase();
    setFormData({ ...formData, code: lowerValue });
    if (touched.code) {
      setErrors({ ...errors, code: validateCode(lowerValue) });
    }
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    if (touched.name) {
      setErrors({ ...errors, name: validateName(value) });
    }
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    let error = "";
    switch (field) {
      case "code":
        error = validateCode(formData.code);
        break;
      case "name":
        error = validateName(formData.name);
        break;
    }
    setErrors({ ...errors, [field]: error });
  };

  const validateForm = () => {
    const allTouched = { code: true, name: true };
    setTouched(allTouched);

    const newErrors = {
      code: validateCode(formData.code),
      name: validateName(formData.name),
    };

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((error) => error !== "");

    if (hasErrors) {
      if (newErrors.code) alert(newErrors.code);
      else if (newErrors.name) alert(newErrors.name);
    }

    return !hasErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ code: "", name: "", description: "" });
    setErrors({ code: "", name: "" });
    setTouched({ code: false, name: false });
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <style>
        {`
          /* Unified input height & spacing for RSuite components */
          .rs-input {
            height: 38px !important;
            font-size: 14px !important;
          }
          
          /* Consistent border color on focus */
          .rs-input:focus,
          .rs-input-group.rs-input-group-focus {
            border-color: #00568c !important;
            box-shadow: 0 0 0 1px #00568c !important;
            outline: none !important;
          }

          /* Error state */
          .rs-input.rs-input-error,
          .rs-input-group.rs-input-error {
            border-color: #ef4444 !important;
          }
          
          .rs-input-group-addon {
             background-color: #f9fafb;
             border-color: #e5e7eb;
          }
        `}
      </style>
      <div
        className="fixed inset-0 bg-black/50 z-[9999]"
        onClick={handleClose}
      />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] bg-white rounded-sm shadow-xl z-[10000] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <p className="text-2xl font-semibold text-gray-900">
            {initialData ? "Chỉnh sửa module" : "Tạo module mới"}
          </p>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={22} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="p-6 overflow-y-auto flex-1 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã module <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <InputGroup className={touched.code && errors.code ? "rs-input-error" : ""}>
                   <InputGroup.Addon>
                     <FolderTree size={16} />
                   </InputGroup.Addon>
                   <Input
                      value={formData.code}
                      onChange={handleCodeChange}
                      onBlur={() => handleBlur("code")}
                      placeholder="user_management"
                      disabled={!!initialData || isSubmitting}
                      className="font-mono"
                   />
                </InputGroup>
              </div>
              <div className="min-h-[20px] mt-1">
                {touched.code && errors.code ? (
                  <p className="text-xs text-red-500">{errors.code}</p>
                ) : (
                  <p className="text-xs text-gray-500">
                    {initialData
                      ? "Mã không thể thay đổi"
                      : "Chữ thường, số và gạch dưới (_)"}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên module <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                 <InputGroup className={touched.name && errors.name ? "rs-input-error" : ""}>
                   <InputGroup.Addon>
                     <FolderTree size={16} />
                   </InputGroup.Addon>
                   <Input
                      value={formData.name}
                      onChange={handleNameChange}
                      onBlur={() => handleBlur("name")}
                      placeholder="Quản lý người dùng"
                      disabled={isSubmitting}
                   />
                </InputGroup>
              </div>
              <div className="min-h-[20px] mt-1">
                {touched.name && errors.name && (
                  <p className="text-xs text-red-500">{errors.name}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <Input
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(value) =>
                  setFormData({ ...formData, description: value })
                }
                placeholder="Mô tả về module..."
                disabled={isSubmitting}
                className="w-full min-h-[80px]"
              />
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 border border-gray-300 rounded-sm text-gray-700 hover:bg-gray-100 transition text-sm font-medium"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#00568c] text-white rounded-sm hover:bg-[#004470] transition text-sm font-medium disabled:opacity-50"
              style={{ color: '#fff' }}
            >
              {isSubmitting
                ? "Đang xử lý..."
                : initialData
                ? "Cập nhật"
                : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
