import { useEffect, useRef } from "react";
import Favico from "favico.js";
import { useRecoilValue } from "recoil";
import { conversationListAtom } from "../recoil/atoms/conversationListAtom";

const FavicoNotifier = () => {
  const conversations = useRecoilValue(conversationListAtom);
  const favicoRef = useRef<Favico | null>(null);

  // init favico chỉ 1 lần
  useEffect(() => {
    favicoRef.current = new Favico({
      animation: "popFade",
      bgColor: "#ef4444",
      textColor: "#ffffff",
    });
  }, []);

  // update badge khi unread thay đổi
  useEffect(() => {
    if (!favicoRef.current) return;

    const totalUnread = conversations.reduce(
      (sum, c) => sum + (c.unread_count || 0),
      0
    );

    if (totalUnread > 0) {
      favicoRef.current.badge(totalUnread);
    } else {
      favicoRef.current.reset();
    }
  }, [conversations]);

  return null; // component global, không render UI
};

export default FavicoNotifier;
