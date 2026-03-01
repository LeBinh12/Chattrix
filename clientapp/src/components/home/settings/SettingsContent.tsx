import React, { useState, useEffect, useRef } from "react";
import { Globe, Bell, Shield, Lock, ChevronRight, User, Mail, Phone, Calendar, Camera, Save, Loader2 } from "lucide-react";
import { useRecoilState } from "recoil";
import { userAtom } from "../../../recoil/atoms/userAtom";
import UserAvatar from "../../UserAvatar";
import { userApi } from "../../../api/userApi";
import { toast } from "react-toastify";
import { BUTTON_HOVER } from "../../../utils/className";

interface SettingsContentProps {
    activeTab: string;
    onOpenChangePassword: () => void;
}

export default function SettingsContent({ activeTab, onOpenChangePassword }: SettingsContentProps) {
    const [user, setUser] = useRecoilState(userAtom);
    const userData = user?.data;

    const [language, setLanguage] = useState(
        () => localStorage.getItem("language") || "vi"
    );
    const [notifications, setNotifications] = useState(
        () => localStorage.getItem("notifications") !== "false"
    );
    const [activeStatus, setActiveStatus] = useState(
        () => localStorage.getItem("activeStatus") !== "false"
    );

    // Profile state
    const [showProfile, setShowProfile] = useState(false);
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
        if (userData) {
            setForm({
                display_name: userData.display_name || "",
                phone: userData.phone || "",
                birthday: userData.birthday ? new Date(userData.birthday).toISOString().split('T')[0] : "",
                gender: userData.gender || "male",
                avatarFile: null
            });
        }
        // Cleanup object URLs when profile section closes or component unmounts
        return () => {
            if (previewAvatar) {
                URL.revokeObjectURL(previewAvatar);
            }
        };
    }, [userData, showProfile]);

    useEffect(() => {
        localStorage.setItem("language", language);
    }, [language]);

    useEffect(() => {
        localStorage.setItem("notifications", String(notifications));
    }, [notifications]);

    useEffect(() => {
        localStorage.setItem("activeStatus", String(activeStatus));
    }, [activeStatus]);

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

    const handleSaveProfile = async () => {
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
                setUser((prev: any) => prev ? { ...prev, data: res.data } : null);
                setIsEditing(false);
                setPreviewAvatar(null);
                toast.success("Cập nhật hồ sơ thành công!");
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

    console.log("previewAvatar", previewAvatar);

    if (activeTab === "general") {
        return (
            <div className="!space-y-4">
                {/* Profile Section */}
                <div className="!pt-1">
                    <button
                        onClick={() => setShowProfile(!showProfile)}
                        className={`!w-full !flex !items-center !justify-between !group !p-1.5 !-mx-1.5 !rounded-xl !transition-all !relative !z-10 active:!bg-gray-50 ${BUTTON_HOVER}`}
                    >
                        <div className="!flex !gap-3">
                            <div className="!relative !group/avatar">
                                {previewAvatar && isEditing && showProfile ? (
                                    <div className="!w-10 !h-10 !rounded-full !overflow-hidden !border-2 !border-white/20 !flex !items-center !justify-center">
                                        <img src={previewAvatar} alt="Preview" className="!w-full !h-full !object-cover" />
                                    </div>
                                ) : (
                                    <UserAvatar
                                        avatar={userData?.avatar}
                                        display_name={userData?.display_name || ""}
                                        size={40}
                                    />
                                )}
                                {isEditing && showProfile && (
                                    <div 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fileInputRef.current?.click();
                                        }}
                                        className="!absolute !inset-0 !bg-black/40 !rounded-full !flex !items-center !justify-center !text-white !opacity-100 !transition-opacity"
                                    >
                                        <Camera size={16} />
                                    </div>
                                )}
                            </div>
                            <div className="!text-left">
                                <p className="!text-[14px] !font-bold !text-gray-900 !tracking-tight">
                                    {userData?.display_name}
                                </p>
                                <p className="!text-[11px] !font-medium !text-gray-400">
                                    Thông tin cá nhân & Tài khoản
                                </p>
                            </div>
                        </div>
                        <ChevronRight size={14} className={`!text-gray-300 !transition-transform !duration-200 ${showProfile ? "!rotate-90 !text-[#be8b43]" : ""}`} />
                    </button>

                    {showProfile && (
                        <div className="!mt-4 !px-1.5 !space-y-4 !border-l-2 !border-[#be8b43]/10 !ml-5 !pl-4">
                            {/* Display Name */}
                            <div className="!space-y-1">
                                <label className="!text-xs !font-bold !text-gray-400 !uppercase !tracking-wider !flex !items-center !gap-2">
                                    <User size={12} /> Tên hiển thị
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={form.display_name}
                                        onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                                        className="!w-full !text-sm !font-semibold !text-gray-900 !bg-gray-50/50 !px-2 !py-1.5 !rounded-md !border !border-gray-100 focus:!outline-none focus:!ring-1 focus:!ring-[#be8b43] focus:!bg-white"
                                    />
                                ) : (
                                    <p className="!text-sm !font-semibold !text-gray-800">{userData?.display_name}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="!space-y-1">
                                <label className="!text-xs !font-bold !text-gray-400 !uppercase !tracking-wider !flex !items-center !gap-2">
                                    <Mail size={12} /> Email
                                </label>
                                <p className="!text-sm !font-semibold !text-gray-500">{userData?.email}</p>
                            </div>

                            {/* Phone */}
                            <div className="!space-y-1">
                                <label className="!text-xs !font-bold !text-gray-400 !uppercase !tracking-wider !flex !items-center !gap-2">
                                    <Phone size={12} /> Số điện thoại
                                </label>
                                {isEditing ? (
                                    <div>
                                        <input
                                            type="text"
                                            value={form.phone}
                                            onChange={(e) => handlePhoneChange(e.target.value)}
                                            className={`!w-full !text-sm !font-semibold !text-gray-900 !bg-gray-50/50 !px-2 !py-1.5 !rounded-md !border focus:!outline-none focus:!ring-1 focus:!bg-white ${
                                                phoneError
                                                    ? "!border-red-300 focus:!ring-red-500"
                                                    : "!border-gray-100 focus:!ring-[#be8b43]"
                                            }`}
                                            placeholder="Chưa cập nhật"
                                        />
                                        {phoneError && <p className="!text-xs !text-red-500 !mt-1">{phoneError}</p>}
                                    </div>
                                ) : (
                                    <p className="!text-sm !font-semibold !text-gray-800">{userData?.phone || "Chưa cập nhật"}</p>
                                )}
                            </div>

                            {/* Birthday */}
                            <div className="!space-y-1">
                                <label className="!text-xs !font-bold !text-gray-400 !uppercase !tracking-wider !flex !items-center !gap-2">
                                    <Calendar size={12} /> Ngày sinh
                                </label>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        value={form.birthday}
                                        onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                                        className="!w-full !text-sm !font-semibold !text-gray-900 !bg-gray-50/50 !px-2 !py-1.5 !rounded-md !border !border-gray-100 focus:!outline-none focus:!ring-1 focus:!ring-[#be8b43] focus:!bg-white"
                                    />
                                ) : (
                                    <p className="!text-sm !font-semibold !text-gray-800">
                                        {userData?.birthday ? (() => {
                                            const d = new Date(userData.birthday);
                                            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                        })() : "Chưa cập nhật"}
                                    </p>
                                )}
                            </div>

                            {/* Gender */}
                            <div className="!space-y-1">
                                <label className="!text-xs !font-bold !text-gray-400 !uppercase !tracking-wider !flex !items-center !gap-2">
                                    <User size={12} /> Giới tính
                                </label>
                                {isEditing ? (
                                    <div className="!flex !gap-4 !pt-1">
                                        <label className="!flex !items-center !gap-2 !cursor-pointer !group/radio">
                                            <input
                                                type="radio"
                                                name="gender"
                                                value="male"
                                                checked={form.gender === "male"}
                                                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                                className="!w-3.5 !h-3.5 !text-[#be8b43] focus:!ring-[#be8b43] !border-gray-300"
                                            />
                                            <span className="!text-sm !font-medium !text-gray-700 group-hover/radio:!text-[#be8b43] !transition-colors">Nam</span>
                                        </label>
                                        <label className="!flex !items-center !gap-2 !cursor-pointer !group/radio">
                                            <input
                                                type="radio"
                                                name="gender"
                                                value="female"
                                                checked={form.gender === "female"}
                                                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                                className="!w-3.5 !h-3.5 !text-[#be8b43] focus:!ring-[#be8b43] !border-gray-300"
                                            />
                                            <span className="!text-sm !font-medium !text-gray-700 group-hover/radio:!text-[#be8b43] !transition-colors">Nữ</span>
                                        </label>
                                    </div>
                                ) : (
                                    <p className="!text-sm !font-semibold !text-gray-800">
                                        {userData?.gender === "male" ? "Nam" : userData?.gender === "female" ? "Nữ" : "Khác"}
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="!pt-2 !flex !gap-2">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                setPreviewAvatar(null);
                                            }}
                                            className="!px-3 !py-1.5 !text-[12px] !font-bold !text-gray-500 !border !border-gray-100 !rounded-lg hover:!bg-gray-50 !transition-colors"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={isLoading || !!phoneError}
                                            className="!px-4 !py-1.5 !text-[12px] !font-bold !text-white !bg-[#be8b43] !rounded-lg !shadow-sm hover:!opacity-90 !transition-all !flex !items-center !gap-1.5 disabled:!opacity-50 disabled:!cursor-not-allowed"
                                        >
                                            {isLoading ? <Loader2 size={14} className="!animate-spin" /> : <Save size={14} />}
                                            Lưu thay đổi
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="!px-4 !py-1.5 !text-[12px] !font-bold !text-[#be8b43] !bg-[#fcf8f4] !border !border-[#f5ede4] !rounded-lg !transition-all"
                                    >
                                        Chỉnh sửa hồ sơ
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                />

            </div>
        );
    }

    if (activeTab === "privacy") {
        return (
            <div className="!space-y-2">
                <div className="!pt-4 !border-t !border-gray-50">
                    <button 
                        onClick={onOpenChangePassword}
                        className={`!w-full !flex !items-center !justify-between !group !p-1.5 !-mx-1.5 !rounded-xl !transition-all !relative !z-10 active:!bg-gray-50 ${BUTTON_HOVER}`}
                    >
                        <div className="!flex !gap-3">
                            <div className="!p-2 !bg-[#fcf8f4] !rounded-xl !h-fit group-hover:!bg-[#f5ede4] !transition-colors">
                                <Lock size={18} className="!text-[#be8b43]" />
                            </div>
                            <div className="!text-left">
                                <p className="!text-[13px] !font-bold !text-gray-900 !tracking-tight">
                                    Bảo mật tài khoản
                                </p>
                                <p className="!text-[10px] !font-medium !text-gray-400">
                                    Thay đổi mật khẩu định kỳ
                                </p>
                            </div>
                        </div>
                        <ChevronRight size={14} className="!text-gray-300 group-hover:!text-[#be8b43] !transition-colors" />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}