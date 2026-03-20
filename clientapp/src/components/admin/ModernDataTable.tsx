import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { ModuleRegistry } from "ag-grid-community";
import { RowSelectionModule } from "ag-grid-community";
import { CellStyleModule } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community";
import { PaginationModule } from "ag-grid-community";
import { EventApiModule } from "ag-grid-community";
import { ValidationModule } from "ag-grid-community";
import {
  Clock
} from "lucide-react";
import { Box, Typography } from "@mui/joy";
import UserAvatar from "../UserAvatar";

// Register AG Grid modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  PaginationModule,
  RowSelectionModule, 
  CellStyleModule,
  EventApiModule,
  ValidationModule
]);

// Import ONLY Theming API (v34+ - NO ag-grid.css)
import "ag-grid-community/styles/ag-theme-quartz.css";

export interface ColumnConfig {
  key: string;
  label: string;
  width?: number;
  flexGrow?: number;
  fixed?: boolean | "left" | "right";
  sortable?: boolean;
  align?: "left" | "center" | "right";
  cellRenderer?: (rowData: any, rowIndex: number) => React.ReactNode;
}

interface ModernDataTableProps {
  data: any[];
  columns: ColumnConfig[];
  loading?: boolean;
  height?: number;
  // Server-side pagination props - chỉ dùng khi serverSidePagination = true
  page?: number;
  limit?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  // Selection
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectChange?: (keys: string[]) => void;
  rowKey?: string | ((rowData: any) => string);
  emptyMessage?: string;
  serverSidePagination?: boolean; // false = client-side (AG Grid), true = server-side (custom UI)
}

