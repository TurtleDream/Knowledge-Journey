import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExerciseBase } from '../../core/exercise-base';
import { ExerciseFeedbackComponent } from '../../shared/exercise-feedback/exercise-feedback.component';

@Component({
  selector: 'app-true-false',
  standalone: true,
  imports: [CommonModule, ExerciseFeedbackComponent],
  template: `
    <div class="exercise-panel tf-panel">
      <div class="exercise-header">
        <span class="type-badge">⚖</span>
        <h4 class="exercise-title">{{ data.question }}</h4>
      </div>

      <div class="tf-options">
        <button
          class="tf-btn tf-true"
          [class.selected]="selected === true"
          [class.correct-opt]="locked && selected === true && data.correctBoolean === true"
          [class.wrong-opt]="locked && selected === true && data.correctBoolean === false"
          [disabled]="locked"
          (click)="select(true)"
        >
          <span class="tf-icon">✔</span> Верно
        </button>
        <button
          class="tf-btn tf-false"
          [class.selected]="selected === false"
          [class.correct-opt]="locked && selected === false && data.correctBoolean === false"
          [class.wrong-opt]="locked && selected === false && data.correctBoolean === true"
          [disabled]="locked"
          (click)="select(false)"
        >
          <span class="tf-icon">✘</span> Неверно
        </button>
      </div>

      <div class="actions" *ngIf="!locked && selected !== null">
        <button class="btn btn-primary" (click)="check()">Проверить</button>
      </div>

      <app-exercise-feedback [status]="status" [explanation]="data.explanation || ''"></app-exercise-feedback>
    </div>
  `,
  styles: [`
    .exercise-panel {
      background: linear-gradient(180deg, #1d1a17, #141210);
      border: 1px solid #3a322a;
      border-left: 4px solid #d43a2f;
      border-radius: 4px;
      padding: 20px;
      margin: 20px 0;
    }
    .exercise-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
    .type-badge { font-size: 22px; line-height: 1; color: #d43a2f; }
    .exercise-title { margin: 0; font-size: 16px; color: #e8e0d0; font-family: 'Open Sans', sans-serif; letter-spacing: 0; }
    .tf-options { display: flex; gap: 12px; flex-wrap: wrap; }
    .tf-btn {
      flex: 1;
      min-width: 140px;
      padding: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #e8e0d0;
      font-size: 15px;
      font-weight: 700;
      font-family: 'Cinzel', serif;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tf-btn:hover:not(:disabled) { border-color: #c9a227; }
    .tf-btn.selected { border-color: #c9a227; background: rgba(201, 162, 39, 0.1); }
    .tf-btn.correct-opt { border-color: #3f9b4f; background: rgba(63, 155, 79, 0.12); color: #8ed49a; }
    .tf-btn.wrong-opt { border-color: #a11f1f; background: rgba(161, 31, 31, 0.12); color: #e08a80; }
    .tf-icon { font-size: 18px; }
    .actions { margin-top: 16px; }
  `]
})
export class TrueFalseComponent extends ExerciseBase {
  selected: boolean | null = null;

  select(value: boolean): void {
    if (this.locked) return;
    this.selected = value;
  }

  check(): void {
    if (this.selected === null) return;
    const correct = this.selected === this.data.correctBoolean;
    this.complete(correct ? 'correct' : 'incorrect', correct ? 1 : 0);
  }
}