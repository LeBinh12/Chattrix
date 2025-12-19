import type { GroupMember } from "../../../types/group-member";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import MentionList, { type MentionListRef } from "./Mentionlist";
import { groupApi } from "../../../api/group";

// Props truyền xuống từ hook
interface MentionSuggestionArgs {
  groupId: string;
  cachedMembers: GroupMember[];
  setCache: (members: GroupMember[]) => void;
}

// Hàm này **không gọi hook nữa**, chỉ nhận data từ hook
export const createMentionSuggestion = ({
  groupId,
  cachedMembers,
  setCache,
}: MentionSuggestionArgs): Omit<SuggestionOptions, "editor"> => {
  let allItems: GroupMember[] = [...cachedMembers];
  let currentPage = 1;
  let hasMore = true;
  let isLoading = false;

  const fetchMembers = async (query = "", page = 1, limit = 10) => {
    try {
      console.log("query", query)
      const res = await groupApi.getGroupMembers(groupId, page, limit, query || undefined);
      const members: GroupMember[] = res.data.members || [];

      if (!query) setCache([...cachedMembers, ...members]);
      return members;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  return {
    items: async ({ query }) => {
      

      if (query && allItems.length > 0) {
        return allItems.filter(
          (m) =>
            m.display_name.toLowerCase().includes(query.toLowerCase()) ||
            m.username.toLowerCase().includes(query.toLowerCase())
        );
      }

      const members = await fetchMembers("", 1, 10);
      allItems = members;
      currentPage = 1;
      hasMore = members.length >= 10;
      return members;
    },

    render: () => {
      let component: ReactRenderer<MentionListRef> | undefined;
      let popup: TippyInstance[] | undefined;

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, {
            props: {
              items: allItems,
              command: props.command,
              onLoadMore: async () => {
                if (!hasMore || isLoading) return;
                isLoading = true;
                const newMembers = await fetchMembers("", currentPage + 1, 10);
                if (newMembers.length > 0) {
                  currentPage += 1;
                  allItems = [...allItems, ...newMembers];
                  hasMore = newMembers.length >= 10;
                  component?.updateProps({ items: allItems });
                } else {
                  hasMore = false;
                }
                isLoading = false;
              },
            },
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
            maxWidth: 400,
          });
        },

        onUpdate(props) {
          component?.updateProps({ ...props, items: allItems });
          if (!props.clientRect) return;
          popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
        },

        onKeyDown(props) {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
};
