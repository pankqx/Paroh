import { useEditorState, type Editor } from '@tiptap/react';
import {
  Baseline,
  Bold,
  Code2,
  Film,
  Heading2,
  Heading3,
  Highlighter,
  Image,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Mic,
  Minus,
  Music,
  Quote,
  Sparkles,
  Square,
  Strikethrough,
  Underline,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { MediaKind } from '../../../shared/media';

interface Tool {
  label: string;
  Icon: LucideIcon;
  keys?: string;
  isActive: (e: Editor) => boolean;
  run: (e: Editor) => void;
}

const TEXT: Tool[] = [
  { label: 'Bold', Icon: Bold, keys: 'Ctrl+B', isActive: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
  { label: 'Italic', Icon: Italic, keys: 'Ctrl+I', isActive: (e) => e.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run() },
  { label: 'Underline', Icon: Underline, keys: 'Ctrl+U', isActive: (e) => e.isActive('underline'), run: (e) => e.chain().focus().toggleUnderline().run() },
  { label: 'Strikethrough', Icon: Strikethrough, isActive: (e) => e.isActive('strike'), run: (e) => e.chain().focus().toggleStrike().run() },
];
const BLOCKS: Tool[] = [
  { label: 'Heading', Icon: Heading2, isActive: (e) => e.isActive('heading', { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Subheading', Icon: Heading3, isActive: (e) => e.isActive('heading', { level: 3 }), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Bullet list', Icon: List, isActive: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered list', Icon: ListOrdered, isActive: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Checklist', Icon: ListChecks, isActive: (e) => e.isActive('taskList'), run: (e) => e.chain().focus().toggleTaskList().run() },
  { label: 'Quote', Icon: Quote, isActive: (e) => e.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Code block', Icon: Code2, isActive: (e) => e.isActive('codeBlock'), run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { label: 'Divider', Icon: Minus, isActive: () => false, run: (e) => e.chain().focus().setHorizontalRule().run() },
];
const ALL = [...TEXT, ...BLOCKS];

/** Highlighter inks: pale enough to read through in Ivory, kept dark-texted in Midnight (app.css). */
export const HIGHLIGHTS = [
  { name: 'Honey', color: '#fde68a' },
  { name: 'Peach', color: '#fdd5b8' },
  { name: 'Rose', color: '#fbcfe0' },
  { name: 'Mint', color: '#c9ecd3' },
  { name: 'Sky', color: '#cfe4f7' },
  { name: 'Lilac', color: '#e3d7f6' },
];
export const INKS = [
  { name: 'Ember', color: '#c8582a' },
  { name: 'Gold', color: '#b0842c' },
  { name: 'Sage', color: '#4f8a5b' },
  { name: 'Ocean', color: '#3b7ea1' },
  { name: 'Plum', color: '#8e5aa8' },
  { name: 'Rose', color: '#c24d6a' },
];

interface Props {
  editor: Editor | null;
  onInsertMedia: (kind: MediaKind) => void;
  voice: { recording: boolean; seconds: number; toggle: () => void };
  onBeautify: () => void;
}

export function FormattingToolbar({ editor, onInsertMedia, voice, onBeautify }: Props) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => (editor ? ALL.map((t) => t.isActive(editor)) : ALL.map(() => false)),
  });
  if (!editor) return null;
  const toolButton = (t: Tool, i: number) => (
    <button
      key={t.label}
      className={`tool ${active?.[i] ? 'active' : ''}`}
      aria-label={t.label}
      aria-pressed={active?.[i] ?? false}
      title={t.keys ? `${t.label} (${t.keys})` : t.label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => t.run(editor)}
    >
      <t.Icon size={17} strokeWidth={2} aria-hidden="true" />
    </button>
  );

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <div className="tool-group">{TEXT.map((t, i) => toolButton(t, i))}</div>
      <div className="tool-group">
        <Swatches
          label="Highlight"
          Icon={Highlighter}
          swatches={HIGHLIGHTS}
          kind="fill"
          onPick={(color) => (color ? editor.chain().focus().setHighlight({ color }).run() : editor.chain().focus().unsetHighlight().run())}
        />
        <Swatches label="Text colour" Icon={Baseline} swatches={INKS} kind="ink" onPick={(color) => (color ? editor.chain().focus().setColor(color).run() : editor.chain().focus().unsetColor().run())} />
      </div>
      <div className="tool-group">{BLOCKS.map((t, i) => toolButton(t, i + TEXT.length))}</div>
      <div className="tool-group">
        <button className="tool" aria-label="Add photos" title="Add photos (or drop them on the page)" onMouseDown={(e) => e.preventDefault()} onClick={() => onInsertMedia('image')}>
          <Image size={17} aria-hidden="true" />
        </button>
        <button className="tool" aria-label="Add a video" title="Add a video" onMouseDown={(e) => e.preventDefault()} onClick={() => onInsertMedia('video')}>
          <Film size={17} aria-hidden="true" />
        </button>
        <button className="tool" aria-label="Add an audio file" title="Add an audio file" onMouseDown={(e) => e.preventDefault()} onClick={() => onInsertMedia('audio')}>
          <Music size={17} aria-hidden="true" />
        </button>
        <button
          className={`tool ${voice.recording ? 'recording' : ''}`}
          aria-label={voice.recording ? 'Stop and add the voice note' : 'Record a voice note'}
          aria-pressed={voice.recording}
          title={voice.recording ? 'Stop and add the voice note' : 'Record a voice note into the page'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={voice.toggle}
        >
          {voice.recording ? <Square size={14} fill="currentColor" aria-hidden="true" /> : <Mic size={17} aria-hidden="true" />}
          {voice.recording && <span className="tool-timer">{`${Math.floor(voice.seconds / 60)}:${String(voice.seconds % 60).padStart(2, '0')}`}</span>}
        </button>
      </div>
      <button className="beautify-btn" aria-label="Make it beautiful" onMouseDown={(e) => e.preventDefault()} onClick={onBeautify} title="Tidy, organise and plan this page, on this device">
        <Sparkles size={16} aria-hidden="true" />
        <span>Make it beautiful</span>
      </button>
    </div>
  );
}

function Swatches({ label, Icon, swatches, kind, onPick }: { label: string; Icon: LucideIcon; swatches: { name: string; color: string }[]; kind: 'fill' | 'ink'; onPick: (color: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const pick = (c: string | null) => {
    onPick(c);
    setOpen(false);
  };
  return (
    <div className="tool-pop" ref={ref}>
      <button className="tool" aria-label={label} title={label} aria-expanded={open} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)}>
        <Icon size={17} aria-hidden="true" />
      </button>
      {open && (
        <Popover>
          {swatches.map((s) => (
            <button key={s.color} className={`swatch swatch-${kind}`} aria-label={s.name} title={s.name} style={kind === 'fill' ? { background: s.color } : { color: s.color }} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s.color)}>
              {kind === 'ink' && 'A'}
            </button>
          ))}
          <button className="swatch swatch-none" aria-label="None" title="None" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(null)}>
            ⌀
          </button>
        </Popover>
      )}
    </div>
  );
}

function Popover({ children }: { children: ReactNode }) {
  return <div className="swatch-pop">{children}</div>;
}
