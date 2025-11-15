import { atom } from "recoil";
import type { MediaItem } from "../../types/media";

interface MediaViewerState {
    isOpen: boolean;
    mediaItems: MediaItem[];
    currentIndex: number;
}

export const mediaViewerAtom = atom<MediaViewerState>({
    key: "mediaViewerState",
    default: {
        isOpen: false,
        mediaItems: [],
        currentIndex: 0,
    },
});