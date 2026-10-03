import { open, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

/**
 * A small ZIP writer and reader (store + deflate), so vault export/import needs no extra dependency.
 * Files are written one at a time, so a large vault never has to fit in memory at once.
 */

export interface ZipSource {
  /** Path inside the archive, always with forward slashes. */
  name: string;
  /** Absolute path on disk. */
  path: string;
}

// Already-compressed formats are stored as-is; deflating them again only costs time.
const STORE_EXT = /\.(webm|ogg|mp3|m4a|png|jpe?g|gif|webp|zip)$/i;

function dosDateTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: (Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export async function writeZip(target: string, sources: readonly ZipSource[], onProgress?: (done: number, total: number) => void): Promise<{ files: number; bytes: number }> {
  const handle = await open(target, 'w');
  const central: Buffer[] = [];
  let offset = 0;
  try {
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      const data = await readFile(src.path);
      const { mtime } = await stat(src.path);
      const method = STORE_EXT.test(src.name) ? 0 : 8;
      const body = method === 8 ? deflateRawSync(data) : data;
      const name = Buffer.from(src.name, 'utf8');
      const crc = crc32(data);
      const { time, date } = dosDateTime(mtime);

      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0x0800, 6); // UTF-8 names
      local.writeUInt16LE(method, 8);
      local.writeUInt16LE(time, 10);
      local.writeUInt16LE(date, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(body.length, 18);
      local.writeUInt32LE(data.length, 22);
      local.writeUInt16LE(name.length, 26);
      local.writeUInt16LE(0, 28);
      await handle.write(Buffer.concat([local, name, body]));

      const entry = Buffer.alloc(46);
      entry.writeUInt32LE(0x02014b50, 0);
      entry.writeUInt16LE(20, 4);
      entry.writeUInt16LE(20, 6);
      entry.writeUInt16LE(0x0800, 8);
      entry.writeUInt16LE(method, 10);
      entry.writeUInt16LE(time, 12);
      entry.writeUInt16LE(date, 14);
      entry.writeUInt32LE(crc, 16);
      entry.writeUInt32LE(body.length, 20);
      entry.writeUInt32LE(data.length, 24);
      entry.writeUInt16LE(name.length, 28);
      entry.writeUInt32LE(offset, 42);
      central.push(Buffer.concat([entry, name]));

      offset += local.length + name.length + body.length;
      if (offset > 0xffffffff) throw new Error('Vault is larger than 4 GB; export it in parts or copy the folder directly');
      onProgress?.(i + 1, sources.length);
    }
    const dir = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(sources.length, 8);
    end.writeUInt16LE(sources.length, 10);
    end.writeUInt32LE(dir.length, 12);
    end.writeUInt32LE(offset, 16);
    await handle.write(Buffer.concat([dir, end]));
    await handle.sync();
  } finally {
    await handle.close();
  }
  return { files: sources.length, bytes: offset };
}

export interface ZipEntry {
  name: string;
  data: Buffer;
}

/** Reads every file entry, checking each CRC. Names that would escape the destination are rejected. */
export function readZip(buf: Buffer): ZipEntry[] {
  let end = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error('Not a ZIP file');
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const entries: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Damaged ZIP directory');
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const compressed = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error(`Damaged ZIP entry: ${name}`);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + compressed);
    let data: Buffer;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) data = inflateRawSync(raw);
    else throw new Error(`Unsupported compression in ${name}`);
    if (crc32(data) !== crc) throw new Error(`Corrupt file in archive: ${name}`);
    entries.push({ name, data });
  }
  return entries;
}

export async function extractZip(buf: Buffer, destination: string): Promise<number> {
  const root = resolve(destination);
  const entries = readZip(buf);
  for (const e of entries) {
    const target = resolve(root, e.name);
    if (!target.startsWith(root + sep) || e.name.includes('\\')) throw new Error(`Refusing unsafe path in archive: ${e.name}`);
  }
  for (const e of entries) {
    const target = join(root, e.name);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, e.data);
  }
  return entries.length;
}
