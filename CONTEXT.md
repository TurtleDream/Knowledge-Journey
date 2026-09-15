# CONTEXT.md

Проект: **Knowledge Journey** — образовательный портал по промпт-инжинирингу.
Фронтенд: Angular 17 standalone-компоненты, signals, zone.js.
Бэкенд: Node + Express (прокси LLM, эмбеддинги, статика для деплоя).
Деплой: GitHub Pages (статика из `ng build`).

## Стек

- Angular 17.3, standalone-компоненты, `signal`/`computed`, zone.js
- TypeScript 5.4, Karma + Jasmine (headless Edge: `CHROME_BIN=msedge`)
- sql.js (SQLite в браузере, WASM из `src/assets/`) + IndexedDB для persist
- Бэкенд: `server/index.js` (Express 5, cors, без TS)
- html2canvas, jspdf (экспорт отчётов)
- `@angular/cli` + `angular-cli-ghpages` для деплоя

## Фронтенд / бэкенд

Бэкенд локальный (`node server/index.js`, порт из `server/settings.json`):
- `GET /api/health` — проверка работы
- `GET /api/config` — содержимое `server/settings.json` (читание на каждый запрос, правки без рестарта)
- `POST /api/llm` `{prompt, systemPrompt}` → `{text}` — прокси к LLM-провайдеру
- `POST /api/embeddings` `{texts}` → `{embeddings}` — прокси к Yandex text-embedding
- `POST /api/analyze` — анализ прогресса (слабые темы, рекомендации)
- `POST /api/recommend` — рекомендации (nextTopics, relatedSkills, resumeSuggestion)
- `express.static` из `server/dist` — для прода-деплоя

Настройки — **в файле**, не в коде: `server/settings.json` (в .gitignore), шаблон `server/settings.example.json`:
`port`, `llm {provider, apiKey, model, apiUrl, folderId}`, `embeddings {apiKey, iamToken, folderId, kind}`.

Фронтенд: `SettingsService.load()` → `/api/config` (кэшируется, `null` если бэкенд не поднят).
- `apiBase()` — относительный путь на localhost, `http://localhost:3000` иначе; переопределить через `localStorage.kj-api-base`.
- LLM: `LlmClientService` — бэкенд в приоритете; ошибка бэкенда пробрасывается (фолбэк на localStorage-ключи только если бэкенда нет и нет сети).
- Эмбеддинги: `EmbedderService.autoConfigure()` → `BackendEmbeddingProvider` если есть конфиг, иначе Yandex (прямой, ключ в браузере — только для разработки).
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

## Контент (`src/app/content/`)

- `articles.data.ts` — `ARTICLES: Article[]` (5 статей, 1500–2500 слов каждая).
  Каждая статья: id, title, subtitle, icon, level, readTime, tags, sections.
  Секция: heading?, paragraphs[], exercises? (интерактивные упражнения после абзацев).
  Статьи: «Как работают LLM», «Галлюцинации», «Структура эффективного промпта», «Безопасность», «Токены и лимиты контекста».
- `test-questions.data.ts` — `TEST_QUESTIONS: ExerciseData[]` (12 вопросов, mode: 'test').

## Упражнения (`src/app/exercises/`)

10 типов, унифицированный `ExerciseData` (см. `core/exercise-types.ts`):
1. **multiple-choice** — выбор одного/нескольких вариантов, частичный балл.
2. **match-pairs** — соедини пары (левый → правый индекс), инкрементальное соединение.
3. **fill-the-blank** — заполни пропуск (`___`), синонимы, case-sensitive опционально.
4. **true-false** — верно/неверно.
5. **order-steps** — порядок шагов (перемешивание + drag-to-position).
6. **case-study** — улучши промпт: автооценка по ключевым элементам + самооценка 1–5, итог = среднее.
7. **prompt-simulator** — напиши промпт для заданного ответа AI: автооценка по ключевым словам + самооценка.
8. **spot-the-hallucination** — выдели галлюцинацию в тексте (клики по словам, диапазон `[start, end]`).
9. **prompt-builder** — собери промпт из блоков в правильном порядке (drag-to-order).
10. **prompt-battle** — выбери лучший из двух промптов + объяснение.

Базовый класс: `ExerciseBase` (abstract component) — состояния idle/correct/incorrect/partial/answered, `@Input() data`, `@Output() result`.
Хост: `ExerciseHostComponent` — динамическая загрузка компонента по `data.type`, прокидывает результат наверх.
Обратная связь: `ExerciseFeedbackComponent` — статус + объяснение.

## AI-слой (`src/app/ai/`)

- **ai-chat-button** — FAB (дロワブル-кнопка справа внизу): свиток с глазом, бейдж «новые рекомендации» = слабые темы (score < 0.5).
- **ai-chat-panel** — панель чата «Оракул»:
  - RAG-ответы с цитатами `[N]`, маркером «На основе платформы» / «Общие знания».
  - Чипы быстрого вызова: «📊 Анализ прогресса», «🎯 Рекомендации», «⚔ Тренировка по изученному».
  - Прогресс (слабые темы, рекомендации) — сразу в чат, без модалки.
  - Тренировка: `ChatJourneyService` — вопросы только по изученному, ответ → оценка LLM → событие в mastery.
  - Тогл «Поиск по изученному» — фильтр `onlyStudied` в RAG.
- **recommendations-modal** — модалка рекомендаций (nextTopics, relatedSkills, resumeSuggestion).
- **ai/pages/ai.component** — tab-страница: Чат, Анализ прогресса, Рекомендации, Генератор Journey.
- **progress-analyzer** — модалка анализа (слабые темы + рекомендации с артиклами).

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

