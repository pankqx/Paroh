import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import { ArrowLeft, CheckCircle2, ListPlus, Sparkles, Undo2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { acceptFor, type MediaKind } from '../../../shared/media';
import type { Entry, EntrySummary } from '../../../shared/types/Entry';
import type { Mood } from '../../../shared/types/Mood';
import { isEntryDate } from '../../../shared/types/Entry';
import { beautify, type BeautifyResult } from '../../domain/beautify';
import { coverForMood } from '../../domain/covers';
import { formatLongDate } from '../../domain/dates';
import { countWords, readMinutes } from '../../domain/wordCount';
import { contentExtensions, getMarkdown } from './contentExtensions';
import { FormattingToolbar } from './FormattingToolbar';
import { pickFiles, uploadMedia } from './mediaUpload';
import { MetadataRail } from './MetadataRail';
import { PageHeader } from './PageHeader';
import { SlashCommand } from './tiptap-extensions/slashCommand';
import type { SuggestionItem } from './tiptap-extensions/SuggestionList';
import { Wikilink } from './tiptap-extensions/wikilink';
import { useAutosave, type SaveStatus } from './useAutosave';
import { useBacklinks } from './useBacklinks';
import { useVoiceNote } from './useVoiceNote';

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

interface Beautified {
  result: BeautifyResult;
  before: Entry;
  added?: number;
}

export function EntryEditor({ initial, isNew, notice, entries, dirtyRef, onOpenEntry, onBack, onSaved }: Props) {
  const [entry, setEntry] = useState<Entry>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [beautified, setBeautified] = useState<Beautified | null>(null);
  const [shimmer, setShimmer] = useState(0);
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
  const insertFiles = useRef<(files: File[], pos?: number) => void>(() => {});

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
      ...contentExtensions(),
      Placeholder.configure({ placeholder: 'Start writing. Type / for blocks, [[ to link another entry, or drop in photos.' }),
      SlashCommand,
      // The callbacks run on user input, never during render, so reading the refs there is safe.
      // eslint-disable-next-line react-hooks/refs
      Wikilink.configure({ candidates: () => candidates.current, onOpen: (t) => openLink.current(t) }),
    ],
    content: initial.body,
    onUpdate: ({ editor }) => update({ body: getMarkdown(editor) }),
    editorProps: {
      // Photos, videos and sound dropped or pasted onto the page are copied into the journal folder.
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.length) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        insertFiles.current(files, pos);
        return true;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!files.length) return false;
        insertFiles.current(files);
        return true;
      },
    },
  });

  useEffect(() => {
    insertFiles.current = async (files, pos) => {
      for (const file of files) {
        const saved = await uploadMedia(file);
        if (!saved.ok) {
          setMessage(saved.error);
          continue;
        }
        const chain = editor?.chain().focus();
        if (pos !== undefined) chain?.setTextSelection(pos);
        chain?.insertMedia({ src: saved.value.path }).run();
      }
    };
  }, [editor]);

  const insertMedia = useCallback(async (kind: MediaKind) => {
    const files = await pickFiles(acceptFor(kind), kind !== 'video');
    insertFiles.current(files);
  }, []);

  // `/photo`, `/video`… from the block menu land here.
  useEffect(() => {
    const onInsert = (e: Event) => void insertMedia((e as CustomEvent<MediaKind>).detail);
    window.addEventListener('paroh:insert-media', onInsert);
    return () => window.removeEventListener('paroh:insert-media', onInsert);
  }, [insertMedia]);

  const voice = useVoiceNote(
    useCallback(
      (path: string) => {
        editor?.chain().focus().insertMedia({ src: path }).run();
      },
      [editor],
    ),
  );

  const back = useCallback(async () => {
    await flush();
    onBack();
  }, [flush, onBack]);

  useEffect(() => {
    openLink.current = async (target: string) => {
      const resolved = await window.paroh.entries.resolveLink(target);
      const date = resolved.ok && resolved.value ? resolved.value : isEntryDate(target) ? target : null;
      if (!date) return setMessage(`No entry called “${target}” yet.`);
      await flush();
      onOpenEntry(date);
    };
  }, [flush, onOpenEntry]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void flush();
      } else if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('.suggestion-list, .cover-menu, .swatch-pop')) {
        void back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flush, back]);

  function makeBeautiful() {
    if (!editor) return;
    const before = entryRef.current;
    const result = beautify({ title: before.title, body: getMarkdown(editor), date: before.date });
    editor.commands.setContent(result.body, { emitUpdate: false });
    update({ title: result.title, body: getMarkdown(editor), cover: before.cover ?? coverForMood(before.mood) });
    setBeautified({ result, before });
    setShimmer((n) => n + 1);
  }

  function undoBeautify() {
    if (!editor || !beautified) return;
    editor.commands.setContent(beautified.before.body, { emitUpdate: false });
    update({ title: beautified.before.title, body: beautified.before.body, cover: beautified.before.cover });
    setBeautified(null);
  }

  async function addPlansToTodo() {
    if (!beautified) return;
    let added = 0;
    for (const t of beautified.result.tasks) {
      const r = await window.paroh.tasks.create({ text: t.text, ...(t.due ? { dueDate: t.due } : {}) });
      if (r.ok) added++;
      else setMessage(r.error);
    }
    setBeautified({ ...beautified, added });
  }

  async function remove() {
    if (!window.confirm(`Delete the entry for ${formatLongDate(entry.date)}? This removes the file from your vault.`)) return;
    const result = await window.paroh.entries.delete(entry.date);
    if (!result.ok) return window.alert(result.error);
    onBack();
  }

  const words = countWords(entry.body);
  const minutes = readMinutes(words);

  return (
    <div className="editor">
      <div className="editor-topbar">
        <button className="btn btn-ghost" onClick={() => void back()}>
          <ArrowLeft size={16} aria-hidden="true" />
          Home
        </button>
        <div className="editor-date">
          <SaveStatusText status={status} isNew={isNew} />
          {notice && status.kind === 'idle' && <span className="muted"> · {notice}</span>}
        </div>
      </div>
      {(message || voice.error) && (
        <div className="banner-info editor-banner" role="status">
          <span className="grow">{message ?? voice.error}</span>
          <button
            className="icon-btn small"
            aria-label="Dismiss"
            onClick={() => {
              setMessage(null);
              voice.dismissError();
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      <PageHeader entry={entry} minutes={minutes} autoFocus={isNew} onChange={update} onTitleEnter={() => editor?.commands.focus('start')} onError={setMessage} />
      <div className="editor-sheet">
        <FormattingToolbar editor={editor} onInsertMedia={(k) => void insertMedia(k)} voice={voice} onBeautify={makeBeautiful} />
        <AnimatePresence>
          {beautified && (
            <motion.div className="beautify-card" role="status" initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <Sparkles size={18} className="beautify-icon" aria-hidden="true" />
              <div className="grow">
                <div className="beautify-title">Made beautiful, right here on your device</div>
                <div className="beautify-detail">{beautified.result.changes.length ? sentence(beautified.result.changes) : 'It was already lovely. Nothing needed changing.'}</div>
              </div>
              {beautified.result.tasks.length > 0 &&
                (beautified.added !== undefined ? (
                  <span className="beautify-added">
                    <CheckCircle2 size={15} aria-hidden="true" /> Added to To-Do
                  </span>
                ) : (
                  <button className="btn btn-small btn-accent" onClick={() => void addPlansToTodo()}>
                    <ListPlus size={15} aria-hidden="true" />
                    Add {beautified.result.tasks.length} to To-Do
                  </button>
                ))}
              <button className="btn btn-small" onClick={undoBeautify}>
                <Undo2 size={14} aria-hidden="true" />
                Undo
              </button>
              <button className="icon-btn small" aria-label="Close" onClick={() => setBeautified(null)}>
                <X size={15} aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="editor-body-wrap">
          {shimmer > 0 && <div className="beautify-shimmer" key={shimmer} aria-hidden="true" />}
          <EditorContent editor={editor} className="editor-body" />
        </div>
        <MetadataRail
          mood={entry.mood}
          tags={entry.tags}
          words={words}
          minutes={minutes}
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

function sentence(parts: string[]): string {
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}

function SaveStatusText({ status, isNew }: { status: SaveStatus; isNew: boolean }) {
  switch (status.kind) {
    case 'saving':
      return <span className="save-status saving">Saving…</span>;
    case 'saved':
      return <span className="save-status saved">Saved {status.at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>;
    case 'error':
      return <span className="error-text">Not saved: {status.message}</span>;
    default:
      return <span className="save-status">{isNew ? 'New page' : 'Saved'}</span>;
  }
}
