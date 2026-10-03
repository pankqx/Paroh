import { isNotFound, parentPath, type VaultFs } from '../../shared/fs/VaultFs';

/** Reads a JSON store under `.paroh/`. Missing → fallback; unreadable → throws, so nothing overwrites it blindly. */
export async function readJsonFile<T>(fs: VaultFs, path: string, fallback: T): Promise<T> {
  let text: string;
  try {
    text = await fs.readText(path);
  } catch (e) {
    if (isNotFound(e)) return fallback;
    throw e;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${path} is not valid JSON; fix or remove it so Paroh does not overwrite it`);
  }
}

export async function writeJsonFile(fs: VaultFs, path: string, data: unknown): Promise<void> {
  await fs.mkdir(parentPath(path));
  const text = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeTextAtomic(path, text, (written) => {
    try {
      JSON.parse(written);
      return null;
    } catch {
      return 'Serialized JSON did not parse';
    }
  });
}
