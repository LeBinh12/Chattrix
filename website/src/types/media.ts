export interface MediaItem {
    id: string;
    type: "image" | "video";
    url: string;
    filename: string;
    timestamp: string;
}

export interface FileItem {
    name: string;
    size: string;
    url: string;
    timestamp: string;
}