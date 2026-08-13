import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Checkpoint, CheckpointStatus } from '../../models/journey.models';
import { JourneyStateService } from '../../services/journey-state.service';

@Component({
  selector: 'app-adventure-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="adventure-map">
      <div class="map-title">🗺 Карта приключений</div>
      <div class="map-path">
        <div
          *ngFor="let cp of checkpoints; let i = index"
          class="map-node-wrap"
        >
          <div class="map-node" [class]="getNodeClass(i)">
            <div class="node-icon">{{ getNodeIcon(i) }}</div>
            <div class="node-label">{{ cp.title }}</div>
            <div class="node-status">{{ getNodeStatusLabel(i) }}</div>
          </div>
          <div class="map-connector" *ngIf="i < checkpoints.length - 1"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .adventure-map {
      background: linear-gradient(180deg, #1d1a17, #141210);
      border: 2px solid #8a6d1f;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .map-title {
      font-family: 'Cinzel', serif;
      font-size: 16px;
      color: #e8c96a;
      margin-bottom: 16px;
      text-align: center;
      letter-spacing: 1px;
    }
    .map-path {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 0;
      flex-wrap: wrap;
    }
    .map-node-wrap {
      display: flex;
      align-items: center;
      flex-direction: column;
      position: relative;
    }
    .map-node {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      background: #141210;
      border: 3px solid #3a322a;
      transition: all 0.3s;
      cursor: pointer;
      text-align: center;
      padding: 6px;
    }
    .map-node.locked { opacity: 0.4; cursor: not-allowed; }
    .map-node.available {
      border-color: #e8c96a;
      box-shadow: 0 0 12px rgba(232,201,106,0.4);
      animation: glow 2s infinite;
    }
    .map-node.completed {
      border-color: #3f9b4f;
      background: rgba(63,155,79,0.15);
    }
    .map-node.failed {
      border-color: #a11f1f;
      background: rgba(161,31,31,0.15);
    }
    .node-icon { font-size: 24px; }
    .node-label {
      font-family: 'Cinzel', serif;
      font-size: 10px;
      color: #e8e0d0;
      line-height: 1.2;
      max-height: 24px;
      overflow: hidden;
    }
    .node-status {
      font-size: 10px;
      color: #a89f8c;
    }
    .map-connector {
      width: 40px;
      height: 3px;
      background: linear-gradient(90deg, #8a6d1f, #e8c96a, #8a6d1f);
      margin-top: 44px;
      flex-shrink: 0;
    }

    @keyframes glow {
      0%, 100% { box-shadow: 0 0 12px rgba(232,201,106,0.4); }
      50% { box-shadow: 0 0 24px rgba(232,201,106,0.7); }
    }

    @media (max-width: 600px) {
      .map-node { width: 70px; height: 70px; }
      .map-connector { width: 20px; }
      .node-icon { font-size: 18px; }
    }
  `]
})
export class AdventureMapComponent {
  @Input() checkpoints: Checkpoint[] = [];

  constructor(private stateService: JourneyStateService) {}

  getNodeClass(index: number): string {
    const s = this.stateService.state();
    if (!s) return 'locked';

    if (index < s.currentCheckpointIndex) {
      const result = s.checkpointResults.find((r) => r.checkpointId === this.checkpoints[index]?.id);
      return result?.status === 'completed' ? 'completed' : 'failed';
    }
    if (index === s.currentCheckpointIndex) return 'available';
    return 'locked';
  }

  getNodeIcon(index: number): string {
    const cls = this.getNodeClass(index);
    switch (cls) {
      case 'completed': return '✔';
      case 'failed': return '✘';
      case 'available': return '⚔';
      default: return '🔒';
    }
  }

  getNodeStatusLabel(index: number): string {
    const cls = this.getNodeClass(index);
    switch (cls) {
      case 'completed': return 'Пройден';
      case 'failed': return 'Провал';
      case 'available': return 'Текущий';
      default: return 'Закрыт';
    }
  }
}