import { useState, useRef, useEffect } from "react";

interface ChannelListWrapperProps {
  children: (width: number) => React.ReactNode; // render props
}

export default function ChannelListWrapper({
  children,
}: ChannelListWrapperProps) {
  const [width, setWidth] = useState(300); // độ rộng mặc định
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const minWidth = 60; // nhỏ nhất: chỉ hiện avatar
  const maxWidth = 400; // rộng nhất

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth =
      e.clientX - (containerRef.current?.getBoundingClientRect().left || 0);
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full rounded-tl-2xl bg-transparent text-black shadow-lg relative"
      style={{ width }}
    >
      {/* Nội dung chính */}
      <div className="flex-1 overflow-hidden rounded-tl-2xl rounded-tr-2xl border border-gray-400">
        {children(width)}
      </div>

      {/* Thanh resize */}
      <div
        className="absolute top-0 right-0 h-full w-1 cursor-ew-resize bg-transparent hover:bg-white/30"
        onMouseDown={() => setIsResizing(true)}
      />
    </div>
  );
}
