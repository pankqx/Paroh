/**
 * An in-memory stand-in for Capacitor's Filesystem plugin, with the error messages and quirks of its
 * web implementation (no encoding means base64, missing parents need `recursive`), so CapacitorVaultFs
 * can be tested without a phone.
 */
interface Node {
  type: 'file' | 'directory';
  data: Uint8Array;
  mtime: number;
  ctime: number;
}

const files = new Map<string, Node>();
let clock = 1_700_000_000_000;

const key = (o: { path: string; directory?: string }) => `${o.directory ?? ''}:${o.path.replace(/^\/+|\/+$/g, '')}`;
const parentKey = (k: string) => (k.includes('/') ? k.slice(0, k.lastIndexOf('/')) : null);
const enc = new TextEncoder();
const dec = new TextDecoder();
const toBytes = (data: string, encoding?: string) => (encoding ? enc.encode(data) : Uint8Array.from(atob(data), (c) => c.charCodeAt(0)));
const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));

function ensureParents(k: string, recursive?: boolean) {
  const parent = parentKey(k);
  if (!parent || files.get(parent)?.type === 'directory') return;
  if (!recursive) throw new Error('Parent directory must exist');
  ensureParents(parent, true);
  files.set(parent, { type: 'directory', data: new Uint8Array(), mtime: clock, ctime: clock });
}

function children(k: string): string[] {
  return [...files.keys()].filter((c) => parentKey(c) === k);
}

export function resetFakeFilesystem() {
  files.clear();
}

/** Shows what is on the fake disk, for assertions. */
export function fakeFileText(path: string, directory = 'DOCUMENTS'): string | undefined {
  const n = files.get(`${directory}:${path}`);
  return n?.type === 'file' ? dec.decode(n.data) : undefined;
}

export const Directory = { Documents: 'DOCUMENTS', Data: 'DATA' } as const;
export const Encoding = { UTF8: 'utf8' } as const;

export const Filesystem = {
  async readFile(o: { path: string; directory?: string; encoding?: string }) {
    const n = files.get(key(o));
    if (!n || n.type !== 'file') throw new Error('File does not exist.');
    return { data: o.encoding ? dec.decode(n.data) : toBase64(n.data) };
  },
  async writeFile(o: { path: string; directory?: string; data: string; encoding?: string; recursive?: boolean }) {
    const k = key(o);
    if (files.get(k)?.type === 'directory') throw new Error('The supplied path is a directory.');
    ensureParents(k, o.recursive);
    const now = ++clock;
    files.set(k, { type: 'file', data: toBytes(o.data, o.encoding), mtime: now, ctime: files.get(k)?.ctime ?? now });
    return { uri: k };
  },
  async appendFile(o: { path: string; directory?: string; data: string; encoding?: string }) {
    const k = key(o);
    ensureParents(k, false);
    const prev = files.get(k)?.data ?? new Uint8Array();
    const add = toBytes(o.data, o.encoding);
    const next = new Uint8Array(prev.length + add.length);
    next.set(prev);
    next.set(add, prev.length);
    const now = ++clock;
    files.set(k, { type: 'file', data: next, mtime: now, ctime: files.get(k)?.ctime ?? now });
  },
  async readdir(o: { path: string; directory?: string }) {
    const k = key(o);
    if (files.get(k)?.type !== 'directory') throw new Error('Folder does not exist.');
    return { files: children(k).map((c) => ({ name: c.slice(c.lastIndexOf('/') + 1) })) };
  },
  async stat(o: { path: string; directory?: string }) {
    const n = files.get(key(o));
    if (!n) throw new Error('Entry does not exist.');
    return { type: n.type, size: n.data.length, mtime: n.mtime, ctime: n.ctime, uri: key(o) };
  },
  async mkdir(o: { path: string; directory?: string; recursive?: boolean }) {
    const k = key(o);
    if (files.get(k)?.type === 'directory') throw new Error('Current directory does already exist.');
    ensureParents(k, o.recursive);
    files.set(k, { type: 'directory', data: new Uint8Array(), mtime: ++clock, ctime: clock });
  },
  async deleteFile(o: { path: string; directory?: string }) {
    if (files.get(key(o))?.type !== 'file') throw new Error('File does not exist.');
    files.delete(key(o));
  },
  async rmdir(o: { path: string; directory?: string; recursive?: boolean }) {
    const k = key(o);
    if (files.get(k)?.type !== 'directory') throw new Error('Folder does not exist.');
    if (!o.recursive && children(k).length) throw new Error('Folder is not empty');
    for (const c of [...files.keys()]) if (c === k || c.startsWith(`${k}/`)) files.delete(c);
  },
  async rename(o: { from: string; to: string; directory?: string }) {
    const from = key({ path: o.from, directory: o.directory });
    const to = key({ path: o.to, directory: o.directory });
    const n = files.get(from);
    if (!n) throw new Error('Entry does not exist.');
    ensureParents(to, false);
    for (const c of [...files.keys()]) {
      if (c === from || c.startsWith(`${from}/`)) {
        files.set(to + c.slice(from.length), files.get(c)!);
        files.delete(c);
      }
    }
  },
  async requestPermissions() {
    return { publicStorage: 'granted' };
  },
};
