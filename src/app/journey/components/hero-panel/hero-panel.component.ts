import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JourneyStateService } from '../../services/journey-state.service';

@Component({
  selector: 'app-hero-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hero-panel" *ngIf="state() as s">
      <div class="hero-stats">
        <div class="stat">
          <span class="stat-icon">⚔</span>
          <span class="stat-label">XP</span>
          <span class="stat-value">{{ s.xp }}</span>
        </div>
        <div class="stat">
          <span class="stat-icon">🔥</span>
          <span class="stat-label">Серия</span>
          <span class="stat-value">{{ s.streak }}</span>
        </div>
        <div class="stat">
          <span class="stat-icon">💡</span>
          <span class="stat-label">Подсказки</span>
          <span class="stat-value">{{ s.hintsRemaining }}</span>
        </div>
        <div class="stat">
          <span class="stat-icon">⏭</span>
          <span class="stat-label">Пропуски</span>
          <span class="stat-value">{{ s.skipsRemaining }}</span>
        </div>
      </div>

      <div class="hero-artifacts" *ngIf="s.achievements.length > 0">
        <div class="artifacts-title">Артефакты</div>
        <div class="artifacts-list">
          <div
            *ngFor="let a of s.achievements"
            class="artifact"
            [title]="a.title + ' — ' + a.description"
          >
            <span class="artifact-icon">{{ a.icon }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hero-panel {
      background: linear-gradient(180deg, #2a2418, #1a1713);
      border: 2px solid #8a6d1f;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .hero-stats {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .stat {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .stat-icon { font-size: 18px; }
    .stat-label {
      font-family: 'Cinzel', serif;
      font-size: 12px;
      color: #a89f8c;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .stat-value {
      font-family: 'Cinzel', serif;
      font-size: 18px;
      font-weight: 700;
      color: #e8c96a;
    }
    .hero-artifacts { display: flex; align-items: center; gap: 8px; }
    .artifacts-title {
      font-family: 'Cinzel', serif;
      font-size: 12px;
      color: #a89f8c;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .artifacts-list { display: flex; gap: 6px; }
    .artifact {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #141210;
      border: 1px solid #8a6d1f;
      border-radius: 4px;
      font-size: 18px;
      cursor: help;
    }
    .artifact:hover { border-color: #e8c96a; box-shadow: 0 0 8px rgba(232,201,106,0.3); }

    @media (max-width: 600px) {
      .hero-panel { flex-direction: column; align-items: flex-start; }
      .hero-stats { gap: 12px; }
    }
  `]
})
export class HeroPanelComponent {
  state = this.stateService.state;

  constructor(private stateService: JourneyStateService) {}
}