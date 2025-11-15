import { Home, MessageCircle, HelpCircle, Newspaper } from "lucide-react";

type Props = {
  activeTab: "home" | "messages" | "help" | "news";
  onChangeTab: (tab: "home" | "messages" | "help" | "news") => void;
};

export default function ChatFooter({ activeTab, onChangeTab }: Props) {
  const tabs = [
    { key: "home", label: "Home", icon: Home },
    { key: "messages", label: "Messages", icon: MessageCircle },
    { key: "help", label: "Help", icon: HelpCircle },
    { key: "news", label: "News", icon: Newspaper },
  ] as const;

  return (
    <div className="flex justify-around bg-white py-3 shadow-[0_-2px_6px_rgba(0,0,0,0.1)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onChangeTab(tab.key)}
            className={`flex flex-col items-center text-xs transition ${
              activeTab === tab.key
                ? "text-[#1b4c8a] font-semibold"
                : "text-gray-500 hover:text-[#0f3461]"
            }`}
          >
            <Icon className="w-5 h-5 mb-1" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
