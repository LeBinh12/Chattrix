import type { ReactNode } from "react";
import { Button, Container, Content, Header, Drawer, IconButton, Stack } from "rsuite";
import TagFilterIcon from "@rsuite/icons/TagFilter";
import { Search } from 'lucide-react';

type DataManagementLayoutProps = {
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    onSearch: () => void;
    advancedOpen: boolean;
    onToggleAdvanced: () => void;
    advancedContent?: ReactNode;
    children: ReactNode;
    searchPlaceholder?: string;
    advancedButtonLabels?: {
        open: string;
        close: string;
    };
    classNamePrefix?: string;
    searchBarExtras?: ReactNode;
    advancedActions?: ReactNode;
    controlSize?: "xs" | "sm" | "md" | "lg";
    headerId?: string;
    searchBarId?: string;
    advancedToggleType?: 'button' | 'icon';
    forceAdvancedToggle?: boolean;
    filterControls?: ReactNode;
};

const DataManagementLayout = ({
    searchTerm,
    onSearchTermChange,
    onSearch,
    advancedOpen,
    onToggleAdvanced,
    advancedContent,
    children,
    searchPlaceholder = "Nhập từ khóa tìm kiếm",
    advancedButtonLabels = {
        open: "Tìm kiếm nâng cao",
        close: "Thu gọn"
    },
    classNamePrefix = "data-management",
    searchBarExtras,
    advancedActions,
    controlSize,
    headerId,
    searchBarId,
    advancedToggleType = 'button',
    forceAdvancedToggle = false,
    filterControls
}: DataManagementLayoutProps) => {
    const withPrefix = (element?: string) =>
        element ? `${classNamePrefix}__${element}` : classNamePrefix;
    const hasAdvancedSearch = Boolean(advancedContent) || forceAdvancedToggle;

    return (
        <Container className={withPrefix()} style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", background: "#F3F4F6" }}>
            <Header
                className={withPrefix("header")}
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 0,
                    background: "#fff",
                    borderBottom: "1px solid #e5e7eb",
                    padding: "16px"
                }}
                id={headerId}
            >
                <div
                    className={withPrefix("search-container")}
                    style={{ width: "100%" }}
                >
                    <div className={withPrefix("search-bar")} id={searchBarId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                        {/* Left: Search & Filters */}
                        <div className="flex items-center gap-2 flex-1">
                            <div className="relative group flex-1 max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0665D0] transition-colors" />
                                <input
                                    type="text"
                                    placeholder={searchPlaceholder}
                                    value={searchTerm}
                                    onChange={(e) => onSearchTermChange(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                                    className="w-full pl-9 pr-4 h-[36px] bg-white border border-[#e5e5ea] rounded-md text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0665D0] focus:ring-1 focus:ring-[#0665D0] transition-all"
                                />
                            </div>
                            {filterControls}
                        </div>

                        {/* Right: Actions */}
                        <Stack spacing={10} className={withPrefix("search-actions")}>
                                {hasAdvancedSearch ? (
                                <div className="md:hidden">
                                    <IconButton
                                        icon={<TagFilterIcon />}
                                        size={controlSize}
                                        appearance={advancedOpen ? "primary" : "default"}
                                        className={withPrefix("advanced-button")}
                                        onClick={onToggleAdvanced}
                                        title={advancedButtonLabels.open}
                                    />
                                </div>
                            ) : null}
                            {searchBarExtras}
                        </Stack>
                    </div>
                </div>
            </Header>

            <Content className={withPrefix("content")} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', background: '#F3F4F6' }}>{children}</Content>

            {advancedContent && (
                <Drawer 
                    placement="right" 
                    className="!w-[85%] !max-w-[320px]" 
                    size="xs" 
                    open={advancedOpen} 
                    onClose={onToggleAdvanced}
                    style={{
                        top: 'var(--Header-height, 0px)',
                        height: 'calc(100% - var(--Header-height, 0px))'
                    }}
                >
                    <Drawer.Header>
                        <Drawer.Title>{advancedButtonLabels.open}</Drawer.Title>
                    </Drawer.Header>
                    <Drawer.Body style={{ padding: 0 }}>
                        {advancedContent}
                    </Drawer.Body>
                    {advancedActions && (
                        <Drawer.Footer>
                            {advancedActions}
                        </Drawer.Footer>
                    )}
                </Drawer>
            )}
        </Container >
    );
};

export default DataManagementLayout;
