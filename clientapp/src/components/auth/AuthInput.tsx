import { type InputHTMLAttributes } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  suffix?: React.ReactNode;
  error?: string;
}

export default function AuthInput({ label, suffix, error, ...props }: AuthInputProps) {
  return (
    <div className="flex flex-col">
      <label className="mb-2 text-sm font-semibold text-[#00568c]">
        {label}
      </label>
      <div className="relative w-full">
        <input
          {...props}
          className={`border-2 rounded-sm px-4 py-2.5 w-full
                    text-sm text-gray-900 placeholder:text-gray-400
                    bg-gray-50 
                    focus:outline-none focus:ring-4 
                    transition-all duration-300
                    ${suffix ? "pr-12" : ""}
                    ${error 
                      ? "border-red-500 focus:ring-red-500/30 focus:border-red-500 hover:border-red-500" 
                      : "border-gray-200 focus:ring-[#00568c]/20 focus:border-[#00568c] hover:border-[#00568c] hover:bg-white"}`}
        />
        {suffix && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
            {suffix}
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mt-1 font-medium">{error}</p>}
    </div>
  );
}
