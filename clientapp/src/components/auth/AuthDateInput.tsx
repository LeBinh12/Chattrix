import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function AuthDateInput({ label }: { label: string }) {
  const [date, setDate] = useState<Date | null>(null);

 return (
    <div className="flex flex-col">
      <label className="mb-2 text-sm font-semibold text-gray-700">
        {label}
      </label>
      <DatePicker
        selected={date}
        onChange={(d: Date | null) => setDate(d)}
        className="border-2 border-gray-200 rounded-lg px-4 py-3 
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 
                  focus:border-transparent transition-all duration-200 
                  w-full bg-gray-50 hover:bg-white"
        dateFormat="dd/MM/yyyy"
        placeholderText="Chọn ngày"
      />
    </div>
  );
}
