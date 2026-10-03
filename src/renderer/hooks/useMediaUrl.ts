import { useEffect, useState } from 'react';
import { isMediaPath, mediaType } from '../../shared/media';

// One object URL per file for the life of the window: covers and photos appear on many screens,
// and reading a photo off disk once is enough.
const cache = new Map<string, Promise<string>>();

export function mediaUrl(path: string): Promise<string> {
  let hit = cache.get(path);
  if (!hit && !isMediaPath(path)) return Promise.reject(new Error('This picture is linked from outside your journal folder, so Paroh doesn’t load it.'));
  if (!hit) {
    hit = window.paroh.media.read(path).then((r) => {
      if (!r.ok) throw new Error(r.error);
      return URL.createObjectURL(new Blob([r.value as BlobPart], { type: mediaType(path)?.mime ?? 'application/octet-stream' }));
    });
    // A failed read is retried next time instead of being remembered.
    hit.catch(() => cache.delete(path));
    cache.set(path, hit);
  }
  return hit;
}

/** A displayable URL for a vault media path, or the reason it could not be loaded. */
export function useMediaUrl(path: string | undefined): { url: string | null; error: string | null } {
  const [state, setState] = useState<{ path?: string; url: string | null; error: string | null }>({ url: null, error: null });
  useEffect(() => {
    if (!path) return;
    let live = true;
    mediaUrl(path).then(
      (url) => live && setState({ path, url, error: null }),
      (e: Error) => live && setState({ path, url: null, error: e.message }),
    );
    return () => {
      live = false;
    };
  }, [path]);
  return state.path === path ? { url: state.url, error: state.error } : { url: null, error: null };
}
