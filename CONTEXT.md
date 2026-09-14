# CONTEXT.md

Проект: **Knowledge Journey** (Angular 17 standalone + локальный Node-бэкенд, деплой статики на GitHub Pages).
Тематика: портал по промпт-инжинирингу в стилистике Diablo 2. Русскоязычный.

## Стек

- Angular 17.3, standalone-компоненты, signals, зона change detection по умолчанию
- TypeScript, Karma + Jasmine (headless через Edge: `CHROME_BIN=msedge`, Chrome не установлен)
- sql.js (SQLite в браузере, WASM в `src/assets/sql-wasm.wasm` + `sql-wasm-browser.wasm` — оба нужны) + IndexedDB для persist
- Бэкенд: Node + Express + cors (`server/index.js`), без TS
- html2canvas, jspdf

## Фронтенд / бэкенд

Бэкенд — локальный (`node server/index.js`, порт из настроек):
- `GET /api/config` — содержимое `server/settings.json` (файл читается на каждый запрос — правки без рестарта)
- `POST /api/llm` `{prompt, systemPrompt}` → `{text}` — прокси к LLM-провайдеру
- `POST /api/embeddings` `{texts}` → `{embeddings}` — прокси к Yandex text-embedding
- раздаёт статику из `server/dist` (вариант прода: `ng build` → туда)

Настройки — **в файле**, не в коде: `server/settings.json` (в .gitignore), шаблон `server/settings.example.json`:
`port`, `llm {provider, apiKey, model, apiUrl}`, `embeddings {iamToken, folderId, kind}`.

Фронтенд: `SettingsService.load()` → `/api/config` (кэшируется, `null` если бэкенд не поднят).
- LLM: `LlmClientService.generate` — бэкенд в приоритете; **ошибка бэкенда пробрасывается** (фолбэк на localStorage-ключи только если бэкенда нет вообще).
- Эмбеддинги: `EmbedderService.autoConfigure()` (зову из `reindexAll`) — есть конфиг → `BackendEmbeddingProvider`.
- `ng serve` проксирует `/api/*` через `proxy.conf.json` (прописан в angular.json serve.options).

## Архитектура: RAG-слой (`src/app/core/`)

Пайплайн: контент → чанки → эмбеддинги → SQLite. Порядок файлов по слоям:

1. **sqlite.service.ts** — SQLite в браузере.
   - `init(wasmDir = 'assets/')` грузит WASM, открывает/создаёт БД из IndexedDB (`kj-db` → store `dbs`, ключ `kj.sqlite`), кэширует initPromise. wasmDir — параметр (для karma и деплоя в подкаталог).
   - `exec(sql, params)` → `Row[]`, `run(sql, params)` (после мутаций — persist с debounce 500ms).
   - Хук на `pagehide` сохраняет БД синхронно (не `beforeunload` — на mobile Safari ненадёжен).
   - Таблицы: `chunks(id TEXT PK, article_id, idx, section, text, studied)` (уникальность `article_id+idx`), `embeddings(chunk_id TEXT PK, vec BLOB)`, `user_events(ts, kind, payload JSON)`, `topic_mastery(topic, score, correct_rate, recency, coverage, updated_at)`, `embeddings_cache(key TEXT PK = SHA-256, vec BLOB)`, `index_meta(source_id, hash)`.
   - Миграции — guarded ALTER (studied/section/correct_rate/recency/coverage), падение = колонка уже есть.
   - Вектор = BLOB из `Float32Array` байтов. К строкам Row — bracket-доступ (`r['col']`), иначе TS4111.
