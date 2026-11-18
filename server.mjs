import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { plots, canPlant } from './public/plots.mjs';

const vercelPreview = process.env.VERCEL === '1';
const directory = process.env.TED_DATA_DIR ?? (vercelPreview
  ? join(tmpdir(), 'ted-island')
  : fileURLToPath(new URL('./data/', import.meta.url)));
mkdirSync(directory, { recursive: true });
const db = new DatabaseSync(join(directory, 'garden.sqlite'));
const plantColumns=`
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  island INTEGER NOT NULL,
  plot INTEGER NOT NULL,
  title TEXT NOT NULL,
  idea TEXT NOT NULL,
  pdf BLOB NOT NULL,
  planted_at TEXT NOT NULL,
  x REAL,
  z REAL,
  UNIQUE (island, plot)
`;
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS plants (${plantColumns});
  CREATE TABLE IF NOT EXISTS watering (
    plant TEXT NOT NULL REFERENCES plants(id),
    player TEXT NOT NULL,
    PRIMARY KEY (plant, player)
  );
`);
const columns = db.prepare("PRAGMA table_info(plants)").all();
if (!columns.some(column => column.name === 'x')) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('ALTER TABLE plants ADD COLUMN x REAL; ALTER TABLE plants ADD COLUMN z REAL;');
    const locate = db.prepare('UPDATE plants SET x=?, z=? WHERE plot=?');
    plots.forEach(([x,z],plot) => locate.run(x,z,plot));
    db.exec('COMMIT');
  } catch(error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
const ownerIsUnique=db.prepare("PRAGMA index_list(plants)").all().some(index=>{
  if(!index.unique)return false;
  const columns=db.prepare('SELECT name FROM pragma_index_info(?)').all(index.name);
  return columns.length===1&&columns[0].name==='owner';
});
if(ownerIsUnique){
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`
      CREATE TABLE plants_next (${plantColumns});
      INSERT INTO plants_next (id,owner,island,plot,title,idea,pdf,planted_at,x,z)
        SELECT id,owner,island,plot,title,idea,pdf,planted_at,x,z FROM plants;
      DROP TABLE plants;
      ALTER TABLE plants_next RENAME TO plants;
    `);
    if(db.prepare('PRAGMA foreign_key_check').get())throw new Error('Plant migration found broken links.');
    db.exec('COMMIT');
  } catch(error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}
const list = db.prepare(`
  SELECT p.id, p.x, p.z, p.title, p.idea, p.planted_at AS plantedAt,
    p.owner = ? AS mine,
    EXISTS (SELECT 1 FROM watering WHERE plant=p.id AND player=?) AS watered,
    (SELECT count(*) FROM watering WHERE plant=p.id) AS likes
  FROM plants p WHERE p.island=0 ORDER BY p.planted_at, p.id
`);
const find = db.prepare('SELECT owner FROM plants WHERE id=?');
const nearby = db.prepare('SELECT id FROM plants WHERE island=0 AND (x-?)*(x-?)+(z-?)*(z-?) < .16');
const insert = db.prepare(`
  INSERT INTO plants (id,owner,island,plot,title,idea,pdf,planted_at,x,z)
  VALUES (?,?,0,(SELECT COALESCE(MAX(plot),-1)+1 FROM plants WHERE island=0),?,?,?,?,?,?)
