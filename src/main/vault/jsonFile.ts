import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { atomicWrite } from './atomicWrite';

/** Reads a JSON store under `.paroh/`. Missing → fallback; unreadable → throws, so nothing overwrites it blindly. */
export async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw e;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${path} is not valid JSON; fix or remove it so Paroh does not overwrite it`);
  }
}

export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const text = `${JSON.stringify(data, null, 2)}\n`;
  await atomicWrite(path, text, (written) => {
    try {
      JSON.parse(written);
      return null;
    } catch {
      return 'Serialized JSON did not parse';
    }
  });
}
