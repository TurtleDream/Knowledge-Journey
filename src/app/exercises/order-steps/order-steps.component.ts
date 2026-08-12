import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExerciseBase } from '../../core/exercise-base';
import { ExerciseFeedbackComponent } from '../../shared/exercise-feedback/exercise-feedback.component';

@Component({
  selector: 'app-order-steps',
  standalone: true,
  imports: [CommonModule, ExerciseFeedbackComponent],
  template: `
    <div class="exercise-panel os-panel">
      <div class="exercise-header">
        <span class="type-badge">⇅</span>
        <h4 class="exercise-title">{{ data.question }}</h4>
      </div>

      <p class="os-hint" *ngIf="!locked">
        Кликните по шагу, чтобы выбрать его, затем по номеру позиции, куда его переместить.
      </p>

      <div class="os-list">
        <div
          *ngFor="let stepIdx of currentOrder; let i = index"
          class="os-row"
          [class.selected]="selectedIndex === i"
          [class.right]="locked && isCorrectPosition(i)"
          [class.wrong]="locked && !isCorrectPosition(i)"
        >
          <span class="os-pos" (click)="placeAt(i)" [class.active]="placing">{{ i + 1 }}</span>
          <div class="os-content" (click)="selectStep(i)">
            <div class="os-text">{{ stepText(stepIdx) }}</div>
            <div class="os-desc" *ngIf="stepDescription(stepIdx)">{{ stepDescription(stepIdx) }}</div>
          </div>
        </div>
      </div>

      <div class="actions" *ngIf="!locked">
        <button class="btn btn-primary" (click)="check()" [disabled]="!isComplete">Проверить</button>
        <button class="btn btn-ghost" (click)="resetOrder()" *ngIf="!isComplete">Сбросить</button>
      </div>

      <app-exercise-feedback [status]="status" [explanation]="data.explanation || ''"></app-exercise-feedback>
    </div>
  `,
  styles: [`
    .exercise-panel {
      background: linear-gradient(180deg, #1d1a17, #141210);
      border: 1px solid #3a322a;
      border-left: 4px solid #7a9fd4;
      border-radius: 4px;
      padding: 20px;
      margin: 20px 0;
    }
    .exercise-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
    .type-badge { font-size: 22px; line-height: 1; color: #7a9fd4; }
    .exercise-title { margin: 0; font-size: 16px; color: #e8e0d0; font-family: 'Open Sans', sans-serif; letter-spacing: 0; }
    .os-hint { color: #a89f8c; font-size: 13px; margin: 0 0 12px; }
    .os-list { display: flex; flex-direction: column; gap: 8px; }
    .os-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .os-row.selected { border-color: #c9a227; background: rgba(201, 162, 39, 0.08); }
    .os-row.right { border-color: #3f9b4f; background: rgba(63, 155, 79, 0.1); }
    .os-row.wrong { border-color: #a11f1f; background: rgba(161, 31, 31, 0.1); }
    .os-pos {
      min-width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #26211c;
      border: 1px solid #5a4d3d;
      border-radius: 4px;
      color: #e8c96a;
      font-weight: 700;
      font-family: 'Cinzel', serif;
      cursor: pointer;
      transition: all 0.15s;
    }
    .os-pos.active { border-color: #d97a2b; background: rgba(217, 122, 43, 0.2); }
    .os-content { flex: 1; cursor: pointer; }
    .os-text { color: #e8e0d0; font-size: 14px; }
    .os-desc { color: #a89f8c; font-size: 12px; margin-top: 2px; font-style: italic; }
    .actions { margin-top: 16px; display: flex; gap: 10px; }
  `]
})
export class OrderStepsComponent extends ExerciseBase {
  /** Текущий порядок (индексы в data.steps) */
  currentOrder: number[] = [];
  selectedIndex: number | null = null;
  placing = false;

  ngOnInit(): void {
    const steps = this.data.steps ?? [];
    // Перемешиваем начальный порядок
    this.currentOrder = this.shuffle(steps.map((_, i) => i));
  }

  get isComplete(): boolean {
    return this.currentOrder.length === (this.data.steps?.length ?? 0);
  }

  /** Текст шага по индексу в data.steps */
  stepText(stepIdx: number): string {
    return this.data.steps?.[stepIdx] ?? '';
  }

  /** Описание шага по индексу в data.steps */
  stepDescription(stepIdx: number): string | undefined {
    return this.data.stepDescriptions?.[stepIdx];
  }

  selectStep(i: number): void {
    if (this.locked) return;
    // Если шаг уже выбран — снимаем выбор
    if (this.selectedIndex === i) {
      this.selectedIndex = null;
      this.placing = false;
      return;
    }
    this.placing = true;
    this.selectedIndex = i;
  }

  placeAt(pos: number): void {
    if (this.locked || this.selectedIndex === null) return;
    const [step] = this.currentOrder.splice(this.selectedIndex, 1);
    this.currentOrder.splice(pos, 0, step);
    this.selectedIndex = null;
    this.placing = false;
  }

  resetOrder(): void {
    this.currentOrder = this.shuffle((this.data.steps ?? []).map((_, i) => i));
    this.selectedIndex = null;
    this.placing = false;
  }

  isCorrectPosition(pos: number): boolean {
    return this.currentOrder[pos] === pos;
  }

  check(): void {
    if (!this.isComplete) return;
    let correctCount = 0;
    for (let i = 0; i < this.currentOrder.length; i++) {
      if (this.currentOrder[i] === i) correctCount++;
    }
    const score = correctCount / this.currentOrder.length;
    const status = correctCount === this.currentOrder.length ? 'correct' : (correctCount > 0 ? 'partial' : 'incorrect');
    this.complete(status, score);
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}