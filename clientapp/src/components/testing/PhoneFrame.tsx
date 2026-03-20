import React, { useEffect, useState } from 'react';
import { User, Send, Smartphone } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isMe: boolean;
  timestamp: Date;
}

interface PhoneFrameProps {
  userId: string;
  status: 'idle' | 'running' | 'completed' | 'stopped';
  messageInterval: number;
}

const PhoneFrame: React.FC<PhoneFrameProps> = ({ userId, status, messageInterval }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const mockSentences = [
    "Hello everyone!",
    "How is the load test going?",
    "Sending a test message...",
    "System looks stable so far.",
    "Can you hear me?",
    "Testing WebSocket connection...",
    "Latency seems low.",
    "Great performance!",
  ];

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (status === 'running') {
      intervalId = setInterval(() => {
        // Simulate typing
        setIsTyping(true);
        
        setTimeout(() => {
          setIsTyping(false);
          const newMessage: Message = {
            id: Math.random().toString(36).substr(2, 9),
            text: mockSentences[Math.floor(Math.random() * mockSentences.length)],
            isMe: Math.random() > 0.3, // 70% chance it's from "me"
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev.slice(-4), newMessage]); // Keep last 5
        }, 800);
      }, messageInterval + Math.random() * 2000);
    } else {
      setMessages([]);
      setIsTyping(false);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, messageInterval]);

  return (
    <div className="relative mx-auto w-full max-w-[200px] h-[360px] bg-slate-100 rounded-[2.5rem] border-[6px] border-slate-200 shadow-xl overflow-hidden flex flex-col group transition-transform hover:scale-105 font-roboto">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-200 rounded-b-xl z-20 flex items-center justify-center">
        <div className="w-8 h-1 bg-slate-300 rounded-full"></div>
      </div>

      {/* Screen Header */}
      <div className="bg-white/90 backdrop-blur-md pt-6 pb-2 px-3 flex items-center gap-2 border-b border-slate-100">
        <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center">
          <User className="w-4 h-4 !text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate">User_{userId.slice(-4)}</p>
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">
              {status === 'running' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 scrollbar-hide bg-slate-50/50">
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full italic text-xs text-slate-500">
            <Smartphone className="w-10 h-10 mb-2 opacity-20" />
            <p className="font-medium">Waiting for test...</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs font-medium break-words animate-in slide-in-from-bottom-1 duration-300 ${
              msg.isMe
                ? 'bg-brand-600 text-slate-900 self-end rounded-tr-none shadow-sm'
                : 'bg-white text-slate-900 self-start rounded-tl-none shadow-sm border border-slate-100'
            }`}
          >
            {msg.text}
          </div>
        ))}

        {isTyping && (
          <div className="bg-white text-slate-600 self-start rounded-2xl rounded-tl-none px-4 py-1.5 text-xs font-bold animate-pulse italic shadow-sm border border-slate-100">
            ...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white p-2 flex gap-1 items-center border-t border-slate-100">
        <div className="flex-1 h-6 bg-white rounded-full border border-slate-200 px-2 flex items-center">
          <div className={`w-full h-1 bg-slate-100 rounded-full overflow-hidden ${status === 'running' && 'relative'}`}>
             {status === 'running' && <div className="absolute top-0 left-0 h-full bg-brand-600 w-1/3 animate-[loading_1.5s_infinite]"></div>}
          </div>
        </div>
        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center opacity-50">
          <Send className="w-3 h-3 text-slate-600" />
        </div>
      </div>
      
      <style>{`
        @keyframes loading {
          0% { left: -30%; }
          100% { left: 100%; }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default PhoneFrame;
