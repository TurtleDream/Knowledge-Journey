import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JourneyGeneratorService } from '../../services/journey-generator.service';
import { LlmClientService } from '../../services/llm-client.service';
import { JourneyStateService } from '../../services/journey-state.service';
import { Difficulty, NarrativeMode } from '../../models/journey.models';

@Component({
  selector: 'app-journey-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="journey-input">
      <div class="input-panel panel">
        <h1 class="input-title">⚔ Путешествие по знаниям</h1>
        <p class="input-subtitle">
          Введи тему или текст — и отправляйся в приключение. Система создаст
          серию чекпоинтов, которые проведут тебя от базовых концепций к мастерству.
        </p>

        <div class="form-group">
          <label for="topic">Тема или текст (до 20 000 символов)</label>
          <textarea
            id="topic"
            [(ngModel)]="topic"
            rows="6"
            maxlength="20000"
            placeholder="Например: HTTP-протокол, машинное обучение, управление проектами..."
            class="topic-input"
          ></textarea>
          <div class="char-count">{{ topic.length }} / 20000</div>
        </div>

        <div class="form-group">
          <label>Режим нарратива</label>
          <div class="mode-select">
            <button
              *ngFor="let mode of narrativeModes"
              class="mode-btn"
              [class.selected]="narrativeMode === mode.value"
              (click)="narrativeMode = mode.value"
            >
              <span class="mode-icon">{{ mode.icon }}</span>
              <span class="mode-label">{{ mode.label }}</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Сложность</label>
          <div class="difficulty-select">
            <button
              *ngFor="let diff of difficulties"
              class="diff-btn"
              [class.selected]="difficulty === diff.value"
              (click)="difficulty = diff.value"
            >
              {{ diff.label }}
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button
            class="btn btn-primary"
            [disabled]="!canStart || loading"
            (click)="startJourney()"
          >
            {{ loading ? 'Генерация...' : '⚔ Начать путешествие' }}
          </button>
          <button class="btn btn-ghost" (click)="openSettings()">⚙ Настройки API</button>
        </div>

        <div class="error-box" *ngIf="error">
          <span class="error-icon">⚠</span>
          <span>{{ error }}</span>
        </div>

        <div class="loading-box" *ngIf="loading">
          <div class="loading-spinner"></div>
          <span>{{ loadingMessage }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .journey-input { max-width: 800px; margin: 0 auto; }
    .input-panel { padding: 32px; }
    .input-title {
      text-align: center;
      font-size: 32px;
      margin: 0 0 12px;
      color: #e8c96a;
      text-shadow: 0 0 20px rgba(201,162,39,0.3);
    }
    .input-subtitle {
      text-align: center;
      color: #a89f8c;
      margin: 0 0 28px;
      line-height: 1.7;
    }
    .form-group { margin-bottom: 24px; }
    .form-group label {
      display: block;
      font-family: 'Cinzel', serif;
      font-size: 14px;
      color: #e8c96a;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }
    .topic-input {
      width: 100%;
      padding: 12px 14px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #e8e0d0;
      font-size: 15px;
      font-family: 'Open Sans', sans-serif;
      resize: vertical;
      min-height: 120px;
    }
    .topic-input:focus {
      outline: none;
      border-color: #e8c96a;
      box-shadow: 0 0 8px rgba(232,201,106,0.2);
    }
    .char-count {
      text-align: right;
      font-size: 12px;
      color: #6f6757;
      margin-top: 4px;
    }
    .mode-select {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 8px;
    }
    .mode-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px;
      background: #141210;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #a89f8c;
      cursor: pointer;
      transition: all 0.15s;
      font-family: 'Cinzel', serif;
      font-size: 12px;
    }
    .mode-btn:hover { border-color: #8a6d1f; }
    .mode-btn.selected {
      border-color: #e8c96a;
      background: rgba(232,201,106,0.1);
      color: #e8c96a;
    }
    .mode-icon { font-size: 22px; }
    .difficulty-select { display: flex; gap: 8px; }
    .diff-btn {
      flex: 1;
      padding: 10px;
      background: #141210;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #a89f8c;
      cursor: pointer;
      transition: all 0.15s;
      font-family: 'Cinzel', serif;
      font-size: 13px;
    }
    .diff-btn:hover { border-color: #8a6d1f; }
    .diff-btn.selected {
      border-color: #e8c96a;
      background: rgba(232,201,106,0.1);
      color: #e8c96a;
    }
    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .error-box {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 12px 16px;
      background: rgba(161,31,31,0.15);
      border: 1px solid #a11f1f;
      border-radius: 4px;
      color: #e08a80;
      font-size: 14px;
    }
    .loading-box {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 16px;
      color: #e8c96a;
      font-family: 'Cinzel', serif;
      font-size: 14px;
    }
    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 3px solid #3a322a;
      border-top-color: #e8c96a;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 600px) {
      .input-panel { padding: 20px; }
      .input-title { font-size: 24px; }
      .mode-select { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class JourneyInputComponent {
  topic = '';
  narrativeMode: NarrativeMode = 'default';
  difficulty: Difficulty = 'medium';
  loading = false;
  loadingMessage = '';
  error = '';

  narrativeModes = [
    { value: 'default' as NarrativeMode, label: 'Классика', icon: '📜' },
    { value: 'startup' as NarrativeMode, label: 'Startup', icon: '🚀' },
    { value: 'incident' as NarrativeMode, label: 'Инцидент', icon: '🚨' },
    { value: 'consulting' as NarrativeMode, label: 'Консалтинг', icon: '💼' },
    { value: 'audit' as NarrativeMode, label: 'Аудит', icon: '🔍' },
  ];

  difficulties = [
    { value: 'easy' as Difficulty, label: 'Лёгкая' },
    { value: 'medium' as Difficulty, label: 'Средняя' },
    { value: 'hard' as Difficulty, label: 'Сложная' },
  ];

  constructor(
    private generator: JourneyGeneratorService,
    private llm: LlmClientService,
    private stateService: JourneyStateService,
    private router: Router
  ) {}

  get canStart(): boolean {
    return this.topic.trim().length >= 10 && this.llm.isConfigured();
  }

  async startJourney(): Promise<void> {
    if (!this.canStart || this.loading) return;

    this.loading = true;
    this.error = '';
    this.loadingMessage = 'Выделяю концепции...';

    try {
      const journey = await this.generator.generateJourney({
        topic: this.topic.trim(),
        narrativeMode: this.narrativeMode,
        difficulty: this.difficulty,
      });

      this.stateService.startJourney(journey);
      this.router.navigate(['/journey/map']);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Ошибка генерации';
    } finally {
      this.loading = false;
    }
  }

  openSettings(): void {
    this.router.navigate(['/journey/settings']);
  }
}