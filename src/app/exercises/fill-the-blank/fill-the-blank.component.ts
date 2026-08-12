import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExerciseBase } from '../../core/exercise-base';
import { ExerciseFeedbackComponent } from '../../shared/exercise-feedback/exercise-feedback.component';
import { ExerciseStatus } from '../../core/exercise-types';

@Component({
  selector: 'app-fill-the-blank',
  standalone: true,
  imports: [CommonModule, FormsModule, ExerciseFeedbackComponent],
  template: `
    <div class="exercise-panel ftb-panel">
      <div class="exercise-header">
        <span class="type-badge">✎</span>
        <h4 class="exercise-title">{{ data.question }}</h4>
      </div>

      <p class="ftb-text" [innerHTML]="displayText"></p>

      <div class="ftb-input-row">
        <input
          class="ftb-input"
          type="text"
          [(ngModel)]="answer"
          [disabled]="locked"
          (keyup.enter)="check()"
          placeholder="Введите ответ..."
          aria-label="Ответ"
        />
        <button class="btn btn-primary" (click)="check()" [disabled]="locked || !answer.trim()">Проверить</button>
      </div>

      <app-exercise-feedback [status]="status" [explanation]="feedbackExplanation"></app-exercise-feedback>
    </div>
  `,
  styles: [`
    .exercise-panel {
      background: linear-gradient(180deg, #1d1a17, #141210);
      border: 1px solid #3a322a;
      border-left: 4px solid #e8c96a;
      border-radius: 4px;
      padding: 20px;
      margin: 20px 0;
    }
    .exercise-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
    .type-badge { font-size: 22px; line-height: 1; color: #e8c96a; }
    .exercise-title { margin: 0; font-size: 16px; color: #e8e0d0; font-family: 'Open Sans', sans-serif; letter-spacing: 0; }
    .ftb-text {
      font-size: 16px;
      line-height: 1.8;
      padding: 14px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #e8e0d0;
    }
    .ftb-text .blank {
      display: inline-block;
      min-width: 120px;
      border-bottom: 2px solid #e8c96a;
      color: #e8c96a;
      font-weight: 700;
      font-style: italic;
    }
    .ftb-input-row { display: flex; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
    .ftb-input {
      flex: 1;
      min-width: 200px;
      padding: 10px 14px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #e8e0d0;
      font-size: 15px;
      font-family: 'Open Sans', sans-serif;
    }
    .ftb-input:focus {
      outline: none;
      border-color: #c9a227;
      box-shadow: 0 0 8px rgba(201, 162, 39, 0.2);
    }
  `]
})
export class FillTheBlankComponent extends ExerciseBase {
  answer = '';

  get displayText(): string {
    const text = this.data.text ?? '';
    return text.replace(/_{3,}/g, ` <span class="blank">${this.locked ? (this.data.acceptedAnswers?.[0] ?? '______') : '______'}</span> `);
  }

  get feedbackExplanation(): string {
    if (this.status === 'incorrect') {
      return `Правильный ответ: "${this.data.acceptedAnswers?.join('" или "')}"${this.data.explanation ? '. ' + this.data.explanation : ''}`;
    }
    return this.data.explanation || '';
  }

  check(): void {
    if (!this.answer.trim() || this.locked) return;

    const userAnswer = this.data.caseSensitive ? this.answer.trim() : this.answer.trim().toLowerCase();
    const accepted = (this.data.acceptedAnswers ?? []).map(a =>
      this.data.caseSensitive ? a : a.toLowerCase()
    );

    const correct = accepted.includes(userAnswer);
    const status: ExerciseStatus = correct ? 'correct' : 'incorrect';
    this.complete(status, correct ? 1 : 0);
  }
}