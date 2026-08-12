/**
 * Типы упражнений и общие интерфейсы данных.
 * Каждый тип имеет уникальную иконку и цветовую метку.
 */

export type ExerciseType =
  | 'multiple-choice'
  | 'match-pairs'
  | 'fill-the-blank'
  | 'true-false'
  | 'order-steps'
  | 'case-study'
  | 'prompt-simulator'
  | 'spot-the-hallucination'
  | 'prompt-builder'
  | 'prompt-battle';

export type ExerciseMode = 'inline' | 'test';

export type ExerciseStatus = 'idle' | 'correct' | 'incorrect' | 'partial' | 'answered';

/** Результат, который упражнение передаёт родителю в тест-режиме. */
export interface ExerciseResult {
  status: ExerciseStatus;
  /** Нормированный балл 0..1 */
  score: number;
  answered: boolean;
}

/** Метаданные типа упражнения для визуальной маркировки. */
export interface ExerciseTypeMeta {
  type: ExerciseType;
  label: string;
  icon: string;
  color: string;
}

export const EXERCISE_TYPE_META: Record<ExerciseType, ExerciseTypeMeta> = {
  'multiple-choice': { type: 'multiple-choice', label: 'Выбор ответа', icon: '☑', color: '#d97a2b' },
  'match-pairs': { type: 'match-pairs', label: 'Соедини пары', icon: '⇄', color: '#5fc96f' },
  'fill-the-blank': { type: 'fill-the-blank', label: 'Заполни пропуск', icon: '✎', color: '#e8c96a' },
  'true-false': { type: 'true-false', label: 'Верно / Неверно', icon: '⚖', color: '#d43a2f' },
  'order-steps': { type: 'order-steps', label: 'Порядок шагов', icon: '⇅', color: '#7a9fd4' },
  'case-study': { type: 'case-study', label: 'Улучши промпт', icon: '✍', color: '#c9a227' },
  'prompt-simulator': { type: 'prompt-simulator', label: 'Симулятор AI', icon: '⚡', color: '#d97a2b' },
  'spot-the-hallucination': { type: 'spot-the-hallucination', label: 'Найди галлюцинацию', icon: '☠', color: '#a11f1f' },
  'prompt-builder': { type: 'prompt-builder', label: 'Собери промпт', icon: '🧱', color: '#8a6d1f' },
  'prompt-battle': { type: 'prompt-battle', label: 'Битва промптов', icon: '⚔', color: '#d43a2f' },
};

/**
 * Унифицированный контейнер данных упражнения.
 * Поля опциональны — каждый компонент читает только нужные ему.
 */
export interface ExerciseData {
  type: ExerciseType;
  question: string;
  mode?: ExerciseMode;
  explanation?: string;

  // --- multiple-choice ---
  options?: string[];
  /** Индексы правильных вариантов */
  correctIndexes?: number[];
  /** true = множественный выбор */
  multiSelect?: boolean;

  // --- match-pairs ---
  /** Левая колонка */
  leftItems?: string[];
  /** Правая колонка (перемешана) */
  rightItems?: string[];
  /** Соответствие: индекс левого -> индекс правого */
  correctPairs?: number[];

  // --- fill-the-blank ---
  /** Текст с пропуском, обозначенным ___ */
  text?: string;
  /** Допустимые ответы (массив синонимов) */
  acceptedAnswers?: string[];
  /** Чувствительность к регистру */
  caseSensitive?: boolean;

  // --- true-false ---
  /** Правильный ответ */
  correctBoolean?: boolean;

  // --- order-steps ---
  /** Шаги в правильном порядке */
  steps?: string[];
  /** Описания шагов (необязательно, по одному на шаг) */
  stepDescriptions?: string[];

  // --- case-study ---
  /** «Плохой» промпт для улучшения */
  badPrompt?: string;
  /** Эталонный улучшенный промпт */
  referencePrompt?: string;
  /** Объяснение, почему эталон лучше */
  referenceExplanation?: string;
  /** Ключевые элементы для автопроверки */
  keyElements?: { label: string; keywords: string[] }[];

  // --- prompt-simulator ---
  /** Заготовленный «ответ AI» */
  aiResponse?: string;
  /** Эталонный промпт, который должен привести к ответу */
  referenceSimPrompt?: string;
  /** Ключевые слова эталона для автопроверки */
  simKeywords?: string[];

  // --- spot-the-hallucination ---
  /** Текст ответа AI, в котором есть галлюцинация */
  hallucinationText?: string;
  /** Индексы [start, end] галлюцинации в тексте */
  hallucinationRange?: [number, number];
  /** Объяснение, почему это галлюцинация */
  hallucinationReason?: string;

  // --- prompt-builder ---
  /** Доступные блоки */
  availableBlocks?: PromptBlock[];
  /** Правильный порядок id блоков */
  correctBlockOrder?: string[];

  // --- prompt-battle ---
  /** Два промпта для сравнения */
  battlePrompts?: { id: string; text: string }[];
  /** id лучшего промпта */
  battleWinnerId?: string;
  /** Объяснение, почему он лучше */
  battleExplanation?: string;
}

export interface PromptBlock {
  id: string;
  label: string;
  description: string;
  icon: string;
}