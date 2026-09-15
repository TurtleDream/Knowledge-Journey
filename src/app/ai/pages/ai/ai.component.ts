import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AiChatPanelComponent } from '../../components/ai-chat-panel/ai-chat-panel.component';
import { ProgressAnalyzerComponent } from '../../../journey/components/progress-analyzer/progress-analyzer.component';
import { RecommendationsModalComponent } from '../../components/recommendations-modal/recommendations-modal.component';
import { JourneyInputComponent } from '../../../journey/pages/journey-input/journey-input.component';

type Tab = 'chat' | 'progress' | 'recs' | 'journey';

@Component({
  selector: 'app-ai',
  standalone: true,
  imports: [
    CommonModule,
    AiChatPanelComponent,
    ProgressAnalyzerComponent,
    RecommendationsModalComponent,
    JourneyInputComponent,
  ],
  template: `
    <div class="ai-page">
      <h1 class="ai-title">🔮 Оракул</h1>

      <div class="tabs">
        <button *ngFor="let t of tabs" class="tab" [class.active]="tab() === t.id" (click)="tab.set(t.id)">
          {{ t.label }}
        </button>
      </div>

      <div class="tab-body">
        <div *ngIf="tab() === 'chat'" class="chat-wrap">
          <app-ai-chat-panel [compact]="true"></app-ai-chat-panel>
        </div>

        <div *ngIf="tab() === 'progress'" class="center">
          <p class="hint-text">Анализ слабых тем и рекомендации, как они мешают твоей цели.</p>
          <button class="btn" (click)="progressModal.open()">Запустить анализ</button>
        </div>

        <div *ngIf="tab() === 'recs'" class="center">
          <p class="hint-text">Что изучить дальше, смежные навыки, формулировки для резюме.</p>
          <button class="btn" (click)="recsModal.open()">Получить рекомендации</button>
        </div>

        <div *ngIf="tab() === 'journey'" class="journey-tab">
          <app-journey-input></app-journey-input>
        </div>
      </div>

      <app-progress-analyzer #progressModal></app-progress-analyzer>
      <app-recommendations-modal #recsModal></app-recommendations-modal>
    </div>
  `,
  styles: [`
    .ai-page { max-width: 900px; margin: 0 auto; }
    .ai-title { font-family: Cinzel, serif; color: #e8c96a; text-align: center; font-size: 28px; margin: 0 0 20px; }
    .tabs { display: flex; gap: 8px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; }
    .tab { padding: 10px 18px; background: #141210; border: 1px solid #3a322a; border-radius: 4px;
      color: #a89f8c; cursor: pointer; font-family: Cinzel, serif; font-size: 13px; transition: all 0.15s; }
    .tab:hover { border-color: #8b0000; }
    .tab.active { border-color: #8b0000; background: rgba(139,0,0,0.2); color: #e8c96a; }
    .chat-wrap { height: 65vh; border: 1px solid #3a322a; border-radius: 8px; overflow: hidden;
      background: #1a1712; display: flex; flex-direction: column; }
    .center { text-align: center; padding: 40px 20px; }
    .hint-text { color: #a89f8c; margin-bottom: 16px; line-height: 1.6; }
    .btn { padding: 10px 24px; background: #8b0000; color: #e8e0d0; border: none; border-radius: 4px;
      cursor: pointer; font-family: Cinzel, serif; font-size: 14px; }
    .btn:hover { background: #a11f1f; }
    .journey-tab { background: #1a1712; border: 1px solid #3a322a; border-radius: 8px; padding: 20px; }
  `],
})
export class AiComponent {
  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'chat', label: '💬 Чат' },
    { id: 'progress', label: '📊 Анализ прогресса' },
    { id: 'recs', label: '🎯 Рекомендации' },
    { id: 'journey', label: '🗺 Генератор Journey' },
  ];

  tab = signal<Tab>('chat');
}
