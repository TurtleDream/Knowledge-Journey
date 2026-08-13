/**
 * Сервис состояния прохождения journey.
 * Управляет: XP, streak, таймер, достижения, счётчики подсказок/пропусков.
 * Прогресс сохраняется в localStorage; таймер продолжает идти после перезагрузки.
 */

import { Injectable, signal, computed } from '@angular/core';
import {
  Achievement,
  Activity,
  ActivityResult,
  Checkpoint,
  CheckpointResult,
  CheckpointStatus,
  Journey,
  JourneyState,
} from '../models/journey.models';

const STATE_KEY = 'kj-journey-state';
const JOURNEY_KEY = 'kj-journey-data';

/** Достижения */
const ACHIEVEMENTS_DEF: Omit<Achievement, 'unlockedAt'>[] = [
  { id: 'first-step', title: 'Первый шаг', description: 'Пройден первый чекпоинт', icon: '👣' },
  { id: 'streak-5', title: 'Серия 5', description: '5 правильных ответов подряд', icon: '🔥' },
  { id: 'blade-master', title: 'Мастер клинка', description: 'Битва с оценкой >80%', icon: '⚔' },
  { id: 'archivist', title: 'Архивариус', description: 'Скачан отчёт', icon: '📜' },
  { id: 'unstoppable', title: 'Неудержимый', description: 'Всё пройдено без провалов', icon: '🛡' },
];

@Injectable({ providedIn: 'root' })
export class JourneyStateService {
  /** Текущий journey */
  private journeySignal = signal<Journey | null>(null);
  /** Текущее состояние */
  private stateSignal = signal<JourneyState | null>(null);

  /** Публичные сигналы */
  readonly journey = this.journeySignal.asReadonly();
  readonly state = this.stateSignal.asReadonly();

  /** Текущий чекпоинт */
  readonly currentCheckpoint = computed(() => {
    const j = this.journeySignal();
    const s = this.stateSignal();
    if (!j || !s) return null;
    return j.checkpoints[s.currentCheckpointIndex] ?? null;
  });

  /** Оставшееся время текущего чекпоинта (сек) */
  readonly remainingTime = computed(() => {
    const s = this.stateSignal();
    const cp = this.currentCheckpoint();
    if (!s || !cp) return 0;
    const elapsed = (Date.now() - s.checkpointStartedAt) / 1000;
    return Math.max(0, cp.timeLimitSec - elapsed);
  });

  /** Процент времени */
  readonly timePercent = computed(() => {
    const s = this.stateSignal();
    const cp = this.currentCheckpoint();
    if (!s || !cp) return 0;
    return Math.min(100, ((Date.now() - s.checkpointStartedAt) / 1000 / cp.timeLimitSec) * 100);
  });

  /** Завершён ли journey */
  readonly isCompleted = computed(() => this.stateSignal()?.completed ?? false);

  constructor() {
    this.loadFromStorage();
  }

  /** Начать новый journey */
  startJourney(journey: Journey): void {
    const state: JourneyState = {
      journeyId: journey.id,
      currentCheckpointIndex: 0,
      checkpointResults: [],
      xp: 0,
      streak: 0,
      maxStreak: 0,
      hintsRemaining: 3,
      skipsRemaining: 1,
      achievements: [],
      startedAt: new Date().toISOString(),
      checkpointStartedAt: Date.now(),
      completed: false,
    };

    // Бонус за сложность
    if (journey.difficulty === 'hard') {
      state.hintsRemaining += 1;
      state.skipsRemaining += 1;
    }

    this.journeySignal.set(journey);
    this.stateSignal.set(state);
    this.saveToStorage();
  }

  /** Загрузить сохранённый journey */
  loadFromStorage(): void {
    try {
      const journeyRaw = localStorage.getItem(JOURNEY_KEY);
      const stateRaw = localStorage.getItem(STATE_KEY);
      if (journeyRaw && stateRaw) {
        this.journeySignal.set(JSON.parse(journeyRaw));
        this.stateSignal.set(JSON.parse(stateRaw));
      }
    } catch {
      // Очищаем повреждённые данные
      localStorage.removeItem(JOURNEY_KEY);
      localStorage.removeItem(STATE_KEY);
    }
  }

  /** Сбросить всё */
  reset(): void {
    localStorage.removeItem(JOURNEY_KEY);
    localStorage.removeItem(STATE_KEY);
    this.journeySignal.set(null);
    this.stateSignal.set(null);
  }

  /** Завершить активность и получить результат */
  completeActivity(
    activity: Activity,
    checkpoint: Checkpoint,
    result: Omit<ActivityResult, 'activityId' | 'checkpointId' | 'type' | 'question' | 'xpEarned' | 'status'>
  ): ActivityResult {
    const s = this.stateSignal();
    if (!s) throw new Error('Нет активного journey');

    // Расчёт XP
    const xp = this.calculateXp(activity, result.score, result.maxScore, result.attempts);

    // Streak
    const isCorrect = result.score >= result.maxScore * 0.7;
    let streak = s.streak;
    if (isCorrect) {
      streak += 1;
      if (streak > s.maxStreak) s.maxStreak = streak;
    } else {
      streak = 0;
    }
    s.streak = streak;

    // Множитель XP за streak (до x2)
    const streakMultiplier = Math.min(2, 1 + (s.maxStreak >= 5 ? 0.5 : 0) + (s.maxStreak >= 10 ? 0.5 : 0));
    const finalXp = Math.round(xp * streakMultiplier);

    // Бонус за скорость (<50% времени)
    const speedBonus = result.timeSpentSec < checkpoint.timeLimitSec * 0.5 ? 20 : 0;

    const activityResult: ActivityResult = {
      ...result,
      activityId: activity.id,
      checkpointId: checkpoint.id,
      type: activity.type,
      question: activity.question,
      xpEarned: finalXp + speedBonus,
      status: result.skipped ? 'skipped' : (result.score >= result.maxScore * 0.7 ? 'completed' : 'failed'),
    };

    // Обновляем XP
    s.xp += activityResult.xpEarned;

    // Проверяем достижения
    this.checkAchievements(s, activityResult, checkpoint);

    this.stateSignal.set({ ...s });
    this.saveToStorage();
    return activityResult;
  }

