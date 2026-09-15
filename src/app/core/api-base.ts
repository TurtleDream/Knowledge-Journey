/**
 * База для /api-запросов. На localhost — относительный путь (через прокси ng serve
 * или тот же origin), иначе (GitHub Pages, file://) — явный адрес локального бэкенда.
 * На другой машине внутри сети: положи origin бэкенда в localStorage.kj-api-base.
 */
export function apiBase(): string {
  const stored = localStorage.getItem('kj-api-base');
  if (stored) return stored.replace(/\/$/, '');
  const h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return '';
  return 'http://localhost:3000';
}
