import { ContentChunkerService, Chunk } from './content-chunker.service';
import { Article } from '../content/articles.data';

const article: Article = {
  id: 'test-article',
  title: 'Тестовая статья',
  subtitle: '',
  icon: '',
  level: '',
  readTime: '',
  tags: [],
  sections: [
    {
      heading: 'Секция раз',
      paragraphs: ['Абзац один.', 'Абзац два.'],
      exercises: [
        {
          type: 'multiple-choice',
          question: 'Вопрос из упражнения?',
          options: ['а', 'б'],
          correctIndexes: [1],
          explanation: 'потому что',
        },
      ],
    },
    {
      paragraphs: ['Абзац без заголовка.'],
    },
  ],
};

describe('ContentChunkerService', () => {
  let svc: ContentChunkerService;

  beforeEach(() => {
    svc = new ContentChunkerService();
  });

  it('каждый абзац — отдельный чанк, упражнения — отдельные', () => {
    const chunks = svc.chunkArticle(article);

    // 3 абзаца + 1 упражнение
    expect(chunks.length).toBe(4);

    const texts = chunks.map((c) => c.text);
    expect(texts).toContain('Абзац один.');
    expect(texts).toContain('Абзац два.');
    expect(texts).toContain('Абзац без заголовка.');
  });

  it('упражнение — чанк с метаданными exercise, без explanation', () => {
    const ex = svc.chunkArticle(article).find((c) => c.meta.type === 'exercise');
    expect(ex).toBeDefined();
    expect(ex!.meta.exerciseType).toBe('multiple-choice');
    expect(ex!.text).toBe('Вопрос из упражнения?');
  });

  it('section тянется из заголовка секции', () => {
    const chunks = svc.chunkArticle(article);
    expect(chunks[0].section).toBe('Секция раз');
    expect(chunks.find((c) => c.text === 'Абзац без заголовка.')!.section).toBeUndefined();
  });

  it('id уникальны, studied по умолчанию false', () => {
    const chunks = svc.chunkArticle(article);
    const ids = new Set(chunks.map((c) => c.id));
    expect(ids.size).toBe(chunks.length);
    chunks.forEach((c: Chunk) => expect(c.meta.studied).toBe(false));
  });
});
