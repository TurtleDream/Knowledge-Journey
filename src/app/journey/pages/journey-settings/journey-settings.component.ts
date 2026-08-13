import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LlmClientService } from '../../services/llm-client.service';
import { LlmConfig } from '../../models/journey.models';

@Component({
  selector: 'app-journey-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page">
      <div class="settings-panel panel">
        <h1 class="settings-title">⚙ Настройки API</h1>
        <p class="settings-subtitle">
          Введи API-ключ для генерации путешествий. Ключ хранится только в localStorage
          вашего браузера и никогда не отправляется на сервер.
        </p>

        <div class="form-group">
          <label>Провайдер</label>
          <div class="provider-select">
            <button
              class="provider-btn"
              [class.selected]="provider === 'yandex'"
              (click)="provider = 'yandex'"
            >
              <span class="provider-icon">☁</span>
              <span>YandexGPT</span>
            </button>
            <button
              class="provider-btn"
              [class.selected]="provider === 'gigachat'"
              (click)="provider = 'gigachat'"
            >
              <span class="provider-icon">💎</span>
              <span>GigaChat</span>
            </button>
            <button
              class="provider-btn"
              [class.selected]="provider === 'chatgpt'"
              (click)="provider = 'chatgpt'"
            >
              <span class="provider-icon">🤖</span>
              <span>ChatGPT</span>
            </button>
            <button
              class="provider-btn"
              [class.selected]="provider === 'deepseek'"
              (click)="provider = 'deepseek'"
            >
              <span class="provider-icon">🐋</span>
              <span>DeepSeek</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="apiKey">API-ключ / Токен</label>
          <input
            id="apiKey"
            type="password"
            [(ngModel)]="apiKey"
            class="api-input"
            placeholder="Введите API-ключ"
          />
        </div>

        <div class="form-group" *ngIf="provider === 'yandex'">
          <label for="model">Модель (необязательно)</label>
          <input
            id="model"
            type="text"
            [(ngModel)]="model"
            class="api-input"
            placeholder="folderId/yandexgpt-lite"
          />
          <div class="hint">
            Формат: <code>folderId/модель</code>. Например: <code>b1g12345/yandexgpt-lite</code>
          </div>
        </div>

        <div class="form-group">
          <label for="apiUrl">URL CORS-прокси (необязательно, для YandexGPT и GigaChat)</label>
          <input
            id="apiUrl"
            type="text"
            [(ngModel)]="apiUrl"
            class="api-input"
            placeholder="https://corsproxy.io/?url=..."
          />
          <div class="hint">
            Некоторые провайдеры (YandexGPT, GigaChat) блокируют прямые запросы из браузера.
            Укажите URL прокси, например <code>https://corsproxy.io/?url=</code>,
            чтобы обойти ограничение CORS. Для ChatGPT и DeepSeek не требуется.
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" (click)="save()">💾 Сохранить</button>
          <button class="btn btn-ghost" (click)="goBack()">← Назад</button>
        </div>

        <div class="success-box" *ngIf="saved">
          <span>✔ Настройки сохранены</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page { max-width: 600px; margin: 0 auto; }
    .settings-panel { padding: 32px; }
    .settings-title {
      text-align: center;
      font-size: 28px;
      margin: 0 0 12px;
      color: #e8c96a;
    }
    .settings-subtitle {
      text-align: center;
      color: #a89f8c;
      margin: 0 0 28px;
      line-height: 1.7;
      font-size: 14px;
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
    .provider-select { display: flex; gap: 8px; }
    .provider-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      background: #141210;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #a89f8c;
      cursor: pointer;
      transition: all 0.15s;
      font-family: 'Cinzel', serif;
      font-size: 14px;
    }
    .provider-btn:hover { border-color: #8a6d1f; }
    .provider-btn.selected {
      border-color: #e8c96a;
      background: rgba(232,201,106,0.1);
      color: #e8c96a;
    }
    .provider-icon { font-size: 20px; }
    .api-input {
      width: 100%;
      padding: 12px 14px;
      background: #0f0e0c;
      border: 1px solid #3a322a;
      border-radius: 4px;
      color: #e8e0d0;
      font-size: 15px;
      font-family: 'Open Sans', sans-serif;
    }
    .api-input:focus {
      outline: none;
      border-color: #e8c96a;
      box-shadow: 0 0 8px rgba(232,201,106,0.2);
    }
    .hint {
      margin-top: 6px;
      font-size: 12px;
      color: #6f6757;
    }
    .hint code {
      background: #141210;
      padding: 2px 6px;
      border-radius: 3px;
      color: #e8c96a;
    }
    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .success-box {
      margin-top: 16px;
      padding: 12px 16px;
      background: rgba(63,155,79,0.15);
      border: 1px solid #3f9b4f;
      border-radius: 4px;
      color: #5fc96f;
      text-align: center;
      font-size: 14px;
    }
  `]
})
export class JourneySettingsComponent implements OnInit {
  provider: 'yandex' | 'gigachat' | 'chatgpt' | 'deepseek' = 'yandex';
  apiKey = '';
  model = '';
  apiUrl = '';
  saved = false;

  constructor(
    private llm: LlmClientService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const config = this.llm.getConfig();
    if (config) {
      this.provider = config.provider;
      this.apiKey = config.apiKey;
      this.model = config.model ?? '';
      this.apiUrl = config.apiUrl ?? '';
    }
  }

  save(): void {
    if (!this.apiKey.trim()) return;
    const config: LlmConfig = {
      provider: this.provider,
      apiKey: this.apiKey.trim(),
      model: this.model.trim() || undefined,
      apiUrl: this.apiUrl.trim() || undefined,
    };
    this.llm.saveConfig(config);
    this.saved = true;
    setTimeout(() => (this.saved = false), 3000);
  }

  goBack(): void {
    this.router.navigate(['/journey']);
  }
}