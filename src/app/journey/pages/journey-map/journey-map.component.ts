import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { JourneyStateService } from '../../services/journey-state.service';
import { HeroPanelComponent } from '../../components/hero-panel/hero-panel.component';
import { AdventureMapComponent } from '../../components/adventure-map/adventure-map.component';

@Component({
  selector: 'app-journey-map',
  standalone: true,
  imports: [CommonModule, HeroPanelComponent, AdventureMapComponent],
  template: `
    <div class="map-page" *ngIf="journey() as j">
      <app-hero-panel></app-hero-panel>

      <div class="map-header">
        <h1 class="map-title">{{ j.title }}</h1>
        <p class="map-subtitle">{{ j.topic }}</p>
      </div>

      <app-adventure-map [checkpoints]="j.checkpoints"></app-adventure-map>

      <div class="map-actions">
        <button class="btn btn-primary" (click)="continueJourney()">
          {{ state()?.completed ? '📜 К отчёту' : '⚔ Продолжить путешествие' }}
        </button>
        <button class="btn btn-ghost" (click)="resetJourney()">🔄 Начать заново</button>
      </div>
    </div>

    <div class="no-journey" *ngIf="!journey()">
      <h2>Нет активного путешествия</h2>
      <p>Создайте новое путешествие по знаниям.</p>
      <button class="btn btn-primary" (click)="goToInput()">⚔ Создать путешествие</button>
    </div>
  `,
  styles: [`
    .map-page { max-width: 1000px; margin: 0 auto; }
    .map-header { text-align: center; margin: 24px 0; }
    .map-title {
      font-size: 28px;
      color: #e8c96a;
      margin: 0 0 8px;
      text-shadow: 0 0 20px rgba(201,162,39,0.3);
    }
    .map-subtitle { color: #a89f8c; margin: 0; }
    .map-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 24px;
    }
    .no-journey {
      text-align: center;
      padding: 60px 20px;
    }
    .no-journey h2 { color: #e8c96a; margin-bottom: 12px; }
    .no-journey p { color: #a89f8c; margin-bottom: 24px; }
  `]
})
export class JourneyMapComponent {
  journey = this.stateService.journey;
  state = this.stateService.state;

  constructor(
    private stateService: JourneyStateService,
    private router: Router
  ) {}

  continueJourney(): void {
    if (this.stateService.isCompleted()) {
      this.router.navigate(['/journey/report']);
    } else {
      this.router.navigate(['/journey/checkpoint']);
    }
  }

  resetJourney(): void {
    this.stateService.reset();
    this.router.navigate(['/journey']);
  }

  goToInput(): void {
    this.router.navigate(['/journey']);
  }
}