export default function ModernDataTable({
  data = [],
  columns,
  loading = false,
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  selectable = false,
  selectedKeys = [],
  onSelectChange,
  rowKey = "id",
  emptyMessage = "Không có dữ liệu",
  serverSidePagination = false,
}: ModernDataTableProps) {
  const gridRef = useRef<AgGridReact>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Client-side pagination settings
  const DEFAULT_PAGE_SIZE = 15;
  const PAGE_SIZE_OPTIONS = [15, 20, 30, 50];



  const getRowKey = useCallback((rowData: any): string => {
    if (typeof rowKey === "function") {
      return rowKey(rowData);
    }
    return rowData[rowKey];
  }, [rowKey]);


  const columnDefs = useMemo<ColDef[]>(() => {
    const defs: ColDef[] = [];

    // Checkbox column definition - MANUAL injection to avoid double render issues
    if (selectable) {
      defs.push({
        // headerCheckboxSelection: true,  <-- REMOVE Native behavior
        // headerCheckboxSelectionFilteredOnly: true, <-- REMOVE Native behavior
        headerComponent: HeaderCheckbox, // Use Custom Header Component
        width: 50,
        minWidth: 50,
        maxWidth: 50,
        pinned: "left",
        sortable: false,
        resizable: false,
        suppressSizeToFit: true,
        suppressNavigable: true, // Chặn AG Grid focus vào cell này khi click/tab
        cellRenderer: CheckboxCell,
        headerClass: "ag-custom-header-checkbox", 
      });
    }

    columns.forEach((col) => {
      defs.push({
        headerName: col.label,
        field: col.key,
        width: col.width,
        minWidth: col.width, // Add minWidth to prevent column shrinking
        flex: col.flexGrow,
        sortable: col.sortable !== false,
        resizable: true,
        suppressSizeToFit: true, // Prevent AG Grid from auto-sizing this column
        pinned:
          col.fixed === "left" || col.fixed === true
            ? "left"
            : col.fixed === "right"
            ? "right"
            : undefined,
        cellStyle: { textAlign: col.align || "left" },
        cellRenderer: (params: any) => {
          if (col.cellRenderer) {
            return col.cellRenderer(params.data, params.rowIndex);
          }
          return params.value;
        },
        valueFormatter: (params: any) => {
        
          if (params.value && typeof params.value === 'object') {
            return JSON.stringify(params.value);
          }
          return params.value;
        },
      });
    });

    return defs;
  }, [columns, selectable]);

  const onSelectionChanged = useCallback((event: SelectionChangedEvent) => {
    const selectedNodes = event.api.getSelectedNodes();
    const selectedIds = selectedNodes.map((node) => getRowKey(node.data));
    onSelectChange?.(selectedIds);
  }, [getRowKey, onSelectChange]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    if (selectedKeys.length > 0) {
      params.api.forEachNode((node) => {
        if (selectedKeys.includes(getRowKey(node.data))) {
          node.setSelected(true);
        }
      });
    }
  }, [selectedKeys, getRowKey]);

  // Handle pagination changes for server-side mode
  const onPaginationChanged = useCallback((event: any) => {
    if (serverSidePagination && gridRef.current) {
      const currentPage = event.api.paginationGetCurrentPage() + 1; // AG Grid uses 0-based index
      const currentPageSize = event.api.paginationGetPageSize();
      
      // Notify parent component of page change
      if (onPageChange && currentPage !== page) {
        onPageChange(currentPage);
      }
      
      // Notify parent component of page size change
      if (onLimitChange && currentPageSize !== limit) {
        onLimitChange(currentPageSize);
      }
    }
  }, [serverSidePagination, page, limit, onPageChange, onLimitChange]);

  // Calculate minimum width for the table
  const tableMinWidth = useMemo(() => {
    const checkboxWidth = selectable ? 50 : 0;
    const columnsWidth = columns.reduce((sum, col) => {
      return sum + (col.width || 150);
    }, 0);
    return checkboxWidth + columnsWidth;
  }, [columns, selectable]);

  return (
    <Box
      ref={containerRef}
      className="modern-data-table-container"
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        bgcolor: "white",
        borderRadius: "8px",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      <Box 
        className="table-wrapper" 
        sx={{ 
          flex: 1, 
          minHeight: 0,
          overflow: "auto", // Maintain wrapper scroll to preserve column widths
        }}
      >
        <div 
          className="ag-theme-quartz" 
          style={{ 
            height: "100%", 
            width: "100%",
            minWidth: `${tableMinWidth}px`, // Force minimum width to prevent shrinking
          }}
        >
          <AgGridReact
            ref={gridRef}
            rowData={data}
            columnDefs={columnDefs}
            rowSelection={selectable ? {
              mode: 'multiRow',
              checkboxes: false, // DISABLED native checkboxes to use Custom Renderer
              headerCheckbox: false,
              enableClickSelection: false,
            } : undefined}
            onSelectionChanged={onSelectionChanged}
            onGridReady={onGridReady}
            headerHeight={48}
            rowHeight={64}
            loading={loading}
            overlayNoRowsTemplate={`<span class="ag-overlay-loading-center">${emptyMessage}</span>`}
            defaultColDef={{
              sortable: true,
              resizable: true,
              suppressSizeToFit: true,
            }}
            pagination={!serverSidePagination}
            paginationPageSize={serverSidePagination ? undefined : (limit || DEFAULT_PAGE_SIZE)}
            paginationPageSizeSelector={serverSidePagination ? undefined : PAGE_SIZE_OPTIONS}
            suppressPaginationPanel={serverSidePagination}
            domLayout="normal"
            onPaginationChanged={serverSidePagination ? undefined : onPaginationChanged}
            suppressColumnVirtualisation={true}
            suppressDragLeaveHidesColumns={true}
            suppressCellFocus={true} // Stop AG Grid from focusing cells on click
            suppressHorizontalScroll={true} // Use wrapper's scroll to avoid double scrollbars
          />
        </div>
      </Box>

      {/* Custom Pagination cho Server-Side Mode */}
      {serverSidePagination && total !== undefined && page !== undefined && limit !== undefined && total > 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: { xs: "center", sm: "flex-end" },
            flexWrap: "wrap",
            gap: { xs: 1.5, sm: 3 },
            padding: { xs: "8px 12px", sm: "12px 16px" },
            borderTop: "1px solid #e5e7eb",
            backgroundColor: "#fafafa",
            minHeight: { xs: "auto", sm: "56px" },
          }}
        >
          {/* Page Size */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography level="body-sm" sx={{ color: "#4b5563", fontSize: "14px", whiteSpace: "nowrap", display: { xs: "none", sm: "block" } }}>
              Page Size:
            </Typography>
            <select
              value={limit}
              onChange={(e) => {
                const newLimit = Number(e.target.value);
                if (onLimitChange) {
                  onLimitChange(newLimit);
                  if (onPageChange) onPageChange(1);
                }
              }}
              style={{
                padding: "4px 8px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "white",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {[10, 15, 20, 30, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </Box>

          {/* Range Info - Hidden on tiny screens */}
          <Typography level="body-sm" sx={{ color: "#4b5563", fontSize: "13px", whiteSpace: "nowrap", display: { xs: "none", md: "block" } }}>
            {Math.min((page - 1) * limit + 1, total)} to {Math.min(page * limit, total)} of {total}
          </Typography>

          {/* Navigation Buttons */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box
              component="button"
              onClick={() => onPageChange && onPageChange(1)}
              disabled={page === 1 || loading}
              sx={{
                width: "28px",
                height: "28px",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                backgroundColor: page === 1 || loading ? "#f3f4f6" : "white",
                cursor: page === 1 || loading ? "not-allowed" : "pointer",
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                "&:hover:not(:disabled)": {
                  backgroundColor: "#f9fafb",
                },
              }}
              title="First page"
            >
              «
            </Box>
            <Box
              component="button"
              onClick={() => onPageChange && onPageChange(page - 1)}
              disabled={page === 1 || loading}
              sx={{
                width: "28px",
                height: "28px",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                backgroundColor: page === 1 || loading ? "#f3f4f6" : "white",
                cursor: page === 1 || loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                "&:hover:not(:disabled)": {
                  backgroundColor: "#f9fafb",
                },
              }}
              title="Previous page"
            >
              ‹
            </Box>
            <Typography
              level="body-sm"
              sx={{
                minWidth: { xs: "70px", sm: "100px" },
                textAlign: "center",
                color: "#374151",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              {page} / {Math.ceil(total / limit)}
            </Typography>
            <Box
              component="button"
              onClick={() => onPageChange && onPageChange(page + 1)}
              disabled={page >= Math.ceil(total / limit) || loading}
              sx={{
                width: "28px",
                height: "28px",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                backgroundColor: page >= Math.ceil(total / limit) || loading ? "#f3f4f6" : "white",
                cursor: page >= Math.ceil(total / limit) || loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                "&:hover:not(:disabled)": {
                  backgroundColor: "#f9fafb",
                },
              }}
              title="Next page"
            >
              ›
            </Box>
            <Box
              component="button"
              onClick={() => onPageChange && onPageChange(Math.ceil(total / limit))}
              disabled={page >= Math.ceil(total / limit) || loading}
              sx={{
                width: "28px",
                height: "28px",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                backgroundColor: page >= Math.ceil(total / limit) || loading ? "#f3f4f6" : "white",
                cursor: page >= Math.ceil(total / limit) || loading ? "not-allowed" : "pointer",
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                "&:hover:not(:disabled)": {
                  backgroundColor: "#f9fafb",
                },
              }}
              title="Last page"
            >
              »
            </Box>
          </Box>
        </Box>
      )}

      <style>{`
        .ag-theme-quartz {
          --ag-font-family: inherit;
          --ag-border-radius: 0;
          --ag-header-background-color: #f9fafb;
          --ag-header-foreground-color: #374151;
          --ag-header-column-separator-display: none;
          --ag-row-hover-color: transparent;
          --ag-selected-row-background-color: transparent;
          --ag-font-size: 14px;
          --ag-cell-horizontal-padding: 16px;
          --ag-cell-horizontal-border: 0;
          /* Focus color - Transparent to remove click separation */
          --ag-cell-focus-border-color: transparent;
          
          /* Remove all pinned section borders for seamless look by default */
          --ag-pinned-column-border: none; 
          --ag-pinned-left-header-border-right-color: transparent;
          --ag-pinned-right-header-border-left-color: transparent;
          --ag-pinned-row-border: none;
        }
        
        /* 1. FORCE BOX-SIZING FOR EVERYTHING */
        .ag-theme-quartz, .ag-theme-quartz * {
          box-sizing: border-box !important;
        }

        /* 2. KILL ALL PSEUDO-ELEMENTS (QUARTZ THEME USES THESE FOR BORDERS) */
        .ag-theme-quartz .ag-row::before,
        .ag-theme-quartz .ag-row::after,
        .ag-theme-quartz .ag-cell::before,
        .ag-theme-quartz .ag-cell::after {
          display: none !important;
          content: none !important;
        }

        /* 3. STABILIZE BORDERS ON ALL STATES */
        .ag-theme-quartz .ag-cell {
             border-right: 1px solid transparent !important;
             border-left: 1px solid transparent !important;
             border-top: none !important;
             border-bottom: 1px solid #f3f4f6 !important; /* Keep your divider stable */
             transition: none !important; /* Avoid transition reflows */
        }

        .ag-theme-quartz .ag-cell-focus,
        .ag-theme-quartz .ag-cell:active,
        .ag-theme-quartz .ag-cell:focus,
        .ag-theme-quartz .ag-cell:focus-within,
        .ag-theme-quartz .ag-row-focused,
        .ag-theme-quartz .ag-row-selected {
             outline: none !important;
             box-shadow: none !important;
             border-top: none !important;
             border-bottom: 1px solid #f3f4f6 !important; 
             z-index: auto !important; /* Prevent focus cell from jumping above others */
        }

        /* Additional fix for persistent header separators */
        .ag-theme-quartz .ag-header-cell-separator {
            display: none !important;
        }

        /* Remove vertical lines in header (pinned columns and cell borders) */
        .ag-theme-quartz .ag-header-cell,
        .ag-theme-quartz .ag-header-group-cell {
            border-right: none !important;
            border-left: none !important;
        }

        .ag-theme-quartz .ag-pinned-left-header {
            border-right: none !important;
        }

        .ag-theme-quartz .ag-pinned-right-header {
            border-left: none !important;
        }

        /* Header cell style - font-size giảm 2px so với cell */
        .ag-theme-quartz .ag-header-cell {
          padding: 12px 16px;
          font-weight: 600;
          font-size: 12px;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .ag-header-cell-label {
          font-weight: 600;
          font-size: 12px;
        }

        /* Header container */
        .ag-theme-quartz .ag-root-wrapper {
          border: none;
        }

        .ag-theme-quartz .ag-header {
          border-bottom: 2px solid #e5e7eb;
        }

        /* Cell body style - TĂNG FONT SIZE */
        .ag-theme-quartz .ag-cell {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px !important;
        }

        /* Force font-size cho tất cả text trong cell */
        .ag-theme-quartz .ag-cell * {
          font-size: inherit;
        }

        .ag-theme-quartz .ag-cell-value {
          font-size: 14px !important;
        }

        /* Typography trong cell */
        .ag-theme-quartz .ag-cell .MuiTypography-root {
          font-size: 14px !important;
        }

        .ag-theme-quartz .ag-cell .MuiTypography-body-sm {
          font-size: 14px !important;
        }

        .ag-theme-quartz .ag-cell .MuiTypography-body-xs {
          font-size: 13px !important;
        }

        /* Row hover */
        .ag-theme-quartz .ag-row:hover {
          background-color: #f9fafb !important;
        }

        /* Row selected - KHÔNG đổi màu nền khi checkbox được tick */
        .ag-theme-quartz .ag-row.ag-row-selected {
          background-color: transparent !important;
        }

        /* Row selected + hover - vẫn giữ màu hover nhẹ */
        .ag-theme-quartz .ag-row.ag-row-selected:hover {
          background-color: #f9fafb !important;
        }

        /* Checkbox Customization via Variables */
        .ag-theme-quartz {
          /* Checkbox Colors */
          --ag-checkbox-checked-color: #B88A4C; /* Color of the checked box */
          --ag-checkbox-background-color: #fff; /* Background of the unchecked box */
          --ag-checkbox-border-color: #d1d5db; /* Border color */
          --ag-checkbox-corner-radius: 4px; /* Rounding */
          
          /* Checkbox Size - slightly larger if needed, default is usually fine */
          --ag-checkbox-size: 18px;
        }

        /* Align checkboxes in center */
        .ag-theme-quartz .ag-selection-checkbox,
        .ag-theme-quartz .ag-header-select-all {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 100%;
        }

        /* Focus state */
        .ag-theme-quartz .ag-checkbox-input-wrapper:focus-within {
          box-shadow: 0 0 0 2px rgba(184, 138, 76, 0.2);
          border-color: #B88A4C;
        }
        
        /* Remove outline from the input itself as wrapper handles it */
        .ag-theme-quartz .ag-checkbox-input-wrapper input {
            outline: none;
        }

        /* Pagination panel - Chỉnh toàn bộ về bên phải */
        .ag-paging-panel {
          font-size: 13px !important;
          color: #374151;
          border-top: 1px solid #e5e7eb !important;
          height: auto !important;
          min-height: 48px !important;
          background-color: #fafafa;
          padding: 8px 16px !important;
          display: flex;
          align-items: center;
          justify-content: flex-end !important;
          gap: 16px;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .ag-paging-panel {
            justify-content: center !important;
            gap: 8px;
            padding: 8px !important;
          }

          .ag-paging-row-summary-panel {
            display: none !important;
          }

          .ag-paging-page-summary-panel {
            gap: 4px;
          }

          .ag-paging-button {
            width: 28px !important;
            height: 28px !important;
          }
        }

        /* Page size selector */
        .ag-paging-page-size {
          display: flex;
          align-items: center;
          gap: 8px;
          order: 1;
        }

        .ag-paging-page-size select {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background-color: white;
          font-size: 14px;
          cursor: pointer;
        }

        .ag-paging-page-size select:hover {
          border-color: #9ca3af;
        }

        /* Row summary - hiển thị "1 to 15 of X" */
        .ag-paging-row-summary-panel {
          font-size: 14px;
          color: #4b5563;
          font-weight: 400;
          order: 2;
        }

        /* Page summary và buttons */
        .ag-paging-page-summary-panel {
          display: flex;
          align-items: center;
          gap: 8px;
          order: 3;
        }

        /* Pagination buttons */
        .ag-paging-button {
          width: 32px !important;
          height: 32px !important;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
          background-color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .ag-paging-button:hover:not(.ag-disabled) {
          background-color: #f3f4f6;
          border-color: #9ca3af;
        }

        .ag-paging-button.ag-disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background-color: #f3f4f6;
        }

        /* Column separator - ẩn */
        .ag-theme-quartz .ag-header-cell-separator {
          display: none !important;
        }

        /* STRICTLY HIDE AG GRID NATIVE PAGINATION PANEL WHEN SERVER SIDE IS ON */
        ${serverSidePagination ? `
        .ag-paging-panel {
          display: none !important;
        }
        ` : ''}
      `}</style>
    </Box>
  );
}

// Helper Components for common cell renderers
// Custom Checkbox Renderer matching Permission Matrix style
const CheckboxCell: React.FC<any> = (params) => {
  const [checked, setChecked] = useState(params.node.isSelected());

  useEffect(() => {
    // Sync state when selection changes externally (e.g. Select All or other interactions)
    const onSelectionChanged = () => setChecked(params.node.isSelected());
    params.node.addEventListener('selectionChanged', onSelectionChanged);
    return () => params.node.removeEventListener('selectionChanged', onSelectionChanged);
  }, [params.node]);

  return (
    <Box 
      sx={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        height: "100%",
        width: "100%",
        cursor: "pointer",
        touchAction: "none",
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        params.node.setSelected(!checked);
      }}
    >
      <div className="custom-checkbox-wrapper" style={{ pointerEvents: 'none' }}>
        <input 
          type="checkbox"
          checked={checked}
          onChange={() => {}}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            width: '18px',
            height: '18px',
            border: '1.5px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: checked ? '#B88A4C' : 'white',
            borderColor: checked ? '#B88A4C' : '#d1d5db',
            backgroundImage: checked 
              ? `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2.5-2.5a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")` 
              : 'none',
            backgroundPosition: 'center',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            transition: 'all 0.1s ease-in-out',
            outline: 'none',
          }}
        />
      </div>
    </Box>
  );
};

