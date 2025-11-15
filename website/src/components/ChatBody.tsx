import HomeTab from "./tabs/HomeTab";
import MessagesTab from "./tabs/MessagesTab";
import HelpTab from "./tabs/HelpTab";
import NewsTab from "./tabs/NewsTab";
import type { Conversation } from "../types/conversation";

type Props = {
  activeTab: "home" | "messages" | "help" | "news";
  onOpenId?: (id: string) => void;
  onFriend: (friend: Conversation) => void;
};

export default function ChatBody({ activeTab, onOpenId, onFriend }: Props) {
  switch (activeTab) {
    case "home":
      return <HomeTab />;
    case "messages":
      return <MessagesTab onOpenId={onOpenId} onFriend={onFriend} />;
    case "help":
      return <HelpTab />;
    case "news":
      return <NewsTab />;
    default:
      return null;
  }
}
