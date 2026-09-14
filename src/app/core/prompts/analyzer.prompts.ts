/**
 * Промпты для анализатора прогресса.
 */

export const ANALYZER_SYSTEM_PROMPT = `Ты — учебный аналитик. Получаешь агрегаты успеваемости
ученика (mastery по темам) и его цель обучения. Отвечай ТОЛЬКО валидным JSON без markdown-разметки.`;

export interface AnalyzerLlmResponse {
  weakTopics: { topic: string; reason: string }[];
  summary: string;
}

export function buildAnalyzerPrompt(
  aggregates: { topic: string; score: number; correctRate: number; coverage: number }[],
  goal?: string,
): string {
  const goalLine = goal ? `Цель ученика: «${goal}».` : 'Цель ученика не указана — ориентируйся на общее владение промпт-инжинирингом.';
  return `Агрегаты успеваемости (score 0..1, чем ниже — тем хуже тема усвоена):
${aggregates.map((a) => `- ${a.topic}: score=${a.score.toFixed(2)} (correct_rate=${a.correctRate.toFixed(2)}, coverage=${a.coverage.toFixed(2)})`).join('\n')}

${goalLine}

Задача: выдели 3 слабые темы (низкий score ИЛИ низкая coverage при высокой correct_rate — данных мало).
Для каждой объясни, как именно эта пробел мешает достичь цели.

Верни ТОЛЬКО JSON вида:
{"weakTopics":[{"topic":"имя темы как в агрегатах","reason":"почему слабая и как мешает цели"}],"summary":"1-2 предложения об общем прогрессе"}`;
}
