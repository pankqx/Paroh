import { forwardRef, useImperativeHandle, useState } from 'react';

export interface SuggestionItem {
  id: string;
  label: string;
  hint?: string;
}

export interface SuggestionListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface Props {
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
  empty: string;
}

/** Keyboard-driven popup shared by the slash menu and wikilink autocomplete. */
export const SuggestionList = forwardRef<SuggestionListHandle, Props>(function SuggestionList({ items, command, empty }, ref) {
  const [selected, setSelected] = useState(0);
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setSelected(0);
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) return false;
      if (event.key === 'ArrowDown') setSelected((s) => (s + 1) % items.length);
      else if (event.key === 'ArrowUp') setSelected((s) => (s + items.length - 1) % items.length);
      else if (event.key === 'Enter' || event.key === 'Tab') command(items[selected]);
      else return false;
      return true;
    },
  }));

  return (
    <div className="suggestion-list" role="listbox">
      {items.length === 0 ? (
        <div className="suggestion-empty">{empty}</div>
      ) : (
        items.map((item, i) => (
          <button
            key={item.id}
            role="option"
            aria-selected={i === selected}
            className={`suggestion-item ${i === selected ? 'selected' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(item)}
          >
            <span>{item.label}</span>
            {item.hint && <span className="suggestion-hint">{item.hint}</span>}
          </button>
        ))
      )}
    </div>
  );
});
