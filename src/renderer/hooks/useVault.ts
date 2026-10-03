import { useCallback, useEffect, useState } from 'react';

/** Asks before using a folder that already holds unrelated files (feature-specifications.md §12 Edge Cases). */
export async function chooseVaultFolder(): Promise<string | null> {
  const choice = await window.paroh.vault.choose();
  if (!choice) return null;
  if (choice.status === 'switched') return choice.path;
  const list = choice.sample.join(', ');
  const ok = window.confirm(
    `${choice.path} already has other files in it (${list}${choice.sample.length >= 5 ? ', …' : ''}).\n\nParoh will add its own folders next to them and never touch the existing files. Use this folder anyway?`,
  );
  if (!ok) return null;
  return (await window.paroh.vault.confirmChoice())?.path ?? null;
}

export function useVault(onChange: () => void) {
  const [path, setPath] = useState('');

  useEffect(() => {
    void window.paroh.vault.info().then((info) => setPath(info.path));
    return window.paroh.vault.onChanged((change) => change.reset && void window.paroh.vault.info().then((info) => setPath(info.path)));
  }, []);

  const choose = useCallback(async () => {
    const next = await chooseVaultFolder();
    if (next) {
      setPath(next);
      onChange();
    }
  }, [onChange]);

  return { path, choose };
}
