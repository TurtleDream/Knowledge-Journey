import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TestService, TestResultRecord } from '../../services/test.service';
import { TEST_QUESTIONS } from '../../content/test-questions.data';
import { ExerciseHostComponent } from '../../exercises/exercise-host/exercise-host.component';
import { ExerciseResult } from '../../core/exercise-types';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [CommonModule, RouterLink, ExerciseHostComponent],
  template: `
    <div class="test-page">
      <h1 class="test-title">⚔ Финальный тест</h1>

      <!-- Прогресс -->
      <div class="test-progress" *ngIf="!finished">
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="progressPercent"></div>
        </div>
        <div class="progress-info">
          <span>Вопрос {{ currentIndex + 1 }} из {{ totalQuestions }}</span>
          <span>Баллы: {{ currentScore.toFixed(1) }}</span>
        </div>
      </div>

      <!-- Текущий вопрос -->
      <div class="test-question" *ngIf="!finished && currentQuestion">
        <app-exercise-host
          [data]="currentQuestion"
          [showLabel]="true"
          (result)="onResult($event)"
        ></app-exercise-host>
      </div>

      <!-- Завершение -->
      <div class="test-finished" *ngIf="finished">
        <div class="finish-panel panel">
          <h2>Тест завершён!</h2>
          <div class="finish-score">
            <div class="score-big">{{ finalPercent }}%</div>
            <div class="score-detail">
              <span>Правильных: {{ finalRecord?.correct }} из {{ finalRecord?.total }}</span>
              <span>Баллы: {{ finalRecord?.score }}</span>
            </div>
          </div>
          <div class="finish-actions">
            <a routerLink="/results" class="btn btn-primary">История результатов</a>
            <a routerLink="/" class="btn btn-ghost">К статьям</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .test-page { max-width: 800px; margin: 0 auto; }
    .test-title { text-align: center; margin-bottom: 24px; }
    .test-progress { margin-bottom: 24px; }
    .progress-bar {
      height: 12px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 6px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #a11f1f, #d97a2b);
      transition: width 0.3s ease;
    }
    .progress-info {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      color: #a89f8c;
      font-size: 14px;
    }
    .test-question { margin-bottom: 24px; }
    .finish-panel { text-align: center; padding: 40px 20px; }
    .finish-panel h2 { margin: 0 0 24px; }
    .finish-score { margin-bottom: 24px; }
    .score-big {
      font-size: 64px;
      font-family: 'Cinzel', serif;
      color: #e8c96a;
      text-shadow: 0 0 20px rgba(201,162,39,0.4);
    }
    .score-detail {
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: #a89f8c;
      font-size: 15px;
    }
    .finish-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  `]
})
export class TestComponent implements OnInit {
  totalQuestions = TEST_QUESTIONS.length;
  currentIndex = 0;
  currentScore = 0;
  finished = false;
  finalRecord: TestResultRecord | null = null;

  constructor(private testService: TestService) {}

  ngOnInit(): void {
    this.testService.setQuestions(TEST_QUESTIONS);
    const progress = this.testService.currentProgress;
    if (progress) {
      this.currentIndex = progress.currentIndex;
      this.currentScore = progress.totalScore;
    }
  }

  get currentQuestion() {
    return this.testService.currentQuestion;
  }

  get progressPercent(): number {
    return ((this.currentIndex) / this.totalQuestions) * 100;
  }

  onResult(result: ExerciseResult): void {
    this.testService.submitAnswer(result);
    const progress = this.testService.currentProgress;
    if (progress) {
      this.currentIndex = progress.currentIndex;
      this.currentScore = progress.totalScore;
    }

    if (this.testService.isFinished) {
      this.finalRecord = this.testService.finishTest();
      this.finished = true;
    }
  }

  get finalPercent(): number {
    return this.finalRecord?.percent ?? 0;
  }
}