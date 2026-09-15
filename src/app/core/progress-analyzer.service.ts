import { Injectable } from '@angular/core';

import { apiBase } from './api-base';

import { ARTICLES } from '../content/articles.data';
import { LlmClientService } from '../journey/services/llm-client.service';
import { UserContextService, TopicMastery } from './user-context.service';
import { RagService, Source } from './rag.service';
import { ANALYZER_SYSTEM_PROMPT, AnalyzerLlmResponse, buildAnalyzerPrompt } from './prompts/analyzer.prompts';

export interface Topic {
  topic: string;
  score: number;
  reason: string;
}

export interface Recommendation {
  topic: string;
  articles: string[];
  reason: string;
}

export interface ProgressAnalysis {
  weakTopics: Topic[];
  recommendations: Recommendation[];
  summary: string;
}

function articleTitle(articleId: string, fallback: string): string {
  return ARTICLES.find((a) => a.id === articleId)?.title ?? fallback;
}

@Injectable({ providedIn: 'root' })
export class ProgressAnalyzerService {
  constructor(
    private ctx: UserContextService,
    private rag: RagService,
    private llm: LlmClientService,
  ) {}

  async analyze(userGoal?: string): Promise<ProgressAnalysis> {
    const aggregates = await this.ctx.getAggregates();
    if (aggregates.length === 0) {
      return {
        weakTopics: [],
        recommendations: [],
        summary: 'Данных пока нет: пройди тест или упражнения — тогда появится что анализировать.',
      };
    }

    // приоритет — бэкенд: промпты и ключ живут на сервере
    let llmRes: AnalyzerLlmResponse;
    try {
      const r = await fetch(`${apiBase()}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aggregates: aggregates.map((a) => ({ topic: a.topic, score: a.score, correctRate: a.correctRate, coverage: a.coverage })),
          goal: userGoal,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: r.statusText }));
        throw new Error(err.error ?? `backend analyze error ${r.status}`);
      }
      llmRes = (await r.json()) as AnalyzerLlmResponse;
    } catch (e) {
      // сеть/нет бэкенда — старый путь через LlmClientService
      if (/Failed to fetch|NetworkError|load failed/i.test(String(e))) {
        llmRes = await this.llm.generateJson<AnalyzerLlmResponse>(
          buildAnalyzerPrompt(aggregates.map(toPromptAggregate), userGoal),
          ANALYZER_SYSTEM_PROMPT,
        );
      } else {
        throw e;
      }
    }

    const byTopic = new Map(aggregates.map((a) => [a.topic, a]));
    const weakTopics: Topic[] = llmRes.weakTopics.map((w) => ({
      topic: w.topic,
      score: byTopic.get(w.topic)?.score ?? 0,
      reason: w.reason,
    }));

    // retrieval по каждой слабой теме параллельно — эмбеддинги локальные/кэшированные
    const recommendations = await Promise.all(
      weakTopics.map(async (w) => {
        const sources = await this.rag.search(w.topic, 3);
        return {
          topic: w.topic,
          articles: dedupeArticles(sources),
          reason: w.reason,
        };
      }),
    );

    return { weakTopics, recommendations, summary: llmRes.summary };
  }
}

function toPromptAggregate(a: TopicMastery) {
  return { topic: a.topic, score: a.score, correctRate: a.correctRate, coverage: a.coverage };
}

function dedupeArticles(sources: Source[]): string[] {
  const seen = new Set<string>();
  const res: string[] = [];
  for (const s of sources) {
    const title = articleTitle(s.articleId, s.section ?? s.chunkId);
    if (!seen.has(title)) {
      seen.add(title);
      res.push(title);
    }
  }
  return res;
}
