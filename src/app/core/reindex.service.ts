import { Injectable, signal } from '@angular/core';

import { ARTICLES, Article } from '../content/articles.data';
import { ContentChunkerService, Chunk } from './content-chunker.service';
import { EmbedderService } from './embedder.service';
import { SqliteService } from './sqlite.service';

const BATCH = 50; // под лимит embedBatch

async function hashStr(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function articleContent(a: Article): string {
  return JSON.stringify(a.sections);
}

@Injectable({ providedIn: 'root' })
export class ReindexService {
  // прогресс индексации: {done, total} по чанкам, null = не идёт
  readonly progress = signal<{ done: number; total: number } | null>(null);

  constructor(
    private db: SqliteService,
    private chunker: ContentChunkerService,
    private embedder: EmbedderService,
  ) {}

  async reindexAll(force = false): Promise<{ chunks: number; time: number }> {
    await this.embedder.autoConfigure();
    const t0 = performance.now();
    let total = 0;

    for (const article of ARTICLES) {
      const h = await hashStr(articleContent(article));
      if (!force) {
        const meta = await this.db.exec(
          'SELECT hash FROM index_meta WHERE source_id = ?', [article.id]);
        if (meta.length > 0 && meta[0]['hash'] === h) continue;
      }
      total += this.chunker.chunkArticle(article).length;
    }

    this.progress.set({ done: 0, total });

    for (const article of ARTICLES) {
      const h = await hashStr(articleContent(article));
      const meta = await this.db.exec(
        'SELECT hash FROM index_meta WHERE source_id = ?', [article.id]);
      if (!force && meta.length > 0 && meta[0]['hash'] === h) continue;
      await this.reindexArticle(article, h);
    }

    this.progress.set(null);
    return { chunks: total, time: Math.round(performance.now() - t0) };
  }

  async reindexArticle(article: Article, hash?: string): Promise<void> {
    const h = hash ?? (await hashStr(articleContent(article)));
    const chunks = this.chunker.chunkArticle(article);

    // старые чанки статьи сносим целиком, idx могли поехать
    await this.db.run('DELETE FROM embeddings WHERE chunk_id LIKE ?', [`${article.id}:%`]);
    await this.db.run('DELETE FROM chunks WHERE article_id = ?', [article.id]);

    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const vecs = await this.embedder.embedBatch(batch.map((c) => c.text));
      for (let j = 0; j < batch.length; j++) {
        await this.saveChunk(batch[j], vecs[j]);
        this.progress.update((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
    }

    await this.db.run(
      'INSERT OR REPLACE INTO index_meta (source_id, hash) VALUES (?, ?)',
      [article.id, h],
    );
  }

  private async saveChunk(chunk: Chunk, vec: number[]): Promise<void> {
    const [articleId, idxStr] = chunk.id.split(':');
    await this.db.run(
      'INSERT INTO chunks (id, article_id, idx, section, text, studied) VALUES (?, ?, ?, ?, ?, ?)',
      [chunk.id, articleId, Number(idxStr), chunk.section ?? null, chunk.text, chunk.meta.studied ? 1 : 0],
    );
    await this.db.run(
      'INSERT OR REPLACE INTO embeddings (chunk_id, vec) VALUES (?, ?)',
      [chunk.id, new Uint8Array(new Float32Array(vec).buffer)],
    );
  }

  async markStudied(articleId: string): Promise<void> {
    await this.db.run('UPDATE chunks SET studied = 1 WHERE article_id = ?', [articleId]);
    // эмбеддинги не трогаем — text не изменился, кэш по хешу и так валиден
  }
}
