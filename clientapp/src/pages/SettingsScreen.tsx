import { useState } from "react";
import { Globe, Lock, LogOut, X, Eye, EyeOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSetRecoilState } from "recoil";
import { toast } from "react-toastify";
import SettingsContent from "../components/home/settings/SettingsContent";
import ConfirmModal from "../components/notification/ConfirmModal";
import { socketManager } from "../api/socket";
import { userAtom } from "../recoil/atoms/userAtom";
import { messageIDAtom, messagesCacheAtom, messagesSearchCacheAtom } from "../recoil/atoms/messageAtom";
import { userApi } from "../api/userApi";
import { motion, AnimatePresence } from "framer-motion";
import { BUTTON_HOVER } from "../utils/className";

export default function SettingsScreen() {
    const [activeTab, setActiveTab] = useState("general");
    const [showConfirm, setShowConfirm] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    
    // Form state
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const navigate = useNavigate();
    const setUser = useSetRecoilState(userAtom);
    const setMessagesCache = useSetRecoilState(messagesCacheAtom);
    const setMessagesSearchCache = useSetRecoilState(messagesSearchCacheAtom);
    const setMessageID = useSetRecoilState(messageIDAtom);

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
                // Update new token if provided
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

    const tabs = [
        { id: "general", label: "Cài đặt chung", icon: <Globe size={18} /> },
        { id: "privacy", label: "Riêng tư & Bảo mật", icon: <Lock size={18} /> },
    ];

    return (
        <div className="!flex !flex-col !h-full !bg-white !pb-[70px]">
            <div className="!bg-white !border-b !border-gray-200 !px-4 !py-3 !sticky !top-0 !z-10 !flex !items-center !justify-center">
                <p className="!text-lg !font-bold !text-gray-800">
                    Cài đặt
                </p>
            </div>

            <div className="!flex-1 !overflow-y-auto">
                {/* Tabs */}
                <div className="!flex !p-2 !pb-1">
                    <div className="!flex !w-full !p-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`!flex-1 !flex !items-center !justify-center !gap-2 !py-1.5 !rounded-sm !text-[13px] !font-semibold !transition-all !duration-200 ${activeTab === tab.id
                                        ? "!text-[#be8b43] !border-b-2 !border-[#be8b43]"
                                        : `!text-gray-500 hover:!text-gray-700 ${BUTTON_HOVER}`
                                    }`}
                            >
                                {tab.icon}
                                <span className="truncate">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="!px-3 !pb-2 !pt-2">
                    <div className="!p-1">
                        <p className="!text-[10px] !font-bold !text-gray-400 !uppercase !tracking-[0.05em] !mb-4 !border-b !border-gray-50 !pb-2">
                            {tabs.find((t) => t.id === activeTab)?.label}
                        </p>
                        <SettingsContent 
                            activeTab={activeTab} 
                            onOpenChangePassword={() => setShowPasswordModal(true)}
                        />
                    </div>
                </div>

                <div className="!px-3 !pb-6 !space-y-4">
                    <div className="!bg-white !rounded-sm !overflow-hidden">
                        <button
                            onClick={() => setShowConfirm(true)}
                            className={`!w-full !px-4 !py-3.5 !flex !items-center !justify-center !gap-3 !text-red-500 !font-bold !text-sm !tracking-tight hover:!bg-red-50 !transition-all active:!scale-[0.99] ${BUTTON_HOVER}`}
                        >
                            <LogOut size={18} strokeWidth={2.5} />
                            Đăng xuất tài khoản
                        </button>
                    </div>
                    
                    <div className="!text-center">
                        <p className="!text-xs !text-gray-400">Phiên bản 1.0.0</p>
                    </div>
                </div>
            </div>
            
            <ConfirmModal
                isOpen={showConfirm}
                title="Xác nhận đăng xuất"
                confirmText="Đăng xuất"
                cancelText="Hủy"
                onConfirm={() => {
                    setShowConfirm(false);
                    handleLogout();
                }}
                onCancel={() => setShowConfirm(false)}
            />

            {/* Change Password Modal */}
            <AnimatePresence>
                {showPasswordModal && (
                    <div className="!fixed !inset-0 !z-[100] !flex !items-end sm:!items-center !justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isLoading && setShowPasswordModal(false)}
                            className="!absolute !inset-0 !bg-black/40 !backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 350 }}
                            className="!relative !w-full sm:!max-w-md !bg-white !rounded-t-[1.5rem] sm:!rounded-xl !shadow-2xl !overflow-hidden !pointer-events-auto"
                        >
                            <div className="!w-full !flex !justify-center !pt-2 !pb-1 sm:!hidden">
                                <div className="!w-10 !h-1 !bg-gray-200 !rounded-full" />
                            </div>
                            <div className="!p-4 !pb-1 sm:!p-5 !border-b !border-gray-50 !flex !items-center !justify-between">
                                <h3 className="!text-xl !font-black !text-gray-900 !tracking-tight">Đổi mật khẩu</h3>
                                <button 
                                    onClick={() => setShowPasswordModal(false)}
                                    className="!p-2 !bg-gray-100 hover:!bg-gray-200 !rounded-full !transition-all active:!scale-95"
                                >
                                    <X size={18} className="!text-gray-600" strokeWidth={2.5} />
                                </button>
                            </div>

                            <form onSubmit={handleChangePassword} className="!p-4 !pt-1 sm:!p-5 !space-y-3.5 !bg-white">
                                <div className="!space-y-1">
                                    <label className="!text-[13px] !font-bold !text-gray-600">Mật khẩu cũ</label>
                                    <div className="!relative">
                                        <input
                                            type={showOldPass ? "text" : "password"}
                                            required
                                            value={oldPassword}
                                            onChange={(e) => setOldPassword(e.target.value)}
                                            className="!w-full !px-3 !py-2 !bg-gray-50 !text-gray-900 !border !border-gray-100 !rounded-md focus:!ring-1 focus:!ring-[#be8b43] focus:!bg-white !outline-none !transition-all placeholder:!text-gray-400 !text-sm"
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

                                <div className="!space-y-1">
                                    <label className="!text-[13px] !font-bold !text-gray-600">Mật khẩu mới</label>
                                    <div className="!relative">
                                        <input
                                            type={showNewPass ? "text" : "password"}
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="!w-full !px-3 !py-2 !bg-gray-50 !text-gray-900 !border !border-gray-100 !rounded-md focus:!ring-1 focus:!ring-[#be8b43] focus:!bg-white !outline-none !transition-all placeholder:!text-gray-400 !text-sm"
                                            placeholder="Tối thiểu 6 ký tự"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPass(!showNewPass)}
                                            className="!absolute !right-3 !top-1/2 !-translate-y-1/2 !text-gray-400 hover:!text-gray-600"
                                        >
                                            {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="!space-y-1">
                                    <label className="!text-[13px] !font-bold !text-gray-600">Xác nhận mật khẩu</label>
                                    <div className="!relative">
                                        <input
                                            type={showConfirmPass ? "text" : "password"}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="!w-full !px-3 !py-2 !bg-gray-50 !text-gray-900 !border !border-gray-100 !rounded-md focus:!ring-1 focus:!ring-[#be8b43] focus:!bg-white !outline-none !transition-all placeholder:!text-gray-400 !text-sm"
                                            placeholder="Nhập lại mật khẩu mới"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                                            className="!absolute !right-3 !top-1/2 !-translate-y-1/2 !text-gray-400 hover:!text-gray-600"
                                        >
                                            {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="!pt-4 !flex !gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordModal(false)}
                                        className={`!flex-1 !px-3 !py-2.5 !border !border-gray-100 !text-gray-500 !font-bold !text-sm !rounded-xl !transition-all active:!scale-95 ${BUTTON_HOVER}`}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="!flex-[2] !px-3 !py-2.5 !bg-[#be8b43] !text-white !font-bold !text-sm !rounded-xl hover:!opacity-90 disabled:!opacity-50 disabled:!cursor-not-allowed !transition-all !shadow-md active:!scale-95 !flex !items-center !justify-center !gap-2"
                                    >
                                        {isLoading ? (
                                            <Loader2 size={16} className="!animate-spin" />
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
        </div>
    );
}
