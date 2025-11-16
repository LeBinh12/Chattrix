import { atom } from "recoil";
import type { Setting } from "../../types/setting";


export const bellStateAtom = atom<Setting | null>({
    key: "bellStateAtom",
    default: null,
});
