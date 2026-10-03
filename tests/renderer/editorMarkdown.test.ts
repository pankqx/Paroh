// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { contentExtensions, getMarkdown } from '../../src/renderer/features/editor/contentExtensions';

function roundTrip(markdown: string): string {
  const editor = new Editor({ extensions: contentExtensions(), content: markdown });
  const out = getMarkdown(editor);
  editor.destroy();
  return out;
}

describe('entry body Markdown', () => {
  it('keeps photos, videos and voice notes as image syntax, with caption and width', () => {
    const md = 'Morning.\n\n![The lake at seven](media/2026-10/lake.jpg "wide")\n\n![](media/2026-10/waves.mp4)\n\n![Note to self](media/2026-10/voice.weba)\n\nAfter.';
    expect(roundTrip(md)).toBe(md);
  });

  it('keeps checklists, highlights, underline and colour', () => {
    const md = '- [ ] call the bank\n\n- [x] water plants\n\nA <u>quiet</u> day, <mark data-color="#fde68a" style="background-color: rgb(253, 230, 138); color: inherit;">mostly</mark>.';
    expect(roundTrip(md)).toBe(md);
    expect(roundTrip('- [ ] a\n- [x] b')).toBe('- [ ] a\n\n- [x] b');
  });

  it('drops scripts and unknown tags from a hand-edited file', () => {
    const out = roundTrip('Hello <script>alert(1)</script><iframe src="x"></iframe> world');
    expect(out).not.toMatch(/script|iframe/);
    expect(out).toContain('Hello');
  });

  it('keeps an image linked from elsewhere instead of dropping it', () => {
    expect(roundTrip('![x](https://example.com/a.png)')).toBe('![x](https://example.com/a.png)');
  });
});
