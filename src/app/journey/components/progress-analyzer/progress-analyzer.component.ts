import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SqliteService } from '../../../core/sqlite.service';
import { ProgressAnalyzerService, ProgressAnalysis } from '../../../core/progress-analyzer.service';

@Component({
  selector: 'app-progress-analyzer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" *ngIf="visible()" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h2>⚔ Анализ прогресса</h2>

        <div *ngIf="loading()" class="loading">Анализирую прогресс…</div>

        <div *ngIf="result() as a" class="content">
          <p class="summary">{{ a.summary }}</p>

          <div *ngIf="a.weakTopics.length === 0" class="empty">Слабых тем не найдено 🎉</div>

          <div *ngFor="let r of a.recommendations" class="rec">
            <div class="rec-topic">{{ r.topic }}</div>
            <div class="rec-reason">{{ r.reason }}</div>
            <ul>
              <li *ngFor="let art of r.articles">📖 {{ art }}</li>
            </ul>
          </div>
        </div>

        <div *ngIf="error()" class="error">{{ error() }}</div>

        <button class="close-btn" (click)="close()">Закрыть</button>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex;
      align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: #1a1712; border: 1px solid #8a6d1f; border-radius: 8px;
      padding: 28px; max-width: 560px; width: 90%; max-height: 80vh; overflow-y: auto; color: #e8e0d0; }
    h2 { margin: 0 0 16px; color: #e8c96a; font-size: 22px; }
    .summary { color: #a89f8c; line-height: 1.6; }
    .rec { margin: 16px 0; padding: 12px; background: #141210; border-radius: 4px; }
    .rec-topic { color: #e8c96a; font-weight: bold; margin-bottom: 4px; }
    .rec-reason { font-size: 13px; color: #a89f8c; line-height: 1.5; }
    ul { margin: 8px 0 0; padding-left: 20px; }
    li { font-size: 13px; color: #e8e0d0; }
    .loading, .empty { text-align: center; color: #a89f8c; padding: 24px 0; }
    .error { color: #d43a2f; font-size: 13px; }
    .close-btn { margin-top: 16px; padding: 8px 24px; background: #141210; border: 1px solid #3a322a;
      border-radius: 4px; color: #e8c96a; cursor: pointer; }
    .close-btn:hover { border-color: #8a6d1f; }
  `],
})
export class ProgressAnalyzerComponent {
  visible = signal(false);
  loading = signal(false);
  result = signal<ProgressAnalysis | null>(null);
  error = signal<string | null>(null);

  constructor(
    private sqlite: SqliteService,
    private analyzer: ProgressAnalyzerService,
  ) {}

  async open(): Promise<void> {
    this.visible.set(true);
    this.result.set(null);
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.sqlite.init();
      this.result.set(await this.analyzer.analyze());
    } catch (e) {
      this.error.set(String(e instanceof Error ? e.message : e));
    } finally {
      this.loading.set(false);
    }
  }

  close(): void {
    this.visible.set(false);
    this.result.set(null);
    this.error.set(null);
  }
}
