import { Injectable } from '@angular/core';

import { LlmClientService } from '../journey/services/llm-client.service';
import { RagService } from './rag.service';
import { UserContextService } from './user-context.service';
import {
  TRAINER_SYSTEM_PROMPT,
  buildQuestionPrompt,
  buildVerdictPrompt,
} from './prompts/trainer.prompts';

export interface TrainingStep {
  question: string;
  expected: string;
  topic: string;
}

export interface TrainingAnswer {
  correct: boolean;
  feedback: string;
  next: TrainingStep | null;
}

/**
 * Лёгкое «путешествие» в чате: вопросы по изученным чанкам, разбор ответа,
 * сразу следующий вопрос. Состояние живёт в сервисе, чат только рисует.
 */
@Injectable({ providedIn: 'root' })
export class ChatJourneyService {
  private topic: string | null = null;
  private asked: string[] = [];
  private current: TrainingStep | null = null;

  constructor(
    private rag: RagService,
    private llm: LlmClientService,
    private ctx: UserContextService,
  ) {}

  get active(): boolean {
    return this.current !== null;
  }

  async start(topic?: string): Promise<TrainingStep | null> {
    this.topic = topic ?? null;
    this.asked = [];
    this.current = await this.nextQuestion();
    return this.current;
  }

  stop(): void {
    this.current = null;
    this.topic = null;
    this.asked = [];
  }

  async answer(userAnswer: string): Promise<TrainingAnswer | null> {
    if (!this.current) return null;
    const step = this.current;

    const verdict = await this.llm.generateJson<{ correct: boolean; feedback: string }>(
      buildVerdictPrompt(step.question, step.expected, userAnswer),
      TRAINER_SYSTEM_PROMPT,
    );

    // ответ идёт в mastery: тема — из вопроса
    await this.ctx.trackEvent({
      type: 'test-answered',
      topicId: step.topic,
      correct: verdict.correct,
    });
    if (!verdict.correct) {
      await this.ctx.trackEvent({ type: 'mistake', topicId: step.topic, correct: false });
    }

    this.current = await this.nextQuestion();
    return {
      correct: verdict.correct,
      feedback: verdict.feedback,
      next: this.current,
    };
  }

  private async nextQuestion(): Promise<TrainingStep | null> {
    // вопросы только по изученному, иначе тренировка про незнакомое бессмысленна
    const sources = await this.rag.search(this.topic ?? 'промпт-инжиниринг', 5, { onlyStudied: true });
    if (sources.length === 0) return null;

    const context = sources
      .map((s, i) => `[${i + 1}] ${s.section ? `${s.section}: ` : ''}${s.text}`)
      .join('\n\n');

    const step = await this.llm.generateJson<TrainingStep>(
      buildQuestionPrompt(context, this.topic, this.asked),
      TRAINER_SYSTEM_PROMPT,
    );
    this.asked.push(step.question);
    return step;
  }
}
