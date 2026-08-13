/**
 * Промпты для генерации journey.
 * Хранятся отдельно — редактирование только через пересборку.
 */

import { Difficulty, NarrativeMode } from '../models/journey.models';

/** Базовый системный промпт */
export const SYSTEM_PROMPT = `Ты — мастер-наставник в мире Heroes of Might and Magic 3.
Ты создаёшь «путешествия по знаниям» (knowledge journeys) — серии чекпоинтов,
которые ведут ученика от базовых концепций к сложным, вплетая обучение
в профессиональный сценарий. Отвечай ТОЛЬКО валидным JSON без markdown-разметки.`;

/** Промпт для выделения концепций */
export function buildConceptsPrompt(
  topic: string,
  narrativeMode: NarrativeMode,
  difficulty: Difficulty
): string {
  return `Выдели атомарные концепции для темы: "${topic}".

Режим нарратива: ${narrativeMode}
Сложность: ${difficulty}

Требования:
- Выдели 5–10 атомарных концепций.
- Каждая концепция — одно чёткое понятие или навык.
- Укажи зависимости (dependsOn) — какие концепции нужно знать до этой.
- Порядок: от базовых к зависимым.

Пример (few-shot):
Тема: "HTTP-протокол"
[
  {"id":"c1","title":"Что такое HTTP","description":"Протокол передачи гипертекста, клиент-серверная модель","dependsOn":[]},
  {"id":"c2","title":"Методы HTTP","description":"GET, POST, PUT, DELETE — назначение каждого","dependsOn":["c1"]},
  {"id":"c3","title":"Коды ответов","description":"2xx, 3xx, 4xx, 5xx — семантика классов","dependsOn":["c1"]},
  {"id":"c4","title":"Заголовки и тело запроса","description":"Content-Type, Authorization, структура запроса","dependsOn":["c2"]}
]

Верни ТОЛЬКО JSON-массив концепций:
[{"id":"c1","title":"...","description":"...","dependsOn":[]}]`;
}

/** Промпт для генерации чекпоинтов */
export function buildCheckpointsPrompt(
  topic: string,
  narrativeMode: NarrativeMode,
  difficulty: Difficulty,
  conceptsJson: string
): string {
  return `Создай чекпоинты для путешествия по теме: "${topic}".

Режим нарратива: ${narrativeMode}
Сложность: ${difficulty}

Концепции:
${conceptsJson}

Требования:
- Сгруппируй концепции в 5–8 чекпоинтов.
- Порядок: от базовых к зависимым.
- Каждый чекпоинт: id, title, concept (главная концепция), goal, narrativeIntro (вплетает концепцию в профессиональный сценарий), timeLimitSec, difficulty.
- Нарратив в стиле HoMM3: профессиональный, не детский.

Пример (few-shot):
Тема: "HTTP-протокол", режим: "incident"
[
  {"id":"cp1","title":"Основа протокола","concept":"Что такое HTTP","goal":"Понять клиент-серверную модель","narrativeIntro":"Ты — инженер поддержки. Сервис клиента падает, и первое, что ты проверяешь — как клиент и сервер общаются. Понимание HTTP — твой первый щит.","timeLimitSec":240,"difficulty":"easy"},
  {"id":"cp2","title":"Методы и их сила","concept":"Методы HTTP","goal":"Различать методы и их применение","narrativeIntro":"Инцидент: клиент случайно удалил данные через GET. Ты должен объяснить разницу методов и предотвратить повторение.","timeLimitSec":300,"difficulty":"medium"}
]

Верни ТОЛЬКО JSON-массив чекпоинтов:
[{"id":"cp1","title":"...","concept":"...","goal":"...","narrativeIntro":"...","timeLimitSec":240,"difficulty":"easy"}]`;
}

