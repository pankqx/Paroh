import { Extension, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import type { MediaKind } from '../../../../shared/media';
import { renderSuggestion } from './renderSuggestion';
import type { SuggestionItem } from './SuggestionList';

interface SlashItem extends SuggestionItem {
  run: (editor: Editor, range: Range) => void;
}

const ITEMS: SlashItem[] = [
  { id: 'h2', label: 'Heading', hint: '##', run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 2 }).run() },
  { id: 'h3', label: 'Subheading', hint: '###', run: (e, r) => e.chain().focus().deleteRange(r).setHeading({ level: 3 }).run() },
  { id: 'ul', label: 'Bullet list', hint: '-', run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { id: 'ol', label: 'Numbered list', hint: '1.', run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { id: 'todo', label: 'Checklist', hint: '[ ]', run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
  { id: 'photo', label: 'Photo', hint: 'image', run: (e, r) => insertMedia(e, r, 'image') },
  { id: 'video', label: 'Video', hint: 'film', run: (e, r) => insertMedia(e, r, 'video') },
  { id: 'audio', label: 'Audio file', hint: 'sound', run: (e, r) => insertMedia(e, r, 'audio') },
  { id: 'quote', label: 'Quote', hint: '>', run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { id: 'code', label: 'Code block', hint: '```', run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { id: 'hr', label: 'Divider', hint: '---', run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
  { id: 'link', label: 'Link to an entry', hint: '[[', run: (e, r) => e.chain().focus().deleteRange(r).insertContent('[[').run() },
];

/** The page itself owns the file picker; the menu just asks for one. */
function insertMedia(editor: Editor, range: Range, kind: MediaKind) {
  editor.chain().focus().deleteRange(range).run();
  window.dispatchEvent(new CustomEvent<MediaKind>('paroh:insert-media', { detail: kind }));
}

/** `/` opens a block menu (feature-specifications.md §4). */
export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [
      Suggestion<SuggestionItem, SuggestionItem>({
        editor: this.editor,
        pluginKey: new PluginKey('slashCommand'),
        char: '/',
        startOfLine: false,
        items: ({ query }) => ITEMS.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())),
        command: ({ editor, range, props }) => (props as SlashItem).run(editor, range),
        render: renderSuggestion('No matching block'),
      }),
    ];
  },
});
