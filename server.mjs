import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createGarden } from './garden.mjs';
import { islands } from './public/islands.mjs';
import { plots, canPlant } from './public/plots.mjs';

const startedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
const vercelPreview = process.env.VERCEL === '1' || !startedDirectly;
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
const garden = createGarden(db);
const getPDF = db.prepare('SELECT pdf FROM plants WHERE id=?');
const clients = new Map();
const maxPDF = 10 * 1024 * 1024;
const files = new Map([
  ['/', [new URL('./public/index.html', import.meta.url), 'text/html; charset=utf-8']],
  ['/design-kit', [new URL('./public/design-kit.html', import.meta.url), 'text/html; charset=utf-8']],
  ['/design-kit.css', [new URL('./public/design-kit.css', import.meta.url), 'text/css; charset=utf-8']],
  ['/design-kit.mjs', [new URL('./public/design-kit.mjs', import.meta.url), 'text/javascript; charset=utf-8']],
  ['/design-assets.mjs', [new URL('./public/design-assets.mjs', import.meta.url), 'text/javascript; charset=utf-8']],
  ['/style.css', [new URL('./public/style.css', import.meta.url), 'text/css; charset=utf-8']],
  ['/scene.mjs', [new URL('./public/scene.mjs', import.meta.url), 'text/javascript; charset=utf-8']],
  ['/app.mjs', [new URL('./public/app.mjs', import.meta.url), 'text/javascript; charset=utf-8']],
  ['/islands.mjs', [new URL('./public/islands.mjs', import.meta.url), 'text/javascript; charset=utf-8']],
  ['/world.mjs', [new URL('./public/world.mjs', import.meta.url), 'text/javascript; charset=utf-8']],
  ['/plots.mjs', [new URL('./public/plots.mjs', import.meta.url), 'text/javascript; charset=utf-8']]
]);

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
  return garden.snapshot(player);
}

function broadcast() {
  for (const [res, player] of clients) {
    if (res.writableLength > 1024 * 1024) res.destroy();
    else res.write('data: ' + JSON.stringify(snapshot(player)) + '\n\n');
  }
}

async function readForm(req,res,maxSize,limitMessage) {
  const type=req.headers['content-type']??'';
  if(Number(req.headers['content-length'])>maxSize){
    json(res,413,{error:limitMessage});
    return null;
  }
  if(!type.startsWith('multipart/form-data;')){
    json(res,415,{error:'Submit the form from CHI Island.'});
    return null;
  }
  const chunks=[];
  let bytes=0;
  for await(const chunk of req.iterator({destroyOnReturn:false})){
    bytes+=chunk.length;
    if(bytes>maxSize){
      res.setHeader('Connection','close');
      json(res,413,{error:limitMessage});
      return null;
    }
    chunks.push(chunk);
  }
  try {
    return await new Response(Buffer.concat(chunks),{headers:{'Content-Type':type}}).formData();
  } catch {
    json(res,400,{error:'The upload could not be read.'});
    return null;
  }
}

