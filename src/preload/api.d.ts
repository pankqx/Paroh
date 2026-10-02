import type { ParohApi } from '../shared/ipc-contract';

declare global {
  interface Window {
    paroh: ParohApi;
  }
}

export {};
