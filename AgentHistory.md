__Что сделано:__

1. __`npm i sql.js`__, `sql-wasm.wasm` скопирован в `src/assets/` (путь захардкожен в `locateFile` — если поменяется, править там).

2. __`src/app/core/sqlite.service.ts`__ — standalone-сервис (`providedIn: 'root'`):

   - `init()` — грузит WASM (ошибка загрузки заворачивается в понятный `Error`), открывает БД из IndexedDB (`kj-db` → store `dbs`, ключ `kj.sqlite`) или создаёт новую; `initPromise` кэшируется, повторные вызовы бесплатны.
   - `exec(sql, params)` — `Row[]` через `prepare/bind/step` (free() в `finally`).
   - `run(sql, params)` — мутация + планирование persist.
   - `persist()` / внутренний `persistNow()` — `db.export()` → IndexedDB, __debounce 500ms__.
   - Хук на `pagehide` (не `beforeunload` — на mobile Safari тот ненадёжен) регистрируется в `init()` и сохраняет БД синхронно перед уходом.

3. __Schema__ в `migrate()`: `chunks`, `embeddings`, `user_events`, `topic_mastery`, `embeddings_cache` — все `CREATE TABLE IF NOT EXISTS`, идемпотентно.

Готово — тесты зелёные (4/4 SUCCESS).

__`src/app/core/content-chunker.service.ts`:__

- `Chunk` — `{ id, source: 'article'|'journey'|'test', sourceId, section?, text, meta: { studied, type?, exerciseType? } }`.
- `chunkArticle(article)` — идёт по секциям реальной структуры из `articles.data.ts` (`sections[].heading?/paragraphs[]/exercises?`): каждый абзац — чанк с `section` из заголовка, каждое упражнение — отдельный чанк (`text` = вопрос, `meta.type = 'exercise'`, `exerciseType` из `ExerciseData`). В текст упражнения explanation не включаю — он для показа юзеру, не для эмбеддинга.
- `chunkJourney(journey)` — весь `Journey` одним чанком (`title + JSON.stringify`), id `journey:<id>`.
- `chunkTestQuestion(q, idx)` — `question + correctAnswerText()`: хелпер вытаскивает правильный ответ по типу (`correctIndexes→options`, `acceptedAnswers`, `correctBoolean`, `correctPairs`, `steps`, `referencePrompt`), без `explanation`.
- `chunkAll(journeys = [])` — статьи из `ARTICLES` + переданные journeys + `TEST_QUESTIONS`.

__Тест__ — `content-chunker.service.spec.ts`, чистый jasmine без TestBed (сервис stateless): проверяет «абзац = чанк», метаданные упражнения и отсутствие explanation, тяготение `section`, уникальность id и `studied: false`.

Пример структуры статьи, на которую завязан чанкер (реальная, из `articles.data.ts`):

```ts
{
  id: 'how-llms-work',
  title: 'Как работают LLM (интуитивно)',
  sections: [
    { heading: 'Токенизация: из чего состоит текст',
      paragraphs: ['Перед обработкой текст разбивается на токены...', '...'],
      exercises: [{ type: 'multiple-choice', question: 'Что такое токен?', options: [...], correctIndexes: [1], explanation: '...' }] },
    { heading: 'Предсказание следующего слова', paragraphs: ['...'] },
  ],
}
```

→ 3 чанка абзацев + 1 чанк упражнения (`id: 'how-llms-work:3'`, `section: 'Токенизация...'`).

Нюанс: для запуска тестов локально Chrome не установлен — запускал через `CHROME_BIN=msedge`. Если захочешь зафиксировать, можно прописать `process.env.CHROME_BIN` в `karma.conf` / `test.ts`.


Компилируется, существующие тесты зелёные.

__API YandexGPT (проверил — актуально):__

- Endpoint: `POST https://llm.api.cloud.yandex.net/foundation-models/v1/text-embedding`
- Тело: `{ "modelUri": "emb://<folderId>/text-search-doc", "text": "..." }`, ответ `{ "embedding": [...] }`
- Модели: `text-search-doc` для документов, `text-search-query` для поисковых запросов — их __нельзя смешивать__ (вектора в разных пространствах), поэтому в провайдере флаг `kind: 'doc' | 'query'`.

