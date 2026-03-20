import { type ReactNode, useMemo, useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Notification, Panel, Pagination, Stack, useToaster } from "rsuite";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type {
    ColDef,
    ColSpanParams,
    GetRowIdParams,
    GridReadyEvent,
    ICellRendererParams,
    GridApi,
    GridOptions,
    ValueFormatterParams,
    ValueGetterParams,
    ValueParserParams,
    ValueSetterParams
} from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";

export type DataTableColumn<TData> = {
    key: string;
    header: ReactNode;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    flexGrow?: number;
    align?: "left" | "center" | "right";
    fixed?: boolean | "left" | "right";
    dataKey?: keyof TData;
    render?: (row: TData) => ReactNode;
    cellClassName?: string;
    headerClassName?: string;
    sortable?: boolean;
    resizable?: boolean;
    filter?: ColDef<TData>["filter"]; // enable default or provide filter type
    filterParams?: ColDef<TData>["filterParams"];
    editable?: boolean;
    valueFormatter?: (params: ValueFormatterParams<TData>) => string | number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    valueParser?: (params: ValueParserParams<TData>) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    valueGetter?: (params: ValueGetterParams<TData>) => any;
    valueSetter?: (params: ValueSetterParams<TData>) => boolean;
    comparator?: ColDef<TData>["comparator"];
    checkboxSelection?: boolean;
    headerCheckboxSelection?: boolean;
    rowDrag?: boolean;
    visible?: boolean;
    suppressSizeToFit?: boolean;
    colSpan?: (params: ColSpanParams<TData>) => number;
};

type GridRowSelectionConfig<TData> = Exclude<
    GridOptions<TData>["rowSelection"],
    "single" | "multiple" | "none" | undefined
>;

type DataTableRowSelection<TData> =
    | "single"
    | "multiple"
    | "none"
    | GridRowSelectionConfig<TData>;

type DataTableProps<TData> = {
    data?: TData[];
    total?: number;
    page?: number;
    limit?: number;
    onChangePage?: (page: number) => void;
    onChangeLimit?: (limit: number) => void;
    columns: Array<DataTableColumn<TData>>;
    limitOptions?: number[];
    rowKey?: keyof TData;
    classNamePrefix?: string;
    panelClassName?: string;
    tableClassName?: string;
    paginationClassName?: string;
    rowsCountClassName?: string;
    visuallyHiddenClassName?: string;
    renderRowsCount?: (limit: number, page: number, total: number) => ReactNode;
    quickFilterText?: string;
    rowSelection?: DataTableRowSelection<TData>;
    /** @deprecated Use rowSelection.enableClickSelection (and related options) instead. */
    suppressRowClickSelection?: boolean;
    onSelectionChange?: (rows: TData[]) => void;
    enablePagination?: boolean;
    enableNativePagination?: boolean;
    serverSidePagination?: boolean;
    gridHeight?: number | string;
    autoFitHeight?: boolean;
    autoFitBottomGap?: number;
    minAutoFitHeight?: number;
    autoFitWatchKeys?: unknown[];
    enableContextMenu?: boolean;
    pinnedTopRowData?: TData[];
    // Tree Data / Row Grouping
    treeData?: boolean;
    getDataPath?: (data: TData) => string[];
    autoGroupColumnDef?: ColDef<TData>;
    groupDefaultExpanded?: number;
    // Infinite Row Model (server-side fetching)
    rowModelType?: "clientSide" | "infinite";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchRows?: (args: { startRow: number; endRow: number; sortModel: any; filterModel: any }) => Promise<{ rows: TData[]; total: number }>;
    cacheBlockSize?: number;
    maxBlocksInCache?: number;
    onApiReady?: (api: GridApi<TData>) => void;
    onCellClicked?: (row: TData, colKey: string) => void;
};

type ContextMenuItemIcon =
    | "cut"
    | "copy"
    | "copy-header"
    | "clipboard"
    | "chart"
    | "export"
    | "view"
    | "edit"
    | "delete"
    | "blank";

type ContextMenuItemEntry = {
    type: "item";
    key: string;
    label: string;
    action?: () => void | Promise<void>;
    disabled?: boolean;
    shortcut?: string;
    submenu?: ContextMenuEntry[];
    icon?: ContextMenuItemIcon;
};

type ContextMenuSeparatorEntry = {
    type: "separator";
    key: string;
};

type ContextMenuEntry = ContextMenuItemEntry | ContextMenuSeparatorEntry;

const DEFAULT_MULTI_ROW_SELECTION = Object.freeze({
    mode: "multiRow" as const,
    enableClickSelection: true as const,
    enableSelectionWithoutKeys: true as const
});

