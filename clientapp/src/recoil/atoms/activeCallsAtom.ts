import { atom } from "recoil";

export const activeCallsAtom = atom<Record<string, boolean>>({
    key: "activeCallsAtom",
    default: {},
});
