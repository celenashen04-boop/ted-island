import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { islandScale } from '../public/islands.mjs';
import { canPlantOnIsland } from '../public/island-kit/navigation.mjs';

const hour = 3_600_000;
const day = 24*hour;
const password = 'garden-testing-123';
const railway = process.env.CHI_TEST_RAILWAY === '1';
const railwayOrigin = 'https://chi-island-test.up.railway.app';

function soil(id) {
  for(let x=-3;x<3;x+=.5)for(let z=-3;z<3;z+=.5)
    if(canPlantOnIsland(id,x*islandScale,z*islandScale))return {x,z};
  throw new Error('Missing test soil');
}

test('isolated sessions, island access, live events and persistence on restart', {timeout:30_000},async t=>{
  const directory=await mkdtemp(join(tmpdir(),'chi-island-v2-test-'));
  let server, base;
  const streams=[];
  async function stop() {
    for(const stream of streams)stream.abort();
    if(!server || server.exitCode!==null)return;
    const exited=once(server,'exit');
    server.kill('SIGTERM');
    await exited;
  }
  t.after(async()=>{await stop();await rm(directory,{recursive:true,force:true});});

  async function start(){
    server=spawn(process.execPath,['server.mjs'],{
      env:{...process.env,PORT:'0',HOST:'127.0.0.1',VERCEL:'0',TED_SECURE_COOKIE:'0',
        TED_DATA_DIR:railway?'':directory,
        RAILWAY_SERVICE_ID:railway?'test-service':'',
        RAILWAY_VOLUME_MOUNT_PATH:railway?directory:'',
        RAILWAY_PUBLIC_DOMAIN:railway?new URL(railwayOrigin).host:''},stdio:['ignore','pipe','pipe']
    });
    let errors='';
    server.stderr.setEncoding('utf8').on('data',part=>errors+=part);
    base=await new Promise((resolve,reject)=>{
      server.once('exit',code=>reject(new Error('Test server exited with '+code+' '+errors)));
      server.stdout.setEncoding('utf8').on('data',part=>{
        const match=part.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
    });
  }
  function client(){
    let cookie='';
    return async function request(path,payload,options={}){
      const headers={...options.headers};
      if(cookie)headers.cookie=cookie;
      let init={headers,signal:options.signal};
      if(payload!==undefined){
        headers['X-TED-Island']='garden';
        if(railway)headers.Origin??=railwayOrigin;
        init={...init,method:'POST',body:payload};
        if(!(payload instanceof FormData)){
          headers['Content-Type']='application/json';
          init.body=JSON.stringify(payload);
        }
      }
      const response=await fetch(base+path,init);
      const setCookie=response.headers.get('Set-Cookie');
      if(setCookie)cookie=setCookie.split(';')[0];
      if(options.stream)return {response,setCookie};
      return {status:response.status,data:await response.json(),setCookie};
    };
  }
  async function register(client,island,judge=false){
    const start=await client('/api/auth/start',{judge});
    assert.match(start.data.id,/^[A-Z][a-z]+-[A-Z][a-z]+-\d{4}$/);
    if(judge)assert.doesNotMatch(start.setCookie,/Max-Age/);
    else assert.equal((await client('/api/auth/register',{password})).status,200);
    const form=new FormData();
    if(railway)assert.match(start.setCookie,/; Secure/);
    form.set('island',island);
    assert.equal((await client('/api/profile',form)).status,201);
    return start.data.id;
  }
  async function plant(client,island,adopt) {
    const form=new FormData();
    for(const [key,value] of Object.entries({island,...soil(island),title:'A shared seed',idea:'Conference prototype',question:'What grows?'})){
      form.set(key,value);
    }
    if(adopt)form.set('adopt',adopt);
    const answer=await client('/api/plants',form);
    assert.equal(answer.status,201,JSON.stringify(answer.data));
    return answer.data;
  }
  async function events(client){
    const controller=new AbortController();
    streams.push(controller);
    const {response}=await client('/api/events',undefined,{stream:true,signal:controller.signal});
    assert.equal(response.status,200);
    assert.match(response.headers.get('Content-Type'),/text\/event-stream/);
    const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();
    let queue='';
    return async ()=>{
      for(;;){
        const end=queue.indexOf('\n\n');
        if(end>=0){
          const message=queue.slice(0,end);
          queue=queue.slice(end+2);
          if(message.startsWith('data: '))return JSON.parse(message.slice(6));
          continue;
        }
        const part=await reader.read();
        assert.ok(!part.done,'SSE closed too early');
        queue+=part.value;
      }
    };
  }

  await start();
  const a=client(), b=client(), newBrowser=client();
  assert.equal((await a('/api/health')).data.storage,railway?'railway-volume':'sqlite');
  if(railway)assert.equal((await a('/api/auth/start',{}, {headers:{Origin:'https://other.example'}})).status,403);
  assert.equal((await a('/api/garden')).status,403);
  const aId=await register(a,0);
  const bId=await register(b,1,true);
  assert.notEqual(aId,bId);
  assert.equal((await b('/api/cross',{island:0})).status,403);
  const live=await events(b);
  assert.equal((await live()).worldBridges.length,3);
  const original=await plant(a,0);
  assert.equal((await live()).catalog[0].id,original.id);
  const adopt=await plant(b,1,original.id);
  assert.equal(adopt.access.addedHours,48);
  assert.equal((await live()).plants[0].id,original.id);
  assert.equal((await plant(b,1,original.id)).unchanged,true);
  assert.equal((await b('/api/cross',{island:0})).status,200);
  const comment=await b('/api/plants/'+original.id+'/comment',{island:0,text:'Judges can participate.'});
  assert.ok(Math.abs(comment.data.access.addedHours-36)<.001);
  assert.equal((await b('/api/plants/'+original.id+'/comment',{island:0,text:'A second thought.'})).data.access,null);
  assert.ok(Math.abs((await b('/api/plants/'+original.id+'/water',{island:0})).data.access.addedHours-24)<.001);
  assert.equal((await b('/api/plants/'+original.id+'/water',{island:0})).data.changed,false);
  let view=(await a('/api/garden')).data;
  assert.equal(view.notifications[0].type,'comment');
  assert.equal(view.plants[0].growth,1);
  assert.equal(view.plants[0].comments[0].resident,bId);
  assert.ok(!('player' in view.plants[0].contributors[0]));
  assert.equal((await b('/api/notifications/read',{id:view.notifications[0].id})).status,404);
  assert.equal((await a('/api/plants/'+original.id+'/export')).data.discussion.length,2);
  const pose=soil(0);
  assert.equal((await b('/api/position',{island:0,x:pose.x*islandScale,z:pose.z*islandScale,yaw:0,pitch:0})).status,200);

  const backupPath=join(directory,'backup.sqlite');
  const backup=spawn(process.execPath,['scripts/backup.mjs',backupPath],{
    env:{...process.env,TED_DATA_DIR:directory},stdio:'inherit'
  });
  assert.equal((await once(backup,'exit'))[0],0);
  const copy=new DatabaseSync(backupPath,{readOnly:true});
  try {
    assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    assert.equal(copy.prepare('SELECT count(*) AS total FROM comments').get().total,2);
  } finally {
    copy.close();
  }

  await stop();
  const database=new DatabaseSync(join(directory,'garden.sqlite'));
  database.prepare('UPDATE island_access SET expiry=?').run(Date.now()-1);
  database.prepare('UPDATE plant_activity SET last_activity=?').run(Date.now()-23*day);
  database.close();
  await start();
  assert.equal((await newBrowser('/api/auth/login',{id:aId,password})).data.id,aId);
  view=(await newBrowser('/api/garden')).data;
  assert.equal(view.plants[0].comments.length,2);
  assert.equal(view.plants[0].dormant,true);
  assert.equal(view.plants[0].growth,1);
  const judge=(await b('/api/garden')).data;
  assert.equal(judge.access[0].active,false);
  assert.equal(judge.position.island,0);
  assert.equal(judge.position.x,pose.x*islandScale);
  assert.equal((await b('/api/cross',{island:1})).status,200);
  assert.equal((await b('/api/cross',{island:0})).status,403);
  assert.ok(adopt.access.expiry>Date.now()+47*hour);
});
