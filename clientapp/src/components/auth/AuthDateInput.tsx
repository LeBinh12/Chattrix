import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function AuthDateInput({ label }: { label: string }) {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <div className="flex flex-col mb-5">
      <label className="mb-1 text-sm font-medium text-gray-700">{label}</label>
      <DatePicker
        selected={date}
        onChange={(d: Date | null) => setDate(d)}
        className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600 transition w-full"
        dateFormat="dd/MM/yyyy"
        placeholderText="Chọn ngày"
      />
    </div>
  );
}
