import React, { useState } from "react";
import { X, Lock, Globe, LogOut, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSetRecoilState } from "recoil";
import { toast } from "react-toastify";
import SettingsContent from "./SettingsContent";
import ConfirmModal from "../../notification/ConfirmModal";
import { socketManager } from "../../../api/socket";
import { userAtom } from "../../../recoil/atoms/userAtom";
import { messageIDAtom, messagesCacheAtom, messagesSearchCacheAtom } from "../../../recoil/atoms/messageAtom";
import { userApi } from "../../../api/userApi";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;

}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState("general");
    const [showConfirm, setShowConfirm] = useState(false);
    const navigate = useNavigate();
    const setUser = useSetRecoilState(userAtom);
    const setMessagesCache = useSetRecoilState(messagesCacheAtom);
    const setMessagesSearchCache = useSetRecoilState(messagesSearchCacheAtom);
    const setMessageID = useSetRecoilState(messageIDAtom);

    // Change Password Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const handleLogout = () => {
        toast.info(`Đăng xuất thành công!`);
        socketManager.disconnect();
        setMessagesCache({});
        setMessagesSearchCache({});
        setMessageID("");
        setUser(null);
        localStorage.removeItem("access_token");
        navigate("/login");
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            toast.error("Mật khẩu xác nhận không khớp");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
            return;
        }

        setIsLoading(true);
        try {
            const response = await userApi.changePassword({
                old_password: oldPassword,
                new_password: newPassword,
            });
            
            if (response.status === 200) {
                if (response.data) {
                    localStorage.setItem("access_token", response.data);
                }
                
                toast.success("Đổi mật khẩu thành công!");
                setShowPasswordModal(false);
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                toast.error(response.message || "Đổi mật khẩu thất bại");
            }
        } catch (error: any) {
            const message = error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại sau";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const tabs = [
        { id: "general", label: "Cài đặt chung", icon: <Globe size={18} /> },
        { id: "privacy", label: "Riêng tư & Bảo mật", icon: <Lock size={18} /> },
    ];

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
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !w-full !max-w-2xl !bg-white !rounded-lg !shadow-xl !z-[1001] !overflow-hidden !flex !h-[500px]"
                    >
                        {/* Sidebar */}
                        <div className="!w-64 !bg-gray-50 !border-r !border-gray-100 !flex !flex-col">
                            <div className="!p-4 !border-b !border-gray-100">
                                <p className="!text-lg !font-bold !text-gray-800">Cài đặt</p>
                            </div>
                            <div className="!flex-1 !p-2 !space-y-1">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`!w-full !text-left !px-4 !py-3 !rounded-lg !flex !items-center !gap-3 !text-sm !font-medium !transition-colors ${activeTab === tab.id ? "!bg-white !text-[#00568c] !shadow-sm" : "!text-gray-600 hover:!bg-gray-100"
                                            }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Logout Button */}
                            <div className="!p-2 !border-t !border-gray-200">
                                <button
                                    onClick={() => setShowConfirm(true)}
                                    className="!w-full !text-left !px-4 !py-3 !rounded-lg !flex !items-center !gap-3 !text-sm !font-medium !transition-colors !text-red-600 hover:!bg-red-50"
                                >
                                    <LogOut size={18} />
                                    Đăng xuất
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="!flex-1 !flex !flex-col">
                            <div className="!p-4 !border-b !border-gray-100 !flex !justify-between !items-center">
                                <p className="!text-base !font-semibold !text-gray-800">
                                    {tabs.find(t => t.id === activeTab)?.label}
                                </p>
                                <button onClick={onClose} className="!text-gray-400 hover:!text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="!flex-1 !p-6 !overflow-y-auto">
                                <SettingsContent 
                                    activeTab={activeTab} 
                                    onOpenChangePassword={() => setShowPasswordModal(true)}
                                />
                            </div>
                        </div>
                    </motion.div>
                    
                    <ConfirmModal
                        isOpen={showConfirm}
                        title="Xác nhận đăng xuất"
                        confirmText="Đăng xuất"
                        cancelText="Hủy"
                        onConfirm={() => {
                            setShowConfirm(false);
                            onClose();
                            handleLogout();
                        }}
                        onCancel={() => setShowConfirm(false)}
                    />

                    {/* Internal Change Password Modal */}
                    <AnimatePresence>
                        {showPasswordModal && (
                            <div className="!fixed !inset-0 !z-[2000] !flex !items-center !justify-center !p-4">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => !isLoading && setShowPasswordModal(false)}
                                    className="!absolute !inset-0 !bg-black/40 !backdrop-blur-sm"
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
                                    className="!relative !w-full !max-w-md !bg-white !rounded-sm !shadow-2xl !overflow-hidden"
                                >
                                    <div className="!p-6 !border-b !border-gray-100 !flex !items-center !justify-between">
                                        <p className="!text-xl !font-bold !text-gray-900">Đổi mật khẩu</p>
                                        <button 
                                            onClick={() => setShowPasswordModal(false)}
                                            className="!p-2 hover:!bg-gray-100 !rounded-full !transition-colors"
                                        >
                                            <X size={20} className="!text-gray-400" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleChangePassword} className="!p-6 !space-y-4 !bg-white">
                                        <div className="!space-y-1.5">
                                            <label className="!text-sm !font-medium !text-gray-700">Mật khẩu cũ</label>
                                            <div className="!relative">
                                                <input
                                                    type={showOldPass ? "text" : "password"}
                                                    required
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                    className="!w-full !px-4 !py-2.5 !bg-gray-50 !text-gray-900 !border !border-gray-100 !rounded-sm focus:!ring-2 focus:!ring-[#00568c] focus:!bg-white !outline-none !transition-all placeholder:!text-gray-400"
                                                    placeholder="Nhập mật khẩu hiện tại"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowOldPass(!showOldPass)}
                                                    className="!absolute !right-3 !top-1/2 !-translate-y-1/2 !text-gray-400 hover:!text-gray-600"
                                                >
                                                    {showOldPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="!space-y-1.5">
                                            <label className="!text-sm !font-medium !text-gray-700">Mật khẩu mới</label>
                                            <div className="!relative">
                                                <input
                                                    type={showNewPass ? "text" : "password"}
                                                    required
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="!w-full !px-4 !py-2.5 !bg-gray-50 !text-gray-900 !border !border-gray-100 !rounded-sm focus:!ring-2 focus:!ring-[#00568c] focus:!bg-white !outline-none !transition-all placeholder:!text-gray-400"
                                                    placeholder="Tối thiểu 6 ký tự"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPass(!showNewPass)}
                                                    className="!absolute !right-3 !top-1/2 !-translate-y-1/2 !text-gray-400 hover:!text-gray-600"
                                                >
                                                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="!space-y-1.5">
                                            <label className="!text-sm !font-medium !text-gray-700">Xác nhận mật khẩu</label>
                                            <div className="!relative">
                                                <input
                                                    type={showConfirmPass ? "text" : "password"}
                                                    required
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="!w-full !px-4 !py-2.5 !bg-gray-50 !text-gray-900 !border !border-gray-100 !rounded-sm focus:!ring-2 focus:!ring-[#00568c] focus:!bg-white !outline-none !transition-all placeholder:!text-gray-400"
                                                    placeholder="Nhập lại mật khẩu mới"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                                                    className="!absolute !right-3 !top-1/2 !-translate-y-1/2 !text-gray-400 hover:!text-gray-600"
                                                >
                                                    {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="!pt-4 !flex !gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswordModal(false)}
                                                className="!flex-1 !px-4 !py-2.5 !border !border-gray-200 !text-gray-500 !font-medium !rounded-lg hover:!bg-gray-50 !transition-colors"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="!flex-1 !px-4 !py-2.5 !bg-[#00568c] !text-white !font-semibold !rounded-lg hover:!opacity-90 disabled:!opacity-50 disabled:!cursor-not-allowed !transition-all !shadow-md active:!scale-[0.98] !flex !items-center !justify-center !gap-2"
                                                style={{ color: '#fff' }}
                                            >
                                                {isLoading ? (
                                                    <Loader2 size={18} className="!animate-spin" />
                                                ) : (
                                                    "Cập nhật"
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
}
