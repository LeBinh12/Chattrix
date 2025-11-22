import type { LucideIcon } from "lucide-react";

export interface Column<T> {
    key: string;
    label: string;
    render: (item: T) => React.ReactNode;
    sortable?: boolean;
    width?: string;
}

export interface Action<T> {
    icon: LucideIcon;
    label: string;
    onClick: (item: T) => void;
    color?: string;
    hoverColor?: string;
    condition?: (item: T) => boolean;
}

export interface FilterOption {
    value: string;
    label: string;
}