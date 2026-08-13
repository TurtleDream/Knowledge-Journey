/**
 * LLM-клиент для YandexGPT (Yandex Cloud) и GigaChat (Сбер).
 * API-ключ хранится в localStorage, никаких секретов в коде.
 * Универсальный промпт + пост-обработка для обеих моделей.
 * Парсинг JSON устойчив к markdown и невалидному JSON.
 */

import { Injectable } from '@angular/core';
import { LlmConfig } from '../models/journey.models';

const CONFIG_KEY = 'kj-llm-config';

@Injectable({ providedIn: 'root' })
export class LlmClientService {
  /** Сохранить конфигурацию LLM */
  saveConfig(config: LlmConfig): void {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  /** Получить конфигурацию LLM */
  getConfig(): LlmConfig | null {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Проверить, настроен ли LLM */
  isConfigured(): boolean {
    const config = this.getConfig();
    return !!config?.apiKey;
  }

  /** Отправить запрос к LLM и получить текст ответа */
  async generate(prompt: string, systemPrompt: string): Promise<string> {
    const config = this.getConfig();
    if (!config?.apiKey) {
      throw new Error('API-ключ не настроен. Перейдите в настройки.');
    }

    if (config.provider === 'yandex') {
      return this.generateYandex(prompt, systemPrompt, config);
    } else {
      return this.generateGigachat(prompt, systemPrompt, config);
    }
  }

  /** Отправить запрос и получить распарсенный JSON (с ретраями) */
  async generateJson<T>(
    prompt: string,
    systemPrompt: string,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const raw = await this.generate(prompt, systemPrompt);
        return this.parseJson<T>(raw);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Если это ошибка парсинга — пробуем ещё раз
        if (attempt < maxRetries - 1) {
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    throw new Error(
      `Не удалось получить валидный JSON от LLM после ${maxRetries} попыток: ${lastError?.message}`
    );
  }

  /** Устойчивый парсинг JSON (убирает markdown-обёртки) */
  private parseJson<T>(raw: string): T {
    let text = raw.trim();

    // Убираем markdown-обёртки ```json ... ```
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      text = codeBlockMatch[1].trim();
    }

    // Убираем всё до первой { или [ и после последней } или ]
    const firstBrace = text.search(/[\[{]/);
    const lastBrace = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(text) as T;
    } catch (e) {
      // Попытка починить невалидный JSON: убрать trailing commas
      const fixed = text
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/,\s*$/g, '');
      try {
        return JSON.parse(fixed) as T;
      } catch (e2) {
        throw new Error(`Невалидный JSON от LLM: ${raw.substring(0, 200)}...`);
      }
    }
  }

  /** Запрос к YandexGPT */
  private async generateYandex(
    prompt: string,
    systemPrompt: string,
    config: LlmConfig
  ): Promise<string> {
    const folderId = config.model?.split('/')[0] ?? '';
    const model = config.model?.split('/')[1] ?? 'yandexgpt-lite';

    const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
    const body = {
      modelUri: `gpt://${folderId}/${model}`,
      completionOptions: {
        stream: false,
        temperature: 0.3,
        maxTokens: 4000,
      },
      messages: [
        { role: 'system', text: systemPrompt },
        { role: 'user', text: prompt },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`YandexGPT ошибка ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const result = data?.result?.alternatives?.[0]?.message?.text;
    if (!result) {
      throw new Error('YandexGPT вернул пустой ответ');
    }
    return result;
  }

  /** Запрос к GigaChat */
  private async generateGigachat(
    prompt: string,
    systemPrompt: string,
    config: LlmConfig
  ): Promise<string> {
    // Получаем токен доступа
    const token = await this.getGigachatToken(config.apiKey);

    const url = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
    const body = {
      model: config.model ?? 'GigaChat',
      temperature: 0.3,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GigaChat ошибка ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content;
    if (!result) {
      throw new Error('GigaChat вернул пустой ответ');
    }
    return result;
  }

  /** Получить токен GigaChat по API-ключу */
  private async getGigachatToken(apiKey: string): Promise<string> {
    const url = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
    const body = new URLSearchParams({
      scope: 'GIGACHAT_API_PERS',
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${btoa(apiKey)}`,
        RqUID: this.generateUuid(),
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GigaChat auth ошибка ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data?.access_token ?? '';
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}