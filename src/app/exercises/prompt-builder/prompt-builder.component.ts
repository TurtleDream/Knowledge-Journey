import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExerciseBase } from '../../core/exercise-base';
import { ExerciseFeedbackComponent } from '../../shared/exercise-feedback/exercise-feedback.component';
import { PromptBlock } from '../../core/exercise-types';

@Component({
  selector: 'app-prompt-builder',
  standalone: true,
  imports: [CommonModule, ExerciseFeedbackComponent],
  template: `
    <div class="exercise-panel pb-panel">
      <div class="exercise-header">
        <span class="type-badge">🧱</span>
        <h4 class="exercise-title">{{ data.question }}</h4>
      </div>

      <p class="pb-hint" *ngIf="!locked">Кликните по блокам, чтобы добавить их в промпт. Кликните по блоку в промпте, чтобы убрать его.</p>

      <div class="pb-available">
        <div class="pb-label">Доступные блоки:</div>
        <div class="pb-blocks">
          <button
            *ngFor="let block of availableBlocks"
            class="pb-block"
            [class.used]="isUsed(block.id)"
            [disabled]="locked || isUsed(block.id)"
            (click)="addBlock(block)"
          >
            <span class="pb-icon">{{ block.icon }}</span>
            <span class="pb-name">{{ block.label }}</span>
          </button>
        </div>
      </div>

      <div class="pb-built">
        <div class="pb-label">Ваш промпт:</div>
        <div class="pb-built-list" *ngIf="built.length > 0; else empty">
          <div
            *ngFor="let block of built; let i = index"
            class="pb-built-item"
            [class.right]="locked && isCorrectPosition(i)"
            [class.wrong]="locked && !isCorrectPosition(i)"
            (click)="removeBlock(i)"
          >
            <span class="pb-pos">{{ i + 1 }}</span>
            <span class="pb-icon">{{ block.icon }}</span>
            <span class="pb-name">{{ block.label }}</span>
          </div>
        </div>
        <ng-template #empty>
          <div class="pb-empty">Промпт пуст. Добавьте блоки слева.</div>
        </ng-template>
      </div>

      <div class="actions" *ngIf="!locked">
        <button class="btn btn-primary" (click)="check()" [disabled]="built.length === 0">Проверить</button>
        <button class="btn btn-ghost" (click)="clearAll()" *ngIf="built.length > 0">Очистить</button>
      </div>

      <div class="pb-reference" *ngIf="locked">
        <div class="pb-label">Правильная структура:</div>
        <div class="pb-ref-list">
          <span *ngFor="let id of data.correctBlockOrder" class="pb-ref-item">
            {{ blockLabel(id) }}
          </span>
        </div>
        <p class="pb-ref-expl" *ngIf="data.explanation">{{ data.explanation }}</p>
      </div>

      <app-exercise-feedback [status]="status" [explanation]="''"></app-exercise-feedback>
    </div>
  `,
  styles: [`
    .exercise-panel {
      background: linear-gradient(180deg, #1d1a17, #141210);
      border: 1px solid #3a322a;
      border-left: 4px solid #8a6d1f;
      border-radius: 4px;
      padding: 20px;
      margin: 20px 0;
    }
    .exercise-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
    .type-badge { font-size: 22px; line-height: 1; color: #8a6d1f; }
    .exercise-title { margin: 0; font-size: 16px; color: #e8e0d0; font-family: 'Open Sans', sans-serif; letter-spacing: 0; }
    .pb-hint { color: #a89f8c; font-size: 13px; margin: 0 0 12px; }
    .pb-label { color: #a89f8c; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .pb-blocks { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .pb-block {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #e8e0d0;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
      font-family: 'Open Sans', sans-serif;
    }
    .pb-block:hover:not(:disabled) { border-color: #c9a227; }
    .pb-block.used { opacity: 0.4; cursor: not-allowed; }
    .pb-icon { font-size: 16px; }
    .pb-built-list { display: flex; flex-direction: column; gap: 6px; }
    .pb-built-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .pb-built-item:hover:not(.right):not(.wrong) { border-color: #d97a2b; }
    .pb-built-item.right { border-color: #3f9b4f; background: rgba(63, 155, 79, 0.1); }
    .pb-built-item.wrong { border-color: #a11f1f; background: rgba(161, 31, 31, 0.1); }
    .pb-pos {
      min-width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #26211c;
      border: 1px solid #5a4d3d;
      border-radius: 3px;
      color: #e8c96a;
      font-weight: 700;
      font-size: 12px;
      font-family: 'Cinzel', serif;
    }
    .pb-empty { color: #6f6757; font-style: italic; padding: 12px; border: 1px dashed #3a322a; border-radius: 4px; }
    .actions { margin-top: 16px; display: flex; gap: 10px; }
    .pb-reference { margin-top: 16px; }
    .pb-ref-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .pb-ref-item {
      padding: 6px 12px;
      background: rgba(63, 155, 79, 0.1);
      border: 1px solid #3f9b4f;
      border-radius: 4px;
      color: #8ed49a;
      font-size: 13px;
    }
    .pb-ref-expl { color: #a89f8c; font-size: 14px; }
  `]
})
export class PromptBuilderComponent extends ExerciseBase {
  availableBlocks: PromptBlock[] = [];
  built: PromptBlock[] = [];

  ngOnInit(): void {
    this.availableBlocks = this.data.availableBlocks ?? [];
    this.built = [];
  }

  isUsed(id: string): boolean {
    return this.built.some(b => b.id === id);
  }

  addBlock(block: PromptBlock): void {
    if (this.locked || this.isUsed(block.id)) return;
    this.built.push(block);
  }

  removeBlock(i: number): void {
    if (this.locked) return;
    this.built.splice(i, 1);
  }

  clearAll(): void {
    this.built = [];
  }

  isCorrectPosition(i: number): boolean {
    const correct = this.data.correctBlockOrder ?? [];
    return this.built[i]?.id === correct[i];
  }

  blockLabel(id: string): string {
    return this.availableBlocks.find(b => b.id === id)?.label ?? id;
  }

  check(): void {
    if (this.built.length === 0) return;
    const correct = this.data.correctBlockOrder ?? [];
    let correctCount = 0;
    for (let i = 0; i < this.built.length; i++) {
      if (this.built[i].id === correct[i]) correctCount++;
    }
    const score = correctCount / correct.length;
    const status = correctCount === correct.length ? 'correct' : (correctCount > 0 ? 'partial' : 'incorrect');
    this.complete(status, score);
  }
}