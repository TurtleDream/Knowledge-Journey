import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JourneyStateService } from '../../services/journey-state.service';

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timer" [class]="timerClass" *ngIf="currentTime > 0">
      <span class="timer-icon">⏳</span>
      <span class="timer-value">{{ formatTime(currentTime) }}</span>
      <div class="timer-bar">
        <div class="timer-fill" [style.width.%]="percent"></div>
      </div>
    </div>
  `,
  styles: [`
    .timer {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: #141210;
      border: 1px solid #3a322a;
      border-radius: 6px;
      font-family: 'Cinzel', serif;
    }
    .timer.green { border-color: #3f9b4f; color: #5fc96f; }
    .timer.yellow { border-color: #d9b23a; color: #e8c96a; }
    .timer.red { border-color: #a11f1f; color: #e08a80; }
    .timer.pulsing { animation: pulse 1s infinite; }
    .timer-icon { font-size: 16px; }
    .timer-value {
      font-size: 20px;
      font-weight: 700;
      min-width: 70px;
      text-align: center;
    }
    .timer-bar {
      width: 100px;
      height: 6px;
      background: #0f0e0c;
      border-radius: 3px;
      overflow: hidden;
    }
    .timer-fill {
      height: 100%;
      transition: width 0.5s linear;
    }
    .green .timer-fill { background: #3f9b4f; }
    .yellow .timer-fill { background: #d9b23a; }
    .red .timer-fill { background: #a11f1f; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class TimerComponent implements OnInit, OnDestroy {
  currentTime = 0;
  percent = 0;
  timerClass = 'green';
  private intervalId: number | null = null;

  constructor(private stateService: JourneyStateService) {}

  ngOnInit(): void {
    this.update();
    this.intervalId = window.setInterval(() => this.update(), 1000);
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
  }

  private update(): void {
    const remaining = this.stateService.remainingTime();
    const percent = this.stateService.timePercent();
    this.currentTime = Math.floor(remaining);
    this.percent = 100 - percent;

    // Цвет: зелёный >50%, жёлтый 20–50%, красный <20%
    if (percent > 50) {
      this.timerClass = 'green';
    } else if (percent >= 20) {
      this.timerClass = 'yellow';
    } else {
      this.timerClass = 'red';
      // Пульсация <30 сек
      if (remaining < 30) {
        this.timerClass += ' pulsing';
      }
    }
  }

  formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}