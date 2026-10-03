import { Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { Mood } from '../../../shared/types/Mood';
import type { Backlink } from '../../../shared/types/Search';
import { formatShortDate } from '../../domain/dates';
import { MoodSelector } from '../../components/MoodSelector';

interface Props {
  mood?: Mood;
  tags: string[];
  words: number;
  minutes: number;
  backlinks?: Backlink[];
  onOpenEntry?: (date: string) => void;
  onMood: (mood: Mood) => void;
  onTags: (tags: string[]) => void;
  onDelete?: () => void;
}

export function MetadataRail({ mood, tags, words, minutes, backlinks = [], onOpenEntry, onMood, onTags, onDelete }: Props) {
  const [draft, setDraft] = useState('');

  function addTag() {
    const tag = draft.trim().toLowerCase().replace(/^#/, '');
    setDraft('');
    if (tag && !tags.includes(tag)) onTags([...tags, tag]);
  }

  return (
    <aside className="metadata-rail" aria-label="Entry details">
      <section>
        <h4 className="rail-label">Mood</h4>
        <MoodSelector value={mood} onChange={onMood} />
      </section>
      <section>
        <h4 className="rail-label">Tags</h4>
        <div className="tags">
          {tags.map((t) => (
            <span key={t} className="tag">
              {t}
              <button className="tag-remove" aria-label={`Remove tag ${t}`} onClick={() => onTags(tags.filter((x) => x !== t))}>
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        <input
          className="tag-input"
          placeholder="Add a tag and press Enter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
        />
      </section>
      <section className="rail-stats">
        <div>
          <span className="micro muted">Words</span>
          <div>{words}</div>
        </div>
        <div>
          <span className="micro muted">Read time</span>
          <div>{minutes} min</div>
        </div>
      </section>
      {backlinks.length > 0 && (
        <section>
          <h4 className="rail-label">Linked from</h4>
          <ul className="backlinks">
            {backlinks.map((b) => (
              <li key={b.date}>
                <button className="link-btn" onClick={() => onOpenEntry?.(b.date)}>
                  {b.title || 'Untitled'}
                </button>{' '}
                <span className="micro muted">{formatShortDate(b.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <span className="micro muted">Private. Stored as a Markdown file in your journal folder, with its photos beside it.</span>
      </section>
      {onDelete && (
        <button className="btn btn-danger" onClick={onDelete}>
          <Trash2 size={15} aria-hidden="true" />
          Delete entry
        </button>
      )}
    </aside>
  );
}
