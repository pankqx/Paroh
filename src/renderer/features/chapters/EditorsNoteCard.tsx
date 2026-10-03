import { useEffect, useState } from 'react';
import type { EditorsNoteDraft } from '../../../shared/ipc-contract';
import type { EditorsNote } from '../../../shared/types/EditorsNote';

type State =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'saved'; note: EditorsNote }
  | { kind: 'writing' }
  | { kind: 'draft'; draft: EditorsNoteDraft };

interface Props {
  month: string;
  /** Whether the Editor's Note switch is on. A saved note shows either way: it is the person's file now. */
  enabled: boolean;
}

/**
 * A short narrative of the month from Claude (roadmap Phase 8). Opt-in, and a draft only reaches the
 * vault when the person keeps it. With the switch off and no saved note, nothing renders at all.
 */
export function EditorsNoteCard({ month, enabled }: Props) {
  const [state, setState] = useState<{ month: string; value: State }>({ month, value: { kind: 'loading' } });
  const [error, setError] = useState<string | null>(null);
  const current: State = state.month === month ? state.value : { kind: 'loading' };
  const set = (value: State) => setState({ month, value });

  useEffect(() => {
    let cancelled = false;
    void window.paroh.ai.note.load(month).then((r) => {
      if (cancelled) return;
      setError(r.ok ? null : r.error);
      setState({ month, value: r.ok && r.value ? { kind: 'saved', note: r.value } : { kind: 'empty' } });
    });
    return () => {
      cancelled = true;
      void window.paroh.ai.note.cancel();
    };
  }, [month]);

  async function write() {
    setError(null);
    set({ kind: 'writing' });
    const r = await window.paroh.ai.note.generate(month);
    if (r.ok) return setState({ month: r.value.month, value: { kind: 'draft', draft: r.value } });
    if (r.error !== 'Stopped.') setError(r.error);
    set({ kind: 'empty' });
  }

  async function keep(draft: EditorsNoteDraft) {
    const r = await window.paroh.ai.note.save(draft);
    if (!r.ok) return setError(r.error);
    setError(null);
    set({ kind: 'saved', note: r.value });
  }

  async function remove() {
    const r = await window.paroh.ai.note.remove(month);
    if (!r.ok) return setError(r.error);
    set({ kind: 'empty' });
  }

  if (current.kind === 'loading' || (!enabled && current.kind !== 'saved')) return null;

  return (
    <section className="card editors-note" aria-labelledby="editors-note-title">
      <div className="editors-note-head">
        <h2 className="card-title" id="editors-note-title">
          Editor’s Note
        </h2>
        {current.kind === 'draft' && <span className="micro muted">Draft from Claude, not saved</span>}
      </div>

      {current.kind === 'empty' && (
        <>
          <p className="small muted">Claude can read this month’s entries and write a short note about the chapter they make. It is only saved if you keep it.</p>
          <button className="btn btn-primary" onClick={() => void write()}>
            Write an Editor’s Note
          </button>
        </>
      )}

      {current.kind === 'writing' && (
        <div className="settings-actions" role="status">
          <span className="small">Claude is reading this month…</span>
          <button className="btn" onClick={() => void window.paroh.ai.note.cancel()}>
            Stop
          </button>
        </div>
      )}

      {current.kind === 'draft' && (
        <>
          <NoteText text={current.draft.text} />
          <div className="settings-actions">
            <button className="btn btn-primary" onClick={() => void keep(current.draft)}>
              Keep this note
            </button>
            <button className="btn" onClick={() => void write()}>
              Try again
            </button>
            <button className="btn" onClick={() => set({ kind: 'empty' })}>
              Discard
            </button>
          </div>
        </>
      )}

      {current.kind === 'saved' && (
        <>
          <NoteText text={current.note.text} />
          <div className="settings-actions">
            <span className="micro muted">
              Written with Claude{current.note.createdAt ? ` on ${new Date(current.note.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}. Saved in your vault’s chapters folder.
            </span>
            <button className="btn" onClick={() => void remove()}>
              Remove note
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="error-text small" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function NoteText({ text }: { text: string }) {
  return (
    <div className="editors-note-text">
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
