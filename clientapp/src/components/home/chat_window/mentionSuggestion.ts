import type { GroupMember } from "../../../types/group-member";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { groupApi } from "../../../api/group";
import MentionList, { type MentionListRef } from "./MentionList";

interface MentionSuggestionArgs {
  groupId: string;
  cachedMembers: GroupMember[];
  setCache: (members: GroupMember[]) => void;
  currentUserId?: string;
  onAssignTask?: () => void; // Callback to open task assignment form
  onOpen?: () => void;
  onClose?: () => void;
}

export const createMentionSuggestion = ({
  groupId,
  cachedMembers,
  setCache,
  currentUserId,
  onAssignTask,
  onOpen,
  onClose,
}: MentionSuggestionArgs): Omit<SuggestionOptions, "editor"> => {
  let allItems: GroupMember[] = [...cachedMembers];
  let hasMore = cachedMembers.length >= 10;
  let isLoading = false;
  let page = 1;
  const LIMIT = 20;

  const mergeUnique = (base: GroupMember[], incoming: GroupMember[]) => {
    const map = new Map<string, GroupMember>();
    base.forEach(m => map.set(m.user_id, m));
    incoming.forEach(m => map.set(m.user_id, m));
    return Array.from(map.values());
  };


  const fetchMembers = async (query = "", page = 1, limit = 20) => {
    try {
      if (!groupId || groupId === "dm" || groupId.length !== 24) return []; // Validate groupId
      const res = await groupApi.getGroupMembers(groupId, page, limit, query || undefined);
      const members = res.data.members || [];
      return members;
    } catch (error) {
      console.error("Fetch mention members error:", error);
      return [];
    }
  };

  const loadMore = async () => {
    if (isLoading || !hasMore) return;
    isLoading = true;

    const newMembers = await fetchMembers("", page + 1, LIMIT);

    if (newMembers.length > 0) {
      page += 1;

      allItems = mergeUnique(allItems, newMembers);
      setCache(allItems);

      hasMore = newMembers.length === LIMIT;
    } else {
      hasMore = false;
    }

    isLoading = false;
  };


  const filterItems = (query: string): GroupMember[] => {
    const lowerQuery = query.toLowerCase().trim();
    const baseItems = allItems.filter(m => m.user_id !== currentUserId);

    if (!lowerQuery) return baseItems;

    return baseItems.filter(
      (m) =>
        m.display_name?.toLowerCase().includes(lowerQuery) ||
        m.username?.toLowerCase().includes(lowerQuery)
    );
  };

  return {
    items: async ({ query }) => {
      const lowerQuery = query.toLowerCase().trim();

      if (lowerQuery) {
        return filterItems(lowerQuery);
      }

      if (allItems.length > 0) {
        return filterItems("");
      }

      isLoading = true;
      page = 1;

      const members = await fetchMembers("", page, LIMIT);
      isLoading = false;

      if (members.length > 0) {
        allItems = members;
        setCache(members);
        hasMore = members.length === LIMIT;
      } else {
        hasMore = false;
      }

      return allItems.filter(m => m.user_id !== currentUserId);
    },


    render: () => {
      let component: ReactRenderer<MentionListRef> | undefined;
      let popup: TippyInstance[] | undefined;
      let currentQuery = "";

      return {
        onStart: (props) => {
          onOpen?.(); // Notify open
          currentQuery = props.query || "";

          component = new ReactRenderer(MentionList, {
            props: {
              items: filterItems(currentQuery),
              command: props.command,
              onLoadMore: async () => {
                await loadMore();
                component?.updateProps({ items: filterItems(currentQuery) });
              },
              // Pass task assignment callback
              onAssignTask: onAssignTask ? () => {
                popup?.[0]?.hide(); // Close mention popup
                onAssignTask(); // Open task assignment form
              } : undefined,
              onClose: () => popup?.[0]?.hide(),
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
            placement: "top-start",
            maxWidth: 400,
          });
        },

        onUpdate: (props) => {
          currentQuery = props.query || "";

          component?.updateProps({
            items: filterItems(currentQuery),
            command: props.command,
          });

          if (!props.clientRect) return;
          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit: () => {
          onClose?.(); // Notify close
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
};