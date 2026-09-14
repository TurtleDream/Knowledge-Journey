Журнал изменений

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
