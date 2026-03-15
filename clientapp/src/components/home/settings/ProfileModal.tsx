import React, { useState, useRef, useEffect } from "react";
import { X, User, Mail, Calendar, Phone, Edit3, Camera, Save, Loader2 } from "lucide-react";
import { useRecoilState } from "recoil";
import { userAtom } from "../../../recoil/atoms/userAtom";
import UserAvatar from "../../UserAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { userApi } from "../../../api/userApi";
import { toast } from "react-toastify";

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const [user, setUser] = useRecoilState(userAtom);
    const userData = user?.data;

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
    const [phoneError, setPhoneError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        display_name: "",
        phone: "",
        birthday: "",
        gender: "",
        avatarFile: null as File | null
    });

    useEffect(() => {
        if (userData && isOpen) {
            setForm({
                display_name: userData.display_name || "",
                phone: userData.phone || "",
                // Convert ISO date (if exists) to YYYY-MM-DD for input type="date"
                birthday: userData.birthday ? new Date(userData.birthday).toISOString().split('T')[0] : "",
                gender: userData.gender || "male",
                avatarFile: null
            });
            setPreviewAvatar(null);
            setIsEditing(false);
        }
        // Cleanup object URLs when component unmounts or modal closes
        return () => {
            if (previewAvatar) {
                URL.revokeObjectURL(previewAvatar);
            }
        };
    }, [userData, isOpen]);

    if (!isOpen || !userData) return null;

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setForm(prev => ({ ...prev, avatarFile: file }));
            const objectUrl = URL.createObjectURL(file);
            setPreviewAvatar(objectUrl);
            // Reset input value để có thể chọn file cùng tên lần sau
            e.target.value = "";
        }
    };

    // Validate phone on change
    const handlePhoneChange = (value: string) => {
        setForm({ ...form, phone: value });
        // Real-time validation
        if (!value) {
            setPhoneError("");
        } else {
            const phoneRegex = /^\d{10}$/;
            if (!phoneRegex.test(value.replace(/\s/g, ""))) {
                setPhoneError("Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 chữ số.");
            } else {
                setPhoneError("");
            }
        }
    };

    const handleSave = async () => {
        // Check for phone validation error
        if (phoneError) {
            toast.error(phoneError);
            return;
        }
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("display_name", form.display_name);
            formData.append("phone", form.phone);
            formData.append("birthday", form.birthday);
            formData.append("gender", form.gender);
            if (form.avatarFile) {
                formData.append("avatar", form.avatarFile);
            }

            const res = await userApi.updateProfile(formData);
            if (res.status === 200) {
                // Update global user state
                setUser(prev => prev ? { ...prev, data: res.data } : null);
                setIsEditing(false);
                toast.success("Cập nhật hồ sơ thành công!");
                if (form.avatarFile) {
                    // Update preview if saved, although global state update should handle it
                    // The component will re-render with new Avatar URL from backend response
                }
            } else {
                toast.error("Có lỗi xảy ra: " + res.message);
            }
        } catch (error) {
            console.error("Update profile error", error);
            toast.error("Không thể cập nhật hồ sơ");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="!fixed !inset-0 !bg-black/40 !z-[1000]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !w-full !max-w-md !rounded-3xl !shadow-2xl !z-[1001] !overflow-visible !bg-transparent"
                    >
                        {/* Header with rounded bottom */}
                        <div className="!h-40 !bg-gradient-to-br !from-sky-600 !via-blue-700 !to-cyan-800 !relative" style={{ borderBottomLeftRadius: '60px', borderBottomRightRadius: '60px' }}>
                            {/* Decorative circles */}
                            <div className="!absolute !top-0 !right-0 !w-32 !h-32 !bg-white/10 !rounded-full !-translate-y-1/2 !translate-x-1/2 !blur-2xl"></div>
                            <div className="!absolute !bottom-0 !left-0 !w-24 !h-24 !bg-black/10 !rounded-full !translate-y-1/2 !-translate-x-1/2 !blur-xl"></div>

                            <button
                                onClick={onClose}
                                className="!absolute !top-4 !right-4 !p-1.5 !bg-white/20 hover:!bg-white/30 !rounded-full !text-white !transition !backdrop-blur-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* White body overlapping header */}
                        <div className="!bg-white !relative !-mt-20 !pt-6 !px-6 !pb-6" style={{ borderTopLeftRadius: '56px', borderTopRightRadius: '56px' }}>
                            {/* Avatar positioned absolutely over both header and body - cuts through middle */}
                            <div className="!absolute !-top-12 !left-6 !p-1 !bg-white !rounded-full !shadow-xl !z-20">
                                {isEditing ? (
                                    <>
                                        <div className="!w-32 !h-32 !rounded-full !overflow-hidden !border-4 !border-white !shadow-md !relative">
                                            {previewAvatar ? (
                                                <img src={previewAvatar} alt="Preview" className="!w-full !h-full !object-cover" />
                                            ) : (
                                                <UserAvatar
                                                    avatar={userData.avatar}
                                                    display_name={userData.display_name}
                                                    size={128}
                                                />
                                            )}
                                            <div
                                                className="!absolute !inset-0 !bg-black/40 !flex !items-center !justify-center !cursor-pointer !transition-opacity !text-white"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Camera size={32} />
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleAvatarChange}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </>
                                ) : (
                                    <UserAvatar
                                        avatar={userData.avatar}
                                        display_name={userData.display_name}
                                        size={128}
                                    />
                                )}
                            </div>

                            {/* User Info - flexbox layout beside avatar, centered vertically */}
                            <div className="!flex !items-center !gap-6 !mb-6">
                                <div className="!w-32 !flex-shrink-0"></div>
                                <div className="!flex-1">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={form.display_name}
                                            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                                            className="!text-2xl !font-bold !text-gray-900 !border-b !border-gray-300 focus:!border-[#00568c] focus:!outline-none !w-full !bg-transparent !p-0"
                                            placeholder="Tên hiển thị"
                                        />
                                    ) : (
                                        <p className="!text-2xl !font-bold !text-gray-900">{userData.display_name}</p>
                                    )}
                                    <p className="!text-gray-500 !text-sm !mt-0.5">@{userData.username}</p>
                                </div>
                            </div>

                            {/* Details List */}
                            <div className="!mt-6 !space-y-4">
                                {/* Email (Read-only) */}
                                <div className="!flex !items-center !gap-3 !text-gray-700">
                                    <div className="!w-8 !flex !justify-center"><Mail size={18} className="!text-gray-400" /></div>
                                    <div className="!flex-1 !border-b !border-gray-100 !pb-2">
                                        <p className="!text-sm !text-gray-900">{userData.email}</p>
                                        <p className="!text-sm !text-gray-400">Email (Không thể thay đổi)</p>
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="!flex !items-center !gap-3 !text-gray-700">
                                    <div className="!w-8 !flex !justify-center"><Phone size={18} className="!text-gray-400" /></div>
                                    <div className="!flex-1 !border-b !border-gray-100 !pb-2">
                                        {isEditing ? (
                                            <div>
                                                <input
                                                    type="text"
                                                    value={form.phone}
                                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                                    className={`!text-sm !text-gray-900 !w-full focus:!outline-none !bg-transparent !border-b !pb-1 transition-colors ${
                                                        phoneError
                                                            ? "!border-red-300 !text-red-600"
                                                            : "!border-gray-300 focus:!border-[#00568c]"
                                                    }`}
                                                    placeholder="Nhập số điện thoại"
                                                />
                                                {phoneError && (
                                                    <p className="!text-xs !text-red-500 !mt-1">{phoneError}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="!text-sm !text-gray-900">{userData.phone || "Chưa cập nhật"}</p>
                                        )}
                                        <p className="!text-sm !text-gray-400">Điện thoại</p>
                                    </div>
                                </div>

                                {/* Birthday */}
                                <div className="!flex !items-center !gap-3 !text-gray-700">
                                    <div className="!w-8 !flex !justify-center"><Calendar size={18} className="!text-gray-400" /></div>
                                    <div className="!flex-1 !border-b !border-gray-100 !pb-2">
                                        {isEditing ? (
                                            <input
                                                type="date"
                                                value={form.birthday}
                                                onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                                                className="!text-sm !text-gray-900 !w-full focus:!outline-none !bg-transparent"
                                            />
                                        ) : (
                                            <p className="!text-sm !text-gray-900">
                                                {userData.birthday ? (() => {
                                                    const d = new Date(userData.birthday);
                                                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                                })() : "Chưa cập nhật"}
                                            </p>
                                        )}
                                        <p className="!text-sm !text-gray-400">Ngày sinh</p>
                                    </div>
                                </div>

                                {/* Gender */}
                                <div className="!flex !items-center !gap-3 !text-gray-700">
                                    <div className="!w-8 !flex !justify-center"><User size={18} className="!text-gray-400" /></div>
                                    <div className="!flex-1 !border-b !border-gray-100 !pb-2">
                                        {isEditing ? (
                                            <select
                                                value={form.gender}
                                                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                                className="!text-sm !text-gray-900 !w-full focus:!outline-none !bg-transparent !appearance-none"
                                            >
                                                <option value="male">Nam</option>
                                                <option value="female">Nữ</option>
                                                <option value="other">Khác</option>
                                            </select>
                                        ) : (
                                            <p className="!text-sm !text-gray-900">
                                                {userData.gender === "male" ? "Nam" : userData.gender === "female" ? "Nữ" : "Khác"}
                                            </p>
                                        )}
                                        <p className="!text-sm !text-gray-400">Giới tính</p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="!mt-6 !pt-4 !border-t !border-gray-100 !flex !gap-2">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    setPreviewAvatar(null);
                                                    setForm({
                                                        display_name: userData.display_name || "",
                                                        phone: userData.phone || "",
                                                        birthday: userData.birthday ? new Date(userData.birthday).toISOString().split('T')[0] : "",
                                                        gender: userData.gender || "male",
                                                        avatarFile: null
                                                    });
                                                }}
                                                className="!flex-1 !px-4 !py-2 !text-sm !font-semibold !text-gray-700 !bg-gray-100 hover:!bg-gray-200 !rounded-lg !transition"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={isLoading || !!phoneError}
                                                 className="!flex-1 !px-4 !py-2 !text-sm !font-semibold !text-white !bg-[#00568c] hover:!bg-[#004d7d] !rounded-lg !transition !flex !items-center !justify-center !gap-2 disabled:!opacity-50 disabled:!cursor-not-allowed"
                                            >
                                                {isLoading ? <Loader2 size={16} className="!animate-spin" /> : <Save size={16} />}
                                                Lưu thay đổi
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                             className="!w-full !px-4 !py-2.5 !text-sm !font-semibold !text-white !bg-[#00568c] hover:!bg-[#004d7d] !rounded-lg !transition !flex !items-center !justify-center !gap-2"
                                        >
                                            <Edit3 size={18} />
                                            Chỉnh sửa hồ sơ
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
