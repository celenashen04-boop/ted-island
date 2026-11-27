import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createAccounts } from '../accounts.mjs';
import { createEmailDelivery } from '../email.mjs';
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
      env:{...process.env,PORT:'0',HOST:'127.0.0.1',VERCEL:'0',TED_SECURE_COOKIE:'0',RESEND_API_KEY:'',
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
    let id, sessionCookie;
    if(judge){
      const start=await client('/api/auth/start',{judge:true});
      id=start.data.id;
      sessionCookie=start.setCookie;
      assert.match(id,/^[A-Z][a-z]+-[A-Z][a-z]+-\d{4}$/);
      assert.doesNotMatch(sessionCookie,/Max-Age/);
    }else{
      const signup=await client('/api/auth/register',{username:'Garden_Pilot',password});
      assert.equal(signup.status,200);
      assert.deepEqual(signup.data,{id:'Garden_Pilot'});
      assert.equal((await client('/api/auth')).data.account,null);
      const login=await client('/api/auth/login',{username:'garden_pilot',password});
      assert.equal(login.status,200);
      id=login.data.id;
      sessionCookie=login.setCookie;
    }
    const form=new FormData();
    if(railway)assert.match(sessionCookie,/; Secure/);
    form.set('island',island);
    assert.equal((await client('/api/profile',form)).status,201);
    return id;
  }
  async function plant(client,island,adopt,emblemYaw) {
    const form=new FormData();
    for(const [key,value] of Object.entries({island,...soil(island),title:'A shared seed',idea:'Conference prototype',question:'What grows?'})){
      form.set(key,value);
    }
    if(adopt)form.set('adopt',adopt);
    if(emblemYaw!==undefined)form.set('emblemYaw',String(emblemYaw));
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
  assert.equal((await newBrowser('/api/auth/register',{username:'Garden_PILOT',password})).status,409);
  const signup = client();
  const generated = (await signup('/api/auth/start', {})).data.id;
  assert.match(generated, /^[A-Za-z]+-[A-Za-z]+-\d{4}$/);
  assert.equal((await signup('/api/auth/secure', { password: 'short' })).status, 400);
  const address = 'private@example.test';
  const secured = await signup('/api/auth/secure', { password, email: address, remind: true });
  assert.equal(secured.data.id, generated);
  assert.equal(secured.data.needsPassword, false);
  assert.deepEqual((await signup('/api/email-settings')).data, { email: address, remindAccess: true, remindReplies: true });
  assert.deepEqual((await signup('/api/email-settings', { email: address, remindAccess: false, remindReplies: true })).data,
    { email: address, remindAccess: false, remindReplies: true });
  const recoveryDb = new DatabaseSync(join(directory, 'garden.sqlite'));
  try {
    const { token } = createAccounts(recoveryDb).createReset(generated);
    assert.equal((await signup('/api/auth/reset-password', { token, password: 'recovered-testing' })).status, 200);
    assert.equal((await signup('/api/auth')).data.account, null);
    assert.equal((await signup('/api/auth/reset-password', { token, password })).status, 400);
    assert.equal((await signup('/api/auth/login', { id: generated.toLowerCase(), password: 'recovered-testing' })).data.id, generated);
    assert.equal((await signup('/api/email-settings', { email: '' })).data.email, '');
    assert.equal(createAccounts(recoveryDb).createReset(generated), null);
  } finally { recoveryDb.close(); }

  const temporary=client();
  const judgeSession=await temporary('/api/auth/start',{judge:true});
  const staleCookie=judgeSession.setCookie.split(';')[0];
  const signedOut=await temporary('/api/auth/logout',{});
  assert.match(signedOut.setCookie,/Max-Age=0/);
  assert.equal((await temporary('/api/auth')).data.account,null);
  assert.equal((await client()('/api/auth',undefined,{headers:{cookie:staleCookie}})).data.account,null);
  const bId=await register(b,1,true);
  assert.notEqual(aId,bId);
  assert.equal((await b('/api/cross',{island:0})).status,403);
  const live=await events(b);
  assert.equal((await live()).worldBridges.length,3);
  const original=await plant(a,0,undefined,-1.25);
  assert.equal((await a('/api/email-settings', { email:'author@example.test', remindReplies:true })).status,200);
  assert.equal((await live()).catalog[0].id,original.id);
  const adopt=await plant(b,1,original.id,2.1);
  assert.equal(adopt.access.addedHours,48);
  const adoptedPlacement=(await live()).plants[0];
  assert.equal(adoptedPlacement.id,original.id);
  assert.equal(adoptedPlacement.originalIsland,0);
  assert.deepEqual(adoptedPlacement.originIslands,[0]);
  assert.equal(adoptedPlacement.emblemYaw,2.1);
  assert.equal((await plant(b,1,original.id)).unchanged,true);
  assert.equal((await a('/api/plants/'+original.id+'/follow',{island:0,enabled:true})).status,200);
  assert.equal((await b('/api/cross',{island:0})).status,200);
  const comment=await b('/api/plants/'+original.id+'/comment',{island:0,text:'Judges can participate.'});
  assert.ok(Math.abs(comment.data.access.addedHours-36)<.001);
  assert.equal((await b('/api/plants/'+original.id+'/comment',{island:0,text:'<em>A second thought.</em>'})).data.access,null);
  assert.ok(Math.abs((await b('/api/plants/'+original.id+'/water',{island:0})).data.access.addedHours-24)<.001);
  assert.equal((await b('/api/plants/'+original.id+'/water',{island:0})).data.changed,false);
  let view=(await a('/api/garden')).data;
  const commentNotice = view.notifications.find(item => item.type === 'comment');
  assert.ok(commentNotice);
  assert.equal(view.plants[0].growth,1);
  assert.equal(view.plants[0].emblemYaw,-1.25);
  assert.equal(view.plants[0].comments[0].resident,bId);
  assert.equal(view.followed[0].newReplies, 2);
  assert.equal((await a('/api/followed/seen',{id:original.id,through:view.plants[0].comments[0].id})).status,200);
  assert.equal((await a('/api/garden')).data.followed[0].newReplies, 1);
  const mailDb = new DatabaseSync(join(directory, 'garden.sqlite'));
  const emails = [];
  try {
    const mail = createEmailDelivery(mailDb, {
      origin:'https://chi.example.test', key:'test', from:'garden@example.test',
      send:async (_, request)=>{emails.push(JSON.parse(request.body)); return new Response(null,{status:200});},
    });
    await mail.flush();
    await mail.flush();
    assert.equal(emails.length, 2);
    assert.ok(emails.every(message => message.to[0]==='author@example.test'));
    assert.ok(emails.some(message => message.html.includes('&lt;em&gt;A second thought.&lt;/em&gt;')));
    assert.ok(emails.every(message => message.html.includes('/#unsubscribe=')));
  } finally { mailDb.close(); }

  assert.ok(!('player' in view.plants[0].contributors[0]));
  assert.equal((await b('/api/notifications/read',{id:commentNotice.id})).status,404);
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
  assert.equal((await newBrowser('/api/auth/login',{username:aId,password})).data.id,aId);
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