/** Промпт для генерации активностей */
export function buildActivitiesPrompt(
  checkpointJson: string,
  difficulty: Difficulty,
  allCheckpointsCount: number
): string {
  return `Создай активности для чекпоинта:

${checkpointJson}

Требования:
- 2–4 активности на чекпоинт.
- Типы: MC (MultipleChoice), FB (FillTheBlank), FR (FreeResponse), ELI5 (ExplainLikeImFive), TB (TeachBack), GYE (GiveYourExample), BC (BattleComponent).
- Вопросы требуют понимания, не запоминания.
- Дистракторы правдоподобны (частые ошибки).
- Подсказки направляют, не раскрывают ответ.
- В чекпоинте ≤2 одинаковых типа подряд.
- Минимум 1 свободный текстовый ответ (FR/ELI5/TB/GYE) на чекпоинт.
- BC (BattleComponent) — диалог-полемика: ИИ задаёт сложный вопрос, пользователь отвечает, ИИ находит слабое место и задаёт уточняющий вопрос. Максимум 5 раундов.
- timeLimitSec: лёгкий 240, средний 300, сложный 360–420.
- maxScore: MC/FB — 10, FR/ELI5/TB/GYE — 20, BC — 50.

Пример (few-shot):
Чекпоинт: "Методы HTTP"
[
  {"id":"a1","type":"MC","title":"Выбор метода","question":"Какой метод HTTP следует использовать для создания нового ресурса?","options":["GET","POST","DELETE","PUT"],"correctIndexes":[1],"hint":"Подумай, какой метод создаёт, а не читает.","timeLimitSec":240,"difficulty":"easy","maxScore":10},
  {"id":"a2","type":"FR","title":"Объясни разницу","question":"Объясни разницу между GET и POST. Когда какой использовать?","rubric":"Правильность 40%, полнота 30%, ясность 20%, пример 10%","timeLimitSec":300,"difficulty":"medium","maxScore":20},
  {"id":"a3","type":"BC","title":"Битва: идемпотентность","question":"Почему PUT идемпотентен, а POST нет?","battleRounds":[{"id":"b1","question":"Почему PUT идемпотентен, а POST нет?","keyConcepts":["идемпотентность","состояние ресурса"],"weaknessPrompt":"Найди слабое место в объяснении идемпотентности"}],"timeLimitSec":420,"difficulty":"hard","maxScore":50}
]

Верни ТОЛЬКО JSON-массив активностей:
[{"id":"a1","type":"MC","title":"...","question":"...","options":[],"correctIndexes":[],"hint":"...","timeLimitSec":240,"difficulty":"easy","maxScore":10}]`;
}

/** Промпт для оценки свободного ответа */
export function buildEvaluationPrompt(
  question: string,
  userAnswer: string,
  rubric: string,
  topic: string
): string {
  return `Оцени свободный ответ ученика.

Тема: ${topic}
Вопрос: ${question}
Критерии: ${rubric}

Ответ ученика:
"""
${userAnswer}
"""

Требования:
- Принимай эквивалентные формулировки.
- Давай конкретный фидбек.
- Оценка по критериям: правильность 40%, полнота 30%, ясность 20%, пример 10%.

Верни ТОЛЬКО JSON:
{"score":0,"maxScore":20,"feedback":"...","strengths":["..."],"gaps":["..."],"misconceptions":["..."]}`;
}

/** Промпт для BC — найти слабое место */
export function buildBattleWeaknessPrompt(
  question: string,
  userAnswer: string,
  keyConcepts: string[]
): string {
  return `Ты — мастер-полемист в битве знаний.

Вопрос: ${question}
Ключевые понятия: ${keyConcepts.join(', ')}

Ответ ученика:
"""
${userAnswer}
"""

Найди слабое место в ответе (неточность, пропуск, неверное утверждение)
и задай уточняющий вопрос, который заставит ученика углубиться.

Верни ТОЛЬКО JSON:
{"weakness":"...","followUpQuestion":"..."}`;
}

/** Промпт для финальной оценки BC */
export function buildBattleFinalPrompt(
  question: string,
  conversation: { role: 'ai' | 'user'; text: string }[]
): string {
  const transcript = conversation
    .map((m) => `${m.role === 'ai' ? 'ИИ' : 'Ученик'}: ${m.text}`)
    .join('\n');

  return `Оцени понимание ученика в битве знаний.

Вопрос: ${question}

Диалог:
"""
${transcript}
"""

Оцени понимание 0–100 и дай развёрнутый фидбек.

Верни ТОЛЬКО JSON:
{"score":0,"feedback":"...","strengths":["..."],"gaps":["..."],"misconceptions":["..."]}`;
}

/** Промпт для финального отчёта — слабые места и рекомендации */
export function buildReportPrompt(
  topic: string,
  activityResultsJson: string
): string {
  return `Проанализируй результаты ученика и составь рекомендации.

Тема: ${topic}

Результаты активностей:
${activityResultsJson}

Верни ТОЛЬКО JSON:
{"weakAreas":["..."],"recommendations":["..."]}`;
}