/**
 * The index is disposable (architecture.md §Search & Indexing): bump INDEX_VERSION whenever this
 * schema changes and every vault's index.db is thrown away and rebuilt from the Markdown files.
 */
export const INDEX_VERSION = 1;

export const SCHEMA = `
CREATE TABLE entries (
  date TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_key TEXT NOT NULL,
  mood TEXT,
  tags TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  mtime REAL NOT NULL
);
CREATE INDEX entries_title_key ON entries(title_key);
CREATE TABLE entry_tags (date TEXT NOT NULL, tag TEXT NOT NULL, PRIMARY KEY (date, tag));
CREATE INDEX entry_tags_tag ON entry_tags(tag);
CREATE TABLE links (source TEXT NOT NULL, target TEXT NOT NULL, PRIMARY KEY (source, target));
CREATE INDEX links_target ON links(target);
CREATE VIRTUAL TABLE entries_fts USING fts5(date UNINDEXED, title, body, tags, tokenize = 'porter unicode61');
`;
