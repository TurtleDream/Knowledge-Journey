import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExerciseBase } from '../../core/exercise-base';
import { ExerciseFeedbackComponent } from '../../shared/exercise-feedback/exercise-feedback.component';
import { ExerciseStatus } from '../../core/exercise-types';

@Component({
  selector: 'app-case-study',
  standalone: true,
  imports: [CommonModule, FormsModule, ExerciseFeedbackComponent],
  template: `
    <div class="exercise-panel cs-panel">
      <div class="exercise-header">
        <span class="type-badge">✍</span>
        <h4 class="exercise-title">{{ data.question }}</h4>
      </div>

      <div class="cs-bad-prompt">
        <div class="cs-label">Исходный «плохой» промпт:</div>
        <blockquote>{{ data.badPrompt }}</blockquote>
      </div>

      <div class="cs-editor" *ngIf="!locked">
        <label class="cs-label" for="cs-input">Ваша улучшенная версия:</label>
        <textarea
          id="cs-input"
          class="cs-textarea"
          [(ngModel)]="userPrompt"
          rows="5"
          placeholder="Напишите улучшенный промпт, добавив роль, контекст, задачу, формат и ограничения..."
        ></textarea>
        <div class="cs-elements" *ngIf="data.keyElements?.length">
          <div class="cs-elements-title">Проверяемые элементы:</div>
          <div class="cs-element-chips">
            <span
              *ngFor="let el of data.keyElements"
              class="cs-chip"
              [class.found]="locked && elementFound(el)"
              [class.missing]="locked && !elementFound(el)"
            >
              {{ el.label }}
            </span>
          </div>
        </div>
        <button class="btn btn-primary" (click)="check()" [disabled]="!userPrompt.trim()">Отправить</button>
      </div>

      <div class="cs-reference" *ngIf="locked">
        <div class="cs-label">Эталонный улучшенный промпт:</div>
        <blockquote class="cs-ref">{{ data.referencePrompt }}</blockquote>
        <p class="cs-ref-expl" *ngIf="data.referenceExplanation">{{ data.referenceExplanation }}</p>
      </div>

      <div class="cs-self" *ngIf="locked && selfScore === null">
        <div class="cs-label">Насколько ваш вариант совпадает с эталоном? (1–5)</div>
        <div class="cs-self-btns">
          <button *ngFor="let n of [1,2,3,4,5]" class="btn cs-self-btn" (click)="rateSelf(n)">{{ n }}</button>
        </div>
      </div>

      <app-exercise-feedback [status]="status" [explanation]="feedbackText"></app-exercise-feedback>
    </div>
  `,
  styles: [`
    .exercise-panel {
      background: linear-gradient(180deg, #1d1a17, #141210);
      border: 1px solid #3a322a;
      border-left: 4px solid #c9a227;
      border-radius: 4px;
      padding: 20px;
      margin: 20px 0;
    }
    .exercise-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
    .type-badge { font-size: 22px; line-height: 1; color: #c9a227; }
    .exercise-title { margin: 0; font-size: 16px; color: #e8e0d0; font-family: 'Open Sans', sans-serif; letter-spacing: 0; }
    .cs-label { color: #a89f8c; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .cs-bad-prompt blockquote {
      margin: 0 0 16px;
      padding: 12px 16px;
      background: rgba(161, 31, 31, 0.08);
      border-left: 3px solid #a11f1f;
      color: #e08a80;
      font-style: italic;
    }
    .cs-textarea {
      width: 100%;
      padding: 12px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #e8e0d0;
      font-size: 14px;
      font-family: 'Open Sans', sans-serif;
      resize: vertical;
      margin-bottom: 12px;
    }
    .cs-textarea:focus { outline: none; border-color: #c9a227; }
    .cs-elements { margin-bottom: 12px; }
    .cs-elements-title { color: #a89f8c; font-size: 13px; margin-bottom: 6px; }
    .cs-element-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .cs-chip {
      padding: 4px 10px;
      border: 1px solid #3a322a;
      border-radius: 12px;
      font-size: 12px;
      color: #a89f8c;
    }
    .cs-chip.found { border-color: #3f9b4f; color: #8ed49a; background: rgba(63, 155, 79, 0.1); }
    .cs-chip.missing { border-color: #a11f1f; color: #e08a80; background: rgba(161, 31, 31, 0.1); }
    .cs-reference { margin-top: 16px; }
    .cs-reference blockquote {
      margin: 0 0 10px;
      padding: 12px 16px;
      background: rgba(63, 155, 79, 0.08);
      border-left: 3px solid #3f9b4f;
      color: #8ed49a;
    }
    .cs-ref-expl { color: #a89f8c; font-size: 14px; }
    .cs-self { margin-top: 16px; }
    .cs-self-btns { display: flex; gap: 8px; }
    .cs-self-btn { min-width: 44px; padding: 8px; }
  `]
})
export class CaseStudyComponent extends ExerciseBase {
  userPrompt = '';
  selfScore: number | null = null;
  autoScore = 0;

  elementFound(el: { label: string; keywords: string[] }): boolean {
    const lower = this.userPrompt.toLowerCase();
    return el.keywords.some(k => lower.includes(k.toLowerCase()));
  }

  check(): void {
    if (!this.userPrompt.trim() || this.locked) return;
    const elements = this.data.keyElements ?? [];
    let found = 0;
    elements.forEach(el => { if (this.elementFound(el)) found++; });
    this.autoScore = elements.length ? found / elements.length : 0;
    // Статус: answered (самооценка ещё впереди)
    this.status = 'answered';
    this.score = this.autoScore;
  }

  rateSelf(n: number): void {
    if (this.selfScore !== null) return;
    this.selfScore = n;
    // Итоговый балл = среднее автооценки и самооценки (нормированной)
    const finalScore = (this.autoScore + n / 5) / 2;
    const status: ExerciseStatus = finalScore >= 0.8 ? 'correct' : finalScore >= 0.5 ? 'partial' : 'incorrect';
    this.complete(status, finalScore);
  }

  get feedbackText(): string {
    if (this.status === 'answered') {
      return 'Промпт отправлен. Оцените, насколько ваш вариант совпадает с эталоном.';
    }
    if (this.selfScore !== null) {
      return `Автооценка: ${Math.round(this.autoScore * 100)}%. Ваша самооценка: ${this.selfScore}/5. Итог: ${Math.round(this.score * 100)}%.`;
    }
    return this.data.explanation || '';
  }
}