import Text from '@tiptap/extension-text';
import { WIKILINK_RE } from '../../../../shared/wikilinks';

interface MarkdownSerializerState {
  text(text: string, escape?: boolean): void;
}

const escapeHtml = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Markdown serialization escapes `[` and `]`, which would turn `[[link]]` into `\[\[link\]\]` on disk.
 * This keeps wikilinks literal (Obsidian-compatible) and escapes everything else as usual.
 */
export const WikilinkText = Text.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: { text?: string }) {
          const text = node.text ?? '';
          let last = 0;
          for (const m of text.matchAll(WIKILINK_RE)) {
            const at = m.index ?? 0;
            if (at > last) state.text(escapeHtml(text.slice(last, at)));
            state.text(escapeHtml(m[0]), false);
            last = at + m[0].length;
          }
          if (last < text.length) state.text(escapeHtml(text.slice(last)));
        },
      },
    };
  },
});
