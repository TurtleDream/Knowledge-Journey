import { TestBed } from '@angular/core/testing';

import { SqliteService } from './sqlite.service';
import { UserContextService, UserEvent } from './user-context.service';

describe('UserContextService', () => {
  let svc: UserContextService;
  let db: SqliteService;
  const H = 3600 * 1000;

  beforeAll(async () => {
    await TestBed.configureTestingModule({}).compileComponents();
    db = TestBed.inject(SqliteService);
    svc = TestBed.inject(UserContextService);
    await db.init();
  });

  // каждый тест начинает с чистой базы
  beforeEach(async () => {
    await svc.clearData();
  });

  it('score растёт с correct_rate, coverage сдерживает малую выборку', async () => {
    // 1 событие, верный: correct_rate=1, coverage=0.1
    await svc.trackEvent({ type: 'test-answered', topicId: 'tokens', correct: true });
    const [one] = await svc.getAggregates();
    expect(one.correctRate).toBe(1);
    expect(one.coverage).toBeCloseTo(0.1);
    // score = 0.6*1 + 0.2*recency(~1) + 0.2*0.1 ≈ 0.82, не 1.0
    expect(one.score).toBeLessThan(0.95);

    // доводим coverage до 1.0: 10 верных подряд
    for (let i = 0; i < 9; i++) {
      await svc.trackEvent({ type: 'test-answered', topicId: 'tokens', correct: true });
    }
    const [full] = await svc.getAggregates();
    expect(full.coverage).toBe(1);
    expect(full.score).toBeGreaterThan(0.95);
  });

  it('recency падает: старые события почти не влияют', async () => {
    const old = Date.now() - 7 * 24 * H; // ~7 полураспадов
    await svc.trackEvent({ type: 'test-answered', topicId: 'halluc', correct: true, ts: old });
    const [a] = await svc.getAggregates();
    expect(a.recency).toBeLessThan(0.02);
  });

  it('getWeakTopics/getStrongTopics сортируют по score', async () => {
    await svc.trackEvent({ type: 'test-answered', topicId: 'good', correct: true });
    await svc.trackEvent({ type: 'mistake', topicId: 'bad', correct: false });
    const weak = await svc.getWeakTopics(1);
    const strong = await svc.getStrongTopics(1);
    expect(weak[0].topic).toBe('bad');
    expect(strong[0].topic).toBe('good');
  });

  it('getPromptContext отдаёт агрегат + максимум 3 ошибки, без сырой истории', async () => {
    for (let i = 0; i < 5; i++) {
      await svc.trackEvent({ type: 'mistake', topicId: 'tokens', correct: false, ts: i });
    }
    await svc.trackEvent({ type: 'test-answered', topicId: 'tokens', correct: true });
    const ctx = await svc.getPromptContext('tokens');
    expect(ctx).toContain('Mastery');
    expect(ctx).toContain('tokens');
    // 3 ошибки + 1 верный = 4 строки «событие»
    expect(ctx.match(/- /g)!.length).toBe(3);
  });

  it('события без topicId не попадают в агрегаты', async () => {
    await svc.trackEvent({ type: 'article-opened' });
    const agg = await svc.getAggregates();
    expect(agg.length).toBe(0);
  });

  it('exportData / clearData', async () => {
    await svc.trackEvent({ type: 'test-answered', topicId: 'tokens', correct: true });
    const json = JSON.parse(await svc.exportData());
    expect(json.events.length).toBe(1);
    await svc.clearData();
    const after = JSON.parse(await svc.exportData());
    expect(after.events.length).toBe(0);
  });
});
