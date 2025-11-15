import { type ButtonHTMLAttributes } from "react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function AuthButton({ children, ...props }: AuthButtonProps) {
  return (
    <button
      {...props}
      className="w-full bg-[#2665b1] text-white py-2 px-4 rounded-lg 
                 hover:bg-[#1f5291] shadow-md transition"
    >
      {children}
    </button>
  );
}
