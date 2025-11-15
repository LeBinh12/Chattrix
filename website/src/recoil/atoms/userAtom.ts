import { atom } from "recoil";
import type { UserResponse } from "../../types/user";


export const userAtom = atom<UserResponse | null>({
    key: "userAtom",
    default: null,
}) 