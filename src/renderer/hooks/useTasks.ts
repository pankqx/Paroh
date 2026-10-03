import { useCallback, useEffect, useState } from 'react';
import type { TaskInput } from '../../shared/ipc-contract';
import type { Result } from '../../shared/types/Result';
import type { NudgeAction, Task } from '../../shared/types/Task';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((r: Result<Task[]>) => (r.ok ? setTasks(r.value) : setError(r.error)), []);
  const load = useCallback(() => window.paroh.tasks.list().then(apply), [apply]);

  useEffect(() => {
    void window.paroh.tasks.list().then(apply);
    return window.paroh.vault.onChanged((c) => c.reset && void load());
  }, [apply, load]);

  const run = useCallback(
    async (action: () => Promise<Result<unknown>>) => {
      const result = await action();
      setError(result.ok ? null : result.error);
      await load();
      return result.ok;
    },
    [load],
  );

  return {
    tasks,
    error,
    dismissError: () => setError(null),
    create: (input: TaskInput) => run(() => window.paroh.tasks.create(input)),
    update: (id: string, input: TaskInput) => run(() => window.paroh.tasks.update(id, input)),
    toggle: (id: string) => run(() => window.paroh.tasks.toggle(id)),
    resolveNudge: (id: string, action: NudgeAction, reflection?: string) => run(() => window.paroh.tasks.resolveNudge(id, action, reflection)),
    remove: (id: string) => run(() => window.paroh.tasks.remove(id)),
    comment: (id: string, text: string) => run(() => window.paroh.tasks.comment(id, text)),
    uncomment: (id: string, commentId: string) => run(() => window.paroh.tasks.uncomment(id, commentId)),
  };
}
