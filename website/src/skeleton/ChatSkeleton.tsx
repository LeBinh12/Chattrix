export default function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center p-5 bg-[#2665b1] text-white">
        <div className="w-10 h-10 bg-gray-400 rounded-full mr-3"></div>
        <div className="w-26 h-6 bg-gray-400 rounded"></div>
      </div>

      {/* Nội dung chat skeleton */}
      <div className="flex-1 p-3 space-y-4 bg-gradient-to-b from-[#2665b1]">
        <div className="flex justify-start">
          <div className="w-12 h-12 bg-gray-400 rounded-full mr-3"></div>
          <div className="w-44 h-6 bg-gray-400 rounded"></div>
        </div>
        <div className="flex justify-end">
          <div className="w-50 h-6 bg-gray-400 rounded"></div>
        </div>
        <div className="flex justify-start">
          <div className="w-12 h-12 bg-gray-400 rounded-full mr-3"></div>
          <div className="w-34 h-6 bg-gray-400 rounded"></div>
        </div>
      </div>

      {/* Input skeleton */}
      <div className="p-4 bg-white shadow-[0_-2px_6px_rgba(0,0,0,0.1)]">
        <div className="h-12 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  );
}