function photoFormat(data){
  if(data.length>=24&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&data.toString('ascii',12,16)==='IHDR')return 'image/png';
  if(data.length>=12&&data[0]===255&&data[1]===216&&data[2]===255&&data.at(-2)===255&&data.at(-1)===217)return 'image/jpeg';
  if(data.length>=20&&data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP'&&['VP8 ','VP8L','VP8X'].includes(data.toString('ascii',12,16)))return 'image/webp';
  return null;
}

async function onboard(req,res,player){
  const maxPhoto=1024*1024;
  const sizeError='Use a profile photo of 1 MB or smaller.';
  const form=await readForm(req,res,maxPhoto+32*1024,sizeError);
  if(!form)return;
  const island=islands.find(entry=>String(entry.id)===form.get('island'));
  if(!island)return json(res,400,{error:'Choose one of the three domains.'});
  const inputLink=form.get('linkedin');
  let linkedin='';
  if(typeof inputLink==='string'&&inputLink.trim()){
    try {
      const link=new URL(inputLink.trim());
      const validHost=link.hostname==='linkedin.com'||link.hostname==='www.linkedin.com';
      if(link.protocol!=='https:'||!validHost||link.username||link.password||link.port||!/^\/in\/[^/]+\/?$/.test(link.pathname)||link.href.length>300)throw Error();
      linkedin='https://www.linkedin.com'+link.pathname;
    }catch{
      return json(res,400,{error:'Enter a LinkedIn profile URL such as https://www.linkedin.com/in/your-name.'});
    }
  }
  const file=form.get('photo');
  let photo=null,photoType=null;
  if(file instanceof File&&file.size>0){
    if(file.size>maxPhoto)return json(res,413,{error:sizeError});
    photo=Buffer.from(await file.arrayBuffer());
    photoType=photoFormat(photo);
    if(!photoType)return json(res,400,{error:'Upload a JPEG, PNG, or WebP profile photo.'});
  }
  const result=garden.finishProfile(player,{island:island.id,linkedin,photo,photoType});
  if(result.error)return json(res,result.status,{error:result.error});
  return json(res,201,result);
}

async function plant(req, res, player) {
  const form=await readForm(req,res,maxPDF+32*1024,'The PDF must be 10 MB or smaller.');
  if(!form)return;
  const field = (name) => {
    const value = form.get(name);
    return typeof value === 'string' ? value.trim() : '';
  };
  const coordinate = (name) => field(name) ? Math.round(Number(field(name))*1000)/1000 : NaN;
  const x = coordinate('x'), z = coordinate('z');
  if (!canPlant(x,z)) return json(res,400,{error:'Aim at open grass.'});
  if (field('island') !== String(garden.home(player).island)) {
    return json(res,403,{error:'Return to your home island to plant.'});
  }
  const adopt=field('adopt');
  const title=field('title'),idea=field('idea'),question=field('question');
  let pdf=Buffer.alloc(0);
  if(!adopt){
    if(!title||title.length>120||!idea||idea.length>500||!question||question.length>300){
      return json(res,400,{error:'Enter a title, a description, and an open question.'});
    }
    const article=form.get('article');
    if(article instanceof File&&article.size>0){
      if(article.size>maxPDF)return json(res,413,{error:'The PDF must be 10 MB or smaller.'});
      pdf=Buffer.from(await article.arrayBuffer());
      if(!/^%PDF-\d\.\d/.test(pdf.subarray(0,8).toString('ascii'))||!pdf.subarray(-1024).includes('%%EOF')){
        return json(res,400,{error:'This file does not look like a PDF.'});
      }
    }
  }
  const result=garden.plant(player,{x,z,title,idea,question,pdf,adopt});
  if(result.error)return json(res,result.status,{error:result.error});
  json(res,201,result);
  broadcast();
}

async function smallJSON(req){
  let data='';
  for await(const chunk of req.iterator({destroyOnReturn:false})){
    data+=chunk.toString();
    if(data.length>8192)return null;
  }
  try { return JSON.parse(data); }
  catch { return null; }
}

export async function handleRequest(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    if (!vercelPreview && req.method === 'GET' && files.has(path)) {
      const [url, type] = files.get(path);
      const data = readFileSync(url);
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      return res.end(data);
    }
    if (req.method === 'GET' && path === '/api/profile') return json(res,200,garden.profile(playerFor(req,res)));
    if (req.method === 'GET' && path === '/api/profile/photo') {
      const row=garden.photoFor.get(playerFor(req,res));
      if(!row?.photo)return json(res,404,{error:'No profile photo.'});
      res.writeHead(200,{'Content-Type':row.type,'Cache-Control':'private, no-store'});
      return res.end(row.photo);
    }
    if (req.method === 'GET' && (path === '/api/garden' || path === '/api/events')) {
      const player=playerFor(req,res);
      if(!garden.profile(player).completed)return json(res,403,{error:'Complete your resident profile first.'});
      if(path==='/api/garden')return json(res,200,snapshot(player));
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
      clients.set(res, player);
      res.on('close', () => clients.delete(res));
      res.write('data: ' + JSON.stringify(snapshot(player)) + '\n\n');
      if (vercelPreview) await new Promise(resolve => res.once('close', resolve));
      return;
    }
    const match = /^\/api\/plants\/([a-f0-9-]{36})\/(article|water|comment|follow)$/.exec(path);
    if (req.method === 'GET' && match?.[2] === 'article') {
      const row = getPDF.get(match[1]);
      const player=playerFor(req,res);
      if (!row?.pdf.length || !garden.profile(player).completed || !garden.canRead(player,match[1])) return json(res, 404, { error: 'Article not found.' });
      res.writeHead(200, {
        'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="research-article.pdf"',
        'Content-Security-Policy': "sandbox; default-src 'none'", 'Cache-Control': 'no-store'
      });
      return res.end(row.pdf);
    }
    if (req.method === 'POST') {
      if (req.headers['x-ted-island'] !== 'garden' || req.headers['sec-fetch-site'] === 'cross-site') {
        return json(res, 403, { error: 'Open CHI Island to make changes.' });
      }
      const player = playerFor(req, res);
      if (path === '/api/profile') return await onboard(req,res,player);
      if (!garden.profile(player).completed) return json(res,403,{error:'Complete your resident profile first.'});
      if (path === '/api/plants') return await plant(req, res, player);
      if(match&&match[2]!=='article'){
        const body=await smallJSON(req);
        if(!Number.isInteger(body?.island))return json(res,400,{error:'Choose a plant on an island.'});
        const id=match[1], action=match[2];
        const message=typeof body.text==='string'?body.text.trim():'';
        if(action==='comment'&&(!message||message.length>1200)){
          return json(res,400,{error:'Write a comment of up to 1,200 characters.'});
        }
        const replyTo=action==='comment' ? body.replyTo??null : null;
        if(replyTo!==null&&(!Number.isSafeInteger(replyTo)||replyTo<1)){
          return json(res,400,{error:'Choose a valid comment to reply to.'});
        }
        const result=action==='follow'
          ?garden.setFollow(player,id,body.island,body.enabled===true)
          :garden.participate(player,id,body.island,action==='water'?'like':'comment',message,replyTo);
        if(result.error)return json(res,result.status,{error:result.error});
        json(res,200,{ok:true});
        if(result.changed!==false)broadcast();
        return;
      }
    }
    return json(res, 404, { error: 'Not found.' });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, 500, { error: 'The garden could not save that change. Try again.' });
    else res.destroy();
  }
}
const heartbeat = setInterval(() => {
  for (const res of clients.keys()) res.write(': heartbeat\n\n');
}, 15000);
heartbeat.unref();
if (startedDirectly) {
  const server = createServer(handleRequest);
  server.listen(Number(process.env.PORT ?? 4173), process.env.HOST ?? '127.0.0.1', () => {
    console.log('CHI Island running at http://' + server.address().address + ':' + server.address().port);
  });
}
