import { Injectable } from '@angular/core';

import { apiBase } from './api-base';

import { ARTICLES } from '../content/articles.data';
import { LlmClientService } from '../journey/services/llm-client.service';
import { JourneyStateService } from '../journey/services/journey-state.service';
import { RagService } from './rag.service';
import { UserContextService, TopicMastery } from './user-context.service';
import {
  RECOMMENDER_SYSTEM_PROMPT,
  RecommenderLlmResponse,
  buildRecommenderPrompt,
} from './prompts/recommender.prompts';

export interface Topic {
  topic: string;
  reason: string;
  articles: string[];
}

export interface NextRecommendation {
  nextTopics: Topic[];
  relatedSkills: string[];
  resumeSuggestion?: string;
}

function articleTitle(articleId: string, fallback: string): string {
  return ARTICLES.find((a) => a.id === articleId)?.title ?? fallback;
}

@Injectable({ providedIn: 'root' })
export class RecommenderService {
  constructor(
    private ctx: UserContextService,
    private rag: RagService,
    private llm: LlmClientService,
    private journeyState: JourneyStateService,
  ) {}

  async recommendNext(userGoal?: string): Promise<NextRecommendation> {
    const aggregates = await this.ctx.getAggregates();
    const studied = aggregates.map((a: TopicMastery) => ({ topic: a.topic, score: a.score }));
    const journey = this.journeyState.journey();

    // приоритет — бэкенд; ошибка сети = старый путь через LlmClientService
    let res: RecommenderLlmResponse;
    try {
      const r = await fetch(`${apiBase()}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studied, journeyTitle: journey?.title ?? null, goal: userGoal }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: r.statusText }));
        throw new Error(err.error ?? `backend recommend error ${r.status}`);
      }
      res = (await r.json()) as RecommenderLlmResponse;
    } catch (e) {
      if (/Failed to fetch|NetworkError|load failed/i.test(String(e))) {
        res = await this.llm.generateJson<RecommenderLlmResponse>(
          buildRecommenderPrompt(studied, journey?.title ?? null, userGoal),
          RECOMMENDER_SYSTEM_PROMPT,
        );
      } else {
        throw e;
      }
    }

    // параллельный retrieval по каждой следующей теме
    const nextTopics = await Promise.all(
      res.nextTopics.map(async (t) => {
        const sources = await this.rag.search(t.topic, 2);
        const articles = dedupe(sources.map((s) => articleTitle(s.articleId, s.section ?? s.chunkId)));
        return { topic: t.topic, reason: t.reason, articles };
      }),
    );

    return {
      nextTopics,
      relatedSkills: res.relatedSkills.map((s) => `${s.skill} — ${s.reason}`),
      resumeSuggestion: res.resumeSuggestion ?? undefined,
    };
  }

  async suggestResumeSkills(studiedTopics: string[]): Promise<string[]> {
    const aggregates = await this.ctx.getAggregates();
    const byName = new Map(aggregates.map((a) => [a.topic, a]));
    // в промпт идут только реально изученные (есть в агрегатах), с их mastery
    const studied = studiedTopics
      .map((t) => ({ topic: t, score: byName.get(t)?.score ?? 0.5 }));

    const res = await this.llm.generateJson<{ skills: { skill: string; because: string }[] }>(
      `Изученные темы (mastery 0..1):\n${studied.map((s) => `- ${s.topic}: ${s.score.toFixed(2)}`).join('\n')}

Сформулируй, какие навыки можно добавить в резюме на основе изученного.
Формулировка каждого пункта: «На основе изученного: добавьте навык X в резюме, потому что ...».
Верни ТОЛЬКО JSON вида {"skills":[{"skill":"...","because":"..."}]}`,
      'Ты помогаешь сформулировать достижения для резюме. Отвечай ТОЛЬКО валидным JSON без markdown.',
    );

    return res.skills.map((s) => `На основе изученного: добавьте навык ${s.skill} в резюме, потому что ${s.because}`);
  }
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}
