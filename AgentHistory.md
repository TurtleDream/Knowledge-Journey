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


## Бэкенд (`server/`)

__`server/index.js`__ — Node + Express + cors (поставлены в dependencies), ~150 строк:

- __`GET /api/config`__ — отдаёт содержимое `server/settings.json`. Файл читается на каждый запрос — правки подхватываются без рестарта.
- __`POST /api/llm`__ `{ prompt, systemPrompt }` → `{ text }` — прокси к YandexGPT / GigaChat / ChatGPT / DeepSeek, ключ берётся из файла, в браузер не попадает.
- __`POST /api/embeddings`__ `{ texts: string[] }` → `{ embeddings: number[][] }` — прокси к Yandex text-embedding (по одному тексту, doc/query из настроек).
- __`GET /api/health`__ + раздача статики из `server/dist` (продовый вариант: `ng build` → результат туда, один процесс на всё).
- Порт из `settings.json` (по умолчанию 3000).

__Настройки в файле:__

- `server/settings.json` — реальные ключи, __в .gitignore__.
- `server/settings.example.json` — шаблон: `port`, `llm {provider, apiKey, model, apiUrl}`, `embeddings {iamToken, folderId, kind}`.

```bash
cp server/settings.example.json server/settings.json  # вписать ключи
node server/index.js
```

## Фронтенд

- __`settings.service.ts`__ — `load()`: один fetch `/api/config`, кэшируется; бэкенд не поднят → `null`, приложение работает как раньше.
- __`LlmClientService.generate`__ — сначала бэкенд. Важно: если бэкенд ответил ошибкой (невалидный ключ в файле), она __пробрасывается__, а не глушится фолбэком на localStorage. Фолбэк на localStorage только если бэкенда нет вообще (`/api/config` → 404/сеть).
- __`EmbedderService.autoConfigure()`__ (вызывается из `reindexAll`) — есть конфиг эмбеддингов → переключается на `BackendEmbeddingProvider`. В интерфейсе `EmbeddingProvider` появился опциональный `embedBatch` — бэкенд умеет батч одним запросом, и `embedBatch()` идёт одним POST вместо пула из 4 воркеров.
- __`proxy.conf.json`__ + `angular.json serve.options.proxyConfig` — при `ng serve` запросы `/api/*` идут на `localhost:3000` без CORS-боли.
- Прямые провайдеры (`YandexEmbeddingProvider`, `OpenAIEmbeddingProvider`) остались — мобильный сценарий без бэкенда не сломан.

__`src/app/core/rag.service.ts`__ — добавлен `search(query, k = 3)`: чистый retrieval (embed → cosine по всем векторам → top-k → `Source[]`), без LLM. `ask()` теперь использует его внутри — дублирования SQL не осталось. Заодно починил dot-доступ к `Row` в `toSource` (TS4111 в app-сборке).

__`src/app/core/prompts/analyzer.prompts.ts`__:

- `ANALYZER_SYSTEM_PROMPT` — «учебный аналитик, ТОЛЬКО валидный JSON»;
- `buildAnalyzerPrompt(aggregates, goal?)` — агрегаты строками + цель юзера; в требовании заложено различение «слабая тема» (низкий score) и «мало данных» (низкая coverage при высокой correct_rate); жёсткий формат ответа с примером.

__`src/app/core/progress-analyzer.service.ts`__ — `analyze(userGoal?)`:

1. `getAggregates()`; пусто → честный summary «данных пока нет», LLM не дёргается.
2. `llm.generateJson<AnalyzerLlmResponse>` — штатные ретраи + толерантный парсинг markdown, руками JSON не парсил.
3. На каждую из 3 слабых тем — `rag.search(topic, 3)`, параллельно (`Promise.all`, эмбеддинги кэшированы).
4. Статьи → человекочитаемые заголовки через `ARTICLES` (fallback: section/chunkId), дедуп.

__UI__ — `journey/components/progress-analyzer/progress-analyzer.component.ts`: кнопка «🔍 Анализ прогресса» в journey-settings (рядом с «Обновить индекс»); модалка в стиле проекта (тёмная, золотые акценты): summary → карточки по темам (тема, reason «как мешает цели», список 📖 статей) → «Закрыть»; клик по оверлею тоже закрывает; ошибка LLM показывается внутри модалки, не падает в консоль молча.

__Замечание:__ тема для `rag.search` — это имя из агрегатов, т.е. то, чем юзер (или твой код) пометил topicId в `trackEvent`. Если там сырые id вроде `tokens`, retrieval будет искать по ним — работает, но лучше человеческие названия тем.


__`src/app/core/prompts/recommender.prompts.ts`:__

- `RECOMMENDER_SYSTEM_PROMPT` — навигатор, только JSON;
- `buildRecommenderPrompt(studied, currentJourney, goal?)` — на вход изученные темы с mastery, заголовок активного journey (или пометка, что journeys нет), цель. В требовании зафиксировано: не предлагать усвоенное (mastery > 0.7), nextTopics = 3, relatedSkills = 2–3 смежных навыка, resumeSuggestion только при mastery > 0.6 хотя бы по двум темам (иначе null). Жёсткий пример JSON.

__`src/app/core/recommender.service.ts`:__

- `recommendNext(userGoal?)`:

  1. Изученные темы — из `UserContextService.getAggregates()` (topic + score), текущий journey — из `JourneyStateService.journey()` (заголовок идёт в промпт).
  2. Один вызов `llm.generateJson` (штатные ретраи) — сразу nextTopics + relatedSkills + resumeSuggestion.
  3. Для каждой next-topic — `rag.search(topic, 2)` параллельно, статьи дедупятся и мапятся на заголовки из `ARTICLES`.

