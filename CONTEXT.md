# CONTEXT.md

Проект: **Knowledge Journey** (Angular 17 standalone, frontend-only, деплой на GitHub Pages).
Тематика: портал по промпт-инжинирингу в стилистике Diablo 2. Русскоязычный.

## Стек

- Angular 17.3, standalone-компоненты, signals, зона change detection по умолчанию
- TypeScript, Karma + Jasmine (headless через Edge: `CHROME_BIN=msedge`, Chrome не установлен)
- sql.js (SQLite в браузере, WASM в `src/assets/sql-wasm.wasm`) + IndexedDB для persist
- html2canvas, jspdf

## Архитектура: RAG-слой (`src/app/core/`)

Пайплайн: контент → чанки → эмбеддинги → SQLite. Порядок файлов по слоям:

1. **sqlite.service.ts** — SQLite в браузере.
   - `init()` грузит WASM (`assets/sql-wasm.wasm`), открывает/создаёт БД из IndexedDB (`kj-db` → store `dbs`, ключ `kj.sqlite`), кэширует initPromise.
   - `exec(sql, params)` → `Row[]`, `run(sql, params)` (после мутаций — persist с debounce 500ms).
   - Хук на `pagehide` сохраняет БД синхронно (не `beforeunload` — на mobile Safari ненадёжен).
   - Таблицы: `chunks(id TEXT PK, article_id, idx, text, studied)` (уникальность `article_id+idx`), `embeddings(chunk_id TEXT PK, vec BLOB)`, `user_events`, `topic_mastery`, `embeddings_cache(key TEXT PK = SHA-256, vec BLOB)`, `index_meta(source_id, hash)`.
   - Вектор = BLOB из `Float32Array` байтов.
2. **content-chunker.service.ts** — `chunkArticle` (по секциям из `articles.data.ts`: абзац = чанк, упражнение = чанк с `meta.type='exercise'`, explanation в текст не попадает), `chunkJourney` (весь journey одним чанком), `chunkTestQuestion` (вопрос + правильный ответ, без объяснения), `chunkAll()`. Формат id чанка: `articleId:idx`, `journey:<id>`, `test:<idx>`. Тесты: `content-chunker.service.spec.ts`.
3. **embedding-provider.ts** — интерфейс `EmbeddingProvider`, реализации `YandexEmbeddingProvider` (POST `llm.api.cloud.yandex.net/foundation-models/v1/text-embedding`, `emb://<folderId>/text-search-doc` для документов / `text-search-query` для запросов — смешивать нельзя) и `OpenAIEmbeddingProvider`. Яндекс принимает один текст за запрос — батчей в теле нет.
4. **embedder.service.ts** — `embed` / `embedBatch`. Кэш в `embeddings_cache` по SHA-256 (`crypto.subtle`). Батч = до 50 текстов, параллелизм 4. Retry на 429/5xx, backoff 500ms → 1s → 2s, максимум 3.
5. **reindex.service.ts** — `reindexAll(force?)`: инкрементальность по SHA-256 хешу `JSON.stringify(article.sections)` в `index_meta`; изменённая статья пересоздаётся целиком (DELETE старых чанков → батчи → INSERT). `markStudied(articleId)` = `UPDATE chunks SET studied=1` (эмбеддинги не трогаются). Прогресс — `signal<{done,total}>`.

## Контент и приложение

- `src/app/content/` — статьи (`ARTICLES: Article[]`, секции с абзацами и inline-упражнениями) и тест (`TEST_QUESTIONS: ExerciseData[]`, mode 'test').
- `src/app/core/exercise-types.ts` — 10 типов упражнений, унифицированный `ExerciseData`.
- `src/app/exercises/` — по компоненту на тип + exercise-host.
- `src/app/journey/` — генерация «путешествий» через LLM: journey-generator / evaluation / llm-client / journey-state сервисы. LLM-ключ хранится в localStorage, для YandexGPT/GigaChat юзер указывает CORS-прокси в настройках.
- `src/app/pages/` — home, article, test, results.

## UI-триггеры индексации

Кнопка «⟳ Обновить индекс» в journey-settings: `sqlite.init()` → `reindexAll()`, показывает `N / M` из `ReindexService.progress`.

## Незакрытое / нюансы

- Frontend-only: IAM-токен и API-ключ светятся в браузере. Для прода нужен прокси (в кодах помечено).
- Journeys пока не участвуют в `reindexAll` — нет хранилища сгенерированных journeys; паттерн тот же (хеш по `JSON.stringify`).
- `SqliteService.persist()` не даёт Promise, дожидающийся записи — только форсит debounce. При надобности дописать.
- БД создаётся при первом `init()`; миграция `studied` — guarded ALTER, падение игнорируется.

## Правила работы

См. `skills.md` — русский язык, никаких ИИ-оборотов, короткие имена, комментарии только там, где есть неочевидные решения.