// Custom Header Checkbox Component
const HeaderCheckbox: React.FC<any> = (params) => {
  const [checked, setChecked] = useState(false);
  const [indeterminate, setIndeterminate] = useState(false);

  useEffect(() => {
    const updateState = () => {
      // Safety check for API availability
      if (!params.api) return;

      // Check if pagination methods exist (Module might not be loaded or grid not ready)
      const hasPagination = typeof params.api.paginationGetFirstRowIndex === 'function' && 
                            typeof params.api.paginationGetLastRowIndex === 'function';

      // Fallback for non-paginated or error state: Check all filtered rows
      if (!hasPagination) {
         const selectedCount = params.api.getSelectedRows().length;
         const totalCount = params.api.getDisplayedRowCount();
         if (totalCount === 0) setChecked(false);
         else if (selectedCount === totalCount) setChecked(true);
         else if (selectedCount > 0) setIndeterminate(true);
         else { setChecked(false); setIndeterminate(false); }
         return;
      }
      
      const firstIndex = params.api.paginationGetFirstRowIndex();
      const lastIndex = params.api.paginationGetLastRowIndex(); 
      
      let selectedCount = 0;
      let pageRowCount = 0;

      if (firstIndex >= 0 && lastIndex >= 0) {
          for (let i = firstIndex; i <= lastIndex; i++) {
               const node = params.api.getDisplayedRowAtIndex(i);
               if (node) {
                   pageRowCount++;
                   if (node.isSelected()) {
                       selectedCount++;
                   }
               }
          }
      }

      if (pageRowCount === 0) {
        setChecked(false);
        setIndeterminate(false);
      } else if (selectedCount === pageRowCount) {
        setChecked(true);
        setIndeterminate(false);
      } else if (selectedCount > 0) {
        setChecked(false);
        setIndeterminate(true);
      } else {
        setChecked(false);
        setIndeterminate(false);
      }
    };
    
    // Listen to events
    const events = ['selectionChanged', 'paginationChanged', 'modelUpdated', 'rowDataUpdated'];
    events.forEach(event => params.api.addEventListener(event, updateState));
    
    // Initial check
    // setTimeout to allow grid to fully initialize if needed
    const timeoutId = setTimeout(updateState, 0);

    return () => {
        events.forEach(event => params.api.removeEventListener(event, updateState));
        clearTimeout(timeoutId);
    };
  }, [params.api]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Logic: 
    // If currently CHECKED -> Click means UNCHECK ALL
    // If currently INDETERMINATE -> Click means CHECK ALL (standard UX)
    // If currently UNCHECKED -> Click means CHECK ALL
    
    // However, the native checkbox 'onChange' event gives us the NEW state after the click.
    // So if it was Checked, it becomes Unchecked (newVal = false).
    // If it was Indeterminate (visually), the native input underlying state might be false or true depending on ref setup.
    // To be consistent, we should rely on our calculated 'checked' and 'indeterminate' state constants if possible, 
    // OR just use the 'newVal' from the event if the input is synced correctly.
    
    // Let's refine the logic to be explicit:
    // If we are currently "Checked" (all selected), we want to Deselect All.
    // If we are currently "Indeterminate" (some selected), the User expects to Deselect All (clear selection).
    // Only if we are "Unchecked" (none selected), we want to Select All.
    
    const shouldSelectAll = !checked && !indeterminate;
    // Explanation:
    // - checked=true, indeterminate=false (All Selected) => shouldSelectAll = false (Deselect)
    // - checked=false, indeterminate=true (Some Selected) => shouldSelectAll = false (Deselect)
    // - checked=false, indeterminate=false (None Selected) => shouldSelectAll = true (Select All)

    const hasPagination = params.api && typeof params.api.paginationGetFirstRowIndex === 'function';

    if (!hasPagination) {
        if (shouldSelectAll) params.api.selectAll();
        else params.api.deselectAll();
        return;
    }
    
    const firstIndex = params.api.paginationGetFirstRowIndex();
    const lastIndex = params.api.paginationGetLastRowIndex();

    if (firstIndex >= 0 && lastIndex >= 0) {
        for (let i = firstIndex; i <= lastIndex; i++) {
             const node = params.api.getDisplayedRowAtIndex(i);
             if (node) {
                 node.setSelected(shouldSelectAll);
             }
        }
    }
  };

  return (
    <Box 
      sx={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        height: "100%",
        width: "100%",
        cursor: "pointer",
        touchAction: "none", // Prevent scrolling while tapping
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onChange(null as any);
      }} 
    >
      <div className="custom-checkbox-wrapper" style={{ pointerEvents: 'none' }}>
        <input 
          type="checkbox"
          checked={checked}
          ref={(input) => {
            if (input) input.indeterminate = indeterminate;
          }}
          onChange={() => {}} 
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            width: '18px',
            height: '18px',
            border: '1.5px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: checked || indeterminate ? '#B88A4C' : 'white',
            borderColor: checked || indeterminate ? '#B88A4C' : '#d1d5db',
            backgroundImage: checked 
              ? `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2.5-2.5a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")`
              : indeterminate
              ? `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M3 8a1 1 0 011-1h8a1 1 0 011 1v0a1 1 0 01-1 1H4a1 1 0 01-1-1v0z'/%3e%3c/svg%3e")`
              : 'none',
            backgroundPosition: 'center',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            transition: 'all 0.1s ease-in-out',
            outline: 'none',
          }}
        />
      </div>
    </Box>
  );
};

export const DateTimeCell: React.FC<{ date: string }> = ({ date }) => {
  if (!date) return <span style={{ color: "#9ca3af" }}>-</span>;

  const d = new Date(date);
  const timePart = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const datePart = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formattedDate = `${timePart} ${datePart}`;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <Clock size={16} color="#9ca3af" />
      <Typography level="body-xs" sx={{ color: "#374151" }}>
        {formattedDate}
      </Typography>
    </Box>
  );
};

export const UserCell: React.FC<{
  avatar?: string;
  name: string;
  username?: string;
}> = ({ avatar, name, username }) => {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "12px", py: 0.5 }}>
      <UserAvatar
        avatar={avatar}
        display_name={name}
        size={35}
        showOnlineStatus={false}
      />
      <Box sx={{ py: 0.5 }}>
        <Typography level="body-sm" fontWeight="600" sx={{ color: "#111827", lineHeight: 1.2 }}>
          {name}
        </Typography>
        {username && (
          <Typography level="body-xs" sx={{ color: "#6b7280" }}>
            @{username}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

