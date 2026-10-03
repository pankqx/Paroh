import Highlight from '@tiptap/extension-highlight';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import type { AnyExtension } from '@tiptap/core';
import { Markdown } from 'tiptap-markdown';
import { MediaBlock } from './tiptap-extensions/mediaBlock';
import { WikilinkText } from './tiptap-extensions/wikilinkText';

/**
 * What an entry's body can hold, shared by the editor and the Markdown round-trip tests. Plain
 * Markdown covers most of it; underline, highlight and text colour are kept as small inline HTML
 * tags (`<u>`, `<mark>`, `<span style="color">`), which other Markdown apps also display.
 */
export function contentExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({ heading: { levels: [2, 3] }, text: false, link: false }),
    WikilinkText,
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    TaskList,
    TaskItem.configure({ nested: true }),
    MediaBlock,
    // `html: true` only lets those small tags through: anything pasted or opened still has to fit
    // the editor's schema, so scripts, iframes and unknown tags are dropped (security.md).
    Markdown.configure({ html: true, transformPastedText: true, transformCopiedText: true }),
  ];
}

export function getMarkdown(editor: { storage: unknown }): string {
  return (editor.storage as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
}