const renderContextMenuIcon = (icon?: ContextMenuItemEntry["icon"]): ReactNode => {
    if (!icon || icon === "blank") {
        return null;
    }

    const commonProps = {
        width: 18,
        height: 18,
        viewBox: "0 0 18 18",
        fill: "none",
        role: "presentation" as const,
        focusable: false,
        "aria-hidden": true
    };

    switch (icon) {
        case "cut":
            return (
                <svg {...commonProps}>
                    <circle cx={5.25} cy={5.25} r={2.1} stroke="currentColor" strokeWidth={1.3} />
                    <circle cx={5.25} cy={12.75} r={2.1} stroke="currentColor" strokeWidth={1.3} />
                    <path d="M7.8 6.3 15 3.3" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
                    <path d="M7.8 11.7 15 14.7" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
                    <path d="M15 9h-6" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
                </svg>
            );
        case "copy":
            return (
                <svg {...commonProps}>
                    <rect
                        x={5.35}
                        y={2.55}
                        width={7.4}
                        height={9.4}
                        rx={1.4}
                        stroke="currentColor"
                        strokeWidth={1.3}
                    />
                    <rect
                        x={4.1}
                        y={6.05}
                        width={7.4}
                        height={9.4}
                        rx={1.4}
                        stroke="currentColor"
                        strokeWidth={1.3}
                        fill="rgba(148, 163, 184, 0.08)"
                    />
                </svg>
            );
        case "copy-header":
            return (
                <svg {...commonProps}>
                    <rect
                        x={5.35}
                        y={2.55}
                        width={7.4}
                        height={9.4}
                        rx={1.4}
                        stroke="currentColor"
                        strokeWidth={1.3}
                        fill="rgba(148, 163, 184, 0.08)"
                    />
                    <rect
                        x={4.1}
                        y={6.05}
                        width={7.4}
                        height={9.4}
                        rx={1.4}
                        stroke="currentColor"
                        strokeWidth={1.3}
                        fill="rgba(148, 163, 184, 0.08)"
                    />
                    <rect
                        x={5.95}
                        y={3.55}
                        width={5}
                        height={2}
                        rx={0.8}
                        fill="currentColor"
                        opacity={0.35}
                    />
                </svg>
            );
        case "clipboard":
            return (
                <svg {...commonProps}>
                    <rect
                        x={5.1}
                        y={4.2}
                        width={7.8}
                        height={10.2}
                        rx={1.3}
                        stroke="currentColor"
                        strokeWidth={1.3}
                    />
                    <rect
                        x={6.4}
                        y={2.7}
                        width={5.1}
                        height={1.6}
                        rx={0.7}
                        fill="currentColor"
                        opacity={0.25}
                    />
                    <path
                        d="M6.3 6.6h4.8"
                        stroke="currentColor"
                        strokeWidth={1.2}
                        strokeLinecap="round"
                    />
                    <path
                        d="M6.3 9h4.8"
                        stroke="currentColor"
                        strokeWidth={1.2}
                        strokeLinecap="round"
                    />
                </svg>
            );
        case "chart":
            return (
                <svg {...commonProps}>
                    <rect x={3.5} y={8.8} width={2.1} height={4.7} rx={0.7} fill="currentColor" opacity={0.45} />
                    <rect x={7.05} y={6.6} width={2.1} height={6.9} rx={0.7} fill="currentColor" opacity={0.75} />
                    <rect x={10.6} y={4.4} width={2.1} height={9.1} rx={0.7} fill="currentColor" />
                    <path d="M3 14.7h12" stroke="currentColor" strokeWidth={1.1} strokeLinecap="round" opacity={0.35} />
                </svg>
            );
        case "export":
            return (
                <svg {...commonProps}>
                    <path
                        d="M6 12.6h6.4a1.1 1.1 0 0 0 1.1-1.1V4.5"
                        stroke="currentColor"
                        strokeWidth={1.3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.85}
                    />
                    <path
                        d="M9.8 6.2 12 4 9.8 1.8"
                        stroke="currentColor"
                        strokeWidth={1.3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path d="M12 4H3.6a1.1 1.1 0 0 0-1.1 1.1v8.1" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
                </svg>
            );
        default:
            return null;
    }
};

const DataTable = <TData,>({
    data = [],
    total = 0,
    page,
    limit,
    onChangePage,
    onChangeLimit,
    columns,
    limitOptions = [20, 50, 100],
    rowKey,
    classNamePrefix = "data-management",
    panelClassName,
    tableClassName,
    paginationClassName,
    rowsCountClassName,

    renderRowsCount,
    quickFilterText,
    rowSelection: rowSelectionProp,
    suppressRowClickSelection = false,
    onSelectionChange,
    enablePagination = true,
    gridHeight,
    autoFitHeight = true,
    autoFitBottomGap = 16,
    minAutoFitHeight = 240,
    autoFitWatchKeys,
    enableContextMenu = false,
    pinnedTopRowData,
    treeData,
    getDataPath,
    autoGroupColumnDef,
    groupDefaultExpanded,
    rowModelType,
    fetchRows,
    cacheBlockSize = 100,
    maxBlocksInCache = 10,
    onApiReady,
    onCellClicked,
    enableNativePagination,
    serverSidePagination
}: DataTableProps<TData>) => {
    const withPrefix = (element?: string) =>
        element ? `${classNamePrefix}__${element}` : classNamePrefix;

    const resolvedPanelClass = panelClassName ?? withPrefix("table-panel");
    const resolvedTableClass = tableClassName ?? withPrefix("table");
    const resolvedPaginationClass = paginationClassName ?? withPrefix("pagination");
    const resolvedRowsCountClass = rowsCountClassName ?? withPrefix("rows-count");

    const gridClass = `${resolvedTableClass} ag-theme-quartz`;
    const gridRef = useRef<AgGridReact<TData>>(null);
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const toaster = useToaster();
    const hasRowDragColumn = useMemo(() => columns.some(column => column.rowDrag), [columns]);
    const gridApiRef = useRef<GridApi<TData> | null>(null);
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        const map: Record<string, boolean> = {};
        columns.forEach(column => {
            map[column.key] = column.visible !== false;
        });
        return map;
    });
    const [openSubmenuKey, setOpenSubmenuKey] = useState<string | null>(null);
    const [activeItemKey, setActiveItemKey] = useState<string | null>(null);
    const [autoHeight, setAutoHeight] = useState<string | undefined>(undefined);
    const autoFitWatchSignature = useMemo(() => {
        if (!autoFitWatchKeys || autoFitWatchKeys.length === 0) {
            return "";
        }

        return autoFitWatchKeys
            .map(item => {
                if (item === null || item === undefined) {
                    return String(item);
                }

                if (typeof item === "object") {
                    try {
                        return JSON.stringify(item);
                    } catch {
                        return String(item);
                    }
                }

                return String(item);
            })
            .join("|");
    }, [autoFitWatchKeys]);

    const normalizedRowSelection = rowSelectionProp ?? DEFAULT_MULTI_ROW_SELECTION;

    const resolvedRowSelection = useMemo<GridOptions<TData>["rowSelection"]>(() => {
        if (!normalizedRowSelection || normalizedRowSelection === "none") {
            return undefined;
        }

        type RowSelectionDefaults = {
            enableClickSelection?: boolean | "enableSelection" | "enableDeselection";
            enableSelectionWithoutKeys?: boolean;
        };

        const applyClickSelectionPreference = (
            config: DataTableRowSelection<TData>,
            defaults: RowSelectionDefaults = {}
        ): GridOptions<TData>["rowSelection"] => {
            if (typeof config !== "object" || config === null) {
                return config as GridOptions<TData>["rowSelection"];
            }

            const nextConfig: Record<string, unknown> = { ...config };

            if (suppressRowClickSelection) {
                nextConfig["enableClickSelection"] = false;
            } else if (
                defaults.enableClickSelection !== undefined &&
                nextConfig["enableClickSelection"] === undefined
            ) {
                nextConfig["enableClickSelection"] = defaults.enableClickSelection;
            }

            if (
                !suppressRowClickSelection &&
                defaults.enableSelectionWithoutKeys !== undefined &&
                nextConfig["enableSelectionWithoutKeys"] === undefined
            ) {
                nextConfig["enableSelectionWithoutKeys"] = defaults.enableSelectionWithoutKeys;
            }

            return nextConfig as unknown as GridOptions<TData>["rowSelection"];
        };

        if (typeof normalizedRowSelection !== "string") {
            return applyClickSelectionPreference(normalizedRowSelection);
        }

        if (normalizedRowSelection === "single") {
            return applyClickSelectionPreference({ mode: "singleRow" }, { enableClickSelection: true });
        }

        return applyClickSelectionPreference(
            { mode: "multiRow" },
            {
                enableClickSelection: true,
                enableSelectionWithoutKeys: true
            }
        );
    }, [normalizedRowSelection, suppressRowClickSelection]);

    useEffect(() => {
        if (suppressRowClickSelection) {
            console.warn(
                "DataTable: suppressRowClickSelection is deprecated. The component now manages rowSelection.enableClickSelection automatically."
            );
        }
    }, [suppressRowClickSelection]);

    const pushToast = useCallback(
        (header: string, message: string, type: "success" | "info" | "warning" | "error" = "success") => {
            if (!toaster) {
                console.warn("RSuite toaster instance is unavailable", { header, message, type });
                return;
            }

            try {
                toaster.push(
                    <Notification closable type={type} header={header}>
                        <span>{message}</span>
                    </Notification>,
                    { placement: "topEnd", duration: 3500 }
                );
            } catch (error) {
                console.error("Failed to push toast", error, { header, message, type });
            }
        },
        [toaster]
    );

    useEffect(() => {
        setColumnVisibility(previous => {
            const next: Record<string, boolean> = {};
            columns.forEach(column => {
                next[column.key] = previous[column.key] ?? (column.visible !== false);
            });
            return next;
        });
    }, [columns]);

    const getRowId = useMemo(() => {
        const generateFallbackId = () =>
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? (crypto.randomUUID as () => string)()
                : Math.random().toString(36).slice(2);

        if (rowKey) {
            return (params: GetRowIdParams<TData>) => {
                const data = params.data as TData | undefined;
                const value = data?.[rowKey];

                if (value != null) {
                    return String(value);
                }

                const fallback = (data as Record<string, unknown> | undefined)?.id ?? generateFallbackId();
                return String(fallback);
            };
        }

        return (params: GetRowIdParams<TData>) => {
            const data = params.data as TData | undefined;
            const candidate = (data as Record<string, unknown> | undefined)?.id ?? generateFallbackId();
            return String(candidate);
        };
    }, [rowKey]);

 const columnDefs = useMemo<ColDef<TData>[]>(() => {
        const mappedColumnDefs = columns.map(column => {
            const cellClasses: string[] = [];
            const headerClasses: string[] = [];

            if (column.cellClassName) {
                cellClasses.push(column.cellClassName);
            }

            if (column.headerClassName) {
                headerClasses.push(column.headerClassName);
            }

            if (column.align === "center") {
                cellClasses.push("ag-center-aligned-cell");
                headerClasses.push("ag-center-aligned-header");
            } else if (column.align === "right") {
                cellClasses.push("ag-right-aligned-cell");
                headerClasses.push("ag-right-aligned-header");
            }

            const pinned = column.fixed === true ? "left" : column.fixed;

            const isVisible = columnVisibility[column.key] ?? true;
            const hasExplicitWidth = column.width !== undefined;

            const colDef: ColDef<TData> = {
                colId: column.key,
                width: column.width,
                // Allow smaller widths than default if explicit width is set
                minWidth: column.minWidth ?? (hasExplicitWidth ? column.width : undefined),
                maxWidth: column.maxWidth,
                // If width is explicit, disable flex unless explicitly set
                flex: column.flexGrow ?? (hasExplicitWidth ? 0 : undefined),
                pinned: pinned === "left" || pinned === "right" ? pinned : undefined,
                sortable: column.sortable ?? undefined,
                resizable: column.resizable ?? true,
                cellClass: cellClasses.length ? cellClasses.join(" ") : undefined,
                headerClass: headerClasses.length ? headerClasses.join(" ") : undefined,
                hide: !isVisible,
                // Prevent sizeColumnsToFit from resizing fixed-width columns
                suppressSizeToFit: column.suppressSizeToFit ?? hasExplicitWidth
            };

            if (typeof column.header === "string") {
                colDef.headerName = column.header;
            } else if (column.header !== undefined) {
                const HeaderComponent = () => <>{column.header}</>;
                colDef.headerComponent = HeaderComponent;
            }

            if (column.render) {
                colDef.cellRenderer = (params: ICellRendererParams<TData>) => {
                    if (!params.data) {
                        return null;
                    }
                    return column.render!(params.data as TData);
                };
                // Set field to enable filtering/sorting even with custom renderer
                if (column.dataKey) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    colDef.field = column.dataKey as any;
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    colDef.field = column.key as any;
                }
            } else if (column.dataKey) {
                const dataKey = column.dataKey;
                colDef.valueGetter = params => {
                    const data = params.data as TData | undefined;
                    return data ? (data[dataKey] as unknown) : null;
                };
            } else {
                // If no render and no dataKey, use colId as field
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                colDef.field = column.key as any;
            }

            if (column.colSpan) {
                colDef.colSpan = params => column.colSpan!(params as ColSpanParams<TData>);
            }

            if (column.filter !== undefined) {
                colDef.filter = column.filter;
                if (column.filter === false) {
                    colDef.floatingFilter = false;
                }
            } else {
                colDef.filter = false;
            }

            if (column.filterParams) {
                colDef.filterParams = column.filterParams;
            }

            if (column.editable !== undefined) {
                colDef.editable = column.editable;
            }

            if (column.valueFormatter) {
                colDef.valueFormatter = params => {
                    const result = column.valueFormatter!(params as ValueFormatterParams<TData>);
                    return result == null ? "" : String(result);
                };
            }

            if (column.valueParser) {
                colDef.valueParser = params => column.valueParser!(params as ValueParserParams<TData>);
            }

            if (column.valueGetter) {
                colDef.valueGetter = params => column.valueGetter!(params as ValueGetterParams<TData>);
            }

            if (column.valueSetter) {
                colDef.valueSetter = params => column.valueSetter!(params as ValueSetterParams<TData>);
            }

            if (column.comparator) {
                colDef.comparator = column.comparator;
            }

            colDef.checkboxSelection = column.checkboxSelection === true;
            colDef.headerCheckboxSelection = column.headerCheckboxSelection === true;

            if (column.rowDrag !== undefined) {
                colDef.rowDrag = column.rowDrag;
            }

            return colDef;
        });

        return mappedColumnDefs;
    }, [columnVisibility, columns]);

    const defaultColDef = useMemo<ColDef>(() => ({
        sortable: false,
        filter: false,
        floatingFilter: false,
        resizable: true,
        editable: false,
        enableRowGroup: false,
        enablePivot: false,
        minWidth: 120,
        flex: 1,
        suppressHeaderMenuButton: false,
        headerClass: 'text-gray-500 bg-gray-50',
        cellStyle: { display: 'flex', alignItems: 'center', height: '100%', overflow: 'hidden' }
    }), []);
    

    const applyQuickFilter = useCallback((api: GridReadyEvent<TData>["api"], value: string | undefined) => {
        const nextValue = value ?? "";

        if (typeof api.setGridOption === "function") {
            api.setGridOption("quickFilterText", nextValue);
            return;
        }

        const legacyApi = api as unknown as { setQuickFilter?: (text: string) => void };
        legacyApi.setQuickFilter?.(nextValue);
    }, []);

    const datasource = useMemo(() => {
        if (rowModelType !== "infinite" || !fetchRows) {
            return undefined;
        }

        return {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            getRows: async (params: any) => {
                try {
                    const { startRow, endRow, sortModel, filterModel } = params;
                    const result = await fetchRows({ startRow, endRow, sortModel, filterModel });
                    const lastRow = typeof result.total === "number" ? result.total : undefined;
                    params.successCallback(result.rows, lastRow);

                    if (result.total === 0) {
                        gridApiRef.current?.showNoRowsOverlay();
                    } else {
                        gridApiRef.current?.hideOverlay();
                    }
                } catch (error) {
                    console.error("Infinite datasource getRows failed", error);
                    params.failCallback?.();
                    gridApiRef.current?.showNoRowsOverlay();
                }
            }
        };
    }, [fetchRows, rowModelType]);

    const onGridReady = useCallback(
        (event: GridReadyEvent<TData>) => {
            gridApiRef.current = event.api;

            if (quickFilterText) {
                applyQuickFilter(event.api, quickFilterText);
            }

            onApiReady?.(event.api);
            event.api.resetColumnState(); // Force reset to clear stale overrides (e.g. ghost checkboxes)
            event.api.sizeColumnsToFit();
        },
        [applyQuickFilter, onApiReady, quickFilterText]
    );

    useEffect(() => {
        if (gridApiRef.current) {
            applyQuickFilter(gridApiRef.current, quickFilterText);
        }
    }, [applyQuickFilter, quickFilterText]);

    const handleSelectionChanged = useCallback(() => {
        if (!onSelectionChange || !gridApiRef.current) {
            return;
        }

        const selectedRows = gridApiRef.current.getSelectedRows() as TData[];
        onSelectionChange(selectedRows);
    }, [onSelectionChange]);

    const handleExportCsv = useCallback(() => {
        const api = gridApiRef.current;

        if (!api) {
            pushToast("Không thể xuất", "Lưới chưa sẵn sàng để xuất dữ liệu.", "warning");
            return;
        }

        try {
            api.exportDataAsCsv();
            pushToast("Xuất CSV", "Tệp CSV đang được chuẩn bị để tải xuống.");
        } catch (error) {
            console.error("CSV export failed", error);
            pushToast("Không thể xuất", "Đã xảy ra lỗi khi xuất CSV. Vui lòng thử lại.", "error");
        }
    }, [pushToast]);





    const [contextMenuState, setContextMenuState] = useState<{
        visible: boolean;
        x: number;
        y: number;
        value: string;
        rowData: TData | null;
        columnId: string | null;
        headerName: string | null;
    }>({ visible: false, x: 0, y: 0, value: "", rowData: null, columnId: null, headerName: null });

    const hideContextMenu = useCallback(() => {
        setContextMenuState(state => (state.visible ? { ...state, visible: false } : state));
        setOpenSubmenuKey(null);
        setActiveItemKey(null);
    }, []);

    useEffect(() => {
        if (!enableContextMenu || !contextMenuState.visible) {
            return;
        }

        const handleClick = () => hideContextMenu();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                hideContextMenu();
            }
        };

        document.addEventListener("click", handleClick);
        document.addEventListener("contextmenu", handleClick);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("click", handleClick);
            document.removeEventListener("contextmenu", handleClick);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [contextMenuState.visible, enableContextMenu, hideContextMenu]);

    const handleCopy = useCallback(
        async (value: string, successMessage?: string) => {
            const text = value ?? "";
            const fallbackCopy = () => {
                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.style.position = "fixed";
                textarea.style.top = "-9999px";
                document.body.appendChild(textarea);

                try {
                    textarea.focus();
                    textarea.select();
                    return document.execCommand("copy");
                } catch (fallbackError) {
                    console.error("Textarea copy fallback failed", fallbackError);
                    return false;
                } finally {
                    document.body.removeChild(textarea);
                }
            };

            let copied = false;

            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(text);
                    copied = true;
                } else {
                    copied = fallbackCopy();
                }
            } catch (error) {
                console.error("Clipboard copy failed", error);
                copied = fallbackCopy();
            }

            if (copied) {
                pushToast("Đã sao chép", successMessage ?? "Nội dung đã được sao chép vào clipboard.");
            } else {
                pushToast("Không thể sao chép", "Đã xảy ra lỗi khi sao chép nội dung. Vui lòng thử lại.", "error");
            }
        },
        [pushToast]
    );

    const handleCopyRowJson = useCallback(async () => {
        const rowData = contextMenuState.rowData;
        if (!rowData) {
            pushToast("Không có dữ liệu", "Không tìm thấy bản ghi để sao chép.", "warning");
            return;
        }

        const formatted = JSON.stringify(rowData, null, 2);
        await handleCopy(formatted, "Thông tin bản ghi đã được sao chép.");
    }, [contextMenuState.rowData, handleCopy, pushToast]);

    const handleCopyWithHeader = useCallback(async () => {
        const headerLabel = contextMenuState.headerName ?? contextMenuState.columnId ?? "Cột";
        const text = `${headerLabel}\n${contextMenuState.value}`;
        await handleCopy(text, "Ô dữ liệu và tiêu đề đã được sao chép.");
    }, [contextMenuState, handleCopy]);

    const handleCopyWithGroupHeaders = useCallback(async () => {
        const headerLabel = contextMenuState.headerName ?? contextMenuState.columnId ?? "Cột";
        const text = `Nhóm > ${headerLabel}\n${contextMenuState.value}`;
        await handleCopy(text, "Ô dữ liệu cùng nhóm tiêu đề đã được sao chép.");
    }, [contextMenuState, handleCopy]);

    const exportItems = useMemo<ContextMenuEntry[]>(
        () => [
            {
                type: "item",
                key: "export-csv",
                label: "Xuất CSV",
                action: handleExportCsv,
                icon: "export"
            },
            {
                type: "item",
                key: "export-xlsx",
                label: "Excel (.xlsx)",
                disabled: true,
                icon: "export"
            },
            {
                type: "item",
                key: "export-xml",
                label: "Excel (.xml)",
                disabled: true,
                icon: "export"
            },
            {
                type: "separator",
                key: "export-separator"
            },
            {
                type: "item",
                key: "export-copy-row-json",
                label: "Sao chép dòng (JSON)",
                action: handleCopyRowJson,
                icon: "clipboard"
            }
        ],
        [handleCopyRowJson, handleExportCsv]
    );

    const contextMenuItems = useMemo<ContextMenuEntry[]>(
        () => [
            {
                type: "item",
                key: "copy",
                label: "Sao chép",
                action: () => handleCopy(contextMenuState.value, "Ô dữ liệu đã được sao chép."),
                shortcut: "Ctrl+C",
                icon: "copy"
            },
            {
                type: "item",
                key: "copy-with-headers",
                label: "Sao chép kèm tiêu đề",
                action: handleCopyWithHeader,
                icon: "copy-header"
            },
            {
                type: "item",
                key: "copy-with-group-headers",
                label: "Sao chép kèm nhóm tiêu đề",
                action: handleCopyWithGroupHeaders,
                icon: "copy-header"
            },
            {
                type: "item",
                key: "export",
                label: "Xuất dữ liệu",
                submenu: exportItems,
                icon: "export"
            }
        ],
        [contextMenuState.value, exportItems, handleCopy, handleCopyWithGroupHeaders, handleCopyWithHeader]
    );



    const hasPagination = (enablePagination || serverSidePagination) && onChangePage && onChangeLimit;
    const resolvedLimitOptions = limitOptions ?? [10, 15, 20, 30];
    const currentPage = page ?? 1;
    const currentLimit = limit ?? resolvedLimitOptions[0];
    const resolvedGridHeight = useMemo(() => {
        if (gridHeight !== undefined) {
            return typeof gridHeight === "number" ? `${gridHeight}px` : gridHeight;
        }

        if (autoFitHeight) {
            return autoHeight ?? "520px";
        }

        return "520px";
    }, [autoHeight, autoFitHeight, gridHeight]);

    const recalculateAutoHeight = useCallback(() => {
        if (!autoFitHeight) {
            return;
        }

        const container = gridContainerRef.current;
        if (!container || typeof window === "undefined") {
            return;
        }

        const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
        const rect = container.getBoundingClientRect();
        const paginationHeight = hasPagination ? 50 : 0;
        const available = viewportHeight - rect.top - autoFitBottomGap - paginationHeight;
        const next = Math.max(available, minAutoFitHeight);
        setAutoHeight(`${Math.round(next)}px`);
    }, [autoFitBottomGap, autoFitHeight, hasPagination, minAutoFitHeight]);

    useEffect(() => {
        if (!autoFitHeight || gridHeight !== undefined) {
            return;
        }

        const handleResize = () => {
            recalculateAutoHeight();
        };

        recalculateAutoHeight();
        if (typeof window !== "undefined") {
            window.addEventListener("resize", handleResize);
        }

        const container = gridContainerRef.current;
        const parent = container?.parentElement;
        let observer: ResizeObserver | null = null;

        if (typeof ResizeObserver !== "undefined" && parent) {
            observer = new ResizeObserver(() => {
                recalculateAutoHeight();
            });
            observer.observe(parent);
        }

        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("resize", handleResize);
            }
            observer?.disconnect();
        };
    }, [autoFitHeight, gridHeight, recalculateAutoHeight]);

    useEffect(() => {
        if (!autoFitHeight || hasPagination || gridHeight !== undefined) {
            return;
        }

        recalculateAutoHeight();
    }, [autoFitHeight, gridHeight, recalculateAutoHeight, autoFitWatchSignature]);

    const renderRowsCountDefault = () => `Số hàng trên trang: ${currentLimit}`;

    const handleChangePage = useCallback(
        (nextPage: number) => {
            onChangePage?.(nextPage);
        },
        [onChangePage]
    );

    const handleChangeLimit = useCallback(
        (nextLimit: number) => {
            onChangeLimit?.(nextLimit);
        },
        [onChangeLimit]
    );

    const contextMenuPortal = enableContextMenu && contextMenuState.visible
        ? createPortal(
            <div
                role="menu"
                className={withPrefix("context-menu")}
                style={{
                    position: "fixed",
                    top: contextMenuState.y,
                    left: contextMenuState.x,
                    zIndex: 2000,
                    minWidth: 240
                }}
            >
                <div className={withPrefix("context-menu-list")}>
                    {contextMenuItems.map(entry => {
                        if (entry.type === "separator") {
                            return <div key={entry.key} className={withPrefix("context-menu-separator")} />;
                        }

                        const { key, label, shortcut, disabled, submenu, icon = "blank" } = entry;
                        const isOpen = openSubmenuKey === key;
                        const isActive = activeItemKey === key;
                        const itemClass = [
                            withPrefix("context-menu-item"),
                            disabled ? "is-disabled" : "",
                            submenu ? "has-submenu" : "",
                            isOpen ? "is-open" : "",
                            isActive ? "is-active" : ""
                        ]
                            .filter(Boolean)
                            .join(" ");

                        const iconNode = renderContextMenuIcon(icon);

                        return (
                            <div
                                key={key}
                                role="menuitem"
                                className={itemClass}
                                tabIndex={disabled ? -1 : 0}
                                onMouseEnter={() => {
                                    if (!disabled) {
                                        setActiveItemKey(key);
                                    }
                                    if (!submenu) {
                                        setOpenSubmenuKey(null);
                                    } else {
                                        setOpenSubmenuKey(key);
                                    }
                                }}
                                onClick={event => {
                                    event.preventDefault();
                                    event.stopPropagation();

                                    if (disabled) {
                                        return;
                                    }

                                    if (submenu) {
                                        setOpenSubmenuKey(key);
                                        return;
                                    }

                                    Promise.resolve(entry.action?.())
                                        .catch(error => {
                                            console.error("Context menu action failed", error);
                                            pushToast("Lỗi thao tác", "Không thể thực hiện hành động vừa chọn.", "error");
                                        })
                                        .finally(() => {
                                            hideContextMenu();
                                        });
                                }}
                                onKeyDown={event => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        if (disabled) {
                                            return;
                                        }

                                        if (submenu) {
                                            setOpenSubmenuKey(key);
                                            return;
                                        }

                                        Promise.resolve(entry.action?.()).finally(() => {
                                            hideContextMenu();
                                        });
                                    }
                                }}
                            >
                                <span
                                    className={withPrefix("context-menu-item-icon")}
                                    data-empty={iconNode ? "false" : "true"}
                                >
                                    {iconNode}
                                </span>
                                <span className={withPrefix("context-menu-item-label")}>{label}</span>
                                <span className={withPrefix("context-menu-shortcut")}>{shortcut ?? null}</span>
                                {submenu ? <span className={withPrefix("context-menu-submenu-arrow")}>›</span> : null}
                                {submenu && isOpen ? (
                                    <div className={withPrefix("context-menu-submenu")}>
                                        {submenu.map(sub => {
                                            if (sub.type === "separator") {
                                                return <div key={sub.key} className={withPrefix("context-menu-separator")} />;
                                            }

                                            const subDisabled = sub.disabled ?? false;

                                            const subIcon = sub.icon ?? "blank";
                                            const subIconNode = renderContextMenuIcon(subIcon);

                                            return (
                                                <div
                                                    key={sub.key}
                                                    role="menuitem"
                                                    className={`${withPrefix("context-menu-item")} ${subDisabled ? "is-disabled" : ""}`}
                                                    tabIndex={subDisabled ? -1 : 0}
                                                    onClick={event => {
                                                        event.preventDefault();
                                                        event.stopPropagation();

                                                        if (subDisabled) {
                                                            return;
                                                        }

                                                        Promise.resolve(sub.action?.())
                                                            .catch(error => {
                                                                console.error("Submenu action failed", error);
                                                                pushToast("Lỗi thao tác", "Không thể thực hiện hành động vừa chọn.", "error");
                                                            })
                                                            .finally(() => {
                                                                hideContextMenu();
                                                            });
                                                    }}
                                                    onMouseEnter={() => {
                                                        if (!subDisabled) {
                                                            setActiveItemKey(sub.key);
                                                        }
                                                    }}
                                                    onKeyDown={event => {
                                                        if (event.key === "Enter" || event.key === " ") {
                                                            event.preventDefault();
                                                            event.stopPropagation();

                                                            if (subDisabled) {
                                                                return;
                                                            }

                                                            Promise.resolve(sub.action?.())
                                                                .catch(error => {
                                                                    console.error("Submenu action failed", error);
                                                                    pushToast("Lỗi thao tác", "Không thể thực hiện hành động vừa chọn.", "error");
                                                                })
                                                                .finally(() => {
                                                                    hideContextMenu();
                                                                });
                                                        }
                                                    }}
                                                >
                                                    <span
                                                        className={withPrefix("context-menu-item-icon")}
                                                        data-empty={subIconNode ? "false" : "true"}
                                                    >
                                                        {subIconNode}
                                                    </span>
                                                    <span className={withPrefix("context-menu-item-label")}>{sub.label}</span>
                                                    <span className={withPrefix("context-menu-shortcut")}>{sub.shortcut ?? null}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>,
            document.body
        )
        : null;

    return (
        <>
            <Panel bodyFill className={resolvedPanelClass} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div
                    ref={gridContainerRef}
                    className={gridClass}
                    data-testid="data-table-grid"
                    style={{
                        padding: 0, // removed 4px to make it stick
                        height: resolvedGridHeight || '100%',
                        minHeight: (autoFitHeight || resolvedGridHeight === '100%') ? undefined : 'var(--grid-min-height, 605px)'
                    }}
                    onContextMenu={event => {
                        event.preventDefault();
                        if (!enableContextMenu) {
                            hideContextMenu();
                        }
                    }}
                >
                    <AgGridReact<TData>
                        ref={gridRef}
                        rowData={rowModelType === "infinite" ? undefined : data}
                        pinnedTopRowData={pinnedTopRowData}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        selectionColumnDef={{
                            width: 50,
                            minWidth: 50,
                            maxWidth: 50,
                            suppressSizeToFit: true,
                            pinned: 'left',
                            sortable: false,
                            resizable: false,
                        }}  
                        headerHeight={40}
                        rowHeight={36}
                        getRowId={getRowId}
                        domLayout={undefined}
                        rowModelType={rowModelType === "infinite" ? "infinite" : undefined}
                        datasource={datasource}
                        cacheBlockSize={rowModelType === "infinite" ? cacheBlockSize : undefined}
                        maxBlocksInCache={rowModelType === "infinite" ? maxBlocksInCache : undefined}
                        cacheQuickFilter
                        rowSelection={resolvedRowSelection}
                        enableCellTextSelection
                        animateRows
                        undoRedoCellEditing
                        undoRedoCellEditingLimit={50}
                        rowDragManaged={hasRowDragColumn}
                        pagination={(enableNativePagination && !serverSidePagination) || rowModelType === "infinite"}
                        paginationPageSize={currentLimit}
                        paginationPageSizeSelector={limitOptions}
                        suppressPaginationPanel={!((enableNativePagination && !serverSidePagination) || rowModelType === "infinite")}
                        paginationAutoPageSize={false}
                        theme={themeQuartz}
                        multiSortKey="ctrl"
                        maintainColumnOrder
                        preventDefaultOnContextMenu
                        treeData={treeData}
                        getDataPath={getDataPath}
                        autoGroupColumnDef={autoGroupColumnDef}
                        groupDefaultExpanded={groupDefaultExpanded}
                        onGridReady={onGridReady}
                        onPaginationChanged={(event) => {
                            if (enableNativePagination && event.newPage) {
                                const newPage = (event.api.paginationGetCurrentPage() || 0) + 1;
                                if (newPage !== currentPage && onChangePage) {
                                    onChangePage(newPage);
                                }
                            }
                        }}
                        onFirstDataRendered={() => gridApiRef.current?.sizeColumnsToFit()}
                        onSelectionChanged={handleSelectionChanged}
                        onCellClicked={event => {
                            if (onCellClicked && event.data) {
                                const colKey = event.column?.getColId?.() ?? event.colDef?.field ?? "";
                                onCellClicked(event.data as TData, colKey);
                            }
                        }}
                        onCellContextMenu={event => {
                            const domEvent = event.event;

                            if (!(domEvent instanceof MouseEvent)) {
                                return;
                            }

                            domEvent.preventDefault();

                            if (!enableContextMenu) {
                                hideContextMenu();
                                return;
                            }

                            const api = event.api;
                            const baseRowNode = event.node ?? (typeof event.rowIndex === "number" && api
                                ? api.getDisplayedRowAtIndex(event.rowIndex)
                                : null);
                            const nodeData = (baseRowNode?.data as TData | undefined) ?? (event.data as TData | undefined) ?? null;

                            let rawValue: unknown = event.value;

                            if ((rawValue === undefined || rawValue === null) && baseRowNode && event.column) {
                                try {
                                    const accessor = baseRowNode as unknown as {
                                        getValue?: (column: typeof event.column) => unknown;
                                    };
                                    rawValue = accessor.getValue?.(event.column);
                                } catch (error) {
                                    console.warn("Failed to read value via rowNode.getValue", error);
                                }
                            }

                            if ((rawValue === undefined || rawValue === null) && nodeData && event.column) {
                                const colId = event.column.getColId?.() ?? event.column.getColDef()?.field;
                                if (colId && typeof nodeData === "object" && nodeData !== null) {
                                    rawValue = (nodeData as Record<string, unknown>)[colId];
                                }
                            }

                            const cellValue = rawValue == null ? "" : String(rawValue);
                            const viewportWidth = window.innerWidth;
                            const viewportHeight = window.innerHeight;
                            const menuWidth = 260;
                            const menuHeight = 280;
                            const adjustedX = Math.min(domEvent.clientX, viewportWidth - menuWidth);
                            const adjustedY = Math.min(domEvent.clientY, viewportHeight - menuHeight);
                            const headerName = typeof event.colDef.headerName === "string" ? event.colDef.headerName : null;
                            const columnId = event.column?.getColId?.() ?? event.colDef.field ?? null;

                            setContextMenuState({
                                visible: true,
                                x: Math.max(adjustedX, 0),
                                y: Math.max(adjustedY, 0),
                                value: cellValue,
                                rowData: nodeData,
                                columnId,
                                headerName
                            });
                            setOpenSubmenuKey(null);
                            setActiveItemKey("copy");
                        }}
                    />

                </div>

                 {hasPagination && (serverSidePagination || !enableNativePagination) ? (
                    <div
                        className={resolvedPaginationClass}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '16px',
                            padding: '6px 16px',
                            borderTop: '1px solid #e5e7eb',
                            background: '#fafafa', // subtle gray like ag-grid footer
                            flexShrink: 0,
                            fontSize: '13px',
                            color: '#4b5563',
                            borderBottomLeftRadius: '6px',
                            borderBottomRightRadius: '6px'
                        }}
                    >
                        {/* Page Size */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ whiteSpace: 'nowrap' }}>Hiển thị:</span>
                            <select
                                value={currentLimit}
                                onChange={(e) => handleChangeLimit(Number(e.target.value))}
                                style={{
                                    padding: '4px 8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    backgroundColor: 'white',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                {resolvedLimitOptions.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>

                        {/* Range Info */}
                        <div style={{ whiteSpace: 'nowrap', display: total > 0 ? 'block' : 'none' }}>
                            {Math.min((currentPage - 1) * currentLimit + 1, total)} - {Math.min(currentPage * currentLimit, total)} / {total}
                        </div>

                        {/* Navigation Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                                onClick={() => handleChangePage(1)}
                                disabled={currentPage === 1}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    color: currentPage === 1 ? '#d1d5db' : '#4b5563'
                                }}
                                title="Trang đầu"
                            >
                                <ChevronsLeft size={16} strokeWidth={1.5} />
                            </button>
                            <button
                                onClick={() => handleChangePage(currentPage - 1)}
                                disabled={currentPage === 1}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    color: currentPage === 1 ? '#d1d5db' : '#4b5563'
                                }}
                                title="Trang trước"
                            >
                                <ChevronLeft size={16} strokeWidth={1.5} />
                            </button>
                            <div style={{ minWidth: '60px', textAlign: 'center', fontWeight: 500, color: '#111827' }}>
                                {currentPage} / {Math.max(1, Math.ceil(total / currentLimit))}
                            </div>
                            <button
                                onClick={() => handleChangePage(currentPage + 1)}
                                disabled={currentPage >= Math.ceil(total / currentLimit)}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: currentPage >= Math.ceil(total / currentLimit) ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    color: currentPage >= Math.ceil(total / currentLimit) ? '#d1d5db' : '#4b5563'
                                }}
                                title="Trang sau"
                            >
                                <ChevronRight size={16} strokeWidth={1.5} />
                            </button>
                            <button
                                onClick={() => handleChangePage(Math.ceil(total / currentLimit))}
                                disabled={currentPage >= Math.ceil(total / currentLimit)}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: currentPage >= Math.ceil(total / currentLimit) ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    color: currentPage >= Math.ceil(total / currentLimit) ? '#d1d5db' : '#4b5563'
                                }}
                                title="Trang cuối"
                            >
                                <ChevronsRight size={16} strokeWidth={1.5} />
                            </button>
                        </div>
                    </div>
                ) : null}
            </Panel>
            {contextMenuPortal}
        </>
    );
};

export default DataTable;
