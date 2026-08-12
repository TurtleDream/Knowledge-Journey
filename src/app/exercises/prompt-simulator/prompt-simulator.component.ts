import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExerciseBase } from '../../core/exercise-base';
import { ExerciseFeedbackComponent } from '../../shared/exercise-feedback/exercise-feedback.component';
import { ExerciseStatus } from '../../core/exercise-types';

@Component({
  selector: 'app-prompt-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule, ExerciseFeedbackComponent],
  template: `
    <div class="exercise-panel ps-panel">
      <div class="exercise-header">
        <span class="type-badge">⚡</span>
        <h4 class="exercise-title">{{ data.question }}</h4>
      </div>

      <div class="ps-editor" *ngIf="!locked">
        <label class="ps-label" for="ps-input">Ваш промпт:</label>
        <textarea
          id="ps-input"
          class="ps-textarea"
          [(ngModel)]="userPrompt"
          rows="4"
          placeholder="Напишите промпт, который должен привести к показанному ниже ответу AI..."
        ></textarea>
        <button class="btn btn-primary" (click)="send()" [disabled]="!userPrompt.trim()">Отправить</button>
      </div>

      <div class="ps-ai-response" *ngIf="locked">
        <div class="ps-label">Ответ AI:</div>
        <div class="ps-ai-box">{{ data.aiResponse }}</div>
      </div>

      <div class="ps-analysis" *ngIf="locked">
        <div class="ps-label">Анализ вашего промпта:</div>
        <div class="ps-keywords">
          <span
            *ngFor="let kw of data.simKeywords ?? []"
            class="ps-kw"
            [class.found]="keywordFound(kw)"
            [class.missing]="!keywordFound(kw)"
          >
            {{ kw }}
          </span>
        </div>
        <p class="ps-missing" *ngIf="missingKeywords.length > 0">
          Пропущены ключевые элементы: <strong>{{ missingKeywords.join(', ') }}</strong>. Они важны, потому что...
        </p>
      </div>

      <div class="ps-reference" *ngIf="locked">
        <div class="ps-label">Эталонный промпт:</div>
        <blockquote>{{ data.referenceSimPrompt }}</blockquote>
      </div>

      <div class="ps-self" *ngIf="locked && selfScore === null">
        <div class="ps-label">Насколько ваш промпт был эффективен? (1–5)</div>
        <div class="ps-self-btns">
          <button *ngFor="let n of [1,2,3,4,5]" class="btn ps-self-btn" (click)="rateSelf(n)">{{ n }}</button>
        </div>
      </div>

      <app-exercise-feedback [status]="status" [explanation]="feedbackText"></app-exercise-feedback>
    </div>
  `,
  styles: [`
    .exercise-panel {
      background: linear-gradient(180deg, #1d1a17, #141210);
      border: 1px solid #3a322a;
      border-left: 4px solid #d97a2b;
      border-radius: 4px;
      padding: 20px;
      margin: 20px 0;
    }
    .exercise-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
    .type-badge { font-size: 22px; line-height: 1; color: #d97a2b; }
    .exercise-title { margin: 0; font-size: 16px; color: #e8e0d0; font-family: 'Open Sans', sans-serif; letter-spacing: 0; }
    .ps-label { color: #a89f8c; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .ps-textarea {
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
    .ps-textarea:focus { outline: none; border-color: #d97a2b; }
    .ps-ai-box {
      padding: 14px;
      background: rgba(217, 122, 43, 0.06);
      border: 1px solid #5a4d3d;
      border-radius: 4px;
      color: #e8e0d0;
      font-size: 14px;
      line-height: 1.7;
      margin-bottom: 16px;
    }
    .ps-keywords { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .ps-kw {
      padding: 4px 10px;
      border: 1px solid #3a322a;
      border-radius: 12px;
      font-size: 12px;
      color: #a89f8c;
    }
    .ps-kw.found { border-color: #3f9b4f; color: #8ed49a; background: rgba(63, 155, 79, 0.1); }
    .ps-kw.missing { border-color: #a11f1f; color: #e08a80; background: rgba(161, 31, 31, 0.1); }
    .ps-missing { color: #e08a80; font-size: 14px; }
    .ps-reference blockquote {
      margin: 0 0 16px;
      padding: 12px 16px;
      background: rgba(63, 155, 79, 0.08);
      border-left: 3px solid #3f9b4f;
      color: #8ed49a;
    }
    .ps-self { margin-top: 16px; }
    .ps-self-btns { display: flex; gap: 8px; }
    .ps-self-btn { min-width: 44px; padding: 8px; }
  `]
})
export class PromptSimulatorComponent extends ExerciseBase {
  userPrompt = '';
  selfScore: number | null = null;
  autoScore = 0;

  get missingKeywords(): string[] {
    return (this.data.simKeywords ?? []).filter(kw => !this.keywordFound(kw));
  }

  keywordFound(kw: string): boolean {
    return this.userPrompt.toLowerCase().includes(kw.toLowerCase());
  }

  send(): void {
    if (!this.userPrompt.trim() || this.locked) return;
    const keywords = this.data.simKeywords ?? [];
    let found = 0;
    keywords.forEach(kw => { if (this.keywordFound(kw)) found++; });
    this.autoScore = keywords.length ? found / keywords.length : 0;
    this.status = 'answered';
    this.score = this.autoScore;
  }

  rateSelf(n: number): void {
    if (this.selfScore !== null) return;
    this.selfScore = n;
    const finalScore = (this.autoScore + n / 5) / 2;
    const status: ExerciseStatus = finalScore >= 0.8 ? 'correct' : finalScore >= 0.5 ? 'partial' : 'incorrect';
    this.complete(status, finalScore);
  }

  get feedbackText(): string {
    if (this.status === 'answered') {
      return 'Промпт отправлен. Оцените эффективность вашего промпта.';
    }
    if (this.selfScore !== null) {
      return `Автооценка: ${Math.round(this.autoScore * 100)}%. Самооценка: ${this.selfScore}/5. Итог: ${Math.round(this.score * 100)}%.`;
    }
    return this.data.explanation || '';
  }
}