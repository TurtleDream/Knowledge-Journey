import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JourneyStateService } from '../../services/journey-state.service';
import { EvaluationService } from '../../services/evaluation.service';
import { HeroPanelComponent } from '../../components/hero-panel/hero-panel.component';
import { TimerComponent } from '../../components/timer/timer.component';
import {
  Activity,
  ActivityResult,
  ActivityType,
  Checkpoint,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_ICONS,
} from '../../models/journey.models';

@Component({
  selector: 'app-journey-checkpoint',
  standalone: true,
  imports: [CommonModule, FormsModule, HeroPanelComponent, TimerComponent],
  template: `
    <div class="checkpoint-page" *ngIf="checkpoint as cp">
      <app-hero-panel></app-hero-panel>

      <div class="checkpoint-header">
        <div class="checkpoint-meta">
          <span class="cp-number">Чекпоинт {{ cp.order }}</span>
          <span class="cp-difficulty">{{ difficultyLabel(cp.difficulty) }}</span>
        </div>
        <h1 class="cp-title">{{ cp.title }}</h1>
        <p class="cp-goal">{{ cp.goal }}</p>
        <div class="cp-narrative">
          <span class="narrative-icon">📜</span>
          <p>{{ cp.narrativeIntro }}</p>
        </div>
      </div>

      <div class="checkpoint-timer">
        <app-timer></app-timer>
      </div>

      <!-- Активности -->
      <div class="activities">
        <div
          *ngFor="let activity of cp.activities; let i = index"
          class="activity-card"
          [class.completed]="isActivityCompleted(activity.id)"
          [class.current]="currentActivityIndex === i"
        >
          <div class="activity-header">
            <span class="activity-type-icon" [title]="activityTypeLabel(activity.type)">
              {{ activityTypeIcon(activity.type) }}
            </span>
            <span class="activity-type-label">{{ activityTypeLabel(activity.type) }}</span>
            <span class="activity-title">{{ activity.title }}</span>
            <span class="activity-status" *ngIf="isActivityCompleted(activity.id)">
              {{ getActivityResult(activity.id)?.status === 'completed' ? '✔' : '✘' }}
            </span>
          </div>

          <div class="activity-body" *ngIf="currentActivityIndex === i && !isActivityCompleted(activity.id)">
            <p class="activity-question">{{ activity.question }}</p>

            <!-- MC -->
            <div class="mc-options" *ngIf="activity.type === 'MC'">
              <button
                *ngFor="let opt of activity.options; let oi = index"
                class="mc-option"
                [class.selected]="mcSelected.has(oi)"
                (click)="toggleMcOption(oi)"
              >
                <span class="mc-mark">{{ mcSelected.has(oi) ? '●' : '○' }}</span>
                <span>{{ opt }}</span>
              </button>
            </div>

            <!-- FB -->
            <div class="fb-input" *ngIf="activity.type === 'FB'">
              <input
                type="text"
                [(ngModel)]="fbAnswer"
                class="text-input"
                placeholder="Введите ответ..."
                (keyup.enter)="submitActivity(activity)"
              />
            </div>

            <!-- FR / ELI5 / TB / GYE -->
            <div class="fr-input" *ngIf="['FR','ELI5','TB','GYE'].includes(activity.type)">
              <textarea
                [(ngModel)]="frAnswer"
                rows="5"
                class="text-area"
                placeholder="Введите ваш ответ..."
              ></textarea>
            </div>

            <!-- BC -->
            <div class="bc-hint" *ngIf="activity.type === 'BC'">
              <p>⚔ Это битва! ИИ будет задавать вопросы и искать слабые места в твоих ответах.</p>
              <button class="btn btn-primary" (click)="startBattle(activity)">⚔ Вступить в битву</button>
            </div>

            <!-- Подсказка -->
            <div class="hint-box" *ngIf="activity.hint && hintShown">
              <span class="hint-icon">💡</span>
              <span>{{ activity.hint }}</span>
            </div>

            <!-- Действия -->
            <div class="activity-actions">
              <button
                class="btn btn-primary"
                [disabled]="!canSubmit(activity)"
                (click)="submitActivity(activity)"
              >
                Проверить
              </button>
              <button
                class="btn btn-ghost"
                [disabled]="!canUseHint"
                (click)="showHint()"
              >
                💡 Подсказка ({{ state()?.hintsRemaining }})
              </button>
              <button
                class="btn btn-ghost"
                [disabled]="!canUseSkip"
                (click)="skipActivity(activity)"
              >
                ⏭ Пропустить ({{ state()?.skipsRemaining }})
              </button>
            </div>

            <!-- Результат -->
            <div class="activity-result" *ngIf="activityResult as ar">
              <div class="result-score" [class.good]="ar.score / ar.maxScore >= 0.7" [class.bad]="ar.score / ar.maxScore < 0.4">
                {{ ar.score }} / {{ ar.maxScore }}
              </div>
              <div class="result-feedback">{{ ar.feedback }}</div>
              <div class="result-xp">+{{ ar.xpEarned }} XP</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Завершение чекпоинта -->
      <div class="checkpoint-actions" *ngIf="allActivitiesCompleted">
        <button class="btn btn-primary" (click)="finishCheckpoint()">
          {{ isLastCheckpoint ? '🏆 Завершить путешествие' : '➡ Далее' }}
        </button>
      </div>
    </div>

    <div class="no-checkpoint" *ngIf="!checkpoint">
      <h2>Нет активного чекпоинта</h2>
      <button class="btn btn-primary" (click)="goToMap()">🗺 К карте</button>
    </div>
  `,
  styles: [`
    .checkpoint-page { max-width: 800px; margin: 0 auto; }
    .checkpoint-header {
      background: linear-gradient(180deg, #1d1a17, #141210);
      border: 2px solid #8a6d1f;
      border-radius: 8px;
      padding: 24px;
      margin: 20px 0;
    }
    .checkpoint-meta {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }
    .cp-number {
      font-family: 'Cinzel', serif;
      font-size: 13px;
      color: #e8c96a;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .cp-difficulty {
      padding: 2px 10px;
      background: rgba(232,201,106,0.1);
      border: 1px solid #8a6d1f;
      border-radius: 12px;
      font-size: 12px;
      color: #e8c96a;
    }
    .cp-title {
      font-size: 26px;
      color: #e8c96a;
      margin: 0 0 8px;
    }
    .cp-goal { color: #a89f8c; margin: 0 0 16px; }
    .cp-narrative {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(201,162,39,0.05);
      border-left: 3px solid #8a6d1f;
      border-radius: 4px;
    }
    .narrative-icon { font-size: 20px; }
    .cp-narrative p { margin: 0; color: #e8e0d0; font-size: 14px; line-height: 1.7; }
    .checkpoint-timer { display: flex; justify-content: center; margin-bottom: 20px; }
    .activities { display: flex; flex-direction: column; gap: 16px; }
    .activity-card {
      background: linear-gradient(180deg, #1d1a17, #141210);
      border: 1px solid #3a322a;
      border-radius: 8px;
      padding: 20px;
      transition: all 0.3s;
    }
    .activity-card.current {
      border-color: #8a6d1f;
      box-shadow: 0 0 12px rgba(138,109,31,0.2);
    }
    .activity-card.completed {
      opacity: 0.7;
      border-left: 4px solid #3f9b4f;
    }
    .activity-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .activity-type-icon { font-size: 20px; }
    .activity-type-label {
      font-family: 'Cinzel', serif;
      font-size: 12px;
      color: #a89f8c;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .activity-title {
      flex: 1;
      font-family: 'Cinzel', serif;
      font-size: 15px;
      color: #e8c96a;
    }
    .activity-status { font-size: 18px; }
    .activity-question {
      color: #e8e0d0;
      font-size: 15px;
      line-height: 1.7;
      margin: 0 0 16px;
    }
    .mc-options { display: flex; flex-direction: column; gap: 8px; }
    .mc-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #e8e0d0;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
    }
    .mc-option:hover { border-color: #8a6d1f; }
    .mc-option.selected {
      border-color: #e8c96a;
      background: rgba(232,201,106,0.1);
    }
    .mc-mark { font-size: 16px; min-width: 18px; }
    .text-input, .text-area {
      width: 100%;
      padding: 12px 14px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #e8e0d0;
      font-size: 15px;
      font-family: 'Open Sans', sans-serif;
    }
    .text-input:focus, .text-area:focus {
      outline: none;
      border-color: #e8c96a;
      box-shadow: 0 0 8px rgba(232,201,106,0.2);
    }
    .text-area { resize: vertical; min-height: 100px; }
    .bc-hint {
      padding: 12px 16px;
      background: rgba(161,31,31,0.1);
      border: 1px solid #a11f1f;
      border-radius: 4px;
      color: #e08a80;
    }
    .bc-hint p { margin: 0 0 12px; }
    .hint-box {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      padding: 10px 14px;
      background: rgba(232,201,106,0.1);
      border: 1px solid #8a6d1f;
      border-radius: 4px;
      color: #e8c96a;
      font-size: 14px;
    }
    .activity-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .activity-result {
      margin-top: 16px;
      padding: 12px 16px;
      background: rgba(63,155,79,0.1);
      border: 1px solid #3f9b4f;
      border-radius: 4px;
    }
    .result-score {
      font-family: 'Cinzel', serif;
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .result-score.good { color: #5fc96f; }
    .result-score.bad { color: #e08a80; }
    .result-feedback { color: #e8e0d0; font-size: 14px; line-height: 1.6; }
    .result-xp {
      margin-top: 8px;
      color: #e8c96a;
      font-family: 'Cinzel', serif;
      font-size: 14px;
    }
    .checkpoint-actions {
      display: flex;
      justify-content: center;
      margin-top: 24px;
    }
    .no-checkpoint { text-align: center; padding: 60px 20px; }
    .no-checkpoint h2 { color: #e8c96a; margin-bottom: 24px; }
  `]
})
export class JourneyCheckpointComponent implements OnInit, OnDestroy {
  checkpoint: Checkpoint | null = null;
  currentActivityIndex = 0;
  mcSelected = new Set<number>();
  fbAnswer = '';
  frAnswer = '';
  hintShown = false;
  activityResult: ActivityResult | null = null;
  private activityResults: ActivityResult[] = [];
  private attempts = 0;
  private activityStartTime = 0;
  private timerInterval: number | null = null;

