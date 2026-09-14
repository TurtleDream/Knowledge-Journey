import { Injectable } from '@angular/core';

import { ARTICLES, Article } from '../content/articles.data';
import { TEST_QUESTIONS } from '../content/test-questions.data';
import { ExerciseData, ExerciseType } from '../core/exercise-types';
import { Journey } from '../journey/models/journey.models';

export interface Chunk {
  id: string;
  source: 'article' | 'journey' | 'test';
  sourceId: string;
  section?: string;
  text: string;
  meta: {
    studied: boolean;
    type?: 'exercise' | 'test-question';
    exerciseType?: ExerciseType;
  };
}

// вопрос + правильный ответ, без explanation — explanation не для эмбеддинга
function correctAnswerText(q: ExerciseData): string {
  if (q.options && q.correctIndexes) {
    return q.correctIndexes.map((i) => q.options?.[i] ?? '').join('; ');
  }
  if (q.acceptedAnswers) return q.acceptedAnswers.join('; ');
  if (q.correctBoolean !== undefined) return q.correctBoolean ? 'Верно' : 'Неверно';
  if (q.correctPairs && q.leftItems && q.rightItems) {
    return q.correctPairs
      .map((r, l) => `${q.leftItems?.[l]} — ${q.rightItems?.[r] ?? ''}`)
      .join('; ');
  }
  if (q.steps) return q.steps.join(' → ');
  if (q.referencePrompt) return q.referencePrompt;
  return '';
}

@Injectable({ providedIn: 'root' })
export class ContentChunkerService {
  chunkArticle(article: Article): Chunk[] {
    const chunks: Chunk[] = [];
    let idx = 0;

    for (const sec of article.sections) {
      for (const p of sec.paragraphs) {
        chunks.push({
          id: `${article.id}:${idx++}`,
          source: 'article',
          sourceId: article.id,
          section: sec.heading,
          text: p,
          meta: { studied: false },
        });
      }
      for (const ex of sec.exercises ?? []) {
        chunks.push({
          id: `${article.id}:${idx++}`,
          source: 'article',
          sourceId: article.id,
          section: sec.heading,
          text: ex.question,
          meta: { studied: false, type: 'exercise', exerciseType: ex.type },
        });
      }
    }
    return chunks;
  }

  chunkJourney(journey: Journey): Chunk {
    return {
      id: `journey:${journey.id}`,
      source: 'journey',
      sourceId: journey.id,
      text: `${journey.title}\n${JSON.stringify(journey)}`,
      meta: { studied: false },
    };
  }

  chunkTestQuestion(q: ExerciseData, idx = 0): Chunk {
    return {
      id: `test:${idx}`,
      source: 'test',
      sourceId: `test-${idx}`,
      text: `${q.question}\n${correctAnswerText(q)}`,
      meta: { studied: false, type: 'test-question', exerciseType: q.type },
    };
  }

  chunkAll(journeys: Journey[] = []): Chunk[] {
    const chunks: Chunk[] = [];
    for (const a of ARTICLES) chunks.push(...this.chunkArticle(a));
    for (const j of journeys) chunks.push(this.chunkJourney(j));
    TEST_QUESTIONS.forEach((q, i) => chunks.push(this.chunkTestQuestion(q, i)));
    return chunks;
  }
}
