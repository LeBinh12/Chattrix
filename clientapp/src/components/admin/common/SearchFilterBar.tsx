import { Box, Input, IconButton, Button, Drawer, Typography, Divider } from "@mui/joy";
import { Search, RefreshCw, Filter } from "lucide-react";
import React from "react";
import NumberRangeFilter from "./NumberRangeFilter";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  minMembers: number | "";
  onMinMembersChange: (value: number | "") => void;
  maxMembers: number | "";
  onMaxMembersChange: (value: number | "") => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
  children?: React.ReactNode; // Cho phép thêm filter khác vào giữa search và refresh
}

export default function SearchFilterBar({
  searchQuery,
  onSearchChange,
  minMembers,
  onMinMembersChange,
  maxMembers,
  onMaxMembersChange,
  isRefreshing = false,
  onRefresh,
  showRefreshButton = true,
  children,
}: SearchFilterBarProps) {
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = React.useState(false);

  // Kiểm tra min > max để disable refresh hoặc hiển thị cảnh báo
  const isInvalid =
    minMembers !== "" &&
    maxMembers !== "" &&
    Number(minMembers) > Number(maxMembers);

  return (
    <>
      {/* Desktop Filter Bar */}
        <Box
        sx={{
            display: "flex",
            gap: 1,
            mb: 1.5,
            alignItems: "center",
            flexWrap: { xs: "wrap", md: "nowrap" },
            bgcolor: "transparent",
            p: 0,
            borderRadius: 0,
            boxShadow: "none",
            border: "none",
        }}
        >

        {/* Left Section: Search & Member Count Filter */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Search Input */}
          <Box
            sx={{
                width: { xs: "100%", md: 280 }, 
                maxWidth: "100%",
                flexShrink: 0,
            }}
            >

            <Input
              startDecorator={<Search size={16} />}
              placeholder="Tìm kiếm nhanh..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              size="sm"
              sx={{
                width: "100%",
                height: 36,
                paddingRight: "12px",
                bgcolor: "#ffffff",
                borderColor: "#e5e7eb",
                borderRadius: "6px",
                fontSize: "14px",
                border: "1px solid #e5e7eb",
                transition: "all 0.2s",
                "& input": {
                  fontSize: "14px",
                },
                "&:hover": { borderColor: "#d1d5db" },
                "&:focus-within": {
                  borderColor: "#0665D0",
                  boxShadow: "0 0 0 1px #0665D0",
                },
              }}
            />
          </Box>

          {/* Member Count Filter - Desktop Only */}
          <Box
            sx={{
              display: { xs: "none", lg: "flex" },
              gap: 1.5,
              alignItems: "center",
              flex: "0 0 auto",
            }}
          >
            <Typography level="body-sm" sx={{ color: "#41301B", fontWeight: 600, whiteSpace: "nowrap" }}>
              Số thành viên:
            </Typography>
            <NumberRangeFilter
              minValue={minMembers}
              maxValue={maxMembers}
              onMinChange={onMinMembersChange}
              onMaxChange={onMaxMembersChange}
              minPlaceholder="Từ"
              maxPlaceholder="Đến"
              showWarning={true}
            />
          </Box>

          {/* Additional Filters - Custom content */}
          {children && (
            <Box
              sx={{
                display: { xs: "none", lg: "flex" },
                gap: 1,
                alignItems: "center",
                flex: "0 0 auto",
              }}
            >
              {children}
            </Box>
          )}
        </Box>

        {/* Right Section: Filter Toggle & Refresh Button */}
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "center",
            flex: "0 0 auto",
          }}
        >
          {/* Mobile Filter Icon */}
          <IconButton
            size="sm"
            variant="soft"
            sx={{
              display: { xs: "flex", lg: "none" },
              bgcolor: "#F8F3ED",
              color: "#B88A4C",
              "&:hover": { bgcolor: "#EADBC8" },
              borderRadius: "4px",
              width: 36,
              height: 36,
            }}
            onClick={() => setIsFilterDrawerOpen(true)}
          >
            <Filter size={18} />
          </IconButton>

          {/* Refresh Button */}
          {showRefreshButton && onRefresh && (
            <IconButton
              size="sm"
              variant="plain"
              disabled={isRefreshing}
              onClick={onRefresh}
              sx={{
                color: "#6b7280",
                width: 36,
                height: 36,
                "&:hover": { bgcolor: "#F3F4F6", color: "#111827" },
                "&:disabled": { color: "#d1d5db" },
              }}
              title={isInvalid ? "Min > Max: Không thể làm mới" : "Làm mới dữ liệu"}
            >
              <RefreshCw
                size={18}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Display warning if min > max */}
      {isInvalid && (
        <Box
          sx={{
            mb: 1,
            p: 1,
            bgcolor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
          }}
        >
          <Typography
            level="body-xs"
            sx={{
              color: "#dc2626",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            ⚠ Số thành viên tối thiểu không được lớn hơn số tối đa
          </Typography>
        </Box>
      )}

      {/* Mobile Filter Drawer */}
      <Drawer
        anchor="right"
        open={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
      >
        <Box
          sx={{
            width: 320,
            p: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Typography level="h4" sx={{ mb: 2, fontWeight: 700, color: "#41301B" }}>
            Bộ lọc
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ flex: 1, overflow: "auto", mb: 2 }}>
            {/* Search in drawer */}
            <Box sx={{ mb: 2 }}>
              <Typography level="body-sm" sx={{ mb: 0.75, fontWeight: 600, color: "#41301B" }}>
                Tìm kiếm
              </Typography>
              <Input
                size="sm"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                startDecorator={<Search size={16} />}
                sx={{
                  width: "100%",
                  height: 36,
                  borderRadius: "6px",
                }}
              />
            </Box>

            {/* Member count filter in drawer */}
            <Box>
              <Typography level="body-sm" sx={{ mb: 0.75, fontWeight: 600, color: "#41301B" }}>
                Số thành viên
              </Typography>
              <NumberRangeFilter
                minValue={minMembers}
                maxValue={maxMembers}
                onMinChange={onMinMembersChange}
                onMaxChange={onMaxMembersChange}
                minPlaceholder="Từ"
                maxPlaceholder="Đến"
                showWarning={true}
              />
            </Box>

            {/* Additional filters if provided */}
            {children && (
              <>
                <Divider sx={{ my: 2 }} />
                {children}
              </>
            )}
          </Box>

          {/* Close button */}
          <Button
            fullWidth
            sx={{
              height: 36,
              bgcolor: "#B88A4C",
              color: "white",
              borderRadius: "4px",
              fontWeight: 600,
              "&:hover": { bgcolor: "#8C6839" },
            }}
            onClick={() => setIsFilterDrawerOpen(false)}
          >
            Đóng
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
