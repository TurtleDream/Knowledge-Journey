import { Injectable } from '@angular/core';

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

export type Row = Record<string, unknown>;

const DB_KEY = 'kj.sqlite';
const STORE = 'dbs';
const PERSIST_DEBOUNCE_MS = 500;

// поднимаем sql.js. wasm лежит в assets — если путь поменялся, тут же поправить locateFile
@Injectable({ providedIn: 'root' })
export class SqliteService {
  private db: Database | null = null;
  private initPromise: Promise<void> | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  // wasmDir — относительный путь к каталогу с sql-wasm.wasm; в karma он другой
  async init(wasmDir = 'assets/'): Promise<void> {
    this.initPromise ??= this.doInit(wasmDir);
    return this.initPromise;
  }

  private async doInit(wasmDir: string): Promise<void> {
    let SQL: SqlJsStatic;
    try {
      SQL = await initSqlJs({
        locateFile: (f: string) => `${wasmDir}${f}`,
      });
    } catch (e) {
      throw new Error(`sql.js WASM не загрузился: ${String(e)}`);
    }

    const bytes = await this.loadFromIdb();
    this.db = bytes ? new SQL.Database(bytes) : new SQL.Database();
    this.migrate();

    // pagehide, а не beforeunload — на mobile Safari beforeunload ненадёжен
    window.addEventListener('pagehide', () => {
      this.persistNow();
    });
  }

  private migrate(): void {
    if (!this.db) throw new Error('db not open');
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        article_id TEXT NOT NULL,
        idx INTEGER NOT NULL,
        section TEXT,
        text TEXT NOT NULL,
        studied INTEGER NOT NULL DEFAULT 0,
        UNIQUE(article_id, idx)
      );
      CREATE TABLE IF NOT EXISTS embeddings (
        chunk_id TEXT PRIMARY KEY REFERENCES chunks(id),
        vec BLOB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS user_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        kind TEXT NOT NULL,
        payload TEXT
      );
      CREATE TABLE IF NOT EXISTS topic_mastery (
        topic TEXT PRIMARY KEY,
        score REAL NOT NULL DEFAULT 0,
        correct_rate REAL NOT NULL DEFAULT 0,
        recency REAL NOT NULL DEFAULT 0,
        coverage REAL NOT NULL DEFAULT 0,
        updated_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS embeddings_cache (
        key TEXT PRIMARY KEY,
        vec BLOB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS index_meta (
        source_id TEXT PRIMARY KEY,
        hash TEXT NOT NULL
      );
    `);
    // для БД, созданных до появления studied — ALTER молча падает на свежих
    try {
      this.db.run('ALTER TABLE chunks ADD COLUMN studied INTEGER NOT NULL DEFAULT 0');
    } catch {
      /* колонка уже есть */
    }
    try {
      this.db.run('ALTER TABLE chunks ADD COLUMN section TEXT');
    } catch {
      /* колонка уже есть */
    }
    for (const col of ['correct_rate REAL', 'recency REAL', 'coverage REAL']) {
      try {
        this.db.run(`ALTER TABLE topic_mastery ADD COLUMN ${col}`);
      } catch {
        /* колонка уже есть */
      }
    }
  }

  exec(sql: string, params: unknown[] = []): Promise<Row[]> {
    const db = this.db;
    if (!db) return Promise.reject(new Error('SqliteService не инициализирован'));

    const stmt = db.prepare(sql);
    try {
      stmt.bind(params as never);
      const rows: Row[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as Row);
      }
      return Promise.resolve(rows);
    } catch (e) {
      return Promise.reject(e);
    } finally {
      stmt.free();
    }
  }

  run(sql: string, params: unknown[] = []): Promise<void> {
    const db = this.db;
    if (!db) return Promise.reject(new Error('SqliteService не инициализирован'));

    try {
      const stmt = db.prepare(sql);
      stmt.bind(params as never);
      stmt.step();
      stmt.free();
    } catch (e) {
      return Promise.reject(e);
    }
    this.schedulePersist();
    return Promise.resolve();
  }

  // debounce, чтобы не дёргать export на каждую мутацию
  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.persistNow();
    }, PERSIST_DEBOUNCE_MS);
  }

  persist(): Promise<void> {
    this.schedulePersist();
    return Promise.resolve();
  }

  private persistNow(): void {
    const db = this.db;
    if (!db) return;
    try {
      const bytes = db.export();
      this.saveToIdb(bytes);
    } catch (e) {
      // при unload поймать уже некому, просто не роняем страницу
      console.error('persist failed', e);
    }
  }

  private loadFromIdb(): Promise<Uint8Array | null> {
    return new Promise((res, rej) => {
      const req = indexedDB.open('kj-db', 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onerror = () => rej(req.error);
      req.onsuccess = () => {
        const idb = req.result;
        const tx = idb.transaction(STORE, 'readonly');
        const get = tx.objectStore(STORE).get(DB_KEY);
        get.onsuccess = () => res((get.result as Uint8Array | undefined) ?? null);
        get.onerror = () => rej(get.error);
      };
    });
  }

  private saveToIdb(bytes: Uint8Array): void {
    const req = indexedDB.open('kj-db', 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(bytes, DB_KEY);
    };
  }
}
