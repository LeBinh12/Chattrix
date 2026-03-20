import { atom } from "recoil";
import type { TaskComment } from "../../types/task-comment";


export type TaskCommentsState = {
  [taskId: string]: TaskComment[];
};

export const taskCommentsAtom = atom<TaskCommentsState>({
  key: "taskCommentsAtom",
  default: {},
});