import { mediaType, type MediaKind } from '../../../shared/media';
import type { Result } from '../../../shared/types/Result';

/** Copies a picked, dropped or pasted file into the vault's media folder. */
export async function uploadMedia(file: File): Promise<Result<{ path: string; kind: MediaKind }>> {
  // Pasted screenshots arrive as "image.png"; give them a better name.
  const name = file.name && file.name !== 'image.png' ? file.name : `photo-${Date.now()}.${(file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`;
  const type = mediaType(name);
  if (!type) return { ok: false, error: `“${file.name}” isn’t a photo, video or audio file Paroh can keep.` };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const saved = await window.paroh.media.save(name, bytes);
  return saved.ok ? { ok: true, value: { path: saved.value.path, kind: type.kind } } : saved;
}

/** Opens the system file picker for one kind of media. */
export function pickFiles(accept: string, multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => resolve(Array.from(input.files ?? []));
    input.click();
  });
}
