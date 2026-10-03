import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MediaBlockView } from './MediaBlockView';

export type MediaWidth = 'normal' | 'wide' | 'full';
const WIDTHS: MediaWidth[] = ['normal', 'wide', 'full'];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaBlock: {
      insertMedia: (attrs: { src: string; caption?: string; width?: MediaWidth }) => ReturnType;
    };
  }
}

interface MarkdownState {
  write(text: string): void;
  closeBlock(node: unknown): void;
}

/** Escapes what would end the Markdown image syntax early. */
const escCaption = (s: string) => s.replace(/[[\]\\]/g, (c) => `\\${c}`).replace(/\n/g, ' ');

/**
 * A photo, video or sound clip on its own line. In the Markdown file it is plain image syntax,
 * `![caption](media/2026-10/sunset.jpg "wide")`, so other editors still show photos and the file
 * stays readable; the extension decides whether it plays as a picture, a video or audio.
 */
export const MediaBlock = Node.create({
  name: 'mediaBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: '' },
      caption: { default: '' },
      width: { default: 'normal' as MediaWidth },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (el) => {
          const img = el as HTMLElement;
          const src = img.getAttribute('src') ?? '';
          const title = img.getAttribute('title') ?? '';
          return { src, caption: img.getAttribute('alt') ?? '', width: WIDTHS.includes(title as MediaWidth) ? title : 'normal' };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, caption, width } = HTMLAttributes as { src: string; caption: string; width: MediaWidth };
    return ['img', mergeAttributes({ src, alt: caption, ...(width !== 'normal' ? { title: width } : {}) })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaBlockView);
  },

  addCommands() {
    return {
      insertMedia:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent([{ type: this.name, attrs: { caption: '', width: 'normal', ...attrs } }, { type: 'paragraph' }]),
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownState, node: { attrs: { src: string; caption: string; width: MediaWidth } }) {
          const { src, caption, width } = node.attrs;
          state.write(`![${escCaption(caption ?? '')}](${src}${width && width !== 'normal' ? ` "${width}"` : ''})`);
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },
});
