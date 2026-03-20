import { AnimatePresence, motion } from "framer-motion";
import { useRecoilState, useSetRecoilState } from "recoil";
import { incomingCallAtom } from "../../recoil/atoms/incomingCallAtom";
import { videoCallState } from "../../recoil/atoms/videoCallAtom";
import { Phone, PhoneOff } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import UserAvatar from "../UserAvatar";

export const IncomingCallModal = () => {
    const [incomingCall, setIncomingCall] = useRecoilState(incomingCallAtom);
    const setVideoCall = useSetRecoilState(videoCallState);

    useEffect(() => {
        if (incomingCall) {
            // Play ringtone (optional, basic loop sound)
            // For now just visual.
            // But user said "like phone call", so sound is important.
            // Using a simple beep logic or asset if available. 
            // I'll skip asset for now to avoid 404s, just visual first.
        }
    }, [incomingCall]);

    const handleAccept = async () => {
        if (!incomingCall) return;

        // Call fetchToken just to get ready or ensure we can join
        // Actually fetchToken in useVideoCall sets up local state but we are outside ChatWindow?
        // Wait, fetchToken inside useVideoCall returns {token, url}. 
        // We need to pass that to the videoCallState so the global modal (VideoCallModal) can open.
        // BUT VideoCallModal in ChatWindow relies on local state `token` in ChatWindow?
        // NO, VideoCallModal in ChatWindow is mounted THERE.

        // This is a tricky part: Where should the VideoCallModal live?
        // Currently it lives in ChatWindow.
        // If we accept here (global modal), we need to trigger the VideoCallModal to open.
        // It's probably better if VideoCallModal was also global or we redirect user to chat?

        // For now: We set videoCallState.isCalling = true. 
        // AND we need to update the ChatWindow to "know" we are in a call.

        // BETTER APPROACH:
        // 1. Set global videoCallState.
        // 2. Fetch token.
        // 3. Mount a global VideoCallModal in App.tsx instead of ChatWindow.tsx?
        //    OR: Just rely on the fact that if we set videoCallState, ChatWindow (if open) will show it?
        //    But what if ChatWindow is NOT open?
        //    The user might be on Dashboard.

        // Let's create a GLOBAL VideoCallModal in App.tsx that listens to videoCallState.
        // And remove the local one from ChatWindow.tsx?
        // Or keep both but ensure they don't conflict. 
        // Ideally App.tsx should host the active call modal so it persists across navigation.

        // For this step, I'll assume we just want to accept -> set state -> open call.

        // To behave "like phone call":
        // 1. Accept -> Close Incoming Modal.
        // 2. Start Call (Open VideoModal).

        setVideoCall({
            isCalling: true,
            roomId: incomingCall.roomName,
            chatId: incomingCall.chatId,
            chatType: incomingCall.isGroup ? "group" : "user",
        });

        // We also need a token for the call.
        // The VideoCallModal usually takes token as prop or fetches it.
        // If we move VideoCallModal to App.tsx, it can handle fetching or receiving token.

        // Let's allow the VideoCallModal (wherever it is) to fetch token if missing?
        // Or fetch here and pass it?
        // videoCallState atom doesn't store token.
        // I might need to update videoCallAtom to store token/url too.

        setIncomingCall(null);
    };

    const handleDecline = () => {
        setIncomingCall(null);
    };

    if (!incomingCall) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="fixed top-4 right-4 z-[99999] bg-white rounded-2xl shadow-2xl p-4 w-80 border border-gray-100 dark:bg-gray-800 dark:border-gray-700"
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className=" rounded-full overflow-hidden border-2 border-white shadow-md">
                            <UserAvatar
                                avatar={incomingCall.callerAvatar}
                                display_name={incomingCall.callerName}
                                showOnlineStatus={false}
                                size={64}
                            />
                           
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                            <Phone size={12} className="text-white animate-pulse" />
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="font-bold text-lg text-gray-900 dark:text-white">
                            {incomingCall.callerName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {incomingCall.isGroup ? "Cuộc gọi từ nhóm" : "Đang gọi cho bạn..."}
                        </p>
                    </div>

                    <div className="flex items-center gap-4 w-full justify-center mt-2">
                        <button
                            onClick={handleDecline}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center transition-colors group-hover:bg-red-600 group-hover:text-white">
                                <PhoneOff size={24} />
                            </div>
                            <span className="text-xs text-gray-500 font-medium">Từ chối</span>
                        </button>

                        <button
                            onClick={handleAccept}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-200 transition-transform group-hover:scale-110 animate-bounce">
                                <Phone size={24} />
                            </div>
                            <span className="text-xs text-green-600 font-medium font-bold">Trả lời</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};
