import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExerciseBase } from '../../core/exercise-base';
import { ExerciseFeedbackComponent } from '../../shared/exercise-feedback/exercise-feedback.component';

@Component({
  selector: 'app-match-pairs',
  standalone: true,
  imports: [CommonModule, ExerciseFeedbackComponent],
  template: `
    <div class="exercise-panel mp-panel">
      <div class="exercise-header">
        <span class="type-badge">⇄</span>
        <h4 class="exercise-title">{{ data.question }}</h4>
      </div>

      <p class="mp-hint" *ngIf="!locked">
        Кликните по элементу слева, затем по соответствующему элементу справа — они соединятся.
        Кликните по соединённой паре, чтобы разъединить.
      </p>

      <div class="mp-grid">
        <div class="mp-col">
          <div class="mp-col-label">Термин</div>
          <div
            *ngFor="let item of leftItems; let i = index"
            class="mp-item"
            [class.selected]="selectedLeft === i"
            [class.right]="locked && matches[i] === correctFor(i)"
            [class.wrong]="locked && matches[i] !== null && matches[i] !== correctFor(i)"
            (click)="pickLeft(i)"
          >
            <span class="mp-connector" [class.connected]="matches[i] !== null">
              {{ matches[i] !== null ? '⇄' : '' }}
            </span>
            <span class="mp-text">{{ item }}</span>
          </div>
        </div>

        <div class="mp-col">
          <div class="mp-col-label">Описание</div>
          <div
            *ngFor="let item of rightItems; let i = index"
            class="mp-item"
            [class.selected]="selectedRight === i"
            [class.right]="locked && isRightCorrect(i)"
            [class.wrong]="locked && rightUsed(i) && !isRightCorrect(i)"
            (click)="pickRight(i)"
          >
            <span class="mp-connector" [class.connected]="rightUsed(i)">
              {{ rightUsed(i) ? '⇄' : '' }}
            </span>
            <span class="mp-text">{{ item }}</span>
          </div>
        </div>
      </div>

      <div class="mp-status" *ngIf="!locked && matches.length > 0">
        Соединено: {{ matchedCount() }} из {{ leftItems.length }}
      </div>

      <div class="actions" *ngIf="!locked && matchedCount() === leftItems.length">
        <button class="btn btn-primary" (click)="check()">Проверить</button>
      </div>

      <app-exercise-feedback [status]="status" [explanation]="data.explanation || ''"></app-exercise-feedback>
    </div>
  `,
  styles: [`
    .exercise-panel {
      background: linear-gradient(180deg, #1d1a17, #141210);
      border: 1px solid #3a322a;
      border-left: 4px solid #5fc96f;
      border-radius: 4px;
      padding: 20px;
      margin: 20px 0;
    }
    .exercise-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    .type-badge { font-size: 22px; line-height: 1; color: #5fc96f; }
    .exercise-title { margin: 0; font-size: 16px; color: #e8e0d0; font-family: 'Open Sans', sans-serif; letter-spacing: 0; }
    .mp-hint { color: #a89f8c; font-size: 13px; margin: 0 0 16px; }
    .mp-grid { display: flex; gap: 20px; flex-wrap: wrap; }
    .mp-col { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 8px; }
    .mp-col-label {
      font-family: 'Cinzel', serif;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #e8c96a;
      padding: 4px 0;
      border-bottom: 1px solid #3a322a;
      margin-bottom: 4px;
    }
    .mp-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #e8e0d0;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s;
      user-select: none;
    }
    .mp-item:hover:not(.right):not(.wrong) { border-color: #5fc96f; }
    .mp-item.selected { border-color: #c9a227; background: rgba(201, 162, 39, 0.1); }
    .mp-item.right { border-color: #3f9b4f; background: rgba(63, 155, 79, 0.12); color: #8ed49a; }
    .mp-item.wrong { border-color: #a11f1f; background: rgba(161, 31, 31, 0.12); color: #e08a80; }
    .mp-connector {
      min-width: 20px;
      text-align: center;
      color: #5fc96f;
      font-size: 16px;
    }
    .mp-connector.connected { color: #e8c96a; }
    .mp-text { flex: 1; }
    .mp-status { margin-top: 14px; color: #a89f8c; font-size: 14px; }
    .actions { margin-top: 16px; }
  `]
})
export class MatchPairsComponent extends ExerciseBase {
  leftItems: string[] = [];
  rightItems: string[] = [];
  /** matches[leftIndex] = rightIndex (или null) */
  matches: (number | null)[] = [];

  selectedLeft: number | null = null;
  selectedRight: number | null = null;

  ngOnInit(): void {
    this.leftItems = this.data.leftItems ?? [];
    this.rightItems = this.data.rightItems ?? [];
    this.matches = this.leftItems.map(() => null);
  }

  correctFor(left: number): number {
    return this.data.correctPairs?.[left] ?? -1;
  }

  matchedCount(): number {
    return this.matches.filter(m => m !== null).length;
  }

  pickLeft(i: number): void {
    if (this.locked) return;
    // Если уже соединён — разъединяем
    if (this.matches[i] !== null) {
      this.matches[i] = null;
      return;
    }
    if (this.selectedLeft === i) {
      this.selectedLeft = null;
    } else {
      this.selectedLeft = i;
      if (this.selectedRight !== null) {
        this.connect(i, this.selectedRight);
        this.selectedLeft = null;
        this.selectedRight = null;
      }
    }
  }

  pickRight(i: number): void {
    if (this.locked) return;
    // Если уже соединён — разъединяем
    const existingLeft = this.matches.indexOf(i);
    if (existingLeft !== -1) {
      this.matches[existingLeft] = null;
      return;
    }
    if (this.selectedRight === i) {
      this.selectedRight = null;
    } else {
      this.selectedRight = i;
      if (this.selectedLeft !== null) {
        this.connect(this.selectedLeft, i);
        this.selectedLeft = null;
        this.selectedRight = null;
      }
    }
  }

  connect(left: number, right: number): void {
    // Снять существующее соединение с правого
    const existingLeft = this.matches.indexOf(right);
    if (existingLeft !== -1) this.matches[existingLeft] = null;
    // Если левый уже соединён — снять
    this.matches[left] = right;
  }

  rightUsed(right: number): boolean {
    return this.matches.includes(right);
  }

  /** Правильный левый индекс для данного правого */
  correctLeftFor(right: number): number {
    return this.data.correctPairs?.indexOf(right) ?? -1;
  }

  /** Соединён ли правый элемент с правильным левым */
  isRightCorrect(right: number): boolean {
    const connectedLeft = this.matches.indexOf(right);
    return connectedLeft !== -1 && connectedLeft === this.correctLeftFor(right);
  }

  check(): void {
    if (this.matchedCount() !== this.leftItems.length) return;
    let correctCount = 0;
    for (let i = 0; i < this.leftItems.length; i++) {
      if (this.matches[i] === this.correctFor(i)) correctCount++;
    }
    const score = correctCount / this.leftItems.length;
    const status = correctCount === this.leftItems.length ? 'correct' : (correctCount > 0 ? 'partial' : 'incorrect');
    this.complete(status, score);
  }
}