import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExerciseBase } from '../../core/exercise-base';
import { ExerciseFeedbackComponent } from '../../shared/exercise-feedback/exercise-feedback.component';

interface WordSpan {
  text: string;
  start: number;
  end: number;
}

@Component({
  selector: 'app-spot-the-hallucination',
  standalone: true,
  imports: [CommonModule, ExerciseFeedbackComponent],
  template: `
    <div class="exercise-panel sth-panel">
      <div class="exercise-header">
        <span class="type-badge">☠</span>
        <h4 class="exercise-title">{{ data.question }}</h4>
      </div>

      <p class="sth-hint" *ngIf="!locked">Кликните по словам, которые, по вашему мнению, являются галлюцинацией. Выделите весь фрагмент.</p>

      <div class="sth-text">
        <span
          *ngFor="let word of words; let i = index"
          class="sth-word"
          [class.selected]="isSelected(i)"
          [class.hallucination]="locked && isInHallucination(i)"
          [class.missed]="locked && !isInHallucination(i) && isSelected(i)"
          (click)="toggleWord(i)"
        >{{ word.text }}</span>
      </div>

      <div class="actions" *ngIf="!locked && selectedWords.size > 0">
        <button class="btn btn-primary" (click)="check()">Проверить</button>
        <button class="btn btn-ghost" (click)="clearSelection()">Сбросить</button>
      </div>

      <div class="sth-reason" *ngIf="locked">
        <div class="sth-label">Почему это галлюцинация:</div>
        <p>{{ data.hallucinationReason }}</p>
      </div>

      <app-exercise-feedback [status]="status" [explanation]="data.explanation || ''"></app-exercise-feedback>
    </div>
  `,
  styles: [`
    .exercise-panel {
      background: linear-gradient(180deg, #1d1a17, #141210);
      border: 1px solid #3a322a;
      border-left: 4px solid #a11f1f;
      border-radius: 4px;
      padding: 20px;
      margin: 20px 0;
    }
    .exercise-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
    .type-badge { font-size: 22px; line-height: 1; color: #a11f1f; }
    .exercise-title { margin: 0; font-size: 16px; color: #e8e0d0; font-family: 'Open Sans', sans-serif; letter-spacing: 0; }
    .sth-hint { color: #a89f8c; font-size: 13px; margin: 0 0 12px; }
    .sth-text {
      padding: 16px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      font-size: 15px;
      line-height: 2;
      color: #e8e0d0;
    }
    .sth-word {
      cursor: pointer;
      padding: 2px 3px;
      border-radius: 2px;
      transition: all 0.12s;
      user-select: none;
    }
    .sth-word:hover { background: rgba(201, 162, 39, 0.15); }
    .sth-word.selected { background: rgba(217, 122, 43, 0.35); color: #fff; }
    .sth-word.hallucination { background: rgba(161, 31, 31, 0.5); color: #ffb0a0; font-weight: 700; }
    .sth-word.missed { background: rgba(217, 122, 43, 0.3); text-decoration: line-through; }
    .actions { margin-top: 16px; display: flex; gap: 10px; }
    .sth-reason { margin-top: 16px; }
    .sth-label { color: #a89f8c; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .sth-reason p { margin: 0; color: #e08a80; font-size: 14px; }
  `]
})
export class SpotTheHallucinationComponent extends ExerciseBase {
  words: WordSpan[] = [];
  selectedWords = new Set<number>();

  ngOnInit(): void {
    const text = this.data.hallucinationText ?? '';
    // Разбиваем на слова, сохраняя пробелы
    const regex = /(\S+\s*)/g;
    let match: RegExpExecArray | null;
    let pos = 0;
    this.words = [];
    while ((match = regex.exec(text)) !== null) {
      const word = match[0];
      this.words.push({ text: word, start: pos, end: pos + word.length });
      pos += word.length;
    }
  }

  isInHallucination(i: number): boolean {
    const [start, end] = this.data.hallucinationRange ?? [0, 0];
    const w = this.words[i];
    if (!w) return false;
    // Слово считается галлюцинацией, если его начало внутри диапазона
    return w.start >= start && w.start < end;
  }

  isSelected(i: number): boolean {
    return this.selectedWords.has(i);
  }

  toggleWord(i: number): void {
    if (this.locked) return;
    if (this.selectedWords.has(i)) {
      this.selectedWords.delete(i);
    } else {
      this.selectedWords.add(i);
    }
  }

  clearSelection(): void {
    this.selectedWords.clear();
  }

  check(): void {
    if (this.selectedWords.size === 0) return;
    const [start, end] = this.data.hallucinationRange ?? [0, 0];

    // Определяем диапазон выбранных слов
    let selStart = Infinity;
    let selEnd = -Infinity;
    this.selectedWords.forEach(i => {
      const w = this.words[i];
      if (w) {
        selStart = Math.min(selStart, w.start);
        selEnd = Math.max(selEnd, w.end);
      }
    });

    // Полное попадание: выбранный диапазон покрывает галлюцинацию
    const fullHit = selStart <= start && selEnd >= end;
    // Частичное: пересечение есть
    const overlap = selStart < end && selEnd > start;

    let score = 0;
    let status: 'correct' | 'partial' | 'incorrect' = 'incorrect';
    if (fullHit) {
      score = 1;
      status = 'correct';
    } else if (overlap) {
      score = 0.5;
      status = 'partial';
    }
    this.complete(status, score);
  }
}