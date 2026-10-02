import { useEffect, useState } from 'react';
import { emptyEntry, type Entry } from '../../../shared/types/Entry';
import { EntryEditor } from './EntryEditor';

interface Props {
  date: string;
  onBack: () => void;
  onSaved: () => void;
}

export function EditorPage({ date, onBack, onSaved }: Props) {
  const [state, setState] = useState<{ entry: Entry; isNew: boolean } | { error: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void window.paroh.entries.load(date).then((result) => {
      if (cancelled) return;
      if (!result.ok) setState({ error: result.error });
      else setState({ entry: result.value ?? emptyEntry(date), isNew: result.value === null });
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

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
  return <EntryEditor initial={state.entry} isNew={state.isNew} onBack={onBack} onSaved={onSaved} />;
}