  /** Завершить чекпоинт */
  completeCheckpoint(checkpoint: Checkpoint, activityResults: ActivityResult[]): void {
    const s = this.stateSignal();
    if (!s) return;

    const totalScore = activityResults.reduce((sum, r) => sum + r.score, 0);
    const maxScore = activityResults.reduce((sum, r) => sum + r.maxScore, 0);
    const timeSpent = activityResults.reduce((sum, r) => sum + r.timeSpentSec, 0);
    const xpEarned = activityResults.reduce((sum, r) => sum + r.xpEarned, 0);

    const status: CheckpointStatus =
      totalScore >= maxScore * 0.7 ? 'completed' : 'failed';

    const cpResult: CheckpointResult = {
      checkpointId: checkpoint.id,
      title: checkpoint.title,
      status,
      totalScore,
      maxScore,
      timeSpentSec: timeSpent,
      xpEarned,
      activityResults,
    };

    s.checkpointResults.push(cpResult);

    // Переход к следующему чекпоинту
    const j = this.journeySignal();
    if (j && s.currentCheckpointIndex < j.checkpoints.length - 1) {
      s.currentCheckpointIndex++;
      s.checkpointStartedAt = Date.now();
    } else {
      s.completed = true;
    }

    this.stateSignal.set({ ...s });
    this.saveToStorage();
  }

  /** Использовать подсказку */
  useHint(): boolean {
    const s = this.stateSignal();
    if (!s || s.hintsRemaining <= 0) return false;
    s.hintsRemaining--;
    this.stateSignal.set({ ...s });
    this.saveToStorage();
    return true;
  }

  /** Пропустить активность */
  useSkip(): boolean {
    const s = this.stateSignal();
    if (!s || s.skipsRemaining <= 0) return false;
    s.skipsRemaining--;
    this.stateSignal.set({ ...s });
    this.saveToStorage();
    return true;
  }

  /** Отметить достижение «Архивариус» */
  markReportDownloaded(): void {
    const s = this.stateSignal();
    if (!s) return;
    this.unlockAchievement(s, 'archivist');
    this.stateSignal.set({ ...s });
    this.saveToStorage();
  }

  /** Получить достижения */
  getAchievements(): Achievement[] {
    return this.stateSignal()?.achievements ?? [];
  }

  /** Расчёт XP */
  private calculateXp(
    activity: Activity,
    score: number,
    maxScore: number,
    attempts: number
  ): number {
    // База: 100 (1 попытка), 70 (2), 40 (3+)
    let baseXp = 100;
    if (attempts >= 3) baseXp = 40;
    else if (attempts >= 2) baseXp = 70;

    // Свободные ответы — пропорционально оценке
    if (['FR', 'ELI5', 'TB', 'GYE', 'BC'].includes(activity.type)) {
      baseXp = Math.round((score / maxScore) * 100);
    }

    // Бонус за сложность
    const difficultyBonus = activity.difficulty === 'hard' ? 30 : activity.difficulty === 'medium' ? 15 : 0;

    return baseXp + difficultyBonus;
  }

  /** Проверка достижений */
  private checkAchievements(
    s: JourneyState,
    result: ActivityResult,
    checkpoint: Checkpoint
  ): void {
    // Первый шаг
    if (s.checkpointResults.length === 0 && result.status === 'completed') {
      this.unlockAchievement(s, 'first-step');
    }

    // Серия 5
    if (s.streak >= 5) {
      this.unlockAchievement(s, 'streak-5');
    }

    // Мастер клинка (BC >80%)
    if (result.type === 'BC' && result.score / result.maxScore > 0.8) {
      this.unlockAchievement(s, 'blade-master');
    }

    // Неудержимый (всё без провалов)
    if (s.completed && s.checkpointResults.every((r) => r.status === 'completed')) {
      this.unlockAchievement(s, 'unstoppable');
    }
  }

  /** Разблокировать достижение */
  private unlockAchievement(s: JourneyState, id: string): void {
    if (s.achievements.some((a) => a.id === id)) return;
    const def = ACHIEVEMENTS_DEF.find((a) => a.id === id);
    if (def) {
      s.achievements.push({ ...def, unlockedAt: new Date().toISOString() });
    }
  }

  /** Сохранить в localStorage */
  private saveToStorage(): void {
    const j = this.journeySignal();
    const s = this.stateSignal();
    if (j) localStorage.setItem(JOURNEY_KEY, JSON.stringify(j));
    if (s) localStorage.setItem(STATE_KEY, JSON.stringify(s));
  }
}