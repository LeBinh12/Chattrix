import { Box, Input, Typography } from "@mui/joy";
import React from "react";

interface NumberRangeFilterProps {
  minValue: number | "";
  maxValue: number | "";
  onMinChange: (value: number | "") => void;
  onMaxChange: (value: number | "") => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  label?: string;
  showWarning?: boolean;
}

export default function NumberRangeFilter({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minPlaceholder = "Từ",
  maxPlaceholder = "Đến",
  label = "Số lượng",
  showWarning = true,
}: NumberRangeFilterProps) {

  console.log("label", label)
  // Kiểm tra min > max
  const isInvalid =
    minValue !== "" &&
    maxValue !== "" &&
    Number(minValue) > Number(maxValue);

  // Xử lý input min
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Không cho phép nhập chữ
    if (value === "") {
      onMinChange("");
      return;
    }

    const num = Number(value);
    // Không cho phép số âm
    if (num < 0) {
      return;
    }

    // Chỉ cho phép số nguyên
    if (!Number.isInteger(num)) {
      return;
    }

    onMinChange(num);
  };

  // Xử lý input max
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (value === "") {
      onMaxChange("");
      return;
    }

    const num = Number(value);
    if (num < 0) {
      return;
    }

    if (!Number.isInteger(num)) {
      return;
    }

    onMaxChange(num);
  };

  // Ngăn paste giá trị âm
  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement> | any,
    type: "min" | "max"
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const num = Number(pastedText.trim());

    if (num < 0 || !Number.isInteger(num)) {
      return;
    }

    if (type === "min") {
      onMinChange(num);
    } else {
      onMaxChange(num);
    }
  };

  const inputStyle = {
    height: 36,
    bgcolor: "#ffffff",
    borderColor: isInvalid ? "#ef4444" : "#e5e7eb",
    borderRadius: "6px",
    fontSize: "14px",
    border: `1px solid ${isInvalid ? "#ef4444" : "#e5e7eb"}`,
    transition: "all 0.2s",
    "& input": {
      fontSize: "14px",
    },
    "&:hover": {
      borderColor: isInvalid ? "#dc2626" : "#d1d5db",
    },
    "&:focus-within": {
      borderColor: isInvalid ? "#dc2626" : "#0665D0",
      boxShadow: isInvalid
        ? "0 0 0 1px #dc2626"
        : "0 0 0 1px #0665D0",
    },
  };

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        {/* Min Input */}
        <Box sx={{ position: "relative", flex: "0 0 auto" }}>
          <Input
            type="number"
            placeholder={minPlaceholder}
            value={minValue}
            onChange={handleMinChange}
            onPaste={(e) => handlePaste(e, "min")}
            slotProps={{
              input: {
                step: "1",
                min: "0",
                inputMode: "numeric",
              },
            }}
            sx={{
              ...inputStyle,
              width: 100,
            }}
          />
        </Box>

        {/* Separator */}
        <Typography level="body-sm" sx={{ color: "#6b7280", fontWeight: 500 }}>
          -
        </Typography>

        {/* Max Input */}
        <Box sx={{ position: "relative", flex: "0 0 auto" }}>
          <Input
            type="number"
            placeholder={maxPlaceholder}
            value={maxValue}
            onChange={handleMaxChange}
            onPaste={(e) => handlePaste(e, "max")}
            slotProps={{
              input: {
                step: "1",
                min: "0",
                inputMode: "numeric",
              },
            }}
            sx={{
              ...inputStyle,
              width: 100,
            }}
          />
        </Box>
      </Box>

      {/* Warning when min > max */}
      {showWarning && isInvalid && (
        <Typography
          level="body-xs"
          sx={{
            color: "#dc2626",
            fontSize: "12px",
            mt: 0.5,
            fontWeight: 500,
          }}
        >
          ⚠ Số tối thiểu không được lớn hơn số tối đa
        </Typography>
      )}
    </Box>
  );
}
