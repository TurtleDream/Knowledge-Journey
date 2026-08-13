import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { JourneyStateService } from '../../services/journey-state.service';
import { EvaluationService, BattleConversation } from '../../services/evaluation.service';
import { HeroPanelComponent } from '../../components/hero-panel/hero-panel.component';
import { Activity, ActivityResult } from '../../models/journey.models';

@Component({
  selector: 'app-journey-battle',
  standalone: true,
  imports: [CommonModule, FormsModule, HeroPanelComponent],
  template: `
    <div class="battle-page" *ngIf="activity">
      <app-hero-panel></app-hero-panel>

      <div class="battle-header">
        <h1 class="battle-title">⚔ Битва знаний</h1>
        <p class="battle-subtitle">{{ activity.title }}</p>
      </div>

      <div class="battle-arena">
        <!-- Диалог -->
        <div class="battle-dialog">
          <div *ngFor="let msg of conversation" class="battle-msg" [class.ai]="msg.role === 'ai'" [class.user]="msg.role === 'user'">
            <div class="msg-avatar">{{ msg.role === 'ai' ? '🤖' : '🛡' }}</div>
            <div class="msg-content">
              <div class="msg-role">{{ msg.role === 'ai' ? 'Мастер' : 'Ты' }}</div>
              <div class="msg-text">{{ msg.text }}</div>
            </div>
          </div>
        </div>

        <!-- Ввод ответа -->
        <div class="battle-input" *ngIf="!battleFinished">
          <textarea
            [(ngModel)]="userAnswer"
            rows="4"
            class="battle-textarea"
            placeholder="Введи свой ответ..."
            [disabled]="aiThinking"
          ></textarea>
          <div class="battle-actions">
            <button
              class="btn btn-primary"
              [disabled]="!userAnswer.trim() || aiThinking"
              (click)="sendAnswer()"
            >
              {{ aiThinking ? 'Мастер думает...' : '⚔ Ответить' }}
            </button>
            <button class="btn btn-ghost" (click)="finishBattle()">🏳 Сдаться</button>
          </div>
        </div>

        <!-- Результат -->
        <div class="battle-result" *ngIf="battleFinished && result">
          <div class="result-title">Битва окончена!</div>
          <div class="result-score" [class.good]="result.score / result.maxScore >= 0.7" [class.bad]="result.score / result.maxScore < 0.4">
            {{ result.score }} / {{ result.maxScore }}
          </div>
          <div class="result-feedback">{{ result.feedback }}</div>
          <div class="result-xp">+{{ result.xpEarned }} XP</div>
          <div class="result-actions">
            <button class="btn btn-primary" (click)="goBack()">➡ Продолжить</button>
          </div>
        </div>
      </div>
    </div>

    <div class="no-battle" *ngIf="!activity">
      <h2>Битва не найдена</h2>
      <button class="btn btn-primary" (click)="goBack()">← Назад</button>
    </div>
  `,
  styles: [`
    .battle-page { max-width: 800px; margin: 0 auto; }
    .battle-header { text-align: center; margin: 20px 0; }
    .battle-title {
      font-size: 28px;
      color: #e8c96a;
      margin: 0 0 8px;
      text-shadow: 0 0 20px rgba(201,162,39,0.3);
    }
    .battle-subtitle { color: #a89f8c; margin: 0; }
    .battle-arena {
      background: linear-gradient(180deg, #1d1a17, #141210);
      border: 2px solid #8a6d1f;
      border-radius: 8px;
      padding: 24px;
    }
    .battle-dialog {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
      margin-bottom: 20px;
      padding: 8px;
    }
    .battle-msg {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
    .battle-msg.ai { flex-direction: row; }
    .battle-msg.user { flex-direction: row-reverse; }
    .msg-avatar {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #141210;
      border: 1px solid #8a6d1f;
      border-radius: 50%;
      font-size: 18px;
      flex-shrink: 0;
    }
    .msg-content {
      max-width: 70%;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.6;
    }
    .battle-msg.ai .msg-content {
      background: rgba(232,201,106,0.08);
      border: 1px solid #8a6d1f;
      color: #e8e0d0;
    }
    .battle-msg.user .msg-content {
      background: rgba(63,155,79,0.08);
      border: 1px solid #3f9b4f;
      color: #e8e0d0;
    }
    .msg-role {
      font-family: 'Cinzel', serif;
      font-size: 11px;
      color: #a89f8c;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .battle-input { display: flex; flex-direction: column; gap: 12px; }
    .battle-textarea {
      width: 100%;
      padding: 12px 14px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #e8e0d0;
      font-size: 15px;
      font-family: 'Open Sans', sans-serif;
      resize: vertical;
    }
    .battle-textarea:focus {
      outline: none;
      border-color: #e8c96a;
      box-shadow: 0 0 8px rgba(232,201,106,0.2);
    }
    .battle-actions { display: flex; gap: 8px; justify-content: center; }
    .battle-result { text-align: center; padding: 20px; }
    .result-title {
      font-family: 'Cinzel', serif;
      font-size: 22px;
      color: #e8c96a;
      margin-bottom: 12px;
    }
    .result-score {
      font-family: 'Cinzel', serif;
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .result-score.good { color: #5fc96f; }
    .result-score.bad { color: #e08a80; }
    .result-feedback {
      color: #e8e0d0;
      font-size: 14px;
      line-height: 1.7;
      margin-bottom: 12px;
      text-align: left;
    }
    .result-xp {
      color: #e8c96a;
      font-family: 'Cinzel', serif;
      font-size: 16px;
      margin-bottom: 16px;
    }
    .result-actions { display: flex; justify-content: center; }
    .no-battle { text-align: center; padding: 60px 20px; }
    .no-battle h2 { color: #e8c96a; margin-bottom: 24px; }
  `]
})
export class JourneyBattleComponent implements OnInit {
  activity: Activity | null = null;
  conversation: BattleConversation[] = [];
  userAnswer = '';
  aiThinking = false;
  battleFinished = false;
  result: ActivityResult | null = null;
  private roundCount = 0;
  private maxRounds = 5;
  private checkpointId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stateService: JourneyStateService,
    private evaluationService: EvaluationService
  ) {}

  ngOnInit(): void {
    const activityId = this.route.snapshot.queryParams['activityId'];
    const checkpoint = this.stateService.currentCheckpoint();
    if (checkpoint) {
      this.checkpointId = checkpoint.id;
      this.activity = checkpoint.activities.find((a) => a.id === activityId && a.type === 'BC') ?? null;
      if (this.activity) {
        this.startBattle();
      }
    }
  }

  async startBattle(): Promise<void> {
    if (!this.activity) return;
    const firstRound = this.activity.battleRounds?.[0];
    if (firstRound) {
      this.conversation.push({ role: 'ai', text: firstRound.question });
    }
  }

  async sendAnswer(): Promise<void> {
    if (!this.activity || !this.userAnswer.trim() || this.aiThinking) return;

    const answer = this.userAnswer.trim();
    this.conversation.push({ role: 'user', text: answer });
    this.userAnswer = '';
    this.roundCount++;

    // Если достигнут лимит раундов — завершаем
    if (this.roundCount >= this.maxRounds) {
      await this.finishBattle();
      return;
    }

    this.aiThinking = true;
    try {
      const round = this.activity.battleRounds?.[Math.min(this.roundCount - 1, (this.activity.battleRounds?.length ?? 1) - 1)];
      if (round) {
        const weakness = await this.evaluationService.findBattleWeakness(round, answer);
        this.conversation.push({ role: 'ai', text: `${weakness.weakness}\n\n${weakness.followUpQuestion}` });
      } else {
        await this.finishBattle();
      }
    } catch (err) {
      this.conversation.push({ role: 'ai', text: 'Мастер задумался... Продолжим.' });
    } finally {
      this.aiThinking = false;
    }
  }

  async finishBattle(): Promise<void> {
    if (this.battleFinished) return;
    this.battleFinished = true;

    if (!this.activity || !this.checkpointId) return;

    try {
      const evalResult = await this.evaluationService.evaluateBattle(this.activity, this.conversation);

      const checkpoint = this.stateService.currentCheckpoint();
      if (!checkpoint) return;

      const result = this.stateService.completeActivity(this.activity, checkpoint, {
        userAnswer: this.conversation.filter((m) => m.role === 'user').map((m) => m.text).join('\n'),
        score: evalResult.score,
        maxScore: evalResult.maxScore,
        feedback: evalResult.feedback,
        strengths: evalResult.strengths,
        gaps: evalResult.gaps,
        misconceptions: evalResult.misconceptions,
        timeSpentSec: 0,
        attempts: 1,
        hintsUsed: 0,
        skipped: false,
      });

      this.result = result;
    } catch (err) {
      // Fallback: если LLM не ответил, даём минимальную оценку
      const checkpoint = this.stateService.currentCheckpoint();
      if (checkpoint && this.activity) {
        const result = this.stateService.completeActivity(this.activity, checkpoint, {
          userAnswer: this.conversation.filter((m) => m.role === 'user').map((m) => m.text).join('\n'),
          score: 0,
          maxScore: this.activity.maxScore,
          feedback: 'Битва завершена, но оценка не получена.',
          strengths: [],
          gaps: [],
          misconceptions: [],
          timeSpentSec: 0,
          attempts: 1,
          hintsUsed: 0,
          skipped: false,
        });
        this.result = result;
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/journey/checkpoint']);
  }
}