import { Extension } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import Suggestion from '@tiptap/suggestion';
import { WIKILINK_RE } from '../../../../shared/wikilinks';
import { renderSuggestion } from './renderSuggestion';
import type { SuggestionItem } from './SuggestionList';

export interface WikilinkOptions {
  /** Entries offered by `[[` autocomplete. */
  candidates: () => SuggestionItem[];
  onOpen: (target: string) => void;
}

/**
 * `[[target]]` stays plain text in the document (so Markdown round-trips untouched) and is only
 * decorated for display. Ctrl/Cmd+click, or a plain click, opens the linked entry.
 */
export const Wikilink = Extension.create<WikilinkOptions>({
  name: 'wikilink',
  addOptions() {
    return { candidates: () => [], onOpen: () => {} };
  },
  addProseMirrorPlugins() {
    const { candidates, onOpen } = this.options;
    return [
      new Plugin({
        key: new PluginKey('wikilinkDecorations'),
        props: {
          decorations: (state) => decorate(state.doc),
          handleClick: (_view, _pos, event) => {
            const el = (event.target as HTMLElement).closest('[data-wikilink]');
            if (!el) return false;
            onOpen(el.getAttribute('data-wikilink') ?? '');
            return true;
          },
        },
      }),
      Suggestion<SuggestionItem, SuggestionItem>({
        editor: this.editor,
        pluginKey: new PluginKey('wikilinkSuggestion'),
        char: '[[',
        allowSpaces: true,
        items: ({ query }) => {
          const q = query.toLowerCase();
          return candidates()
            .filter((c) => c.label.toLowerCase().includes(q) || c.id.includes(q))
            .slice(0, 8);
        },
        command: ({ editor, range, props }) => {
          // Swallow an auto-closed `]]` right after the cursor, if the user typed one.
          const after = editor.state.doc.textBetween(range.to, Math.min(range.to + 2, editor.state.doc.content.size));
          const to = after === ']]' ? range.to + 2 : range.to;
          editor.chain().focus().insertContentAt({ from: range.from, to }, `[[${props.id}]] `).run();
        },
        render: renderSuggestion('No matching entry. Type a date like 2026-10-02'),
      }),
    ];
  },
});

function decorate(doc: PmNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text || node.marks.some((m) => m.type.name === 'code')) return;
    for (const m of node.text.matchAll(WIKILINK_RE)) {
      const from = pos + (m.index ?? 0);
      decorations.push(Decoration.inline(from, from + m[0].length, { class: 'wikilink', 'data-wikilink': m[1].trim(), title: `Open “${m[2] ?? m[1]}”` }));
    }
  });
  return DecorationSet.create(doc, decorations);
}
