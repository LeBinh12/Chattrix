import { Editor, useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  RotateCcw,
  RotateCw,
  Minus,
  Type,
  Maximize,
  Underline,
  Indent,
  Outdent,
} from "lucide-react";

type MenuBarProps = {
  editor: Editor | null;
  toggleHeight?: () => void;
};

function MenuBarContent({
  editor,
  toggleHeight,
}: {
  editor: Editor;
  toggleHeight?: () => void;
}) {
  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive("bold"),
      canBold: ctx.editor.can().chain().toggleBold().run(),
      isItalic: ctx.editor.isActive("italic"),
      canItalic: ctx.editor.can().chain().toggleItalic().run(),
      isUnderline: ctx.editor.isActive("underline"),
      canUnderline: ctx.editor.can().chain().toggleUnderline().run(),
      isStrike: ctx.editor.isActive("strike"),
      canStrike: ctx.editor.can().chain().toggleStrike().run(),
      isCode: ctx.editor.isActive("code"),
      canCode: ctx.editor.can().chain().toggleCode().run(),
      isParagraph: ctx.editor.isActive("paragraph"),
      isBulletList: ctx.editor.isActive("bulletList"),
      isOrderedList: ctx.editor.isActive("orderedList"),
      isBlockquote: ctx.editor.isActive("blockquote"),
      isCodeBlock: ctx.editor.isActive("codeBlock"),
      canUndo: ctx.editor.can().chain().undo().run(),
      canRedo: ctx.editor.can().chain().redo().run(),
      headingLevel:
        [1, 2, 3, 4, 5, 6].find((lvl) =>
          ctx.editor.isActive("heading", { level: lvl })
        ) || 0,
    }),
  });

