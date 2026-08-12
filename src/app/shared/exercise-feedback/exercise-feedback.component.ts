import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExerciseStatus } from '../../core/exercise-types';

@Component({
  selector: 'app-exercise-feedback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="exercise-feedback" [class]="statusClass" *ngIf="status !== 'idle'">
      <span class="feedback-icon">{{ icon }}</span>
      <div class="feedback-content">
        <div class="feedback-title">{{ title }}</div>
        <div class="feedback-text" *ngIf="explanation">{{ explanation }}</div>
      </div>
    </div>
  `,
  styles: [`
    .exercise-feedback {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-top: 16px;
      padding: 12px 16px;
      border: 1px solid;
      border-radius: 4px;
      font-size: 14px;
    }
    .feedback-icon {
      font-size: 22px;
      line-height: 1;
    }
    .feedback-title {
      font-weight: 700;
      font-family: 'Cinzel', serif;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .feedback-text {
      opacity: 0.9;
    }
    .feedback-correct {
      background: rgba(63, 155, 79, 0.12);
      border-color: #3f9b4f;
      color: #8ed49a;
    }
    .feedback-incorrect {
      background: rgba(161, 31, 31, 0.15);
      border-color: #a11f1f;
      color: #e08a80;
    }
    .feedback-partial {
      background: rgba(217, 178, 58, 0.12);
      border-color: #d9b23a;
      color: #e6cf7a;
    }
    .feedback-answered {
      background: rgba(201, 162, 39, 0.1);
      border-color: #c9a227;
      color: #e8c96a;
    }
  `]
})
export class ExerciseFeedbackComponent {
  @Input() status: ExerciseStatus = 'idle';
  @Input() explanation = '';

  get statusClass(): string {
    return `feedback-${this.status}`;
  }

  get icon(): string {
    switch (this.status) {
      case 'correct': return '✔';
      case 'incorrect': return '✘';
      case 'partial': return '◐';
      case 'answered': return '★';
      default: return '';
    }
  }

  get title(): string {
    switch (this.status) {
      case 'correct': return 'Верно!';
      case 'incorrect': return 'Неверно';
      case 'partial': return 'Частично верно';
      case 'answered': return 'Готово';
      default: return '';
    }
  }
}