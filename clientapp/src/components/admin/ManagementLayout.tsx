
import React from 'react';
import { Box, Input, IconButton, Typography, Button } from '@mui/joy';
import { Search, Filter, RefreshCw } from 'lucide-react';
import type { SxProps } from '@mui/joy/styles/types';

/**
 * Standard SX for Filter Inputs/Selects to match User Management styling.
 */
export const MANAGEMENT_FILTER_SX: SxProps = {
  flex: "0 1 180px",
  width: { xs: "100%", sm: 180 },
  minWidth: { sm: 140 }, // Reduced minWidth to allow more filters on desktop
  height: 36,
  bgcolor: "#ffffff",
  borderColor: "#e5e7eb",
  borderRadius: "6px",
  fontSize: "14px",
  border: "1px solid #e5e7eb",
  transition: "all 0.2s",
  "&:hover": { borderColor: "#d1d5db" },
  "&:focus-within": {
    borderColor: "#0665D0",
    boxShadow: "0 0 0 1px #0665D0",
  },
};

interface ManagementPageProps extends React.ComponentProps<typeof Box> {
  title?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onCreate?: () => void;
  createLabel?: string;
  subtitle?: string;
}

/**
 * Wrapper for Management Pages to ensure consistent padding and layout.
 * Includes Header logic for title and mobile actions.
 */
export function ManagementPage({ 
  children, 
  sx, 
  title, 
  onRefresh, 
  isRefreshing, 
  onCreate, 
  createLabel = "Tạo mới",
  subtitle,
  ...props 
}: ManagementPageProps) {
  console.log("createLabel", createLabel);
  return (
    <Box
      sx={{
        flex: 1,
        p: { xs: 1.5, sm: 2 },
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        ...sx,
      }}
      {...props}
    >
      {/* Header Section */}
      {(title || onCreate || onRefresh) && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.5,
            gap: 1,
          }}
        >
          {title && (
            <Box>
              <Typography 
                level="h3" 
                sx={{ 
                  color: "#41301B", 
                  fontWeight: 700,
                  fontSize: { xs: "20px", sm: "24px", md: "28px" } // Responsive title
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography level="body-xs" textColor="text.tertiary" sx={{ mt: 0.2 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          )}

          {/* Mobile Actions: Refresh + Create */}
          <Box sx={{ display: { xs: "flex", md: "none" }, gap: 1, alignItems: "center" }}>
            {onRefresh && (
              <IconButton
                size="sm"
                variant="soft"
                onClick={onRefresh}
                disabled={isRefreshing}
                sx={{
                  height: 36,
                  width: 36,
                  bgcolor: "white",
                  border: "1px solid #e5e7eb",
                  color: "#00568c",
                  "&:hover": { bgcolor: "#f9fafb" },
                }}
              >
                <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
              </IconButton>
            )}
            {onCreate && (
              <Button
                size="sm"
                onClick={onCreate}
                sx={{
                  height: 36,
                  bgcolor: "#00568c",
                  color: "white",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  px: 1.5,
                  whiteSpace: "nowrap",
                  "&:hover": { bgcolor: "#004470" },
                }}
              >
                {createLabel}
              </Button>
            )}
          </Box>
        </Box>
      )}

      {children}
    </Box>
  );
}

interface ManagementToolbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onAdvancedToggle?: () => void;
}

/**
 * Standardized Toolbar for Management Pages.
 */
export function ManagementToolbar({ 
  searchQuery = "", 
  onSearchChange,
  searchPlaceholder = "Tìm kiếm...",
  filters, 
  actions,
  onAdvancedToggle
}: ManagementToolbarProps) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: { xs: 1.5, md: 3 }, // Increased gap for desktop
        mb: 2,
        alignItems: "center",
        width: "100%",
        justifyContent: "space-between",
        minWidth: 0,
      }}
    >
        {/* Left Section: Search & Filters */}
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flex: "1 1 auto", minWidth: 0 }}>
              <Box sx={{ flex: "1 1 auto", maxWidth: { lg: 360 }, minWidth: 0 }}>
                <Input 
                   startDecorator={<Search size={16} />}
                   placeholder={searchPlaceholder}
                   value={searchQuery}
                   onChange={e => onSearchChange?.(e.target.value)}
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
                     "& input": { fontSize: "14px" },
                     "&:hover": { borderColor: "#d1d5db" },
                     "&:focus-within": { borderColor: "#0665D0", boxShadow: "0 0 0 1px #0665D0" }
                   }}
                />
              </Box>
             
             {filters && (
                <Box sx={{ display: { xs: "none", lg: "flex" }, gap: 1, alignItems: "center", flex: "0 1 auto", minWidth: 0 }}>
                  {filters}
                </Box>
             )}
        </Box>

        {/* Mobile Filter Toggle Button */}
        {onAdvancedToggle && (
            <IconButton
              onClick={onAdvancedToggle}
              sx={{
                display: { xs: "flex", lg: "none" },
                height: 36, 
                width: 36, 
                flex: "0 0 auto",
                bgcolor: "white",
                color: "#00568c",
                borderRadius: "6px", 
                border: "1px solid #e5e7eb",
                transition: "all 0.2s",
                "&:hover": { bgcolor: "#f9f5f1", borderColor: "#d1d5db" }
              }}
            >
              <Filter size={18} />
            </IconButton>
        )}

        {/* Desktop Actions */}
        <Box sx={{ display: { xs: "none", md: "flex" }, flex: "0 0 auto", ml: "auto" }}>
          {actions}
        </Box>
    </Box>
  );
}
