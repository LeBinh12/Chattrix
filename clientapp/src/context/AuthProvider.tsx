import { useState, type ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { socketManager } from "../api/socket";
import { useResetRecoilState } from "recoil";
import { userAtom, isAuthLoadingAtom } from "../recoil/atoms/userAtom";
import { selectedChatState } from "../recoil/atoms/chatAtom";
import { conversationListAtom } from "../recoil/atoms/conversationListAtom";
import { groupListState, groupMembersAtom, groupTotalMembersAtom } from "../recoil/atoms/groupAtom";
import { messagesCacheAtom, messagesSearchCacheAtom, messageIDAtom } from "../recoil/atoms/messageAtom";
import { activeCallsAtom } from "../recoil/atoms/activeCallsAtom";
import { videoCallState } from "../recoil/atoms/videoCallAtom";
import { incomingCallAtom } from "../recoil/atoms/incomingCallAtom";
import { bellStateAtom } from "../recoil/atoms/bellAtom";
import { mediaViewerAtom } from "../recoil/atoms/mediaViewerAtom";
import { replyMessageState, groupDetailState } from "../recoil/atoms/uiAtom";
import { taskCommentsAtom } from "../recoil/atoms/taskComment";
import { 
  adminUsersState, 
  adminGroupsState, 
  adminUsersPageState, 
  adminGroupsPageState, 
  adminUsersHasMoreState, 
  adminGroupsHasMoreState 
} from "../recoil/atoms/adminAtoms";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("access_token") || null
  );

  // Recoil Resets
  const resetUser = useResetRecoilState(userAtom);
  const resetIsAuthLoading = useResetRecoilState(isAuthLoadingAtom);
  const resetSelectedChat = useResetRecoilState(selectedChatState);
  const resetConversations = useResetRecoilState(conversationListAtom);
  const resetGroupList = useResetRecoilState(groupListState);
  const resetGroupMembers = useResetRecoilState(groupMembersAtom);
  const resetGroupTotalMembers = useResetRecoilState(groupTotalMembersAtom);
  const resetMessagesCache = useResetRecoilState(messagesCacheAtom);
  const resetSearchCache = useResetRecoilState(messagesSearchCacheAtom);
  const resetMessageID = useResetRecoilState(messageIDAtom);
  const resetActiveCalls = useResetRecoilState(activeCallsAtom);
  const resetVideoCall = useResetRecoilState(videoCallState);
  const resetIncomingCall = useResetRecoilState(incomingCallAtom);
  const resetBell = useResetRecoilState(bellStateAtom);
  const resetMediaViewer = useResetRecoilState(mediaViewerAtom);
  const resetReplyMessage = useResetRecoilState(replyMessageState);
  const resetGroupDetail = useResetRecoilState(groupDetailState);
  const resetTaskComments = useResetRecoilState(taskCommentsAtom);
  const resetAdminUsers = useResetRecoilState(adminUsersState);
  const resetAdminGroups = useResetRecoilState(adminGroupsState);
  const resetAdminUsersPage = useResetRecoilState(adminUsersPageState);
  const resetAdminGroupsPage = useResetRecoilState(adminGroupsPageState);
  const resetAdminUsersHasMore = useResetRecoilState(adminUsersHasMoreState);
  const resetAdminGroupsHasMore = useResetRecoilState(adminGroupsHasMoreState);

  const saveToken = (t: string) => {
    localStorage.setItem("access_token", t);
    setToken(t);
  };

  const logout = () => {
    // 1. Clear Storage
    localStorage.removeItem("access_token");
    sessionStorage.clear();

    // 2. Disconnect Socket
    socketManager.disconnect();

    // 3. Reset Recoil States
    resetUser();
    resetIsAuthLoading();
    resetSelectedChat();
    resetConversations();
    resetGroupList();
    resetGroupMembers();
    resetGroupTotalMembers();
    resetMessagesCache();
    resetSearchCache();
    resetMessageID();
    resetActiveCalls();
    resetVideoCall();
    resetIncomingCall();
    resetBell();
    resetMediaViewer();
    resetReplyMessage();
    resetGroupDetail();
    resetTaskComments();
    resetAdminUsers();
    resetAdminGroups();
    resetAdminUsersPage();
    resetAdminGroupsPage();
    resetAdminUsersHasMore();
    resetAdminGroupsHasMore();

    // 4. Update Auth State
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, saveToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
