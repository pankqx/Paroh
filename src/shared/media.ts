/** Photos, videos and sound kept beside the entries in `<vault>/media/YYYY-MM/`, linked from Markdown as `![caption](media/…)`. */
export type MediaKind = 'image' | 'video' | 'audio';

const TYPES: Record<string, { kind: MediaKind; mime: string }> = {
  jpg: { kind: 'image', mime: 'image/jpeg' },
  jpeg: { kind: 'image', mime: 'image/jpeg' },
  png: { kind: 'image', mime: 'image/png' },
  gif: { kind: 'image', mime: 'image/gif' },
  webp: { kind: 'image', mime: 'image/webp' },
  avif: { kind: 'image', mime: 'image/avif' },
  mp4: { kind: 'video', mime: 'video/mp4' },
  m4v: { kind: 'video', mime: 'video/mp4' },
  mov: { kind: 'video', mime: 'video/quicktime' },
  webm: { kind: 'video', mime: 'video/webm' },
  // Voice notes recorded inside an entry; `.weba` keeps them apart from `.webm` videos.
  weba: { kind: 'audio', mime: 'audio/webm' },
  mp3: { kind: 'audio', mime: 'audio/mpeg' },
  m4a: { kind: 'audio', mime: 'audio/mp4' },
  aac: { kind: 'audio', mime: 'audio/aac' },
  wav: { kind: 'audio', mime: 'audio/wav' },
  ogg: { kind: 'audio', mime: 'audio/ogg' },
  oga: { kind: 'audio', mime: 'audio/ogg' },
  opus: { kind: 'audio', mime: 'audio/ogg' },
};

/** Big enough for a phone video, small enough not to stall the app copying it. */
export const MAX_MEDIA_BYTES = 300 * 1024 * 1024;
export const MEDIA_DIR = 'media';

export function mediaExtension(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
}

export function mediaType(name: string): { kind: MediaKind; mime: string } | null {
  return TYPES[mediaExtension(name)] ?? null;
}

/** What a file picker should offer for each kind. */
export function acceptFor(kind: MediaKind): string {
  return Object.entries(TYPES)
    .filter(([, t]) => t.kind === kind)
    .map(([ext, t]) => `.${ext},${t.mime}`)
    .join(',');
}

/** A media path is only ever inside `media/`, with a known extension and no tricks. */
export function isMediaPath(path: string): boolean {
  if (typeof path !== 'string' || !path.startsWith(`${MEDIA_DIR}/`)) return false;
  if (path.includes('\\') || path.includes('\0')) return false;
  if (!path.split('/').every((s) => s !== '' && s !== '.' && s !== '..')) return false;
  return mediaType(path) !== null;
}

/** "Holiday Photo (1).JPG" → "holiday-photo-1", for a readable file name. */
export function slugifyFileName(name: string): string {
  const base = name.replace(/\.[^.]*$/, '');
  const slug = base
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'media';
}
