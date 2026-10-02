import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyEntry, type Entry, type EntrySummary } from '../../../shared/types/Entry';
import { EntryEditor } from './EntryEditor';

interface Props {
  date: string;
  entries: EntrySummary[];
  onOpenEntry: (date: string) => void;
  onBack: () => void;
  onSaved: () => void;
}

type State = { entry: Entry; isNew: boolean; version: number; notice?: string } | { error: string } | null;

const sameContent = (a: Entry, b: Entry) => a.title === b.title && a.body === b.body && a.mood === b.mood && a.tags.join('\n') === b.tags.join('\n');

export function EditorPage({ date, entries, onOpenEntry, onBack, onSaved }: Props) {
  const [state, setState] = useState<State>(null);
  const [conflict, setConflict] = useState<Entry | null>(null);
  // What we believe is on disk: the version we loaded, or the last one we saved.
  const onDisk = useRef<Entry | null>(null);
  const dirty = useRef<() => boolean>(() => false);

  useEffect(() => {
    let cancelled = false;
    void window.paroh.entries.load(date).then((result) => {
      if (cancelled) return;
      if (!result.ok) return setState({ error: result.error });
      onDisk.current = result.value;
      setState({ entry: result.value ?? emptyEntry(date), isNew: result.value === null, version: 0 });
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  // Entry edited outside Paroh while open: reload quietly if nothing is unsaved, otherwise ask.
  useEffect(
    () =>
      window.paroh.vault.onChanged(async (change) => {
        if (!change.reset && !change.dates.includes(date)) return;
        const result = await window.paroh.entries.load(date);
        if (!result.ok || !result.value) return;
        if (onDisk.current && sameContent(onDisk.current, result.value)) return;
        if (dirty.current()) return setConflict(result.value);
        onDisk.current = result.value;
        const fresh = result.value;
        setState((s) => (s && 'entry' in s ? { entry: fresh, isNew: false, version: s.version + 1, notice: 'Updated with changes made outside Paroh.' } : s));
      }),
    [date],
  );

  const handleSaved = useCallback(
    (entry: Entry) => {
      onDisk.current = entry;
      onSaved();
    },
    [onSaved],
  );

  if (state === null) return <div className="editor-loading muted">Opening…</div>;
  if ('error' in state)
    return (
      <div className="editor-error">
        <p className="error-text">This entry could not be opened safely, so nothing was changed: {state.error}</p>
        <button className="btn" onClick={onBack}>
          Back to Canvas
        </button>
      </div>
    );
  return (
    <>
      {conflict && (
        <div className="banner-warning" role="alert">
          <span>This entry was changed outside Paroh while you were writing. If you keep writing, your version replaces it.</span>
          <button
            className="btn"
            onClick={() => {
              onDisk.current = conflict;
              setState({ entry: conflict, isNew: false, version: state.version + 1 });
              setConflict(null);
            }}
          >
            Load the other version
          </button>
          <button className="btn" onClick={() => setConflict(null)}>
            Keep mine
          </button>
        </div>
      )}
      <EntryEditor
        key={state.version}
        initial={state.entry}
        isNew={state.isNew}
        notice={state.notice}
        entries={entries}
        dirtyRef={dirty}
        onOpenEntry={onOpenEntry}
        onBack={onBack}
        onSaved={handleSaved}
      />
    </>
  );
}