__Файлы:__

1. __`src/app/core/embedding-provider.ts`__ — абстракция:

   - `EmbeddingProvider` — интерфейс с одним `embed(text): Promise<number[]>`.
   - `YandexEmbeddingProvider` — реализация выше.
   - `OpenAIEmbeddingProvider` — уже набросан (`/v1/embeddings`, `text-embedding-3-small`), переключение = `embedder.setProvider(new OpenAIEmbeddingProvider(key))`.

2. __`src/app/core/embedder.service.ts`__:

   - `embed(text)`: SHA-256 через `crypto.subtle` → lookup в `embeddings_cache` (вектор хранится как BLOB — `Float32Array` байты, при чтении разворачивается обратно). Промах → запрос → `INSERT OR REPLACE` (persist в IndexedDB debounce'ится самим `SqliteService`).
   - `embedBatch(texts)`: лимит 50 (больше — ошибка, резать наверху), ограничение параллелизма 4 воркера.
   - `embedWithRetry`: retry только на 429/5xx, до 3 попыток, backoff 500ms → 1s → 2s.

__Два честных замечания:__

- «max 50 текстов за запрос» для Яндекса физически не существует — их API принимает один текст на вызов. Батчинг реализован как пачка из ≤50 текстов с семафором. Если потом перейдёте на OpenAI, там батч возможен в одном запросе — можно будет переопределить в провайдере (добавить опциональный `embedBatch` в интерфейс).
- Frontend-only: IAM-токен/ключ лежит в браузере и виден любому. Для реального ключа нужен прокси; в коде это помечено комментарием, токен пока заглушка.


__Изменения схемы__ (`sqlite.service.ts`, миграция идемпотентна):

- `chunks.id` → `TEXT PRIMARY KEY` (формат `articleId:idx`), добавлена колонка `studied INTEGER DEFAULT 0` (+ guarded `ALTER TABLE` для старых БД).
- `embeddings.chunk_id` → `TEXT` (ссылается на текстовый id чанка).
- Новая таблица `index_meta(source_id, hash)` — хеш контента статьи для инкрементальности.

__`src/app/core/reindex.service.ts`:__

- `reindexAll(force = false)` — считает SHA-256 от `JSON.stringify(article.sections)` каждой статьи; если хеш совпал со сохранённым — статья пропускается целиком (ни эмбеддингов, ни записи). Прогресс в `signal<{done,total}>` — `total` считается только по реально переиндексируемым статьям. Возвращает `{chunks, time}`.
- `reindexArticle(article, hash?)` — DELETE старых чанков/векторов статьи (`LIKE 'articleId:%'`), батчи по 50 через `embedBatch`, запись `chunks` + `embeddings` (вектор — BLOB из `Float32Array`), обновление хеша в `index_meta`. `idx` мог поехать после правки текста, поэтому полная замена, а не UPSERT.
- `markStudied(articleId)` — `UPDATE chunks SET studied = 1`. Эмбеддинги не пересчитываются: текст не менялся, кэш по хешу и так валиден.
- Прогресс — Angular `signal`, обновляется после каждого чанка (батчами по 50), компонент подписан через `progress()` в шаблоне.

__UI__ (`journey-settings.component.ts`): блок «Индекс знаний» с кнопкой «⟳ Обновить индекс»; во время работы — `Индексация N / M…` и disabled, после — «X чанков за Y мс». Перед запуском вызывает `sqlite.init()`.

__Нюанс:__ journeys в `reindexAll` сейчас не участвуют — `chunkAll` их принимает, но journeys генерятся в рантайме и не лежат в константах; когда появится хранилище сгенерированных journeys, добавлю их во второй цикл тем же паттерном (хеш по `JSON.stringify(journey)`).

Готово, компилируется и тесты зелёные.

__`src/app/core/prompts/rag.prompts.ts`__ — по образцу `journey/prompts/`:

- `RAG_SYSTEM_PROMPT` — «Отвечай ТОЛЬКО на основе контекста… Если контекста мало — добавь пометку [ОБЩИЕ ЗНАНИЯ] и ответь из своих знаний» + требование ссылаться на чанки `[N]`.
- `buildRagPrompt(question, chunks)` — пронумерованный контекст `[1]…[N]` + вопрос.

__`src/app/core/rag.service.ts`__:

- Пайплайн `ask()`:

  1. `embedder.embed(question)` → все векторы из SQLite одним JOIN-запросом (сотни-тысячи строк для frontend-only — в память ок).
  2. Cosine similarity, top-K = 5; `studied = 0` → `source.unstudied = true`.
  3. `includeUnstudied = false` и все top-K не изучены → `{ needsUnstudiedConfirm: true, sources }` — тип результата поэтому union (`RagResult`).
  4. `llm.generate(prompt, system)` — штатный клиент (Yandex/GigaChat/ChatGPT/DeepSeek).
  5. Парсинг `[N]` → `source.cited = true` у использованных чанков. Регэксп `[(\d+)]` с проверкой границ — модель любит несуществующие номера.
  6. `origin`: ищем `[ОБЩИЕ ЗНАНИЯ]` case-insensitive (модель может вернуть `[Общие знания]`), пометку из текста ответа убираю.

- Пустой индекс → честный `origin: 'general'` с пустым answer (пока без fallback-генерации — FIXME, если нужно).

__Сопутствующая правка схемы__: в `chunks` добавлена колонка `section TEXT` (CREATE + guarded ALTER для существующих БД), `ReindexService.saveChunk` теперь её пишет — она нужна источникам, чтобы в UI показывать «Из статьи X → раздел Y».

__Замечание:__ цитаты `[N]` после парсинга остаются в тексте ответа — чистить их при рендере (например, подсветить как ссылки) решать UI-компоненту.


__`src/app/core/user-context.service.ts`__:

- `trackEvent({ type, topicId, correct?, timeSpent?, ts? })` — событие целиком сериализуется в `payload` (JSON) таблицы `user_events`, `ts` по умолчанию `Date.now()`.
- `getAggregates(): TopicMastery[]` — пересчёт on-demand: смотрю `MAX(updated_at)` в `topic_mastery`, если старше 5 мин (или внутренний `lastRecompute` тоже устарел) — полный `recompute()` из сырых событий, иначе чтение готовой таблицы.
- `getWeakTopics(n)` / `getStrongTopics(n)` — сортировка по `score` asc/desc.
- `getPromptContext(topicId)` — то, что уходит в LLM: __только__ строка агрегатов по теме + последние 3 события (mistake) из `user_events`, без сырой истории.mistake-фильтр по `payload LIKE '%"topicId":"..."%'` — грубовато, но дешево и работает для нашего формата payload.
- `exportData()` — JSON `{ exportedAt, events, mastery }`; `clearData()` — DELETE обеих таблиц (persist в IndexedDB debounce'ится самим SqliteService).

__Схема__: `topic_mastery` расширена колонками `correct_rate, recency, coverage` (CREATE + guarded ALTER — тот же паттерн, что для `studied`/`section`).

__Формула `score = 0.6 * correct_rate + 0.2 * recency + 0.2 * coverage` — почему так:__

1. __correct_rate 0.6__ — это единственная компонента, которая напрямую отражает знание, а не активность. Главный сигнал, не зря доминирует.
2. __recency 0.2__ — экспоненциальный распад: `0.5^(Δt / 24ч)`, сутки = полураспад. Малый вес обоснован: свежесть показывает, что данные актуальны, но сама по себе не про знание — ученик, вернувшийся через неделю, не «отупел» на 0.6. Поэтому recency только слегка подмешивается, а не давит.
3. __coverage 0.2__ — `min(1, answered / 10)`. Защита от самообмана при малой выборке: 1 правильный ответ из 1 даёт correct_rate = 1.0, но mastery не должна быть максимальной. Coverage сдерживает score, пока на тему мало данных. 10 — условная «полная тема» (у нас тест из 12 вопросов, inline-упражнений на тему ~2–4, 10 = несколько сессий).
4. Сумма весов = 1, все компоненты в [0,1] — score интерпретируем как вероятность/уровень, легко сравнивать темы между собой.
