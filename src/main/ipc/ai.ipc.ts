import { ipcMain } from 'electron';
import { IPC, type EditorsNoteDraft } from '../../shared/ipc-contract';
import { err, ok, type Result } from '../../shared/types/Result';
import { aiFeatureEnabled } from '../ai/aiFeatureEnabled';
import { looksLikeAnthropicKey, type ApiKeyStore } from '../ai/apiKeyStore';
import type { EditorsNoteService } from '../ai/EditorsNoteService';
import type { SpeechModelStore } from '../ai/SpeechModelStore';

export function registerAiIpc(keys: ApiKeyStore, notes: () => EditorsNoteService, model: SpeechModelStore): void {
  ipcMain.handle(IPC.aiSetApiKey, async (_e, key: string | null): Promise<Result<void>> => {
    if (key !== null && (typeof key !== 'string' || !looksLikeAnthropicKey(key))) return err('That does not look like an Anthropic API key. Keys start with sk-ant-.');
    try {
      await keys.set(key === null ? null : key.trim());
      return ok(undefined);
    } catch (e) {
      return err(`Could not store the key: ${(e as Error).message}`);
    }
  });

  ipcMain.handle(IPC.aiNoteGenerate, (_e, month: string) => notes().generate(String(month)));
  ipcMain.handle(IPC.aiNoteCancel, () => notes().cancel());
  ipcMain.handle(IPC.aiNoteLoad, (_e, month: string) => notes().load(String(month)));
  ipcMain.handle(IPC.aiNoteSave, (_e, draft: EditorsNoteDraft) => notes().save(draft));
  ipcMain.handle(IPC.aiNoteRemove, (_e, month: string) => notes().remove(String(month)));

  ipcMain.handle(IPC.aiModelStatus, () => model.status());
  ipcMain.handle(IPC.aiModelDownload, async (): Promise<Result<void>> => {
    if (!(await aiFeatureEnabled('transcription'))) return err('Turn on transcription in Settings first.');
    return model.download();
  });
  ipcMain.handle(IPC.aiModelRemove, () => model.remove());
}
