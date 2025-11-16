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
} from "lucide-react";

type MenuBarProps = {
  editor: Editor | null;
  toggleHeight?: () => void; // thêm prop mới
};

export default function MenuBar({ editor, toggleHeight }: MenuBarProps) {
  if (!editor) return null;

  // Đọc trạng thái hiện tại của editor
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
    `p-1.5 rounded-md transition-colors ${
      disabled
        ? "opacity-50 cursor-not-allowed"
        : active
        ? "bg-blue-500 text-white"
        : "hover:bg-gray-200 text-gray-800"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-white rounded-t-lg">
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

      {[1, 2, 3, 4, 5, 6].map((level) => (
        <button
          key={level}
          className={btnClass(editorState.headingLevel === level)}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
              .run()
          }
        >
          H{level}
        </button>
      ))}

      {/* Lists */}
      <button
        className={btnClass(editorState.isBulletList)}
        onClick={() => {
          editor.commands.focus();
          editor.chain().toggleBulletList().run();
        }}
      >
        <List size={16} />
      </button>

      <button
        className={btnClass(editorState.isOrderedList)}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
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
