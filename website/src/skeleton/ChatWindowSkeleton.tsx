export default function ChatWindowSkeleton() {
  return (
    <div className="flex flex-col flex-1 h-screen bg-gradient-to-b from-blue-50 via-white to-blue-100 animate-pulse relative overflow-hidden">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-3 border-b border-blue-100 shadow-sm">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 p-4 space-y-6 overflow-hidden relative">
        {/* Logo mờ giữa */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 z-0">
          <img
            src="/assets/logo.png"
            alt="logo"
            className="w-40 h-40 sm:w-52 sm:h-52 object-contain select-none"
          />
        </div>

        {/* Tin nhắn mẫu */}
        <div className="relative z-10 space-y-5">
          {/* Trái */}
          <div className="flex items-start gap-2">
            <div className="w-9 h-9 bg-gray-200 rounded-full flex-shrink-0 shadow-sm"></div>
            <div className="space-y-2">
              <div className="h-10 bg-gray-200 rounded-2xl w-64 shadow-sm"></div>
              <div className="h-10 bg-gray-200 rounded-2xl w-48 shadow-sm"></div>
            </div>
          </div>

          {/* Phải */}
          <div className="flex items-start gap-2 justify-end">
            <div className="space-y-2">
              <div className="h-10 bg-blue-200/70 rounded-2xl w-56 shadow-sm"></div>
              <div className="h-10 bg-blue-200/70 rounded-2xl w-40 shadow-sm"></div>
            </div>
          </div>

          {/* Trái */}
          <div className="flex items-start gap-2">
            <div className="w-9 h-9 bg-gray-200 rounded-full flex-shrink-0 shadow-sm"></div>
            <div className="h-12 bg-gray-200 rounded-2xl w-72 shadow-sm"></div>
          </div>

          {/* Phải */}
          <div className="flex items-start gap-2 justify-end">
            <div className="h-10 bg-blue-200/70 rounded-2xl w-52 shadow-sm"></div>
          </div>

          {/* Trái */}
          <div className="flex items-start gap-2">
            <div className="w-9 h-9 bg-gray-200 rounded-full flex-shrink-0 shadow-sm"></div>
            <div className="space-y-2">
              <div className="h-10 bg-gray-200 rounded-2xl w-60 shadow-sm"></div>
              <div className="h-10 bg-gray-200 rounded-2xl w-44 shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Skeleton */}
      <div className="bg-white/80 backdrop-blur-md px-4 py-3 border-t border-blue-100 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1 h-12 bg-gray-200 rounded-full"></div>
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
