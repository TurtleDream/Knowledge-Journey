import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { RagService, Source } from '../../../core/rag.service';
import { ProgressAnalyzerService } from '../../../core/progress-analyzer.service';
import { RecommenderService } from '../../../core/recommender.service';
import { ChatJourneyService } from '../../../core/chat-journey.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  sources?: Source[];
  origin?: 'platform' | 'general';
  needsConfirm?: boolean;
  /** сообщение — часть тренировки */
  training?: boolean;
  topic?: string;
  verdict?: 'ok' | 'bad';
}

@Component({
  selector: 'app-ai-chat-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  host: { '[class.panel-mode]': '!compact', '[class.open]': 'open && !compact' },
  template: `
    <div class="panel-header" *ngIf="!compact">
      <span class="panel-title">🔮 Оракул</span>
      <button class="panel-close" (click)="closed.emit()">✕</button>
    </div>
    <div class="chat">
      <div class="messages">
        <div *ngFor="let m of messages()" class="msg" [class.user]="m.role === 'user'">
          <div class="bubble">
            <div class="training-tag" *ngIf="m.training">⚔ Тренировка{{ m.topic ? ': ' + m.topic : '' }}</div>
            <div class="verdict" [class.ok]="m.verdict === 'ok'" [class.bad]="m.verdict === 'bad'" *ngIf="m.verdict">
              {{ m.verdict === 'ok' ? '✓ Верно' : '✗ Есть пробелы' }}
            </div>
            <div class="origin" [class.general]="m.origin === 'general'" *ngIf="m.origin">
              {{ m.origin === 'platform' ? '✓ На основе платформы' : 'Общие знания' }}
            </div>
            <div class="text">{{ m.text }}</div>

            <div *ngIf="m.needsConfirm" class="confirm">
              <p>Найденные фрагменты ещё не изучены. Разрешить ответить с их учётом?</p>
              <button class="allow-btn" (click)="allowUnstudied(m)">Разрешить</button>
            </div>

            <div *ngIf="m.sources?.length" class="sources">
              <a *ngFor="let s of m.sources" [routerLink]="url(s)" class="src">
                <span class="badge" [class.studied]="!s.unstudied">
                  {{ s.unstudied ? 'Не изучено' : 'Изучено' }}
                </span>
                {{ s.section ?? s.chunkId }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="quick" *ngIf="!compact">
        <button class="quick-btn" (click)="runAnalysis()" [disabled]="busy()">📊 Анализ прогресса</button>
        <button class="quick-btn" (click)="runRecommendations()" [disabled]="busy()">🎯 Рекомендации</button>
        <button class="quick-btn" *ngIf="!training()" (click)="startTraining()" [disabled]="busy()">
          ⚔ Тренировка по изученному
        </button>
        <button class="quick-btn stop" *ngIf="training()" (click)="stopTraining()">
          ■ Закончить тренировку
        </button>
      </div>

      <div class="input-row">
        <label class="studied-toggle">
          <input type="checkbox" [(ngModel)]="searchStudied" />
          Поиск по изученному
        </label>
        <input
          class="chat-input"
          placeholder="Спроси о промпт-инжиниринге…"
          [(ngModel)]="draft"
          (keyup.enter)="send()"
          [disabled]="busy()"
        />
        <button class="send-btn" (click)="send()" [disabled]="busy() || !draft.trim()">➤</button>
      </div>
    </div>
  `,
  styles: [`
    :host(.panel-mode) {
      position: fixed; top: 0; right: 0; height: 100vh; width: 400px; max-width: 92vw;
      background: #1a1712; border-left: 2px solid #8b0000; z-index: 950;
      display: flex; flex-direction: column;
      transform: translateX(105%); transition: transform 0.25s ease;
      box-shadow: -4px 0 24px rgba(0,0,0,0.6);
    }
    :host(.panel-mode.open) { transform: translateX(0); }
    .panel-header { display: flex; justify-content: space-between; align-items: center;
      padding: 12px 14px; border-bottom: 1px solid #3a322a; }
    .panel-title { font-family: Cinzel, serif; color: #e8c96a; font-size: 16px; }
    .panel-close { background: none; border: none; color: #a89f8c; font-size: 16px; cursor: pointer; }
    .panel-close:hover { color: #d43a2f; }
    .chat { display: flex; flex-direction: column; height: 100%; flex: 1; min-height: 0; }
    .messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .msg { display: flex; }
    .msg.user { justify-content: flex-end; }
    .bubble { max-width: 85%; background: #141210; border: 1px solid #3a322a; border-radius: 8px; padding: 10px 12px; }
    .msg.user .bubble { background: rgba(139, 0, 0, 0.25); border-color: #8b0000; }
    .text { font-size: 14px; line-height: 1.55; white-space: pre-wrap; color: #e8e0d0; }
    .origin { font-size: 11px; margin-bottom: 6px; color: #5fc96f; font-family: Cinzel, serif; }
    .origin.general { color: #6f6757; }
    .confirm { margin-top: 8px; font-size: 12px; color: #a89f8c; }
    .allow-btn { margin-top: 6px; padding: 4px 12px; background: #8b0000; color: #e8e0d0;
      border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .sources { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; }
    .src { font-size: 12px; color: #a89f8c; text-decoration: none; }
    .src:hover { color: #e8c96a; }
    .badge { font-size: 10px; padding: 1px 6px; border-radius: 3px; background: #3a322a; color: #a89f8c; margin-right: 4px; }
    .badge.studied { background: rgba(95,201,111,0.2); color: #5fc96f; }
    .quick { display: flex; gap: 8px; padding: 8px 10px 0; flex-wrap: wrap; }
    .quick-btn { padding: 6px 12px; background: #141210; border: 1px solid #8b0000;
      border-radius: 14px; color: #e8c96a; font-size: 12px; cursor: pointer; }
    .quick-btn:hover { background: rgba(139,0,0,0.2); }
    .quick-btn.stop { border-color: #3a322a; color: #a89f8c; }
    .training-tag { font-size: 11px; color: #e8c96a; font-family: Cinzel, serif; margin-bottom: 4px; }
    .verdict { font-size: 11px; font-family: Cinzel, serif; margin-bottom: 6px; }
    .verdict.ok { color: #5fc96f; }
    .verdict.bad { color: #d43a2f; }
    .input-row { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #3a322a; align-items: center; }
    .studied-toggle { font-size: 11px; color: #a89f8c; display: flex; gap: 4px; align-items: center; white-space: nowrap; }
    .chat-input { flex: 1; background: #0f0e0c; border: 1px solid #3a322a; border-radius: 4px;
      color: #e8e0d0; padding: 8px 10px; font-size: 13px; }
    .send-btn { background: #8b0000; color: #e8e0d0; border: none; border-radius: 4px; padding: 8px 14px; cursor: pointer; }
    .send-btn:disabled { opacity: 0.4; }
  `],
})
export class AiChatPanelComponent {
  /** compact — inline-режим (страница /ai), иначе — фиксированная панель со slide-in */
  @Input() compact = false;
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  messages = signal<ChatMessage[]>([]);
  busy = signal(false);
  training = signal(false);
  draft = '';
  searchStudied = false;

