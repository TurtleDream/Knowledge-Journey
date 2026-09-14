/**
 * RAG-контекст для генератора journey.
 */

import { Source } from '../../core/rag.service';

export const RAG_JOURNEY_HINT =
  'Используй материалы платформы: они приведены в контексте ниже. Формулируй концепции и чекпоинты строго в их терминах, не выдумывай факты, которых там нет.';

// меньше изученных чанков — генерировать journey нельзя
export const MIN_STUDIED_SOURCES = 3;

export interface JourneySourceRef {
  chunkId: string;
  url: string;
  section?: string;
}

/** chunk_id → url: чанк принадлежит статье, ведём на страницу статьи */
export function toSourceRef(s: Source): JourneySourceRef {
  return { chunkId: s.chunkId, url: `/article/${s.articleId}`, section: s.section };
}

export function buildContextBlock(sources: Source[]): string {
  return `Материалы платформы (изученные чанки):

${sources.map((s, i) => `[${i + 1}] ${s.section ? `${s.section}: ` : ''}${s.text}`).join('\n\n')}`;
}
