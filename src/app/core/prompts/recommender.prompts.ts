/**
 * Промпты для рекомендатора: что изучить дальше, смежные навыки, резюме.
 */

export const RECOMMENDER_SYSTEM_PROMPT = `Ты — учебный навигатор по промпт-инжинирингу. Получаешь
изученные темы с уровнем усвоения (mastery 0..1), цель ученика и текущий journey.
Отвечай ТОЛЬКО валидным JSON без markdown-разметки.`;

export interface RecommenderLlmResponse {
  nextTopics: { topic: string; reason: string }[];
  relatedSkills: { skill: string; reason: string }[];
  resumeSuggestion?: string;
}

export function buildRecommenderPrompt(
  studied: { topic: string; score: number }[],
  currentJourney: string | null,
  goal?: string,
): string {
  const goalLine = goal ? `Цель ученика: «${goal}».` : 'Цель не указана — ориентируйся на рост в промпт-инжиниринге.';
  const journeyLine = currentJourney
    ? `Текущий journey: «${currentJourney}» (учитывай, что уже в процессе).`
    : 'Активных journeys нет.';
  const studiedLine = studied.length
    ? studied.map((s) => `- ${s.topic}: mastery=${s.score.toFixed(2)}`).join('\n')
    : '(данных об изученном пока нет — предложи стартовые темы)';

  return `Изученные темы:
${studiedLine}

${journeyLine}
${goalLine}

Задача:
1. nextTopics — 3 темы, которые изучить ДАЛЬШЕ: логические продолжения изученного,
   с учётом цели. Не предлагай то, что уже усвоено (mastery > 0.7).
2. relatedSkills — 2-3 смежных навыка (за пределами промпт-инжиниринга),
   которые усиливают изученное.
3. resumeSuggestion — если изученного достаточно (mastery > 0.6 хотя бы по 2 темам),
   краткая формулировка для резюме; иначе null.

Верни ТОЛЬКО JSON вида:
{"nextTopics":[{"topic":"имя темы","reason":"почему именно она и как связана с целью"}],
 "relatedSkills":[{"skill":"навык","reason":"как усиливает изученное"}],
 "resumeSuggestion":"текст для резюме или null"}`;
}
