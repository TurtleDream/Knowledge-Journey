import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserContextService } from '../../../core/user-context.service';

// свиток с глазом — «знание видит»
@Component({
  selector: 'app-ai-chat-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="fab" (click)="open.emit()" title="AI-помощник">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6">
        <!-- свиток -->
        <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
        <path d="M8 8h8M8 12h5"/>
        <!-- глаз -->
        <ellipse cx="12" cy="16.5" rx="3" ry="1.8"/>
        <circle cx="12" cy="16.5" r="0.8" fill="currentColor"/>
      </svg>
      <span class="badge" *ngIf="newCount() > 0">{{ newCount() }}</span>
    </button>
  `,
  styles: [`
    .fab {
      position: fixed; right: 24px; bottom: 24px; z-index: 900;
      width: 56px; height: 56px; border-radius: 50%;
      background: #1a1712; border: 2px solid #8b0000; color: #e8c96a;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(139,0,0,0.4); transition: transform 0.15s, border-color 0.15s;
    }
    .fab:hover { transform: scale(1.08); border-color: #d43a2f; }
    .badge {
      position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px;
      background: #8b0000; color: #fff; border-radius: 10px;
      font-size: 11px; line-height: 20px; text-align: center; padding: 0 4px;
      font-family: Cinzel, serif;
    }
  `],
})
export class AiChatButtonComponent implements OnInit {
  @Output() open = new EventEmitter<void>();

  // «новые рекомендации» = слабые темы (score < 0.5)
  newCount = signal(0);

  constructor(private ctx: UserContextService) {}

  async ngOnInit(): Promise<void> {
    try {
      const agg = await this.ctx.getAggregates();
      this.newCount.set(agg.filter((a) => a.score < 0.5).length);
    } catch {
      // без БД бейдж просто не показываем
    }
  }
}
