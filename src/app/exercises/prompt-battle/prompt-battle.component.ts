import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExerciseBase } from '../../core/exercise-base';
import { ExerciseFeedbackComponent } from '../../shared/exercise-feedback/exercise-feedback.component';

@Component({
  selector: 'app-prompt-battle',
  standalone: true,
  imports: [CommonModule, ExerciseFeedbackComponent],
  template: `
    <div class="exercise-panel pbattle-panel">
      <div class="exercise-header">
        <span class="type-badge">⚔</span>
        <h4 class="exercise-title">{{ data.question }}</h4>
      </div>

      <p class="pbattle-hint" *ngIf="!locked">Выберите лучший промпт из двух. Обоснуйте свой выбор.</p>

      <div class="pbattle-arena">
        <div
          *ngFor="let prompt of data.battlePrompts; let i = index"
          class="pbattle-card"
          [class.selected]="selectedId === prompt.id"
          [class.winner]="locked && prompt.id === data.battleWinnerId"
          [class.loser]="locked && selectedId === prompt.id && prompt.id !== data.battleWinnerId"
          (click)="select(prompt.id)"
        >
          <div class="pbattle-card-header">
            <span class="pbattle-tag">Промпт {{ i + 1 }}</span>
            <span class="pbattle-vs" *ngIf="i === 0">⚔</span>
          </div>
          <p class="pbattle-text">{{ prompt.text }}</p>
        </div>
      </div>

      <div class="pbattle-reason" *ngIf="locked">
        <div class="pbattle-label">Почему этот промпт лучше:</div>
        <p>{{ data.battleExplanation }}</p>
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
    .pbattle-hint { color: #a89f8c; font-size: 13px; margin: 0 0 12px; }
    .pbattle-arena { display: flex; gap: 16px; flex-wrap: wrap; }
    .pbattle-card {
      flex: 1;
      min-width: 240px;
      padding: 16px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .pbattle-card:hover:not(.winner):not(.loser) { border-color: #c9a227; transform: translateY(-2px); }
    .pbattle-card.selected { border-color: #d97a2b; background: rgba(217, 122, 43, 0.08); }
    .pbattle-card.winner { border-color: #3f9b4f; background: rgba(63, 155, 79, 0.1); box-shadow: 0 0 12px rgba(63, 155, 79, 0.3); }
    .pbattle-card.loser { border-color: #a11f1f; background: rgba(161, 31, 31, 0.1); opacity: 0.7; }
    .pbattle-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .pbattle-tag {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #a89f8c;
      font-family: 'Cinzel', serif;
    }
    .pbattle-vs { color: #d43a2f; font-size: 18px; }
    .pbattle-text { margin: 0; font-size: 14px; line-height: 1.6; color: #e8e0d0; }
    .pbattle-reason { margin-top: 16px; }
    .pbattle-label { color: #a89f8c; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .pbattle-reason p { margin: 0; color: #8ed49a; font-size: 14px; }
  `]
})
export class PromptBattleComponent extends ExerciseBase {
  selectedId: string | null = null;

  select(id: string): void {
    if (this.locked) return;
    this.selectedId = id;
    const correct = this.selectedId === this.data.battleWinnerId;
    this.complete(correct ? 'correct' : 'incorrect', correct ? 1 : 0);
  }
}