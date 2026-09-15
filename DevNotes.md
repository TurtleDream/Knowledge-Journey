Журнал изменений

2026-09-15 16:46 — v 3.1.0 Обновление UI

Область:  Frontend | Backand | Documentation

Что изменилось:

    Добавлен пункт "Оракул для работы с AI"
    Добавлен чат для работы с AI
    Добавлены функциональности для генерация journey на основе изученной базы
    В чат и оракула встроенны рекомендации по изучению и анализ прогресса

Затронутые пути:

    src/app/pages/article/article.component.ts
    src/app/journey/services/llm-client.service.ts
    src/app/journey/services/journey-generator.service.ts
    src/app/journey/pages/journey-input/journey-input.component.ts
    src/app/journey/components/progress-analyzer/progress-analyzer.component.ts
    src/app/core/prompts/trainer.prompts.ts
    src/app/core/sqlite.service.ts
    src/app/core/settings.service.ts
    src/app/core/reindex.service.ts
    src/app/core/recommender.service.ts
    src/app/core/rag.service.ts
    src/app/core/progress-analyzer.service.ts
    src/app/core/embedding-provider.ts
    src/app/core/embedder.service.ts
    src/app/core/chat-journey.service.ts
    src/app/core/api-base.ts
    src/app/ai/pages/ai/ai.component.ts
    src/app/ai/components/recommendations-modal/recommendations-modal.component.ts
    src/app/ai/components/ai-chat-panel/ai-chat-panel.component.ts
    src/app/ai/components/ai-chat-button/ai-chat-button.component.ts
    src/app/app.routes.ts
    src/app/app.config.ts
    src/app/app.component.ts
    server/start-all.js
    server/index.js
    start-all.bat
    package.json

Зачем / контекст:

    Финализация функционала

2026-09-14 15:47 — v 3.0.4 Генератор Journey через RAG

Область:  Frontend | Documentation

Что изменилось:

    Добавлен механизм генерации путешествия используя пройденные темы (изученный контент)

Затронутые пути:

    src/app/journey/services/journey-generator.service.ts
    src/app/journey/prompts/journey-rag.prompts.ts
    src/app/journey/pages/journey-input/journey-input.component.ts
    src/app/journey/models/journey.models.ts
    src/app/core/rag.service.ts

Зачем / контекст:

    Для улучшения закрепления на основе изученного


2026-09-14 15:32 — v 3.0.3 Рекомендатор следующих шагов

Область:  Frontend | Documentation

Что изменилось:

    Добавлен механизм рекомендации следующих шагов
    Рекомендует доп освоение навыков
    Предлагает добавить навыки в резюме

Затронутые пути:

    src/app/core/prompts/recommender.prompts.ts
    src/app/core/recommender.service.ts

Зачем / контекст:

    Для формироания целей обучения


2026-09-14 15:22 — v 3.0.2 Анализатор прогресса

Область:  Frontend | Documentation

Что изменилось:

    Добавлен анализатор прогресса, предлагает темы для изучения 

Затронутые пути:

    src/app/journey/pages/journey-settings/journey-settings.component.ts
    src/app/journey/components/progress-analyzer/progress-analyzer.component.ts
    src/app/core/prompts/analyzer.prompts.ts
    src/app/core/rag.service.ts
    src/app/core/progress-analyzer.service.ts

Зачем / контекст:

    Поддержка чистоты кода

2026-09-14 14:30 — Персональный контекст (события + агрегаты)

Область:  Backend | Documentation

Что изменилось:

    Прикручивание сохранения персонального контекста

Затронутые пути:

    src/app/core/embedder.service.ts
    src/app/core/reindex.service.ts
    src/app/core/sqlite.service.ts
    src/app/core/user-context.service.spec.ts
    src/app/core/user-context.service.ts
    src/assets/sql-wasm-browser.wasm

Зачем / контекст:

    Фича для персонализации

2026-09-14 14:03 — RAG-поиск с бейджем «Ещё не изучено»

Область:  Backend | Documentation

Что изменилось:

    Функционал для поиска по изученным знаниям

Затронутые пути:

    src/app/core/rag.service.ts
    src/app/core/reindex.service.ts
    src/app/core/sqlite.service.ts
    src/app/core/prompts/rag.prompts.ts

Зачем / контекст:

    Формирование основы для RAG

2026-09-14 13:57 —  Индексация + reindex

Область:  Backend | Documentation

Что изменилось:

    Добавлен ReindexService
    Основа готова

Затронутые пути:

    src/app/core/embedder.service.ts
    src/app/core/embedding-provider.ts
    src/app/core/reindex.service.ts
    src/app/core/sqlite.service.ts
    src/app/journey/pages/journey-settings/journey-settings.component.ts

Зачем / контекст:

    Формирование основы для RAG

2026-09-14 13:52 — Embedder с кэшем (YandexGPT)

Область:  Backend | Documentation

Что изменилось:

    Добавлен Embedder с кэшем для RAG

Затронутые пути:

    src/app/core/embedder.service.ts
    src/app/core/embedding-provider.ts

Зачем / контекст:

    Формирование основы для RAG

2026-09-14 13:44 — Добавление Chunker

Область:  Backend | Documentation

Что изменилось:

    Добавлен Chunker сервис

Затронутые пути:

    src/app/core/content-chunker.service.spec.ts
    src/app/core/content-chunker.service.ts

Зачем / контекст:

    Формирование основы


2026-09-14 13:36 — SQLite + sql.js в Angular

Область:  Backend | Documentation

Что изменилось:

    Добавлен SQLite для RAG и хранения контекста
    Добавлены файлы документации

Затронутые пути:

    AgentHistory.md
    CONTEXT.md
    DevNotes.md
    package-lock.json
    package.json
    Skills.md
    src/app/core/sqlite.service.ts
    src/assets/sql-wasm.wasm

Зачем / контекст:

    для RAG и хранения контекста
