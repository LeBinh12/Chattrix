type Props = { onClose: () => void };

export default function ChatHeader({ onClose }: Props) {
  return (
    <button
      onClick={onClose}
      className="absolute top-7 right-3 z-10 
                 w-8 h-8 flex items-center justify-center 
                 rounded-md text-2xl font-bold text-white
                 hover:bg-gray-300 hover:text-black 
                 transition"
    >
      ×
    </button>
  );
}