- `suggestResumeSkills(studiedTopics)`: принимает список тем, сверяет с агрегатами (нет данных → mastery 0.5 по умолчанию), один LLM-вызов, на выходе строки строго в формате «На основе изученного: добавьте навык X в резюме, потому что …

__`src/app/journey/prompts/journey-rag.prompts.ts`:__

- `RAG_JOURNEY_HINT` — «Используй материалы платформы… строго в их терминах, не выдумывай факты»;
- `MIN_STUDIED_SOURCES = 3` — порог «изученного мало»;
- `buildContextBlock(sources)` — пронумерованные чанки с секциями;
- `toSourceRef` — `chunk_id → url` (`/article/<articleId>`, маршрут есть в app.routes) + `section`.

__`RagService.search`__ — третий параметр `opts.onlyStudied`: фильтр по `studied` __после__ сортировки (иначе порог top-k откусит релевантные неучёные чанки).

__`JourneyGeneratorService`__:

- Пайплайн: `search(topic, 10, {onlyStudied: true})` → если `< 3` чанков, генерация не запускается, а второй поиск (уже без фильтра, топ-5) формирует список «сначала изучить». Порог проверяется до LLM — ключ не тратится.
- Контекст (hint + блок чанков) добавляется к промптам концепций и чекпоинтов; активности — без блока (генерятся на базе чекпоинта, там контекст не нужен).
- Возвращаемый тип — union `JourneyGeneration`: `{status:'ok', journey}` | `{status:'need-study', articles}`.
- `origin: 'ai'` проставляется в journey при сохранении (поле добавлено в модель `Journey`, опциональное — старые journeys из localStorage валидны).
- `journey.sources[]` — на каждый чекпоинт: retrieval по `cp.concept` среди изученных (3 релевантных, дедуп по chunkId); если по концепции пусто — fallback: первые 3 чанка общего контекста.

__`journey-input`__: обрабатывает `need-study` — блок «Изученного материала по теме пока мало. Сначала пройди:» со ссылками (RouterLink) на страницы статей.


## Что появилось (`src/app/ai/`)

__1. `components/ai-chat-button/`__ — FAB в правом нижнем углу (fixed, z-index 900):

- SVG-иконка: свиток + глаз, обводка `#8b0000`, свечение при hover;
- бейдж = количество слабых тем (`score < 0.5` из `UserContextService`), пересчитывается при загрузке; без БД бейдж просто не показывается;
- клик → `EventEmitter open` → родитель открывает панель.

__2. `components/ai-chat-panel/`__ — два режима одним компонентом:

- __panel-mode__ (в app.component): fixed справа, 400px, slide-in через `transform: translateX`, хост-биндинг `[class.panel-mode]/[class.open]`, шапка «🔮 Оракул» с крестиком;
- __compact__ (на странице `/ai`): inline-блок;
- сообщения: инпут + enter, чекбокс «Поиск по изученному» (маппится на `includeUnstudied: false`);
- подтверждение: если `needsUnstudiedConfirm` — кнопка «Разрешить» переспрашивает с `includeUnstudied: true`;
- под ответом: источники со ссылками на `/article/:id` и бейджем «Изучено» (зелёный) / «Не изучено» (серый);
- маркер origin: «✓ На основе платформы» зелёный / «Общие знания» серый.

__3. `components/recommendations-modal/`__ — модалка: nextTopics с причинами и списком 📖 статей, смежные навыки, блок «В резюме» (рамка `#8b0000`).

__4. `pages/ai/ai.component.ts`__ (`/ai`) — вкладки через signal: 💬 Чат (панель inline, 65vh) | 📊 Анализ прогресса (кнопка → существующая модалка analyzer) | 🎯 Рекомендации (новая модалка) | 🗺 Генератор Journey (встроенный `app-journey-input`).

__Проводка:__ маршрут `/ai` в `app.routes.ts` (lazy), в шапке появилась ссылка «Оракул», в `app.component` — FAB + панель (`chatOpen`).

## 1. Анализ прогресса и рекомендации — из чата

__`AiChatPanelComponent`__ — над полем ввода два чипа быстрого действия (только в режиме панели, не в inline-чате на `/ai`):

```javascript
📊 Анализ прогресса   🎯 Рекомендации
```

Клик → `@Output() openProgress` / `openRecommendations`.

__`app.component`__ (он хостит панель) — держит обе модалки и пробрасывает события:

```ts
openFromChat(modal) { this.chatOpen = false; void modal.open(); }
```

Панель закрывается перед показом модалки — они не спорят за экран. Теперь доступно с любой страницы: FAB → чип → модалка.

## 2. Journey по изученным темам

__`JourneyGeneratorService.suggestTopicFromProgress()`__ — берёт агрегаты, сортирует по `score` по возрастанию и склеивает __3 самые слабые темы__ через `+` (например `токены + галлюцинации + промпт-инжиниринг`). Логика: journey должен вести туда, где провисает, а не туда, где уже хорошо. Нет агрегатов → `null`.

__`journey-input`__ — кнопка __«🎯 Тема по моему прогрессу»__ над полем ввода: подставляет получившуюся тему (дальше обычная генерация, уже с RAG-контекстом по изученным материалам). Если прогресса нет — понятная подсказка «пройди тест или отметь статьи как изученные», а не пустое поле.

__Замечание:__ тема собирается из `topicId`, которыми помечены события. Сейчас это первый тег статьи и темы тестов — если названия не совпадают, темы могут выглядеть техническими (`tokens`). Согласование справочника тем — отдельная задача; скажи, если делать.
