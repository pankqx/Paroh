import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Markdown } from 'tiptap-markdown';
import type { Entry, EntrySummary } from '../../../shared/types/Entry';
import type { Mood } from '../../../shared/types/Mood';
import { isEntryDate } from '../../../shared/types/Entry';
import { formatLongDate } from '../../domain/dates';
import { countWords, readMinutes } from '../../domain/wordCount';
import { FormattingToolbar } from './FormattingToolbar';
import { MetadataRail } from './MetadataRail';
import { SlashCommand } from './tiptap-extensions/slashCommand';
import type { SuggestionItem } from './tiptap-extensions/SuggestionList';
import { Wikilink } from './tiptap-extensions/wikilink';
import { WikilinkText } from './tiptap-extensions/wikilinkText';
import { useAutosave, type SaveStatus } from './useAutosave';
import { useBacklinks } from './useBacklinks';

interface Props {
  initial: Entry;
  isNew: boolean;
  notice?: string;
  entries: EntrySummary[];
  dirtyRef: MutableRefObject<() => boolean>;
  onOpenEntry: (date: string) => void;
  onBack: () => void;
  onSaved: (entry: Entry) => void;
}

function getMarkdown(editor: { storage: unknown }): string {
  return (editor.storage as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
}

export function EntryEditor({ initial, isNew, notice, entries, dirtyRef, onOpenEntry, onBack, onSaved }: Props) {
  const [entry, setEntry] = useState<Entry>(initial);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const entryRef = useRef(entry);
  const { status, change, flush, isDirty } = useAutosave(onSaved);
  const backlinks = useBacklinks(entry.date);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [dirtyRef, isDirty]);

  // Extensions are created once, so they read the latest entries and navigation through refs.
  const candidates = useRef<SuggestionItem[]>([]);
  useEffect(() => {
    const seen = new Set<string>();
    candidates.current = entries
      .filter((e) => e.date !== initial.date)
      .map((e) => ({ id: e.title.trim() || e.date, label: e.title.trim() || 'Untitled', hint: e.date }))
      .filter((c) => !seen.has(c.id.toLowerCase()) && seen.add(c.id.toLowerCase()));
  }, [entries, initial.date]);

  const openLink = useRef<(target: string) => void>(() => {});

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
      StarterKit.configure({ heading: { levels: [2, 3] }, text: false, link: false }),
      WikilinkText,
      Placeholder.configure({ placeholder: 'Start writing. Type / for blocks, [[ to link another entry.' }),
      // Pasted Word/Docs content is reduced to what Markdown can hold, never raw HTML (feature-specifications.md §4).
      Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: true }),
      SlashCommand,
      // The callbacks run on user input, never during render, so reading the refs there is safe.
      // eslint-disable-next-line react-hooks/refs
      Wikilink.configure({ candidates: () => candidates.current, onOpen: (t) => openLink.current(t) }),
    ],
    content: initial.body,
    onUpdate: ({ editor }) => update({ body: getMarkdown(editor) }),
  });

  const back = useCallback(async () => {
    await flush();
    onBack();
  }, [flush, onBack]);

  useEffect(() => {
    openLink.current = async (target: string) => {
      const resolved = await window.paroh.entries.resolveLink(target);
      const date = resolved.ok && resolved.value ? resolved.value : isEntryDate(target) ? target : null;
      if (!date) return setLinkMessage(`No entry called “${target}” yet.`);
      await flush();
      onOpenEntry(date);
    };
  }, [flush, onOpenEntry]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void flush();
      } else if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('.suggestion-list')) {
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
          {notice && status.kind === 'idle' && <span className="muted"> · {notice}</span>}
        </div>
      </div>
      {linkMessage && (
        <div className="banner-info" role="status">
          {linkMessage}
          <button className="link-btn" onClick={() => setLinkMessage(null)}>
            Dismiss
          </button>
        </div>
      )}
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
          backlinks={backlinks}
          onOpenEntry={(date) => void flush().then(() => onOpenEntry(date))}
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
