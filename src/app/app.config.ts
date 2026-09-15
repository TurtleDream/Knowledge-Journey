import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { SqliteService } from './core/sqlite.service';
import { EmbedderService } from './core/embedder.service';


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // SQLite и эмбеддинги должны быть готовы до первого запроса из любого UI
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (sqlite: SqliteService, embedder: EmbedderService) => () =>
        // ошибка старта БД не должна блокировать приложение — UI покажет её при запросе
        sqlite.init()
          .then(() => embedder.autoConfigure())
          .catch((err) => console.error('sqlite/embedder init failed', err)),
      deps: [SqliteService, EmbedderService],
    },

  ],
};