/**
 * Сервис генерации journey.
 * Поэтапная генерация: концепции → чекпоинты → активности.
 * При невалидном JSON — автоматический повтор (до 3 попыток).
 */

import { Injectable } from '@angular/core';
import { LlmClientService } from './llm-client.service';
import {
  Activity,
  Checkpoint,
  Concept,
  Difficulty,
  Journey,
  JourneyRequest,
  NarrativeMode,
} from '../models/journey.models';
import {
  SYSTEM_PROMPT,
  buildActivitiesPrompt,
  buildCheckpointsPrompt,
  buildConceptsPrompt,
} from '../prompts/journey.prompts';

@Injectable({ providedIn: 'root' })
export class JourneyGeneratorService {
  constructor(private llm: LlmClientService) {}

  /** Полная генерация journey */
  async generateJourney(request: JourneyRequest): Promise<Journey> {
    // Шаг 1: концепции
    const concepts = await this.generateConcepts(request);

    // Шаг 2: чекпоинты
    const checkpoints = await this.generateCheckpoints(request, concepts);

    // Шаг 3: активности для каждого чекпоинта
    const fullCheckpoints: Checkpoint[] = [];
    for (const cp of checkpoints) {
      const activities = await this.generateActivities(cp, request.difficulty, checkpoints.length);
      fullCheckpoints.push({ ...cp, activities });
    }

    // Проверяем, что есть хотя бы один BC
    const hasBattle = fullCheckpoints.some((cp) =>
      cp.activities.some((a) => a.type === 'BC')
    );
    if (!hasBattle && fullCheckpoints.length > 0) {
      // Добавляем BC в последний чекпоинт
      const last = fullCheckpoints[fullCheckpoints.length - 1];
      last.activities.push(this.createFallbackBattle(last));
    }

    const journey: Journey = {
      id: this.generateId(),
      title: this.buildJourneyTitle(request),
      topic: request.topic,
      narrativeMode: request.narrativeMode,
      difficulty: request.difficulty,
      concepts,
      checkpoints: fullCheckpoints,
      createdAt: new Date().toISOString(),
    };

    return journey;
  }

  /** Шаг 1: генерация концепций */
  private async generateConcepts(request: JourneyRequest): Promise<Concept[]> {
    const prompt = buildConceptsPrompt(
      request.topic,
      request.narrativeMode,
      request.difficulty
    );
    const concepts = await this.llm.generateJson<Concept[]>(prompt, SYSTEM_PROMPT);

    // Валидация
    if (!Array.isArray(concepts) || concepts.length < 5 || concepts.length > 10) {
      throw new Error('LLM вернул некорректное количество концепций');
    }

    // Нормализация id
    return concepts.map((c, i) => ({
      ...c,
      id: c.id || `c${i + 1}`,
      dependsOn: c.dependsOn || [],
    }));
  }

  /** Шаг 2: генерация чекпоинтов */
  private async generateCheckpoints(
    request: JourneyRequest,
    concepts: Concept[]
  ): Promise<Checkpoint[]> {
    const prompt = buildCheckpointsPrompt(
      request.topic,
      request.narrativeMode,
      request.difficulty,
      JSON.stringify(concepts)
    );
    const checkpoints = await this.llm.generateJson<Checkpoint[]>(prompt, SYSTEM_PROMPT);

    // Валидация
    if (!Array.isArray(checkpoints) || checkpoints.length < 5 || checkpoints.length > 8) {
      throw new Error('LLM вернул некорректное количество чекпоинтов');
    }

    // Нормализация
    return checkpoints.map((cp, i) => ({
      ...cp,
      id: cp.id || `cp${i + 1}`,
      order: i + 1,
      timeLimitSec: this.normalizeTimeLimit(cp.timeLimitSec, cp.difficulty),
      activities: [],
    }));
  }

  /** Шаг 3: генерация активностей для чекпоинта */
  private async generateActivities(
    checkpoint: Checkpoint,
    difficulty: Difficulty,
    totalCheckpoints: number
  ): Promise<Activity[]> {
    const prompt = buildActivitiesPrompt(
      JSON.stringify(checkpoint),
      difficulty,
      totalCheckpoints
    );
    const activities = await this.llm.generateJson<Activity[]>(prompt, SYSTEM_PROMPT);

    // Валидация
    if (!Array.isArray(activities) || activities.length < 2 || activities.length > 4) {
      throw new Error('LLM вернул некорректное количество активностей');
    }

    // Нормализация
    return activities.map((a, i) => ({
      ...a,
      id: a.id || `${checkpoint.id}-a${i + 1}`,
      timeLimitSec: this.normalizeTimeLimit(a.timeLimitSec, a.difficulty || difficulty),
      maxScore: a.maxScore || this.defaultMaxScore(a.type),
    }));
  }

  /** Fallback BC, если LLM не сгенерировал ни одной битвы */
  private createFallbackBattle(checkpoint: Checkpoint): Activity {
    return {
      id: `${checkpoint.id}-battle`,
      type: 'BC',
      title: 'Битва: защити свою позицию',
      question: `Объясни и защити своё понимание концепции «${checkpoint.concept}». ИИ будет искать слабые места в твоём ответе.`,
      rubric: 'Правильность 40%, полнота 30%, ясность 20%, пример 10%',
      battleRounds: [
        {
          id: 'b1',
          question: `Почему важно понимать «${checkpoint.concept}»? Объясни своими словами.`,
          keyConcepts: [checkpoint.concept],
          weaknessPrompt: 'Найди слабое место в объяснении и задай уточняющий вопрос',
        },
      ],
      timeLimitSec: 420,
      difficulty: 'hard',
      maxScore: 50,
    };
  }

  /** Нормализация времени (умножаем расчётное на 1.5) */
  private normalizeTimeLimit(sec: number | undefined, difficulty: Difficulty): number {
    const base = sec ?? this.defaultTimeLimit(difficulty);
    return Math.round(base * 1.5);
  }

  private defaultTimeLimit(difficulty: Difficulty): number {
    switch (difficulty) {
      case 'easy': return 240;
      case 'medium': return 300;
      case 'hard': return 420;
    }
  }

  private defaultMaxScore(type: string): number {
    switch (type) {
      case 'MC':
      case 'FB': return 10;
      case 'FR':
      case 'ELI5':
      case 'TB':
      case 'GYE': return 20;
      case 'BC': return 50;
      default: return 10;
    }
  }

  private buildJourneyTitle(request: JourneyRequest): string {
    const modeLabels: Record<NarrativeMode, string> = {
      startup: 'Путь основателя',
      incident: 'Ликвидация инцидента',
      consulting: 'Консалтинговый кейс',
      audit: 'Аудит знаний',
      default: 'Путешествие по знаниям',
    };
    return `${modeLabels[request.narrativeMode]}: ${request.topic}`;
  }

  private generateId(): string {
    return 'j_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }
}