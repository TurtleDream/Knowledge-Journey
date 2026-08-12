import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TestService, TestResultRecord } from '../../services/test.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="results-page">
      <h1 class="results-title">📜 История результатов</h1>

      <div class="results-actions">
        <a routerLink="/test" class="btn btn-primary">Пройти тест заново</a>
        <a routerLink="/" class="btn btn-ghost">К статьям</a>
      </div>

      <div class="results-list" *ngIf="history.length > 0; else empty">
        <div *ngFor="let record of history" class="result-card panel">
          <div class="result-percent" [class.good]="record.percent >= 70" [class.mid]="record.percent >= 40 && record.percent < 70" [class.bad]="record.percent < 40">
            {{ record.percent }}%
          </div>
          <div class="result-details">
            <div class="result-date">{{ record.date }}</div>
            <div class="result-stats">
              <span>Правильных: {{ record.correct }} из {{ record.total }}</span>
              <span>Баллы: {{ record.score }}</span>
            </div>
          </div>
        </div>
      </div>

      <ng-template #empty>
        <div class="results-empty panel">
          <p>Пока нет результатов. Пройдите тест, чтобы увидеть свою историю.</p>
          <a routerLink="/test" class="btn btn-primary">Начать тест</a>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .results-page { max-width: 800px; margin: 0 auto; }
    .results-title { text-align: center; margin-bottom: 24px; }
    .results-actions { display: flex; gap: 12px; justify-content: center; margin-bottom: 24px; flex-wrap: wrap; }
    .results-list { display: flex; flex-direction: column; gap: 12px; }
    .result-card {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 16px 20px;
    }
    .result-percent {
      font-size: 36px;
      font-family: 'Cinzel', serif;
      font-weight: 700;
      min-width: 90px;
      text-align: center;
    }
    .result-percent.good { color: #5fc96f; }
    .result-percent.mid { color: #e8c96a; }
    .result-percent.bad { color: #e08a80; }
    .result-details { flex: 1; }
    .result-date { color: #a89f8c; font-size: 14px; margin-bottom: 4px; }
    .result-stats { display: flex; gap: 16px; color: #e8e0d0; font-size: 14px; }
    .results-empty { text-align: center; padding: 40px 20px; }
    .results-empty p { color: #a89f8c; margin-bottom: 16px; }
  `]
})
export class ResultsComponent implements OnInit {
  history: TestResultRecord[] = [];

  constructor(private testService: TestService) {}

  ngOnInit(): void {
    this.history = this.testService.getHistory();
  }
}