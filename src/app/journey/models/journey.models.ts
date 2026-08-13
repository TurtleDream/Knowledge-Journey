/**
 * Модели данных для модуля «Путешествие по знаниям» (Knowledge Journey).
 * Стиль — Heroes of Might and Magic 3.
 */

/** Режим нарратива */
export type NarrativeMode =
  | 'startup'
  | 'incident'
  | 'consulting'
  | 'audit'
  | 'default';

/** Сложность */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** Тип активности */
export type ActivityType =
  | 'MC'    // MultipleChoice
  | 'FB'    // FillTheBlank
  | 'FR'    // FreeResponse
  | 'ELI5'  // ExplainLikeImFive
  | 'TB'    // TeachBack
  | 'GYE'   // GiveYourExample
  | 'BC';   // BattleComponent

/** Статус чекпоинта */
export type CheckpointStatus = 'locked' | 'available' | 'completed' | 'failed';

/** Статус активности */
export type ActivityStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';

/** Входные данные для генерации journey */
export interface JourneyRequest {
  topic: string;
  narrativeMode: NarrativeMode;
  difficulty: Difficulty;
}

/** Атомарная концепция */
export interface Concept {
  id: string;
  title: string;
  description: string;
  /** Зависимости — id других концепций */
  dependsOn: string[];
}

/** Активность */
export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  question: string;
  hint?: string;
  /** Для MC */
  options?: string[];
  correctIndexes?: number[];
  /** Для FB */
  acceptedAnswers?: string[];
  /** Для FR/ELI5/TB/GYE — критерии оценки */
  rubric?: string;
  /** Для BC — вопросы для полемики */
  battleRounds?: BattleRound[];
  /** Время на активность (сек) */
  timeLimitSec: number;
  difficulty: Difficulty;
  /** Максимальный балл */
  maxScore: number;
}

/** Раунд битвы */
export interface BattleRound {
  id: string;
  question: string;
  /** Ожидаемые ключевые понятия */
  keyConcepts: string[];
  /** Слабое место, которое ИИ найдёт в ответе */
  weaknessPrompt: string;
}

/** Чекпоинт */
export interface Checkpoint {
  id: string;
  title: string;
  concept: string;
  goal: string;
  narrativeIntro: string;
  activities: Activity[];
  timeLimitSec: number;
  difficulty: Difficulty;
  /** Порядковый номер */
  order: number;
}

/** Сгенерированный journey */
export interface Journey {
  id: string;
  title: string;
  topic: string;
  narrativeMode: NarrativeMode;
  difficulty: Difficulty;
  concepts: Concept[];
  checkpoints: Checkpoint[];
  createdAt: string;
}

/** Результат активности */
export interface ActivityResult {
  activityId: string;
  checkpointId: string;
  type: ActivityType;
  question: string;
  userAnswer: string;
  correctAnswer?: string;
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  gaps: string[];
  misconceptions: string[];
  timeSpentSec: number;
  xpEarned: number;
  attempts: number;
  hintsUsed: number;
  skipped: boolean;
  status: ActivityStatus;
}

/** Результат чекпоинта */
export interface CheckpointResult {
  checkpointId: string;
  title: string;
  status: CheckpointStatus;
  totalScore: number;
  maxScore: number;
  timeSpentSec: number;
  xpEarned: number;
  activityResults: ActivityResult[];
}

/** Достижение */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

/** Состояние прохождения */
export interface JourneyState {
  journeyId: string;
  currentCheckpointIndex: number;
  checkpointResults: CheckpointResult[];
  xp: number;
  streak: number;
  maxStreak: number;
  hintsRemaining: number;
  skipsRemaining: number;
  achievements: Achievement[];
  startedAt: string;
  /** Timestamp начала текущего чекпоинта (для таймера) */
  checkpointStartedAt: number;
  /** Завершён ли journey */
  completed: boolean;
}

/** Оценка свободного ответа от LLM */
export interface FreeResponseEvaluation {
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  gaps: string[];
  misconceptions: string[];
}

/** Финальный отчёт */
export interface JourneyReport {
  userName: string;
  date: string;
  topic: string;
  journeyTitle: string;
  overallScore: number;
  overallPercent: number;
  totalXp: number;
  checkpointMap: {
    checkpointId: string;
    title: string;
    status: CheckpointStatus;
    score: number;
    maxScore: number;
  }[];
  activityTable: ActivityResult[];
  weakAreas: string[];
  recommendations: string[];
  achievements: Achievement[];
}

/** Конфигурация LLM */
export interface LlmConfig {
  provider: 'yandex' | 'gigachat' | 'chatgpt' | 'deepseek';
  apiKey: string;
  model?: string;
  /** Кастомный API URL (для CORS-прокси или OpenAI-совместимых эндпоинтов) */
  apiUrl?: string;
}

/** Промпт-файлы */
export const NARRATIVE_MODE_LABELS: Record<NarrativeMode, string> = {
  startup: 'Startup Journey',
  incident: 'Incident Response',
  consulting: 'Consulting Case',
  audit: 'Audit',
  default: 'Классическое путешествие',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Сложная',
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  MC: 'Выбор ответа',
  FB: 'Заполни пропуск',
  FR: 'Свободный ответ',
  ELI5: 'Объясни как пятилетнему',
  TB: 'Обучи обратно',
  GYE: 'Приведи пример',
  BC: 'Битва',
};

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  MC: '☑',
  FB: '✎',
  FR: '✍',
  ELI5: '🧒',
  TB: '🔄',
  GYE: '💡',
  BC: '⚔',
};