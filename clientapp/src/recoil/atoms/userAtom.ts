import { atom } from "recoil";
import type { UserResponse } from "../../types/user";

export const userAtom = atom<UserResponse | null>({
    key: "userAtom",
    default: null,
}) 

export const isAuthLoadingAtom = atom<boolean>({
    key: "isAuthLoadingAtom",
    default: !!localStorage.getItem("access_token"),
})