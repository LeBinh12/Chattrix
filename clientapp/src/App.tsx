import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLoadUser } from "./hooks/useLoadUser";
import { useRecoilValue, useRecoilState } from "recoil";
import { userAtom } from "./recoil/atoms/userAtom";
import { useEffect, useRef } from "react";
import FavicoNotifier from "./components/FavicoNotifier";
import { IncomingCallModal } from "./components/LiveKit/IncomingCallModal";
import { videoCallState } from "./recoil/atoms/videoCallAtom";
import { VideoCallModal } from "./components/LiveKit/VideoCallModal";
import { useVideoCall } from "./hooks/useVideoCall";
import "rsuite/dist/rsuite.min.css";
import MobileNotificationBanner from "./components/MobileNotificationBanner";
import { useAppSocket } from "./hooks/useAppSocket";
import { AppRoutes } from "./components/AppRoutes";

function App() {
  useLoadUser();
  const user = useRecoilValue(userAtom);
  const [videoCall, setVideoCall] = useRecoilState(videoCallState);

  const { mobileNotif, setMobileNotif, isMobile } = useAppSocket();
const isInAppWebView = () => {
  const ua = navigator.userAgent || "";

    return (
      /Zalo/i.test(ua) ||          // Zalo
      /FBAN|FBAV/i.test(ua) ||     // Facebook / Messenger
      /Instagram/i.test(ua) ||     // Instagram
      (window as any).ReactNativeWebView !== undefined // React Native WebView
    );
  };
 useEffect(() => {
    if (isInAppWebView()) {
      console.log("🚫 Running inside WebView - skip Notification");
      return;
    }

    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission();
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Global Video Call Handling
  const {
    token,
    serverUrl,
    fetchToken,
    resetCall,
    loading: loadingCall,
    error: errorCall,
  } = useVideoCall();
  const hasFetchedTokenForRoom = useRef<string | null>(null);

  // Auto-fetch token when calls start globally
  useEffect(() => {
    if (videoCall.isCalling && videoCall.roomId && !token) {
      if (hasFetchedTokenForRoom.current === videoCall.roomId) return;
      if (!user?.data.id) return;

      const participantName =
        user.data.display_name || user.data.username || "Guest";
      console.log("🚀 [App.tsx] Joining room:", videoCall.roomId);
      hasFetchedTokenForRoom.current = videoCall.roomId;

      fetchToken(
        videoCall.roomId,
        participantName,
        videoCall.chatType === "group" ? videoCall.chatId! : undefined,
        videoCall.chatType === "user" ? videoCall.chatId! : undefined
      ).catch((err) => {
        console.error("[App.tsx] Token fetch failed:", err);
        hasFetchedTokenForRoom.current = null;
      });
    }
  }, [
    videoCall.isCalling,
    videoCall.roomId,
    token,
    user?.data,
    fetchToken,
    videoCall.chatType,
    videoCall.chatId,
  ]);

  // Reset ref and token when call ends
  useEffect(() => {
    if (!videoCall.isCalling) {
      hasFetchedTokenForRoom.current = null;
      resetCall(); // Ensure token is cleared so next call fetches fresh
    }
  }, [videoCall.isCalling, resetCall]);

  return (
    <>
      <FavicoNotifier />
      <MobileNotificationBanner
        isVisible={!!mobileNotif}
        title={mobileNotif?.title || ""}
        body={mobileNotif?.body || ""}
        onClose={() => setMobileNotif(null)}
        onClick={mobileNotif?.onClick}
      />
      <IncomingCallModal />
      <VideoCallModal
        isOpen={videoCall.isCalling}
        onClose={() => {
          setVideoCall((prev) => ({
            ...prev,
            isCalling: false,
            roomId: null,
            chatId: null,
            chatType: null,
          }));
          resetCall();
        }}
        token={token}
        serverUrl={serverUrl}
        loading={loadingCall}
        error={errorCall}
      />
      
      <AppRoutes />

      <ToastContainer
        position={isMobile ? "top-center" : "top-right"}
        autoClose={isMobile ? 5000 : 3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
        toastClassName={`bg-white shadow-xl rounded-2xl p-4 sm:p-5 text-sm sm:text-base border border-slate-100 ${
          isMobile ? "mx-4 mt-2 w-auto min-w-[320px] max-w-[90vw]" : ""
        }`}
      />
    </>
  );
}

export default App;