  journey = this.stateService.journey;
  state = this.stateService.state;

  constructor(
    private stateService: JourneyStateService,
    private evaluationService: EvaluationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkpoint = this.stateService.currentCheckpoint();
    this.activityStartTime = Date.now();

    // Таймер автозавершения
    this.timerInterval = window.setInterval(() => {
      if (this.stateService.remainingTime() <= 0 && !this.allActivitiesCompleted) {
        this.autoCompleteCheckpoint();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
    }
  }

  get allActivitiesCompleted(): boolean {
    return this.checkpoint?.activities.every((a) => this.isActivityCompleted(a.id)) ?? false;
  }

  get isLastCheckpoint(): boolean {
    const j = this.journey();
    const s = this.state();
    return !!j && !!s && s.currentCheckpointIndex >= j.checkpoints.length - 1;
  }

  get canUseHint(): boolean {
    return (this.state()?.hintsRemaining ?? 0) > 0 && !this.hintShown;
  }

  get canUseSkip(): boolean {
    return (this.state()?.skipsRemaining ?? 0) > 0;
  }

  isActivityCompleted(activityId: string): boolean {
    return this.activityResults.some((r) => r.activityId === activityId);
  }

  getActivityResult(activityId: string): ActivityResult | null {
    return this.activityResults.find((r) => r.activityId === activityId) ?? null;
  }

  activityTypeLabel(type: ActivityType): string {
    return ACTIVITY_TYPE_LABELS[type];
  }

  activityTypeIcon(type: ActivityType): string {
    return ACTIVITY_TYPE_ICONS[type];
  }

  difficultyLabel(diff: string): string {
    switch (diff) {
      case 'easy': return 'Лёгкий';
      case 'medium': return 'Средний';
      case 'hard': return 'Сложный';
      default: return diff;
    }
  }

  toggleMcOption(index: number): void {
    if (this.mcSelected.has(index)) {
      this.mcSelected.delete(index);
    } else {
      this.mcSelected.clear();
      this.mcSelected.add(index);
    }
  }

  canSubmit(activity: Activity): boolean {
    switch (activity.type) {
      case 'MC': return this.mcSelected.size > 0;
      case 'FB': return this.fbAnswer.trim().length > 0;
      case 'FR':
      case 'ELI5':
      case 'TB':
      case 'GYE': return this.frAnswer.trim().length > 0;
      case 'BC': return false; // BC запускается отдельно
      default: return false;
    }
  }

  showHint(): void {
    if (this.stateService.useHint()) {
      this.hintShown = true;
    }
  }

  async submitActivity(activity: Activity): Promise<void> {
    if (this.attempts >= 10) return;
    this.attempts++;

    const timeSpent = Math.floor((Date.now() - this.activityStartTime) / 1000);
    let score = 0;
    let maxScore = activity.maxScore;
    let feedback = '';
    let strengths: string[] = [];
    let gaps: string[] = [];
    let misconceptions: string[] = [];
    let correctAnswer = '';

    switch (activity.type) {
      case 'MC': {
        const correct = activity.correctIndexes ?? [];
        const selected = Array.from(this.mcSelected);
        const isCorrect = selected.length === correct.length && selected.every((s) => correct.includes(s));
        score = isCorrect ? maxScore : 0;
        feedback = isCorrect ? 'Верно!' : 'Неверно. Попробуй ещё раз.';
        correctAnswer = (activity.options ?? []).filter((_, i) => correct.includes(i)).join(', ');
        break;
      }
      case 'FB': {
        const accepted = (activity.acceptedAnswers ?? []).map((a) => a.toLowerCase());
        const answer = this.fbAnswer.trim().toLowerCase();
        const isCorrect = accepted.includes(answer);
        score = isCorrect ? maxScore : 0;
        feedback = isCorrect ? 'Верно!' : 'Неверно. Попробуй ещё раз.';
        correctAnswer = activity.acceptedAnswers?.[0] ?? '';
        break;
      }
      case 'FR':
      case 'ELI5':
      case 'TB':
      case 'GYE': {
        try {
          const evalResult = await this.evaluationService.evaluateFreeResponse(
            activity,
            this.frAnswer,
            this.journey()?.topic ?? ''
          );
          score = evalResult.score;
          maxScore = evalResult.maxScore;
          feedback = evalResult.feedback;
          strengths = evalResult.strengths;
          gaps = evalResult.gaps;
          misconceptions = evalResult.misconceptions;
        } catch (err) {
          feedback = 'Не удалось оценить ответ. Попробуй ещё раз.';
        }
        break;
      }
    }

    const result = this.stateService.completeActivity(activity, this.checkpoint!, {
      userAnswer: this.getUserAnswer(activity),
      correctAnswer,
      score,
      maxScore,
      feedback,
      strengths,
      gaps,
      misconceptions,
      timeSpentSec: timeSpent,
      attempts: this.attempts,
      hintsUsed: this.hintShown ? 1 : 0,
      skipped: false,
    });

    this.activityResults.push(result);
    this.activityResult = result;
    this.hintShown = false;
    this.mcSelected.clear();
    this.fbAnswer = '';
    this.frAnswer = '';

    // Переход к следующей активности
    if (this.currentActivityIndex < this.checkpoint!.activities.length - 1) {
      this.currentActivityIndex++;
      this.activityStartTime = Date.now();
    }
  }

  skipActivity(activity: Activity): void {
    if (!this.stateService.useSkip()) return;

    const result = this.stateService.completeActivity(activity, this.checkpoint!, {
      userAnswer: 'Пропущено',
      score: 0,
      maxScore: activity.maxScore,
      feedback: 'Активность пропущена.',
      strengths: [],
      gaps: [],
      misconceptions: [],
      timeSpentSec: 0,
      attempts: 1,
      hintsUsed: 0,
      skipped: true,
    });

    this.activityResults.push(result);

    if (this.currentActivityIndex < this.checkpoint!.activities.length - 1) {
      this.currentActivityIndex++;
      this.activityStartTime = Date.now();
    }
  }

  startBattle(activity: Activity): void {
    this.router.navigate(['/journey/battle'], {
      queryParams: { activityId: activity.id },
    });
  }

  finishCheckpoint(): void {
    if (!this.checkpoint) return;
    this.stateService.completeCheckpoint(this.checkpoint, this.activityResults);

    if (this.isLastCheckpoint) {
      this.router.navigate(['/journey/report']);
    } else {
      this.router.navigate(['/journey/map']);
    }
  }

  autoCompleteCheckpoint(): void {
    // Автозавершение: помечаем невыполненные активности
    if (!this.checkpoint) return;

    for (const activity of this.checkpoint.activities) {
      if (!this.isActivityCompleted(activity.id)) {
        const result = this.stateService.completeActivity(activity, this.checkpoint, {
          userAnswer: 'Время истекло',
          score: 0,
          maxScore: activity.maxScore,
          feedback: 'Время вышло. Активность не выполнена.',
          strengths: [],
          gaps: [],
          misconceptions: [],
          timeSpentSec: this.checkpoint.timeLimitSec,
          attempts: 1,
          hintsUsed: 0,
          skipped: false,
        });
        this.activityResults.push(result);
      }
    }

    this.finishCheckpoint();
  }

  private getUserAnswer(activity: Activity): string {
    switch (activity.type) {
      case 'MC': {
        const selected = Array.from(this.mcSelected);
        return selected.map((i) => activity.options?.[i] ?? '').join(', ');
      }
      case 'FB': return this.fbAnswer;
      case 'FR':
      case 'ELI5':
      case 'TB':
      case 'GYE': return this.frAnswer;
      default: return '';
    }
  }

  goToMap(): void {
    this.router.navigate(['/journey/map']);
  }
}