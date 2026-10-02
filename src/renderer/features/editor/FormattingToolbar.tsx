import { useEditorState, type Editor } from '@tiptap/react';

interface Tool {
  label: string;
  short: string;
  isActive: (e: Editor) => boolean;
  run: (e: Editor) => void;
}

const TOOLS: Tool[] = [
  { label: 'Bold', short: 'B', isActive: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
  { label: 'Italic', short: 'I', isActive: (e) => e.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run() },
  { label: 'Heading', short: 'H', isActive: (e) => e.isActive('heading', { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Bullet list', short: '•', isActive: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered list', short: '1.', isActive: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Quote', short: '❝', isActive: (e) => e.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Divider', short: '—', isActive: () => false, run: (e) => e.chain().focus().setHorizontalRule().run() },
];

export function FormattingToolbar({ editor }: { editor: Editor | null }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => (editor ? TOOLS.map((t) => t.isActive(editor)) : TOOLS.map(() => false)),
  });
  if (!editor) return null;
  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      {TOOLS.map((t, i) => (
        <button key={t.label} className={`tool ${active?.[i] ? 'active' : ''}`} aria-label={t.label} aria-pressed={active?.[i] ?? false} title={t.label} onMouseDown={(e) => e.preventDefault()} onClick={() => t.run(editor)}>
          {t.short}
        </button>
      ))}
    </div>
  );
}