  constructor(
    private rag: RagService,
    private analyzer: ProgressAnalyzerService,
    private recommender: RecommenderService,
    private trainer: ChatJourneyService,
  ) {}

  private push(msg: ChatMessage): void {
    this.messages.update((m) => [...m, msg]);
  }

  url(s: Source): string {
    return `/article/${s.articleId}`;
  }

  async send(): Promise<void> {
    const q = this.draft.trim();
    if (!q || this.busy()) return;

    this.push({ role: 'user', text: q });
    this.draft = '';
    this.busy.set(true);

    try {
      // в режиме тренировки любой ввод — ответ на текущий вопрос
      if (this.training()) {
        const res = await this.trainer.answer(q);
        if (!res) {
          this.training.set(false);
          this.push({ role: 'assistant', text: 'Тренировка завершена.' });
          return;
        }
        this.push({
          role: 'assistant',
          text: res.feedback,
          verdict: res.correct ? 'ok' : 'bad',
          training: true,
        });
        if (res.next) {
          this.push({ role: 'assistant', text: res.next.question, training: true, topic: res.next.topic });
        } else {
          this.training.set(false);
          this.push({ role: 'assistant', text: 'Изученные материалы закончились — тренировка завершена.' });
        }
        return;
      }

      const res = await this.rag.ask(q, { includeUnstudied: !this.searchStudied });
      if (res.needsUnstudiedConfirm) {
        this.push({
          role: 'assistant',
          text: 'Нашёл совпадения, но они не из изученного материала.',
          sources: res.sources,
          needsConfirm: true,
        });
        return;
      }
      this.push({
        role: 'assistant',
        text: res.answer || 'Ничего не нашёл в базе знаний.',
        sources: res.sources,
        origin: res.origin,
      });
    } catch (e) {
      this.push({ role: 'assistant', text: this.humanError(e) });
    } finally {
      this.busy.set(false);
    }
  }

