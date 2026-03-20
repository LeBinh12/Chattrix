import { type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
}

export default function AuthButton({ children, isLoading, disabled, ...props }: AuthButtonProps) {
  return (
    <button
      {...props}
      disabled={isLoading || disabled}
      className={`w-full bg-[#00568c] !text-white py-2.5 px-4 rounded-sm
                  hover:bg-[#004a78] active:bg-[#003d63] 
                  shadow-lg hover:shadow-xl transition-all duration-200 
                  font-semibold text-base cursor-pointer
                  focus:outline-none focus:ring-4 focus:ring-[#00568c]/30
                  flex items-center justify-center gap-2
                  disabled:opacity-70 disabled:cursor-not-allowed`}
    >
      {isLoading && <Loader2 size={20} className="animate-spin" />}
      {children}
    </button>
  );
}
