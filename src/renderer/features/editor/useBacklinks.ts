import { useEffect, useState } from 'react';
import type { Backlink } from '../../../shared/types/Search';

export function useBacklinks(date: string): Backlink[] {
  const [links, setLinks] = useState<Backlink[]>([]);
  useEffect(() => {
    const load = () => void window.paroh.entries.backlinks(date).then((r) => r.ok && setLinks(r.value));
    load();
    return window.paroh.vault.onChanged(load);
  }, [date]);
  return links;
}
