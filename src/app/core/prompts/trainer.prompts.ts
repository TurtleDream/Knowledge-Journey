/**
 * Промпты для лёгкого «путешествия» прямо в чате: вопрос → ответ → разбор.
 */

export const TRAINER_SYSTEM_PROMPT = `Ты — наставник по промпт-инжинирингу. Ведёшь короткую тренировку
в формате вопрос-ответ по материалам платформы. Отвечай ТОЛЬКО валидным JSON без markdown-разметки.`;

export function buildQuestionPrompt(context: string, topic: string | null, asked: string[]): string {
  const askedLine = asked.length
    ? `Уже спрашивал (не повторяй): ${asked.join(' | ')}`
    : 'Это первый вопрос.';
  return `Материалы платформы:
${context}

Тема тренировки: ${topic ?? 'любая из материалов'}.
${askedLine}

Придумай ОДИН короткий проверочный вопрос по этим материалам (не по общим знаниям):
вопрос должен проверять понимание, а не память на слова.

Верни ТОЛЬКО JSON вида:
{"question":"текст вопроса","expected":"эталонный ответ в 1-3 предложениях","topic":"тема из материалов"}`;
}

export function buildVerdictPrompt(
  question: string,
  expected: string,
  userAnswer: string,
): string {
  return `Вопрос: ${question}
Эталонный ответ: ${expected}
Ответ ученика: ${userAnswer}

Оцени ответ: верно ли по сути (не придирайся к формулировкам), что упущено.

Верни ТОЛЬКО JSON вида:
{"correct":true,"feedback":"1-2 предложения: что верно, что упущено"}`;
}