  /** анализ прогресса — результат прямо в чат, без модалки */
  async runAnalysis(): Promise<void> {
    if (this.busy()) return;
    this.push({ role: 'user', text: '📊 Анализ прогресса' });
    this.busy.set(true);
    try {
      const a = await this.analyzer.analyze();
      const parts = [a.summary || 'Анализ готов.'];
      for (const r of a.recommendations) {
        parts.push(`\n• ${r.topic} — ${r.reason}`);
        if (r.articles.length) parts.push(`  📖 ${r.articles.join(', ')}`);
      }
      this.push({ role: 'assistant', text: parts.join('\n') });
    } catch (e) {
      this.push({ role: 'assistant', text: this.humanError(e) });
    } finally {
      this.busy.set(false);
    }
  }

  /** рекомендации — тоже в чат */
  async runRecommendations(): Promise<void> {
    if (this.busy()) return;
    this.push({ role: 'user', text: '🎯 Что изучить дальше?' });
    this.busy.set(true);
    try {
      const r = await this.recommender.recommendNext();
      const parts: string[] = [];
      for (const t of r.nextTopics) {
        parts.push(`• ${t.topic} — ${t.reason}`);
        if (t.articles.length) parts.push(`  📖 ${t.articles.join(', ')}`);
      }
      if (r.relatedSkills.length) parts.push(`\nСмежные навыки:\n${r.relatedSkills.map((s) => `• ${s}`).join('\n')}`);
      if (r.resumeSuggestion) parts.push(`\nВ резюме: ${r.resumeSuggestion}`);
      this.push({ role: 'assistant', text: parts.join('\n') || 'Пока нечего рекомендовать — мало данных.' });
    } catch (e) {
      this.push({ role: 'assistant', text: this.humanError(e) });
    } finally {
      this.busy.set(false);
    }
  }

  async startTraining(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const step = await this.trainer.start();
      if (!step) {
        this.push({
          role: 'assistant',
          text: 'Нет изученных материалов для тренировки. Открой статью и нажми «Я изучил эту статью», потом запусти индексацию.',
        });
        return;
      }
      this.training.set(true);
      this.push({ role: 'assistant', text: 'Начинаем тренировку по изученному. Отвечай своими словами.', training: true });
      this.push({ role: 'assistant', text: step.question, training: true, topic: step.topic });
    } catch (e) {
      this.push({ role: 'assistant', text: this.humanError(e) });
    } finally {
      this.busy.set(false);
    }
  }

  stopTraining(): void {
    this.trainer.stop();
    this.training.set(false);
    this.push({ role: 'assistant', text: 'Тренировка остановлена.' });
  }

  private humanError(e: unknown): string {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Failed to fetch|NetworkError|Network request failed|load failed/i.test(msg)) {
      return 'Нет связи с бэкендом. Проверь, что запущен node server/index.js, и обнови страницу.';
    }
    return msg || 'Ошибка запроса';
  }

  async allowUnstudied(msg: ChatMessage): Promise<void> {
    const idx = this.messages().indexOf(msg);
    const q = this.messages()[Math.max(0, idx - 1)];
    if (q?.role !== 'user') return;
    this.busy.set(true);
    try {
      const res = await this.rag.ask(q.text, { includeUnstudied: true });
      if (res.needsUnstudiedConfirm) return; // не бывает при includeUnstudied: true, но TS требует
      this.messages.update((m) => [...m, {
        role: 'assistant',
        text: res.answer || 'Ничего не нашёл.',
        sources: res.sources,
        origin: res.origin,
      }]);
    } finally {
      this.busy.set(false);
    }
  }
}
