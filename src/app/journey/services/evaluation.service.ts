/**
 * Сервис оценки ответов.
 * Свободные ответы оцениваются LLM по критериям:
 * правильность 40%, полнота 30%, ясность 20%, пример 10%.
 * BC — диалог-полемика с оценкой понимания 0–100.
 */

import { Injectable } from '@angular/core';
import { LlmClientService } from './llm-client.service';
import {
  Activity,
  BattleRound,
  FreeResponseEvaluation,
} from '../models/journey.models';
import {
  SYSTEM_PROMPT,
  buildBattleFinalPrompt,
  buildBattleWeaknessPrompt,
  buildEvaluationPrompt,
} from '../prompts/journey.prompts';

export interface BattleWeakness {
  weakness: string;
  followUpQuestion: string;
}

export interface BattleConversation {
  role: 'ai' | 'user';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class EvaluationService {
  constructor(private llm: LlmClientService) {}

  /** Оценить свободный ответ */
  async evaluateFreeResponse(
    activity: Activity,
    userAnswer: string,
    topic: string
  ): Promise<FreeResponseEvaluation> {
    const prompt = buildEvaluationPrompt(
      activity.question,
      userAnswer,
      activity.rubric ?? 'Правильность 40%, полнота 30%, ясность 20%, пример 10%',
      topic
    );

    const result = await this.llm.generateJson<FreeResponseEvaluation>(
      prompt,
      SYSTEM_PROMPT
    );

    // Нормализация
    return {
      score: Math.max(0, Math.min(result.maxScore || activity.maxScore, result.score || 0)),
      maxScore: result.maxScore || activity.maxScore,
      feedback: result.feedback || '',
      strengths: result.strengths || [],
      gaps: result.gaps || [],
      misconceptions: result.misconceptions || [],
    };
  }

  /** Найти слабое место в ответе для BC */
  async findBattleWeakness(
    round: BattleRound,
    userAnswer: string
  ): Promise<BattleWeakness> {
    const prompt = buildBattleWeaknessPrompt(
      round.question,
      userAnswer,
      round.keyConcepts
    );

    const result = await this.llm.generateJson<BattleWeakness>(prompt, SYSTEM_PROMPT);

    return {
      weakness: result.weakness || '',
      followUpQuestion: result.followUpQuestion || '',
    };
  }

  /** Финальная оценка BC */
  async evaluateBattle(
    activity: Activity,
    conversation: BattleConversation[]
  ): Promise<FreeResponseEvaluation> {
    const prompt = buildBattleFinalPrompt(activity.question, conversation);

    const result = await this.llm.generateJson<FreeResponseEvaluation>(
      prompt,
      SYSTEM_PROMPT
    );

    // Нормализация: score 0–100 → 0–50 (maxScore BC = 50)
    const normalizedScore = Math.round((result.score || 0) / 2);

    return {
      score: Math.max(0, Math.min(activity.maxScore, normalizedScore)),
      maxScore: activity.maxScore,
      feedback: result.feedback || '',
      strengths: result.strengths || [],
      gaps: result.gaps || [],
      misconceptions: result.misconceptions || [],
    };
  }
}