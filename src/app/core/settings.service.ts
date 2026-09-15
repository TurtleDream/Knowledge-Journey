import { Injectable } from '@angular/core';

import { apiBase } from './api-base';

/**
 * Настройки с локального бэкенда (server/settings.json).
 * Если бэкенд не поднят — load() вернёт null, приложение живёт
 * на ключах из localStorage как раньше.
 */
export interface BackendConfig {
  port?: number;
  llm?: { provider: string; apiKey: string; model?: string; apiUrl?: string; folderId?: string };
  embeddings?: { apiKey?: string; iamToken?: string; folderId: string; kind?: 'doc' | 'query' };
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private cfgPromise: Promise<BackendConfig | null> | null = null;

  load(): Promise<BackendConfig | null> {
    this.cfgPromise ??= fetch(`${apiBase()}/api/config`)
      .then((r) => (r.ok ? (r.json() as Promise<BackendConfig>) : null))
      .catch(() => null);
    return this.cfgPromise;
  }
}
