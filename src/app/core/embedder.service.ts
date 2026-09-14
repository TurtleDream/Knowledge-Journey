import { Injectable } from '@angular/core';

import { SqliteService } from './sqlite.service';
import { EmbeddingProvider, YandexEmbeddingProvider } from './embedding-provider';

const MAX_BATCH = 50;
const PARALLEL = 4; // одновременных запросов к API
const MAX_RETRIES = 3;
const BACKOFF_MS = 500;

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function vecToBlob(vec: number[]): Uint8Array {
  return new Uint8Array(new Float32Array(vec).buffer);
}

function blobToVec(blob: Uint8Array): number[] {
  return Array.from(new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4));
}

@Injectable({ providedIn: 'root' })
export class EmbedderService {
  // временно — новый провайдер каждый раз, токен изнутри приложения
  private provider: EmbeddingProvider = new YandexEmbeddingProvider('', 'b1g…', 'doc');

  setProvider(p: EmbeddingProvider): void {
    this.provider = p;
  }

  constructor(private db: SqliteService) {}

  async embed(text: string): Promise<number[]> {
    const key = await sha256(text);
    const cached = await this.db.exec(
      'SELECT vec FROM embeddings_cache WHERE key = ?',
      [key],
    );
    if (cached.length > 0) return blobToVec(cached[0].vec as Uint8Array);

    const vec = await this.embedWithRetry(text);
    await this.db.run(
      'INSERT OR REPLACE INTO embeddings_cache (key, vec) VALUES (?, ?)',
      [key, vecToBlob(vec)],
    );
    return vec;
  }

  // Яндекс не умеет батч в одном запросе, поэтому батч — это до 50 текстов,
  // которые гоним с ограничением параллелизма
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length > MAX_BATCH) {
      throw new Error(`батч больше ${MAX_BATCH} текстов, режьте наверху`);
    }
    const res: number[][] = new Array(texts.length);
    let next = 0;

    const worker = async (): Promise<void> => {
      while (next < texts.length) {
        const i = next++;
        res[i] = await this.embed(texts[i]);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL, texts.length) }, worker),
    );
    return res;
  }

  private async embedWithRetry(text: string): Promise<number[]> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.provider.embed(text);
      } catch (e) {
        const status = (e as { status?: number }).status ?? 0;
        const retriable = status === 429 || status >= 500;
        if (!retriable || attempt >= MAX_RETRIES) throw e;
        await new Promise((r) => setTimeout(r, BACKOFF_MS * 2 ** attempt));
      }
    }
  }
}
