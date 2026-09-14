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
