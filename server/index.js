/**
 * Локальный бэкенд: хранит настройки в файле и проксирует LLM/эмбеддинги,
 * чтобы ключи не светились в браузере.
 *
 * Запуск: node server/index.js (порт из settings.json или 3000)
 * Настройки: server/settings.json (в git не попадает, см. .gitignore)
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const SETTINGS_PATH = path.join(__dirname, 'settings.json');

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch {
    return null;
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
// статика для собранного фронта — ng build и положить в server/dist
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// фронт получает настройки (включая ключи — бэкенд локальный, доверять можно)
app.get('/api/config', (req, res) => {
  const s = loadSettings();
  if (!s) {
    res.status(404).json({ error: 'server/settings.json не найден, скопируй settings.example.json' });
    return;
  }
  res.json(s);
});

// универсальный LLM-прокси: { prompt, systemPrompt } -> { text }
// универсальный вызов LLM по настройкам. yandex — нативный API (URL как во
// фронтенд-клиенте: foundationModels в camelCase, /completion; foundation-models/
// v1/chat/completions не существует — 404, проверено), остальные — OpenAI-совместимые.
async function sendLlm(cfg, systemPrompt, prompt) {
  if (cfg.provider === 'yandex') {
    let folderId = cfg.folderId ?? '';
    let mdl = cfg.model || 'yandexgpt-lite';
    if (mdl.includes('/')) [folderId, mdl] = mdl.split('/');
    const r = await fetch(cfg.apiUrl || 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Api-Key ${cfg.apiKey}` },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/${mdl}`,
        completionOptions: { stream: false, temperature: 0.3, maxTokens: 4000 },
        messages: [
          { role: 'system', text: systemPrompt ?? '' },
          { role: 'user', text: prompt ?? '' },
        ],
      }),
    });
    if (!r.ok) throw Object.assign(new Error(`yandex ${r.status}: ${await r.text()}`), { status: r.status });
    const data = await r.json();
    const text = data?.result?.alternatives?.[0]?.message?.text;
    if (!text) throw new Error('пустой ответ YandexGPT');
    return text;
  }

  let url;
  let headers;
  let model;
  if (cfg.provider === 'gigachat') {
    // токен GigaChat надо получать отдельно — пока только по готовому токену
    url = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
    headers = { Authorization: `Bearer ${cfg.apiKey}` };
    model = cfg.model || 'GigaChat';
  } else if (cfg.provider === 'deepseek') {
    url = 'https://api.deepseek.com/chat/completions';
    headers = { Authorization: `Bearer ${cfg.apiKey}` };
    model = cfg.model || 'deepseek-chat';
  } else {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { Authorization: `Bearer ${cfg.apiKey}` };
    model = cfg.model || 'gpt-4o-mini';
  }
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: systemPrompt ?? '' },
        { role: 'user', content: prompt ?? '' },
      ],
    }),
  });
  if (!r.ok) throw Object.assign(new Error(`${cfg.provider} ошибка ${r.status}: ${await r.text()}`), { status: r.status });
  const data = await r.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

// вытащить JSON из ответа модели, устойчиво к ```json-обёрткам
function parseJsonLoose(text) {
  const cleaned = text.replace(/```(json)?/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error(`Невалидный JSON от LLM: ${text.slice(0, 200)}`);
  }
}

app.post('/api/llm', async (req, res) => {
  const s = loadSettings();
  const { prompt, systemPrompt } = req.body ?? {};
  if (!s?.llm?.apiKey) {
    res.status(400).json({ error: 'llm.apiKey не задан в settings.json' });
    return;
  }
  try {
    res.json({ text: await sendLlm(s.llm, systemPrompt, prompt) });
  } catch (e) {
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

// анализ прогресса: { aggregates, goal } -> { weakTopics, summary }
app.post('/api/analyze', async (req, res) => {
  const s = loadSettings();
  const { aggregates, goal } = req.body ?? {};
  if (!s?.llm?.apiKey) {
    res.status(400).json({ error: 'llm.apiKey не задан в settings.json' });
    return;
  }
  if (!Array.isArray(aggregates)) {
    res.status(400).json({ error: 'ожидался { aggregates: [...] }' });
    return;
  }
  const system = 'Ты — учебный аналитик. Отвечай ТОЛЬКО валидным JSON без markdown-разметки.';
  const goalLine = goal ? `Цель ученика: «${goal}».` : 'Цель не указана — ориентируйся на общее владение промпт-инжинирингом.';
  const prompt = `Агрегаты успеваемости (score 0..1, чем ниже — тем хуже тема усвоена):
${aggregates.map((a) => `- ${a.topic}: score=${Number(a.score ?? 0).toFixed(2)} (correct_rate=${Number(a.correctRate ?? 0).toFixed(2)}, coverage=${Number(a.coverage ?? 0).toFixed(2)})`).join('\n')}

${goalLine}

Задача: выдели 3 слабые темы (низкий score ИЛИ низкая coverage при высокой correct_rate — данных мало).
Для каждой объясни, как именно пробел мешает достичь цели. Темы бери строго из списка выше.

Верни ТОЛЬКО JSON вида:
{"weakTopics":[{"topic":"имя темы как в агрегатах","reason":"почему слабая и как мешает цели"}],"summary":"1-2 предложения об общем прогрессе"}`;
  try {
    res.json(parseJsonLoose(await sendLlm(s.llm, system, prompt)));
  } catch (e) {
    res.status(e.status ?? 502).json({ error: e.message });
  }
});

// рекомендации: { studied, journeyTitle, goal } -> { nextTopics, relatedSkills, resumeSuggestion }
app.post('/api/recommend', async (req, res) => {
  const s = loadSettings();
  const { studied, journeyTitle, goal } = req.body ?? {};
  if (!s?.llm?.apiKey) {
    res.status(400).json({ error: 'llm.apiKey не задан в settings.json' });
    return;
  }
  const system = 'Ты — учебный навигатор по промпт-инжинирингу. Отвечай ТОЛЬКО валидным JSON без markdown-разметки.';
  const goalLine = goal ? `Цель ученика: «${goal}».` : 'Цель не указана — ориентируйся на рост в промпт-инжиниринге.';
  const journeyLine = journeyTitle ? `Текущий journey: «${journeyTitle}».` : 'Активных journeys нет.';
  const studiedLine = Array.isArray(studied) && studied.length
    ? studied.map((t) => `- ${t.topic}: mastery=${Number(t.score ?? 0).toFixed(2)}`).join('\n')
    : '(данных об изученном пока нет — предложи стартовые темы)';
  const prompt = `Изученные темы:
${studiedLine}

${journeyLine}
${goalLine}

Задача:
1. nextTopics — 3 темы, которые изучить ДАЛЬШЕ: логические продолжения изученного.
   Не предлагай то, что уже усвоено (mastery > 0.7).
2. relatedSkills — 2-3 смежных навыка, которые усиливают изученное.
3. resumeSuggestion — если изученного достаточно (mastery > 0.6 хотя бы по 2 темам),
   краткая формулировка для резюме; иначе null.

Верни ТОЛЬКО JSON вида:
{"nextTopics":[{"topic":"имя темы","reason":"почему именно она и как связана с целью"}],
 "relatedSkills":[{"skill":"навык","reason":"как усиливает изученное"}],
 "resumeSuggestion":"текст для резюме или null"}`;
  try {
    res.json(parseJsonLoose(await sendLlm(s.llm, system, prompt)));
  } catch (e) {
    res.status(e.status ?? 502).json({ error: e.message });
  }
});



// эмбеддинги: { texts: string[] } -> { embeddings: number[][] }
app.post('/api/embeddings', async (req, res) => {
  const s = loadSettings();
  const emb = s?.embeddings;
  const texts = req.body?.texts;
  if (!emb?.iamToken && !emb?.apiKey) {
    res.status(400).json({ error: 'embeddings.apiKey или iamToken не заданы в settings.json' });
    return;
  }
  if (!Array.isArray(texts)) {
    res.status(400).json({ error: 'ожидался { texts: string[] }' });
    return;
  }
  const model = emb.kind === 'query' ? 'text-search-query' : 'text-search-doc';
  const auth = emb.apiKey ? `Api-Key ${emb.apiKey}` : `Bearer ${emb.iamToken}`;
  try {
    const embeddings = [];
    for (const text of texts) {
      const r = await fetch(
        // camelCase, как и у completion: foundation-models/v1/text-embedding отдаёт 404
        'https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: auth },
          body: JSON.stringify({ modelUri: `emb://${emb.folderId}/${model}`, text }),
        },
      );
      if (!r.ok) {
        res.status(r.status).json({ error: `yandex embedding ${r.status}: ${await r.text()}` });
        return;
      }
      embeddings.push((await r.json()).embedding);
    }
    res.json({ embeddings });
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
});

const port = loadSettings()?.port ?? 3000;
// занятый порт должен орать, а не молча выходить с code 0
app.on('error', (e) => {
  console.error(`не удалось поднять бэкенд на :${port} — ${e.message}`);
  console.error('скорее всего, сервер уже запущен (netstat -ano | findstr :3000)');
  process.exit(1);
});
app.listen(port, () => console.log(`backend: http://localhost:${port}`));

