/**
 * Стартует бэкенд + фронт одним процессом.
 * Бэкенд с автоперезапуском: если упал — поднимается через 2 сек.
 * Запуск: npm run start:all  (или двойной клик по start-all.bat)
 */

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(name, command, opts = {}) {
  // shell:true + args дают DEP0190 — собираем команду одной строкой
  const p = spawn(command, { cwd: ROOT, shell: true, ...opts });
  const tag = `[${name}]`;
  p.stdout.on('data', (d) => process.stdout.write(`${tag} ${d}`));
  p.stderr.on('data', (d) => process.stderr.write(`${tag} ${d}`));
  return p;
}

let backend = null;

function startBackend() {
  backend = run('backend', 'node server/index.js');
  backend.on('exit', (code) => {
    console.log(`[backend] упал (code=${code}), перезапуск через 2 сек…`);
    setTimeout(startBackend, 2000);
  });
}

startBackend();
run('frontend', 'npm start');

process.on('SIGINT', () => {
  if (backend) backend.kill();
  process.exit(0);
});