2. **content-chunker.service.ts** — `chunkArticle` (по секциям из `articles.data.ts`: абзац = чанк, упражнение = чанк с `meta.type='exercise'`, explanation в текст не попадает), `chunkJourney` (весь journey одним чанком), `chunkTestQuestion` (вопрос + правильный ответ, без объяснения), `chunkAll()`. Формат id чанка: `articleId:idx`, `journey:<id>`, `test:<idx>`. Тесты: `content-chunker.service.spec.ts`.
3. **embedding-provider.ts** — интерфейс `EmbeddingProvider` (+ опциональный `embedBatch`). Реализации: `BackendEmbeddingProvider` (через `/api/embeddings`, батч одним запросом), `YandexEmbeddingProvider` (POST `llm.api.cloud.yandex.net/foundation-models/v1/text-embedding`, `emb://<folderId>/text-search-doc|query` — смешивать нельзя), `OpenAIEmbeddingProvider`. Прямой Яндекс — один текст за запрос.
4. **embedder.service.ts** — `embed` / `embedBatch` / `autoConfigure()`. Кэш в `embeddings_cache` по SHA-256. Батч: провайдер умеет `embedBatch` → одним запросом, иначе до 50 текстов, параллелизм 4. Retry на 429/5xx, backoff 500ms → 1s → 2s, максимум 3.
5. **reindex.service.ts** — `reindexAll(force?)`: `autoConfigure()` → инкрементальность по SHA-256 хешу `JSON.stringify(article.sections)` в `index_meta`; изменённая статья пересоздаётся целиком. `markStudied(articleId)` = `UPDATE chunks SET studied=1`. Прогресс — `signal<{done,total}>`.
6. **rag.service.ts** + **prompts/rag.prompts.ts** — `ask(question, {includeUnstudied})`: cosine similarity по всем векторам, top-5; все top-K не изучены и includeUnstudied=false → `{needsUnstudiedConfirm: true, sources}`. Пометка `[ОБЩИЕ ЗНАНИЯ]` (case-insensitive) → `origin: 'general'`; citations `[N]` → `source.cited`. `RagResult` — union.
7. **user-context.service.ts** — `trackEvent` (в `user_events`, payload = JSON события; **сбрасывает кэш агрегатов**), `getAggregates()` — пересчёт on-demand при TTL > 5 мин, `getWeak/StrongTopics(n)`, `getPromptContext(topicId)` (только агрегаты + 3 последних mistake — это уходит в LLM), `exportData()` / `clearData()`.
   Формула mastery: `0.6*correct_rate + 0.2*recency + 0.2*coverage`; recency = `0.5^(Δt/24ч)` (полураспад сутки), coverage = `min(1, answered/10)`.
8. **settings.service.ts** — см. «Фронтенд / бэкенд».

## Контент и приложение

- `src/app/content/` — статьи (`ARTICLES: Article[]`, секции с абзацами и inline-упражнениями) и тест (`TEST_QUESTIONS: ExerciseData[]`, mode 'test').
- `src/app/core/exercise-types.ts` — 10 типов упражнений, унифицированный `ExerciseData`.
- `src/app/exercises/` — по компоненту на тип + exercise-host.
- `src/app/journey/` — генерация «путешествий» через LLM: journey-generator / evaluation / llm-client / journey-state. Ключ: бэкенд (settings.json) или localStorage (настройки journey-settings).
- `src/app/pages/` — home, article, test, results.

## Тестирование

- `npx ng test --watch=false --browsers=ChromeHeadless` (на этой машине нужен `CHROME_BIN=msedge`).
- Тесты гоняют реальный SQLite (sql.js в karma, WASM раздаётся через assets из angular.json).
- Покрыто: chunker (4 теста), user-context (6, включая формулу mastery и инвалидацию кэша через trackEvent).
- Не покрыто: reindex-инкрементальность, rag-ветки (нужны моки embedder/llm).

## UI-триггеры индексации

Кнопка «⟳ Обновить индекс» в journey-settings: `sqlite.init()` → `reindexAll()`, показывает `N / M` из `ReindexService.progress`.

## Незакрытое / нюансы

- Journeys пока не участвуют в `reindexAll` — нет хранилища сгенерированных journeys.
- `SqliteService.persist()` не даёт Promise, дожидающийся записи — только форсит debounce.
- GigaChat через бэкенд требует готового Bearer-токена (oauth не реализован, помечено в server/index.js).
- `/api/config` отдаёт ключи в браузер — безопасно только на localhost, наружу без правки выставлять нельзя.
- IndexedDB karma-контекста накапливается между прогонами — при «странных» данных чистить kj-db в DevTools.

## Правила работы

См. `skills.md` — русский язык, никаких ИИ-оборотов, короткие имена, комментарии только там, где есть неочевидные решения.