const btnClass = (active?: boolean, disabled?: boolean) =>
  `!p-1.5 !rounded-md !transition-colors !duration-200 ${
    disabled
      ? "!opacity-50 !cursor-not-allowed"
      : active
      ? "!bg-blue-50 !text-[#00568c] !shadow-sm" // Active: light blue bg, blue text
      : "hover:!bg-gray-100 !text-gray-600 hover:!text-gray-900" // Default: hover gray bg, dark text
  }`;

  // Hàm xử lý bullet list - chuyển đổi nhiều paragraphs thành list items
  const handleBulletList = () => {
    if (!editor) return;

    if (!editor.isActive("bulletList")) {
      const { from, to, empty } = editor.state.selection;
      if (!empty) {
        // Tham số thứ 3 là blockSeparator, thứ 4 là leafText (cho hard breaks <br>)
        const text = editor.state.doc.textBetween(from, to, "\n", "\n");
        
        if (text.includes("\n")) {
          // Xây dựng JSON structure cho bulletList
          const listItems = text
            .split("\n")
            .filter((line) => line.trim() !== "")
            .map((line) => ({
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: line }],
                },
              ],
            }));
          
          if (listItems.length > 0) {
            editor
              .chain()
              .focus()
              .insertContent({
                type: "bulletList",
                content: listItems,
              })
              .run();
            return;
          }
        }
      }
    }
    editor.chain().focus().toggleBulletList().run();
  };

  // Hàm xử lý ordered list - chuyển đổi nhiều paragraphs thành numbered list
  const handleOrderedList = () => {
    if (!editor) return;

    if (!editor.isActive("orderedList")) {
      const { from, to, empty } = editor.state.selection;
      if (!empty) {
        // Tham số thứ 3 là blockSeparator, thứ 4 là leafText (cho hard breaks <br>)
        const text = editor.state.doc.textBetween(from, to, "\n", "\n");
        
        if (text.includes("\n")) {
          // Xây dựng JSON structure cho orderedList
          const listItems = text
            .split("\n")
            .filter((line) => line.trim() !== "")
            .map((line) => ({
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: line }],
                },
              ],
            }));

          if (listItems.length > 0) {
            editor
              .chain()
              .focus()
              .insertContent({
                type: "orderedList",
                content: listItems,
              })
              .run();
            return;
          }
        }
      }
    }
    editor.chain().focus().toggleOrderedList().run();
  };

  return (
    <div className="!flex !flex-wrap !items-center !gap-2 !p-2 !bg-white !rounded-t-lg">
      {/* Basic formatting */}
      <button
        className={btnClass(editorState.isBold, !editorState.canBold)}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </button>

      <button
        className={btnClass(editorState.isItalic, !editorState.canItalic)}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </button>

      <button
        className={btnClass(editorState.isUnderline, !editorState.canUnderline)}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline size={16} />
      </button>

      <button
        className={btnClass(editorState.isStrike, !editorState.canStrike)}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={16} />
      </button>

      <button
        className={btnClass(false)}
        onClick={() => editor.chain().focus().unsetAllMarks().run()}
      >
        Clear
      </button>

      {/* Paragraph & Headings */}
      <button
        className={btnClass(editorState.isParagraph)}
        onClick={() =>
          editor.chain().focus().setParagraph().unsetAllMarks().run()
        }
      >
        <Type size={16} />
      </button>



      {/* Indent / Outdent */}
      <button
        className={btnClass(false)}
        onClick={() => {
          // Check if we're in a list item
          if (editor.isActive('listItem') && editor.can().sinkListItem('listItem')) {
            editor.chain().focus().sinkListItem('listItem').run();
          } else {
            // For regular text, use Tab key behavior
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to);
            
            if (selectedText) {
              // Add indentation to each line
              const indentedText = selectedText.split('\n').map(line => '\u00A0\u00A0\u00A0\u00A0' + line).join('\n');
              editor.chain().focus().deleteSelection().insertContent(indentedText).run();
            } else {
              // Just insert spaces at cursor
              editor.chain().focus().insertContent('\u00A0\u00A0\u00A0\u00A0').run();
            }
          }
        }}
      >
        <Indent size={16} />
      </button>

      <button
        className={btnClass(false)}
        onClick={() => {
          if (editor.isActive('listItem') && editor.can().liftListItem('listItem')) {
            editor.chain().focus().liftListItem('listItem').run();
          } else {
            // For regular text, remove leading spaces
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to);
            
            if (selectedText) {
              // Remove up to 4 leading spaces from each line
              const outdentedText = selectedText.split('\n').map(line => {
                // Remove up to 4 non-breaking spaces or regular spaces
                return line.replace(/^[\u00A0 ]{1,4}/, '');
              }).join('\n');
              editor.chain().focus().deleteSelection().insertContent(outdentedText).run();
            }
          }
        }}
      >
        <Outdent size={16} />
      </button>

      {/* Lists - SỬA LẠI ĐÂY */}
      <button
        className={btnClass(editorState.isBulletList)}
        onClick={handleBulletList}
      >
        <List size={16} />
      </button>

      <button
        className={btnClass(editorState.isOrderedList)}
        onClick={handleOrderedList}
      >
        <ListOrdered size={16} />
      </button>

      {/* Blockquote & Code block */}
      <button
        className={btnClass(editorState.isBlockquote)}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={16} />
      </button>

      {/* Horizontal & Break */}
      <button
        className={btnClass()}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus size={16} />
      </button>

      {/* Undo / Redo */}
      <button
        className={btnClass(false, !editorState.canUndo)}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <RotateCcw size={16} />
      </button>

      <button
        className={btnClass(false, !editorState.canRedo)}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <RotateCw size={16} />
      </button>

      <button className={btnClass(false)} onClick={toggleHeight}>
        <Maximize size={16} />
      </button>
    </div>
  );
}

export default function MenuBar({ editor, toggleHeight }: MenuBarProps) {
  if (!editor) return null;
  return <MenuBarContent editor={editor} toggleHeight={toggleHeight} />;
}
