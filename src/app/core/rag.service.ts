import { Injectable } from '@angular/core';

import { LlmClientService } from '../journey/services/llm-client.service';
import { EmbedderService } from './embedder.service';
import { SqliteService, Row } from './sqlite.service';
import { RAG_SYSTEM_PROMPT, buildRagPrompt } from './prompts/rag.prompts';

export interface Source {
  chunkId: string;
  articleId: string;
  section?: string;
  text: string;
  unstudied: boolean;
  score: number;
  /** чанк процитирован в ответе через [N] */
  cited?: boolean;
}

export type RagResult =
  | { needsUnstudiedConfirm: true; sources: Source[] }
  | { needsUnstudiedConfirm: false; answer: string; sources: Source[]; origin: 'platform' | 'general' };

const TOP_K = 5;

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// из BLOB обратно в вектор — дублирует логику embedder, но тянуть оттуда
// ради двух строк не хочется
function blobToVec(blob: Uint8Array): number[] {
  return Array.from(new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4));
}

function toSource(r: Row, score: number): Source {
  return {
    chunkId: r['id'] as string,
    articleId: r['article_id'] as string,
    section: (r['section'] as string) || undefined,
    text: r['text'] as string,
    unstudied: !r['studied'],
    score,
  };
}

@Injectable({ providedIn: 'root' })
export class RagService {
  constructor(
    private db: SqliteService,
    private embedder: EmbedderService,
    private llm: LlmClientService,
  ) {}

  async ask(question: string, opts: { includeUnstudied: boolean }): Promise<RagResult> {
    const sources = await this.search(question, TOP_K);
    if (sources.length === 0) {
      return { needsUnstudiedConfirm: false, answer: '', sources, origin: 'general' };
    }

    if (!opts.includeUnstudied && sources.every((s) => s.unstudied)) {
      return { needsUnstudiedConfirm: true, sources };
    }

    const raw = await this.llm.generate(
      buildRagPrompt(question, sources.map((s) => s.text)),
      RAG_SYSTEM_PROMPT,
    );

    // [ОБЩИЕ ЗНАНИЯ] мог приехать в любом регистре — модель любит импровизировать
    const general = /\[общие знания\]/i.test(raw);
    const answer = raw.replace(/\[общие знания\]\s*/i, '').trim();

    return {
      needsUnstudiedConfirm: false,
      answer,
      sources: this.linkCitations(answer, sources),
      origin: general ? 'general' : 'platform',
    };
  }

  // чистый retrieval без LLM — для анализатора прогресса
  async search(query: string, k = 3): Promise<Source[]> {
    const qvec = await this.embedder.embed(query);

    const rows = await this.db.exec(`
      SELECT c.id, c.article_id, c.section, c.text, c.studied, e.vec
      FROM chunks c JOIN embeddings e ON e.chunk_id = c.id
    `);

    return rows
      .map((r) => ({ r, score: cosine(qvec, blobToVec(r['vec'] as Uint8Array)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((s) => toSource(s.r, s.score));
  }

  // citations [N] в ответе могут указывать на чанки, которые модель взяла
  // из контекста, даже если не процитировала напрямую — помечаем использованные
  private linkCitations(answer: string, sources: Source[]): Source[] {
    const used = new Set<number>();
    for (const m of answer.matchAll(/\[(\d+)\]/g)) {
      const n = Number(m[1]);
      if (n >= 1 && n <= sources.length) used.add(n - 1);
    }
    return sources.map((s, i) => (used.has(i) ? { ...s, cited: true } : s));
  }
}