`);
const water = db.prepare('INSERT OR IGNORE INTO watering VALUES (?, ?)');
const getPDF = db.prepare('SELECT pdf FROM plants WHERE id=?');
const clients = new Map();
const maxPDF = 10 * 1024 * 1024;
const files = new Map([
  ['/', [new URL('./public/index.html', import.meta.url), 'text/html; charset=utf-8']],
  ['/style.css', [new URL('./public/style.css', import.meta.url), 'text/css; charset=utf-8']],
  ['/scene.mjs', [new URL('./public/scene.mjs', import.meta.url), 'text/javascript; charset=utf-8']],
  ['/app.mjs', [new URL('./public/app.mjs', import.meta.url), 'text/javascript; charset=utf-8']],
  ['/plots.mjs', [new URL('./public/plots.mjs', import.meta.url), 'text/javascript; charset=utf-8']]
].map(([path, [url, type]]) => [path, [readFileSync(url), type]]));

function playerFor(req, res) {
  const existing = /(?:^|;\s*)ted-player=([a-f0-9-]{36})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1];
  if (existing) return existing;
  const player = randomUUID();
  const secure = process.env.TED_SECURE_COOKIE === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', 'ted-player=' + player + '; Path=/; Max-Age=31536000; HttpOnly; SameSite=Strict' + secure);
  return player;
}

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

function snapshot(player) {
  return list.all(player, player);
}

function broadcast() {
  for (const [res, player] of clients) {
    if (res.writableLength > 1024 * 1024) res.destroy();
    else res.write('data: ' + JSON.stringify(snapshot(player)) + '\n\n');
  }
}

async function plant(req, res, player) {
  const type = req.headers['content-type'] ?? '';
  const maxBody = maxPDF + 32 * 1024;
  if (Number(req.headers['content-length']) > maxBody) {
    return json(res, 413, { error: 'The PDF must be 10 MB or smaller.' });
  }
  if (!type.startsWith('multipart/form-data;')) {
    return json(res, 415, { error: 'Upload a PDF research article.' });
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > maxBody) {
      res.setHeader('Connection', 'close');
      return json(res, 413, { error: 'The PDF must be 10 MB or smaller.' });
    }
    chunks.push(chunk);
  }
  let form;
  try {
    form = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': type } }).formData();
  } catch {
    return json(res, 400, { error: 'The article upload could not be read.' });
  }
  const field = (name) => {
    const value = form.get(name);
    return typeof value === 'string' ? value.trim() : '';
  };
  const coordinate = (name) => field(name) ? Math.round(Number(field(name))*1000)/1000 : NaN;
  const x = coordinate('x'), z = coordinate('z');
  const title = field('title'), idea = field('idea');
  if (!canPlant(x,z) || !title || title.length > 120 || !idea || idea.length > 500) {
    return json(res, 400, { error: 'Aim at open grass and enter a title and research idea.' });
  }
  const article = form.get('article');
  if (!(article instanceof File) || article.size === 0) {
    return json(res, 400, { error: 'Upload a PDF research article.' });
  }
  if (article.size > maxPDF) return json(res, 413, { error: 'The PDF must be 10 MB or smaller.' });
  const pdf = Buffer.from(await article.arrayBuffer());
  if (!/^%PDF-\d\.\d/.test(pdf.subarray(0, 8).toString('ascii')) || !pdf.subarray(-1024).includes('%%EOF')) {
    return json(res, 400, { error: 'This file does not look like a PDF.' });
  }
  if (nearby.get(x,x,z,z)) return json(res, 409, { error: 'A seed is already there. Aim at another spot.' });
  const id = randomUUID();
  insert.run(id, player, title, idea, pdf, new Date().toISOString(), x,z);
  json(res, 201, { id });
  broadcast();
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    if (req.method === 'GET' && files.has(path)) {
      const [data, type] = files.get(path);
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      return res.end(data);
    }
    if (req.method === 'GET' && path === '/api/garden') return json(res, 200, snapshot(playerFor(req, res)));
    if (req.method === 'GET' && path === '/api/events') {
      const player = playerFor(req, res);
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
      clients.set(res, player);
      res.on('close', () => clients.delete(res));
      return res.write('data: ' + JSON.stringify(snapshot(player)) + '\n\n');
    }
    const match = /^\/api\/plants\/([a-f0-9-]{36})\/(article|water)$/.exec(path);
    if (req.method === 'GET' && match?.[2] === 'article') {
      const row = getPDF.get(match[1]);
      if (!row) return json(res, 404, { error: 'Article not found.' });
      res.writeHead(200, {
        'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="research-article.pdf"',
        'Content-Security-Policy': "sandbox; default-src 'none'", 'Cache-Control': 'no-store'
      });
      return res.end(row.pdf);
    }
    if (req.method === 'POST') {
      if (req.headers['x-ted-island'] !== 'garden' || req.headers['sec-fetch-site'] === 'cross-site') {
        return json(res, 403, { error: 'Open TED Island to make changes.' });
      }
      const player = playerFor(req, res);
      if (path === '/api/plants') return await plant(req, res, player);
      if (match?.[2] === 'water') {
        const id = match[1];
        const row = find.get(id);
        if (!row) return json(res, 404, { error: 'Plant not found.' });
        if (row.owner === player) return json(res, 403, { error: 'Other players can water your plant.' });
        const result = water.run(id, player);
        json(res, 200, { watered: true });
        if (result.changes) broadcast();
        return;
      }
    }
    return json(res, 404, { error: 'Not found.' });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, 500, { error: 'The garden could not save that change. Try again.' });
    else res.destroy();
  }
});
const heartbeat = setInterval(() => {
  for (const res of clients.keys()) res.write(': heartbeat\n\n');
}, 15000);
heartbeat.unref();
server.listen(Number(process.env.PORT ?? 4173), process.env.HOST ?? '127.0.0.1', () => {
  console.log('TED Island running at http://' + server.address().address + ':' + server.address().port);
});
