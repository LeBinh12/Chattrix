import { type ButtonHTMLAttributes } from "react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function AuthButton({ children, ...props }: AuthButtonProps) {
  return (
    <button
      {...props}
      className="w-full bg-brand-600 text-white py-2 px-4 rounded-lg 
                 hover:bg-brand-700 shadow-md transition"
    >
      {children}
    </button>
  );
}
