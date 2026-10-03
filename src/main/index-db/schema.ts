/**
 * The index is disposable (architecture.md §Search & Indexing): bump INDEX_VERSION whenever this
 * schema changes and every vault's index.db is thrown away and rebuilt from the Markdown files.
 */
export const INDEX_VERSION = 4;

export const SCHEMA = `
CREATE TABLE entries (
  date TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_key TEXT NOT NULL,
  mood TEXT,
  tags TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  habits TEXT NOT NULL DEFAULT '[]',
  prompt_id TEXT,
  prompt_skipped INTEGER NOT NULL DEFAULT 0,
  mtime REAL NOT NULL
);
CREATE INDEX entries_title_key ON entries(title_key);
CREATE TABLE entry_tags (date TEXT NOT NULL, tag TEXT NOT NULL, PRIMARY KEY (date, tag));
CREATE INDEX entry_tags_tag ON entry_tags(tag);
CREATE TABLE links (source TEXT NOT NULL, target TEXT NOT NULL, PRIMARY KEY (source, target));
CREATE INDEX links_target ON links(target);
CREATE VIRTUAL TABLE entries_fts USING fts5(date UNINDEXED, title, body, tags, tokenize = 'porter unicode61');
CREATE VIRTUAL TABLE transcripts_fts USING fts5(id UNINDEXED, date UNINDEXED, text, tokenize = 'porter unicode61');
`;
