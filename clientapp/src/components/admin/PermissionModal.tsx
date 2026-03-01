import { useState, useEffect } from "react";
import { X, Lock, FolderTree } from "lucide-react";
import { SelectPicker, Input, InputGroup } from "rsuite";
import "rsuite/dist/rsuite.min.css";
import { toast } from "react-toastify";
import type {
  Permission,
  CreatePermissionRequest,
  UpdatePermissionRequest,
} from "../../types/admin/role";
import {
  moduleAdminApi,
  type PermissionModule,
} from "../../api/admin/moduleAdminApi";

interface PermissionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: CreatePermissionRequest | UpdatePermissionRequest
  ) => Promise<void>;
  initialData?: Permission | null;
}

export default function PermissionModal({
  open,
  onClose,
  onSubmit,
  initialData,
}: PermissionModalProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    module_id: "",
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
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || "",
        name: initialData.name || "",
        description: initialData.description || "",
        module_id: initialData.module_id || "",
      });
    } else {
      setFormData({
        code: "",
        name: "",
        description: "",
        module_id: "",
      });
    }
    setErrors({ code: "", name: "" });
    setTouched({ code: false, name: false });
  }, [initialData, open]);

  // Load modules when modal opens
  useEffect(() => {
    if (open) {
      loadModules();
    }
  }, [open]);

  const loadModules = async () => {
    setIsLoadingModules(true);
    try {
      const modulesData = await moduleAdminApi.getAll();
      setModules(modulesData);
    } catch (error) {
      console.error("Error loading modules:", error);
    } finally {
      setIsLoadingModules(false);
    }
  };

  // Validation functions
  const validateCode = (value: string) => {
    if (!value.trim()) {
      return "Mã quyền không được để trống!";
    }
    const codeRegex = /^[a-z]+(\:[a-z_]+)*$/;
    if (!codeRegex.test(value)) {
      return "Chỉ chứa chữ thường, gạch dưới (_), và dấu hai chấm (:) theo dạng: user:create_demo";
    }
    return "";
  };

  const validateName = (value: string) => {
    if (!value.trim()) {
      return "Tên quyền không được để trống!";
    }
    return "";
  };

  // Handle field changes
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

  // Handle field blur
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
      const errorMessage = newErrors.code || newErrors.name;
      toast.error(errorMessage);
      return false;
    }

    return true;
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
    setFormData({ code: "", name: "", description: "", module_id: "" });
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

          /* Fix z-index for dropdown menu on desktop */
          .rs-picker-select-menu, .rs-picker-menu, .rs-picker-popup {
            z-index: 20000 !important;
          }
          /* Fix z-index for drawer on mobile */
          .rs-drawer-wrapper {
            z-index: 20000 !important;
          }
          
          /* Add padding for icon in SelectPicker if we keep custom icon */
          .custom-select-picker .rs-picker-toggle {
            padding-left: 36px !important;
          }
        `}
      </style>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9999]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div 
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] bg-white rounded-sm shadow-xl z-[10000] flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#f0f4f8] border-b border-[#e5e7eb] flex items-center justify-between rounded-t-sm">
          <p className="text-2xl font-semibold text-[#374151]">
            {initialData ? "Chỉnh sửa quyền hạn" : "Tạo quyền hạn mới"}
          </p>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* Form Content */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1"
        >
          <div className="p-6 overflow-y-visible flex-1 space-y-3">
            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã quyền <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <InputGroup className={touched.code && errors.code ? "rs-input-error" : ""}>
                   <InputGroup.Addon>
                     <Lock size={16} />
                   </InputGroup.Addon>
                   <Input
                      value={formData.code}
                      onChange={handleCodeChange}
                      onBlur={() => handleBlur("code")}
                      placeholder="user:create"
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
                      : "Định dạng: module:action_name (chữ thường, gạch dưới, dấu hai chấm)"}
                  </p>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên quyền <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <InputGroup className={touched.name && errors.name ? "rs-input-error" : ""}>
                   <InputGroup.Addon>
                     <Lock size={16} />
                   </InputGroup.Addon>
                   <Input
                      value={formData.name}
                      onChange={handleNameChange}
                      onBlur={() => handleBlur("name")}
                      placeholder="Tạo người dùng"
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

            {/* Permission Module */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nhóm quyền
              </label>
              <div className="relative">
                <SelectPicker
                  data={[
                    { label: "-- Không chọn nhóm --", value: "" },
                    ...modules.map((m) => ({ label: m.name, value: m.id })),
                  ]}
                  value={formData.module_id}
                  onChange={(value) =>
                    setFormData({ ...formData, module_id: value || "" })
                  }
                  disabled={isLoadingModules}
                  block
                  placeholder="Chọn nhóm quyền"
                  searchable={false}
                  cleanable={false}
                  menuAutoWidth={false}
                  placement="bottomStart"
                  className="w-full custom-select-picker"
                  style={{ width: '100%' }}
                  renderValue={(value) => {
                    const selectedModule = modules.find(m => m.id === value);
                    return (
                      <span className="text-[#374151]">
                         {selectedModule ? selectedModule.name : "-- Không chọn nhóm --"}
                      </span>
                    );
                  }}
                />
                <FolderTree
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none"
                />
              </div>
              <div className="min-h-[20px] mt-1">
                <p className="text-xs text-gray-500">
                  Chọn nhóm để phân loại quyền hạn
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <Input
                as="textarea"
                rows={4}
                value={formData.description}
                onChange={(value) =>
                  setFormData({ ...formData, description: value })
                }
                placeholder="Mô tả quyền hạn..."
                disabled={isSubmitting}
                className="w-full min-h-[100px]"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 transition"
              disabled={isSubmitting}
            >
              Hủy
            </button>
             <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-medium text-white bg-[#00568c] rounded-lg hover:bg-[#004470] transition disabled:opacity-50 disabled:cursor-not-allowed"
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
