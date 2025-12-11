import { type InputHTMLAttributes } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function AuthInput({ label, ...props }: AuthInputProps) {
 return (
    <div className="flex flex-col">
      <label className="mb-2 text-sm font-semibold text-gray-700">
        {label}
      </label>
      <input
        {...props}
        className="border-2 border-gray-200 rounded-lg px-4 py-3 
                  text-gray-900 placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 
                  focus:border-transparent transition-all duration-200 
                  bg-gray-50 hover:bg-white hover:border-gray-300"
      />
    </div>
  );
}
