import { type InputHTMLAttributes } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function AuthInput({ label, ...props }: AuthInputProps) {
  return (
    <div className="flex flex-col mb-5">
      <label className="mb-1 text-sm font-medium text-gray-700">{label}</label>
      <input
        {...props}
        className="border rounded-lg px-3 py-2 focus:outline-none 
                  focus:ring-2 focus:ring-brand-600 focus:border-brand-600 
                   transition"
      />
    </div>
  );
}
