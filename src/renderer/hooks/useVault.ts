import { useCallback, useEffect, useState } from 'react';

export function useVault(onChange: () => void) {
  const [path, setPath] = useState('');

  useEffect(() => {
    void window.paroh.vault.info().then((info) => setPath(info.path));
  }, []);

  const choose = useCallback(async () => {
    const info = await window.paroh.vault.choose();
    if (info) {
      setPath(info.path);
      onChange();
    }
  }, [onChange]);

  return { path, choose };
}
