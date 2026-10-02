import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Markdown } from 'tiptap-markdown';
import type { Entry } from '../../../shared/types/Entry';
import type { Mood } from '../../../shared/types/Mood';
import { formatLongDate } from '../../domain/dates';
import { countWords, readMinutes } from '../../domain/wordCount';
import { FormattingToolbar } from './FormattingToolbar';
import { MetadataRail } from './MetadataRail';
import { useAutosave, type SaveStatus } from './useAutosave';

interface Props {
  initial: Entry;
  isNew: boolean;
  onBack: () => void;
  onSaved: () => void;
}

function getMarkdown(editor: { storage: unknown }): string {
  return (editor.storage as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
}

export function EntryEditor({ initial, isNew, onBack, onSaved }: Props) {
  const [entry, setEntry] = useState<Entry>(initial);
  const entryRef = useRef(entry);
  const { status, change, flush } = useAutosave(onSaved);

  const update = useCallback(
    (patch: Partial<Entry>) => {
      const next = { ...entryRef.current, ...patch };
      entryRef.current = next;
      setEntry(next);
      change(next);
    },
    [change],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: 'Start writing. Nothing here has to be perfect.' }),
      // Pasted Word/Docs content is reduced to what Markdown can hold, never raw HTML (feature-specifications.md §4).
      Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: true }),
    ],
    content: initial.body,
    onUpdate: ({ editor }) => update({ body: getMarkdown(editor) }),
  });

  const back = useCallback(async () => {
    await flush();
    onBack();
  }, [flush, onBack]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void flush();
      } else if (e.key === 'Escape') {
        void back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flush, back]);

  async function remove() {
    if (!window.confirm(`Delete the entry for ${formatLongDate(entry.date)}? This removes the file from your vault.`)) return;
    const result = await window.paroh.entries.delete(entry.date);
    if (!result.ok) return window.alert(result.error);
    onSaved();
    onBack();
  }

  const words = countWords(entry.body);

  return (
    <div className="editor">
      <div className="editor-topbar">
        <button className="btn" onClick={() => void back()}>
          ← Canvas
        </button>
        <div className="editor-date">
          {formatLongDate(entry.date)} · <SaveStatusText status={status} isNew={isNew} />
        </div>
      </div>
      <div className="editor-layout">
        <div className="editor-column">
          <input
            className="editor-title"
            placeholder="Untitled"
            value={entry.title}
            aria-label="Entry title"
            autoFocus={isNew}
            onChange={(e) => update({ title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                editor?.commands.focus('start');
              }
            }}
          />
          <FormattingToolbar editor={editor} />
          <EditorContent editor={editor} className="editor-body" />
        </div>
        <MetadataRail
          mood={entry.mood}
          tags={entry.tags}
          words={words}
          minutes={readMinutes(words)}
          onMood={(mood: Mood) => update({ mood })}
          onTags={(tags) => update({ tags })}
          onDelete={isNew && status.kind === 'idle' ? undefined : () => void remove()}
        />
      </div>
    </div>
  );
}

function SaveStatusText({ status, isNew }: { status: SaveStatus; isNew: boolean }) {
  switch (status.kind) {
    case 'saving':
      return <span className="muted">Saving…</span>;
    case 'saved':
      return <span className="muted">Saved {status.at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>;
    case 'error':
      return <span className="error-text">Not saved: {status.message}</span>;
    default:
      return <span className="muted">{isNew ? 'New entry' : 'Saved'}</span>;
  }
}
