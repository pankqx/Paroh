import { describe, expect, it } from 'vitest';
import { beautify } from '../../../src/renderer/domain/beautify';

const run = (body: string, title = '') => beautify({ title, body, date: '2026-10-03' }); // a Saturday

describe('beautify', () => {
  it('tidies capitals, "i", contractions, spacing and full stops without rewording', () => {
    const r = run('today was slow .i dont know why but im ok\n');
    expect(r.body).toBe('Today was slow. I don’t know why but I’m ok.\n');
  });

  it('suggests a title from the first sentence when there is none, and keeps one that exists', () => {
    expect(run('a long walk after the rain cleared my head. then tea.').title).toBe('A long walk after the rain…');
    expect(run('words.', 'my day').title).toBe('My day');
  });

  it('turns loose lists and checkboxes into Markdown lists', () => {
    expect(run('• milk\n• eggs').body).toBe('- Milk\n- Eggs\n');
    const r = run('[] call mum tomorrow\n[x] water plants');
    expect(r.body).toBe('- [ ] Call mum tomorrow\n- [x] Water plants\n');
    expect(r.tasks).toEqual([{ text: 'Call mum', due: '2026-10-04', when: 'Tomorrow' }]);
  });

  it('splits bullets typed on one line, even mid-paragraph', () => {
    expect(run('Errands:\n• buy flowers • water the plants').body).toBe('## Errands\n\n- Buy flowers\n- Water the plants\n');
  });

  it('finds plans mid-sentence', () => {
    expect(run('Work was long and i need to finish the report by friday.').tasks).toEqual([{ text: 'Finish the report', due: '2026-10-09', when: 'By Friday' }]);
  });

  it('gathers plans written as sentences into a Plan checklist with dates', () => {
    const r = run('Busy week ahead. I need to finish the report by friday. Remember to call the dentist.');
    expect(r.tasks).toEqual([{ text: 'Finish the report', due: '2026-10-09', when: 'By Friday' }, { text: 'Call the dentist' }]);
    expect(r.body).toContain('## Plan\n\n- [ ] Finish the report · *By Friday*\n- [ ] Call the dentist');
  });

  it('collects gratitude', () => {
    const r = run('Hard day. Still, I am grateful for my sister and the sun.');
    expect(r.grateful).toEqual(['My sister and the sun']);
    expect(r.body).toContain('## Grateful for\n\n- My sister and the sun');
  });

  it('makes short lines before more writing into headings', () => {
    expect(run('First line here.\n\nmorning\n\nWoke early.').body).toBe('First line here.\n\n## Morning\n\nWoke early.\n');
    expect(run('Things that helped:\n\nwalking.').body).toBe('## Things that helped\n\nWalking.\n');
  });

  it('splits very long paragraphs into readable ones', () => {
    const long = Array.from({ length: 12 }, (_, i) => `This is sentence number ${i + 1} with a few more words in it`).join('. ') + '.';
    expect(run(long).body.split('\n\n').length).toBe(4);
  });

  it('leaves code, media and quotes alone, and running it twice changes nothing', () => {
    const body = '```\nconst x = 1 ,2\n```\n\n![Lake](media/2026-10/lake.jpg)\n\n> she said it softly\n\nI need to rest tomorrow.\n';
    const once = run(body);
    expect(once.body).toContain('```\nconst x = 1 ,2\n```');
    expect(once.body).toContain('![Lake](media/2026-10/lake.jpg)');
    expect(once.body).toContain('> She said it softly.');
    const twice = beautify({ title: once.title, body: once.body, date: '2026-10-03' });
    expect(twice.body).toBe(once.body);
    expect(twice.title).toBe(once.title);
  });
});
