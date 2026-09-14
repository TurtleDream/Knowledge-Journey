import { Injectable } from '@angular/core';

import { SqliteService } from './sqlite.service';

export type EventType = 'article-opened' | 'test-answered' | 'checkpoint-passed' | 'mistake';

export interface UserEvent {
  type: EventType;
  topicId?: string;
  correct?: boolean;
  timeSpent?: number;
  ts?: number;
}

export interface TopicMastery {
  topic: string;
  score: number;
  correctRate: number;
  recency: number;
  coverage: number;
  updatedAt: number;
}

// сколько событий на тему считаем «полным покрытием»
const FULL_COVERAGE_EVENTS = 10;
// полураспад свежести — сутки
const RECENCY_HALF_LIFE_MS = 24 * 3600 * 1000;
const TTL_MS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class UserContextService {
  private lastRecompute = 0;

  constructor(private db: SqliteService) {}

  async trackEvent(e: UserEvent): Promise<void> {
    await this.db.run(
      'INSERT INTO user_events (ts, kind, payload) VALUES (?, ?, ?)',
      [e.ts ?? Date.now(), e.type, JSON.stringify(e)],
    );
    // новое событие — кэш агрегатов больше не валиден
    this.lastRecompute = 0;
  }

  async getAggregates(): Promise<TopicMastery[]> {
    const meta = await this.db.exec('SELECT MAX(updated_at) AS t FROM topic_mastery');
    const updated = meta[0]?.['t'] as number | null | undefined;
    if (!updated || Date.now() - updated > TTL_MS || Date.now() - this.lastRecompute > TTL_MS) {
      await this.recompute();
      this.lastRecompute = Date.now();
    }
    const rows = await this.db.exec('SELECT * FROM topic_mastery');
    return rows.map((r) => ({
      topic: r['topic'] as string,
      score: r['score'] as number,
      correctRate: r['correct_rate'] as number,
      recency: r['recency'] as number,
      coverage: r['coverage'] as number,
      updatedAt: r['updated_at'] as number,
    }));
  }

  async getWeakTopics(n: number): Promise<TopicMastery[]> {
    const all = await this.getAggregates();
    return all.slice().sort((a, b) => a.score - b.score).slice(0, n);
  }

  async getStrongTopics(n: number): Promise<TopicMastery[]> {
    const all = await this.getAggregates();
    return all.slice().sort((a, b) => b.score - a.score).slice(0, n);
  }

  // для промпта: только агрегаты + последние 3 ошибки по теме, без сырых событий
  async getPromptContext(topicId: string): Promise<string> {
    const agg = await this.getAggregates();
    const mine = agg.find((a) => a.topic === topicId);
    const mistakes = await this.db.exec(
      "SELECT payload FROM user_events WHERE kind = 'mistake' AND payload LIKE ? ORDER BY ts DESC LIMIT 3",
      [`%"topicId":"${topicId}"%`],
    );
    const lines = mistakes.map((m) => {
      const p = JSON.parse(m['payload'] as string) as UserEvent;
      return `- ${p.correct === undefined ? 'событие' : 'ошибка'}: ${JSON.stringify(p)}`;
    });
    return [
      mine
        ? `Mastery по теме «${topicId}»: score=${mine.score.toFixed(2)} (correct_rate=${mine.correctRate.toFixed(2)}, recency=${mine.recency.toFixed(2)}, coverage=${mine.coverage.toFixed(2)})`
        : `По теме «${topicId}» данных нет.`,
      lines.length ? `Последние события:\n${lines.join('\n')}` : '',
    ].filter(Boolean).join('\n');
  }

  private async recompute(): Promise<void> {
    const rows = await this.db.exec('SELECT ts, payload FROM user_events ORDER BY ts');
    const byTopic = new Map<string, { correct: number; answered: number; lastTs: number }>();

    for (const r of rows) {
      const e = JSON.parse(r['payload'] as string) as UserEvent;
      const topic = e.topicId;
      if (!topic) continue;
      const t = byTopic.get(topic) ?? { correct: 0, answered: 0, lastTs: 0 };
      const ts = r['ts'] as number;
      if (ts > t.lastTs) t.lastTs = ts;
      if (e.correct !== undefined) {
        t.answered++;
        if (e.correct) t.correct++;
      }
      byTopic.set(topic, t);
    }

    const now = Date.now();
    await this.db.run('DELETE FROM topic_mastery');
    for (const [topic, t] of byTopic) {
      const correctRate = t.answered ? t.correct / t.answered : 0;
      // экспоненциальный распад: сколько «периодов полураспада» прошло с последней активности
      const recency = t.lastTs
        ? Math.pow(0.5, (now - t.lastTs) / RECENCY_HALF_LIFE_MS)
        : 0;
      const coverage = Math.min(1, t.answered / FULL_COVERAGE_EVENTS);
      const score = 0.6 * correctRate + 0.2 * recency + 0.2 * coverage;
      await this.db.run(
        'INSERT INTO topic_mastery (topic, score, correct_rate, recency, coverage, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [topic, score, correctRate, recency, coverage, now],
      );
    }
  }

  async exportData(): Promise<string> {
    const events = await this.db.exec('SELECT * FROM user_events ORDER BY ts');
    const mastery = await this.db.exec('SELECT * FROM topic_mastery ORDER BY score DESC');
    return JSON.stringify({ exportedAt: Date.now(), events, mastery }, null, 2);
  }

  async clearData(): Promise<void> {
    await this.db.run('DELETE FROM user_events');
    await this.db.run('DELETE FROM topic_mastery');
  }
}
