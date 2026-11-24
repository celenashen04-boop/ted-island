import { createServer } from 'node:http';
import { createEmailDelivery } from './email.mjs';
import { createAccounts } from './accounts.mjs';
import { mkdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createGarden } from './garden.mjs';
import { islands, islandScale } from './public/islands.mjs';
import { plots } from './public/plots.mjs';
import { canPlantOnIsland, islandModel } from './public/island-kit/navigation.mjs';

const startedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
const vercelPreview = process.env.VERCEL === '1' || !startedDirectly;
const railway = Boolean(process.env.RAILWAY_SERVICE_ID);
const railwayVolume = process.env.RAILWAY_VOLUME_MOUNT_PATH || undefined;
if (railway && !railwayVolume) throw new Error('Attach a persistent Railway volume before starting CHI Island.');
const secureCookies = railway || process.env.TED_SECURE_COOKIE === '1';
const publicOrigin = process.env.TED_ORIGIN ?? (process.env.RAILWAY_PUBLIC_DOMAIN
  ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN : null);
const persistentDirectory = railwayVolume ?? process.env.TED_DATA_DIR;
const directory = persistentDirectory ?? (vercelPreview
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
const accounts = createAccounts(db,{secureCookies});
const garden = createGarden(db);
const emailDelivery = createEmailDelivery(db, {
  origin: publicOrigin, key: process.env.RESEND_API_KEY, from: process.env.CHI_EMAIL_FROM,
});
const databaseHealth = db.prepare('SELECT 1');
const getPDF = db.prepare('SELECT pdf FROM plants WHERE id=?');
const clients = new Map();
const canStand=(island,x,z)=>islandModel(island)?.queryIsland(x,z).walkable;
const maxPDF = 10 * 1024 * 1024;
const requestRates=new Map();
function acceptRequest(scope,limit){
  const now=Date.now();
  if(requestRates.size>=10_000){
    for(const [key,value] of requestRates)if(value.reset<=now)requestRates.delete(key);
    if(requestRates.size>=10_000&&!requestRates.has(scope))return false;
  }
  let count=requestRates.get(scope);
  if(!count||count.reset<=now){
    count={total:0,reset:now+60_000};
    requestRates.set(scope,count);
  }
  if(count.total>=limit)return false;
  count.total++;
  return true;
}
const files = new Map([
  ['/', [new URL('./public/index.html', import.meta.url), 'text/html; charset=utf-8']],
  ...['index','spiral','verdant','pinwheel'].flatMap(page=> {
    const path=page==='index'?'/studios':'/studios/'+page;
    const entry=[new URL('./public/studios/'+page+'.html',import.meta.url),'text/html; charset=utf-8'];
    return [[path,entry],[path+'/',entry]];
  }),
  ['/studios/studio.css', [new URL('./public/studios/studio.css', import.meta.url), 'text/css; charset=utf-8']],
  ['/studios/studio.mjs', [new URL('./public/studios/studio.mjs', import.meta.url), 'text/javascript; charset=utf-8']],
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

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

function snapshot(player) {
  return garden.snapshot(player);
}

function broadcast() {
  const updates=new Map();
  for (const [res, client] of clients) {
    if(accounts.player(client.req)!==client.player){
      res.end();
      continue;
    }
    if(res.writableLength>1024*1024){
      res.destroy();
      continue;
    }
    if(!updates.has(client.player))updates.set(client.player,'data: '+JSON.stringify(snapshot(client.player))+'\n\n');
    res.write(updates.get(client.player));
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

async function onboard(req,res,player){
  const form=await readForm(req,res,32*1024,'Use a shorter profile submission.');
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
  const shareLinkedin=form.get('shareLinkedin')==='on';
  if(shareLinkedin&&!linkedin)return json(res,400,{error:'Add your LinkedIn URL before choosing to share it.'});
  const result=garden.finishProfile(player,{island:island.id,linkedin,shareLinkedin});
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
  const island = garden.home(player).island;
  if (field('island') !== String(island)) {
    return json(res,403,{error:'Return to your home island to plant.'});
  }
  if (!canPlantOnIsland(island,x*islandScale,z*islandScale)) {
    return json(res,400,{error:'Aim at open grass.'});
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
    if(req.method==='GET' && path==='/api/health'){
      databaseHealth.get();
      return json(res,200,{ok:true,storage:railway?'railway-volume':vercelPreview&&!persistentDirectory?'temporary':'sqlite'});
    }
    if (!vercelPreview && req.method === 'GET' && /^\/ui\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(css|mjs|html|svg|png|woff2)$/i.test(path)) {
      const types = {
        css: 'text/css; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
        html: 'text/html; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', woff2: 'font/woff2',
      };
      const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
      try {
        const data = readFileSync(new URL('./public' + path, import.meta.url));
        res.writeHead(200, { 'Content-Type': types[extension], 'Cache-Control': 'no-cache' });
        return res.end(data);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return json(res, 404, { error: 'Not found.' });
      }
    }
    if (!vercelPreview && req.method === 'GET' && /^\/island-kit\/(?:[a-z]+\/)*[a-z0-9.-]+\.m?js$/i.test(path)) {
      let data;
      try { data = readFileSync(new URL('./public' + path, import.meta.url)); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return json(res,404,{error:'Not found.'});
      }
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(data);
    }
    if (!vercelPreview && req.method === 'GET' && files.has(path)) {
      const [url, type] = files.get(path);
      const data = readFileSync(url);
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      return res.end(data);
    }
    if (req.method === 'GET' && path === '/api/email-settings') {
      const player = accounts.player(req);
      return player ? json(res, 200, accounts.email(player)) : json(res, 401, { error: 'Sign in first.' });
    }
    if (req.method==='GET' && path==='/api/auth')return json(res,200,{account:accounts.current(req), emailAvailable:emailDelivery.available});
    if (req.method==='GET' && path==='/api/profile'){
      const player=accounts.player(req);
      return player ? json(res,200,garden.profile(player)) : json(res,401,{error:'Sign in to the garden.'});
    }
    if (req.method === 'GET' && path === '/api/profile/photo') {
      const player=accounts.player(req);
      const row=player&&garden.photoFor.get(player);
      if(!row?.photo)return json(res,404,{error:'No profile photo.'});
      res.writeHead(200,{'Content-Type':row.type,'Cache-Control':'private, no-store'});
      return res.end(row.photo);
    }
    if (req.method === 'GET' && (path === '/api/garden' || path === '/api/events')) {
      const player=accounts.player(req);
      if(!player||!garden.profile(player).completed)return json(res,403,{error:'Complete your player profile first.'});
      if(path==='/api/garden')return json(res,200,snapshot(player));
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
      clients.set(res,{player,req});
      res.on('close', () => clients.delete(res));
      res.write('data: ' + JSON.stringify(snapshot(player)) + '\n\n');
      if (vercelPreview) await new Promise(resolve => res.once('close', resolve));
      return;
    }
    const exportMatch=/^\/api\/plants\/([a-f0-9-]{36})\/export$/.exec(path);
    if(req.method==='GET'&&exportMatch){
      const player=accounts.player(req);
      const data=player&&garden.exportPlant(player,exportMatch[1]);
      if(!data)return json(res,404,{error:'Plant export is unavailable.'});
      res.setHeader('Content-Disposition','attachment; filename="chi-island-plant.json"');
      return json(res,200,data);
    }
    const match = /^\/api\/plants\/([a-f0-9-]{36})\/(article|water|comment|follow)$/.exec(path);
    if (req.method === 'GET' && match?.[2] === 'article') {
      const row = getPDF.get(match[1]);
      const player=accounts.player(req);
      if (!row?.pdf.length || !player || !garden.profile(player).completed || !garden.canRead(player,match[1])) return json(res, 404, { error: 'Article not found.' });
      res.writeHead(200, {
        'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="research-article.pdf"',
        'Content-Security-Policy': "sandbox; default-src 'none'", 'Cache-Control': 'no-store'
      });
      return res.end(row.pdf);
    }
    if (req.method === 'POST') {
      const origin=req.headers.origin;
      const expected=publicOrigin??(req.headers.host
        ?(vercelPreview||secureCookies?'https://':'http://')+req.headers.host:null);
      if (req.headers['x-ted-island'] !== 'garden' || req.headers['sec-fetch-site'] === 'cross-site' ||
        (origin && origin!==expected)) {
        return json(res, 403, { error: 'Open CHI Island to make changes.' });
      }
      if(path.startsWith('/api/auth/')){
        const body=await smallJSON(req);
        if(body===null)return json(res,400,{error:'Invalid account request.'});
        let result;
        if(path==='/api/auth/start'){
          if(!acceptRequest('account:'+req.socket.remoteAddress,60))return json(res,429,{error:'Try again in a minute.'});
          result=accounts.create(req,res,body.judge===true);
        }
        else if(path==='/api/auth/register'){
          if(!acceptRequest('register:'+req.socket.remoteAddress,60))return json(res,429,{error:'Try again in a minute.'});
          result=await accounts.register(req,res,body);
        }
        else if (path === '/api/auth/secure') result = await accounts.secure(req, res, body);
        else if (path === '/api/auth/reset-request') {
          if (!emailDelivery.available) return json(res, 503, { error: 'Password reset email is unavailable on this server.' });
          const id = typeof body.id === 'string' ? body.id.trim().toLowerCase() : '';
          if (acceptRequest('reset-ip:' + req.socket.remoteAddress, 8) && acceptRequest('reset-id:' + id, 2)) {
            const reset = accounts.createReset(id);
            if (reset) void emailDelivery.reset(reset).catch(error => console.error('CHI Island password email:', error.message));
          }
          result = { ok: true };
        }
        else if (path === '/api/auth/reset-password') result = await accounts.resetPassword(body);
        else if (path === '/api/auth/unsubscribe') result = accounts.unsubscribe(body.token);
        else if(path==='/api/auth/login')result=await accounts.login(req,res,body);
        else if(path==='/api/auth/logout'){
          const player=accounts.player(req);
          result=accounts.logout(req,res);
          for(const [stream,client] of clients)if(client.player===player&&accounts.player(client.req)!==player)stream.end();
        }else return json(res,404,{error:'Not found.'});
        return json(res,result.status??200,result.error?{error:result.error}:result);
      }
      const player = accounts.player(req);
      if (!player)return json(res,401,{error:'Sign in to the garden.'});
      if (path === '/api/profile') return await onboard(req,res,player);
      if (path === '/api/email-settings') {
        const input = await smallJSON(req);
        if (!input || typeof input.email !== 'string') return json(res, 400, { error: 'Enter an email address.' });
        const result = accounts.saveEmail(player, input);
        return json(res, result.status ?? 200, result.error ? { error: result.error } : result);
      }
      if (!garden.profile(player).completed) return json(res,403,{error:'Complete your player profile first.'});
      if (path === '/api/profile/linkedin-sharing') {
        const body=await smallJSON(req);
        if(typeof body?.enabled!=='boolean')return json(res,400,{error:'Choose whether to share your LinkedIn profile.'});
        const profile=garden.setLinkedinSharing(player,body.enabled);
        if(!profile)return json(res,400,{error:'Add a LinkedIn URL before choosing to share it.'});
        json(res,200,profile);
        broadcast();
        return;
      }
      if(path==='/api/followed/seen'){
        const body=await smallJSON(req);
        const valid = typeof body?.id === 'string' && Number.isSafeInteger(body.through) && body.through >= 0;
        if (!valid || !garden.seeDiscussion(player,body.id,body.through)) return json(res,404,{error:'Discussion unavailable.'});
        json(res,200,{ok:true});
        broadcast();
        return;
      }
      if(path==='/api/notifications/read'){
        const body=await smallJSON(req);
        if(!Number.isSafeInteger(body?.id))return json(res,400,{error:'Choose a notification.'});
        const changed=garden.markNotification(player,body.id);
        if(changed)broadcast();
        return json(res,changed?200:404,{ok:changed});
      }
      if(path==='/api/cross'||path==='/api/position'){
        const body=await smallJSON(req);
        if(!Number.isInteger(body?.island))return json(res,400,{error:'Choose an island.'});
        if(path==='/api/cross'){
          const result=garden.cross(player,body.island);
          return json(res,result.status??200,result.error?result:{...result,garden:snapshot(player)});
        }
        if(!['x','z','yaw','pitch'].every(key=>Number.isFinite(body[key])) ||
          !canStand(body.island,body.x,body.z)){
          return json(res,400,{error:'Position is outside the playable island.'});
        }
        const saved=garden.savePose(player,body.island,body);
        return json(res,saved?200:409,{ok:saved});
      }
      if(path==='/api/plants'){
        if(!acceptRequest('plant:'+player,12))return json(res,429,{error:'Wait a minute before planting another seed.'});
        return await plant(req,res,player);
      }
      if(match&&match[2]!=='article'){
        const body=await smallJSON(req);
        if(!Number.isInteger(body?.island))return json(res,400,{error:'Choose a plant on an island.'});
        const id=match[1], action=match[2];
        if(action==='comment'&&!acceptRequest('comment:'+player,20))return json(res,429,{error:'Wait a minute before posting another comment.'});
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
        json(res,200,result);
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
  for(const [res,client] of clients){
    if(accounts.player(client.req)===client.player)res.write(': heartbeat\n\n');
    else res.end();
  }
}, 15000);
heartbeat.unref();
if (startedDirectly) {
  const server = createServer(handleRequest);
  const maintenance=setInterval(()=>{
    try {if(garden.runMaintenance())broadcast();}
    catch(error){console.error('Garden maintenance failed:',error.message);}
    void emailDelivery.flush().catch(error => console.error('CHI Island email maintenance:', error.message));
  },60_000);
  maintenance.unref();
  server.listen(Number(process.env.PORT ?? 4173), process.env.HOST ?? (railway?'0.0.0.0':'127.0.0.1'), () => {
    console.log('CHI Island running at http://' + server.address().address + ':' + server.address().port);
  });
  function shutdown() {
    clearInterval(heartbeat);
    clearInterval(maintenance);
    for(const client of clients.keys())client.end();
    server.close(()=>db.close());
  }
  process.once('SIGTERM',shutdown);
  process.once('SIGINT',shutdown);
}
