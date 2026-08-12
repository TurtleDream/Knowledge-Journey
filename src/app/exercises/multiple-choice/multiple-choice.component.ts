import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExerciseBase } from '../../core/exercise-base';
import { ExerciseFeedbackComponent } from '../../shared/exercise-feedback/exercise-feedback.component';
import { ExerciseStatus } from '../../core/exercise-types';

@Component({
  selector: 'app-multiple-choice',
  standalone: true,
  imports: [CommonModule, ExerciseFeedbackComponent],
  template: `
    <div class="exercise-panel">
      <div class="exercise-header">
        <span class="type-badge">☑</span>
        <h4 class="exercise-title">{{ data.question }}</h4>
      </div>

      <div class="options">
        <button
          *ngFor="let opt of data.options; let i = index"
          class="option-btn"
          [class.selected]="selected.has(i)"
          [class.correct-opt]="locked && isCorrectIndex(i)"
          [class.wrong-opt]="locked && selected.has(i) && !isCorrectIndex(i)"
          [disabled]="locked"
          (click)="toggleOption(i)"
        >
          <span class="opt-mark">{{ selected.has(i) ? (multi ? '☑' : '●') : '○' }}</span>
          <span class="opt-text">{{ opt }}</span>
        </button>
      </div>

      <div class="actions" *ngIf="!locked">
        <button class="btn btn-primary" (click)="check()" [disabled]="selected.size === 0">Проверить</button>
      </div>

      <app-exercise-feedback [status]="status" [explanation]="data.explanation || ''"></app-exercise-feedback>
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
    .exercise-header {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .type-badge {
      font-size: 22px;
      line-height: 1;
      color: #d97a2b;
    }
    .exercise-title {
      margin: 0;
      font-size: 16px;
      color: #e8e0d0;
      font-family: 'Open Sans', sans-serif;
      letter-spacing: 0;
    }
    .options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .option-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      text-align: left;
      padding: 12px 14px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #e8e0d0;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s;
      font-family: 'Open Sans', sans-serif;
    }
    .option-btn:hover:not(:disabled) {
      border-color: #c9a227;
      background: #1d1a17;
    }
    .option-btn.selected {
      border-color: #c9a227;
      background: rgba(201, 162, 39, 0.1);
    }
    .option-btn.correct-opt {
      border-color: #3f9b4f;
      background: rgba(63, 155, 79, 0.12);
      color: #8ed49a;
    }
    .option-btn.wrong-opt {
      border-color: #a11f1f;
      background: rgba(161, 31, 31, 0.12);
      color: #e08a80;
    }
    .opt-mark {
      font-size: 16px;
      min-width: 18px;
    }
    .actions {
      margin-top: 16px;
    }
  `]
})
export class MultipleChoiceComponent extends ExerciseBase implements OnInit {
  selected = new Set<number>();

  get multi(): boolean {
    return this.data.multiSelect ?? false;
  }

  ngOnInit(): void {
    // Варианты оставляем в исходном порядке и храним selected по их индексу
  }

  isCorrectIndex(i: number): boolean {
    return this.data.correctIndexes?.includes(i) ?? false;
  }

  toggleOption(i: number): void {
    if (this.locked) return;
    if (this.selected.has(i)) {
      this.selected.delete(i);
    } else {
      if (!this.multi) {
        this.selected.clear();
      }
      this.selected.add(i);
    }
  }

  check(): void {
    if (this.selected.size === 0) return;
    const correct = this.data.correctIndexes ?? [];
    const total = this.data.options?.length ?? 1;

    let correctCount = 0;
    this.selected.forEach(s => { if (correct.includes(s)) correctCount++; });

    const wrongSelected = this.selected.size - correctCount;
    const correctUnselected = correct.length - correctCount;
    const score = (correctCount + (total - correct.length - wrongSelected)) / total;

    const allCorrect = correctCount === correct.length && wrongSelected === 0;
    const status: ExerciseStatus = allCorrect
      ? 'correct'
      : (correctCount > 0 || correctUnselected < total - correct.length)
        ? 'partial'
        : 'incorrect';

    this.complete(status, Math.max(0, Math.min(1, score)));
  }
}