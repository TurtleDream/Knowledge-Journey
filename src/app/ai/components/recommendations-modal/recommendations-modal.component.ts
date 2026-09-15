import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { RecommenderService, NextRecommendation } from '../../../core/recommender.service';
import { SqliteService } from '../../../core/sqlite.service';

@Component({
  selector: 'app-recommendations-modal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="overlay" *ngIf="visible()" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h2>🎯 Рекомендации</h2>

        <div *ngIf="loading()" class="loading">Собираю рекомендации…</div>

        <div *ngIf="result() as r" class="content">
          <h3>Что изучить дальше</h3>
          <div *ngIf="r.nextTopics.length === 0" class="empty">Пока нечего рекомендовать — данных мало.</div>
          <div *ngFor="let t of r.nextTopics" class="rec">
            <div class="rec-topic">{{ t.topic }}</div>
            <div class="rec-reason">{{ t.reason }}</div>
            <ul>
              <li *ngFor="let a of t.articles">📖 {{ a }}</li>
            </ul>
          </div>

          <h3 *ngIf="r.relatedSkills.length">Смежные навыки</h3>
          <ul class="skills">
            <li *ngFor="let s of r.relatedSkills">{{ s }}</li>
          </ul>

          <div *ngIf="r.resumeSuggestion" class="resume">
            <h3>В резюме</h3>
            <p>{{ r.resumeSuggestion }}</p>
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
    .modal { background: #1a1712; border: 1px solid #8b0000; border-radius: 8px;
      padding: 28px; max-width: 560px; width: 90%; max-height: 80vh; overflow-y: auto; color: #e8e0d0; }
    h2 { margin: 0 0 16px; color: #e8c96a; font-size: 22px; font-family: Cinzel, serif; }
    h3 { color: #e8c96a; font-size: 15px; font-family: Cinzel, serif; margin: 18px 0 8px; }
    .rec { margin: 10px 0; padding: 10px; background: #141210; border-radius: 4px; }
    .rec-topic { color: #e8c96a; font-weight: bold; margin-bottom: 4px; }
    .rec-reason { font-size: 13px; color: #a89f8c; line-height: 1.5; }
    ul { margin: 8px 0 0; padding-left: 20px; }
    li { font-size: 13px; }
    .skills li { color: #e8e0d0; line-height: 1.6; }
    .resume { background: rgba(139,0,0,0.15); border: 1px solid #8b0000; border-radius: 4px; padding: 10px 14px; }
    .resume p { margin: 0; font-size: 13px; line-height: 1.6; }
    .loading, .empty { text-align: center; color: #a89f8c; padding: 24px 0; }
    .error { color: #d43a2f; font-size: 13px; }
    .close-btn { margin-top: 16px; padding: 8px 24px; background: #141210; border: 1px solid #3a322a;
      border-radius: 4px; color: #e8c96a; cursor: pointer; }
    .close-btn:hover { border-color: #8b0000; }
  `],
})
export class RecommendationsModalComponent {
  visible = signal(false);
  loading = signal(false);
  result = signal<NextRecommendation | null>(null);
  error = signal<string | null>(null);

  constructor(
    private sqlite: SqliteService,
    private recommender: RecommenderService,
  ) {}

  async open(): Promise<void> {
    this.visible.set(true);
    this.result.set(null);
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.sqlite.init();
      this.result.set(await this.recommender.recommendNext());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
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
