// Абстракция поверх конкретного провайдера эмбеддингов — чтобы переключиться
// на OpenAI, достаточно реализовать этот интерфейс и подсунуть в EmbedderService.
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

// ВАЖНО: frontend-only — ключ светится в браузере. Для прода нужен proxy,
// но пока так. docUri — для документов, queryUri — для поисковых запросов,
// у Яндекса это разные модели, смешивать нельзя.
export class YandexEmbeddingProvider implements EmbeddingProvider {
  private static readonly URL =
    'https://llm.api.cloud.yandex.net/foundation-models/v1/text-embedding';

  constructor(
    private iamToken: string,
    private folderId: string,
    private kind: 'doc' | 'query' = 'doc',
  ) {}

  async embed(text: string): Promise<number[]> {
    const model = this.kind === 'doc' ? 'text-search-doc' : 'text-search-query';
    const res = await fetch(YandexEmbeddingProvider.URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.iamToken}`,
      },
      body: JSON.stringify({
        modelUri: `emb://${this.folderId}/${model}`,
        text,
      }),
    });
    if (!res.ok) {
      throw Object.assign(new Error(`yandex embedding failed: ${res.status}`), {
        status: res.status,
      });
    }
    const json = (await res.json()) as { embedding: number[] };
    return json.embedding;
  }
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private static readonly URL = 'https://api.openai.com/v1/embeddings';

  constructor(
    private apiKey: string,
    private model = 'text-embedding-3-small',
  ) {}

  async embed(text: string): Promise<number[]> {
    const res = await fetch(OpenAIEmbeddingProvider.URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: text }),
    });
    if (!res.ok) {
      throw Object.assign(new Error(`openai embedding failed: ${res.status}`), {
        status: res.status,
      });
    }
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    return json.data[0].embedding;
  }
}
