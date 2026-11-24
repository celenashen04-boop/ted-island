import { createHash, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
const hour = 3_600_000;
const first = ['Amber','Breezy','Dewy','Golden','Mossy','Quiet','Silver','Sunny','Velvet','Wild'];
const second = ['Acorn','Birch','Cedar','Clover','Fern','Grove','Heron','Maple','Meadow','Willow'];
const digest = token => createHash('sha256').update(token).digest('hex');
const cookie = (req, name) => (req.headers.cookie ?? '').split(';')
  .map(item => item.trim()).find(item => item.startsWith(name + '='))?.slice(name.length + 1);
const validId = /^[a-z]+-[a-z]+-\d{4}$/i;

export function createAccounts(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      player TEXT PRIMARY KEY, public_id TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password TEXT, email TEXT, email_consent_at INTEGER,
      judge INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, player TEXT NOT NULL REFERENCES accounts(player) ON DELETE CASCADE, expires INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_player ON sessions(player);
    CREATE TABLE IF NOT EXISTS login_attempts (
      scope TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL
    );
  `);
  const insertAccount = db.prepare('INSERT OR IGNORE INTO accounts(player,public_id,judge,created) VALUES(?,?,?,?)');
  const insertSession = db.prepare('INSERT INTO sessions VALUES(?,?,?)');
  const byId = db.prepare('SELECT * FROM accounts WHERE public_id=? AND judge=0');
  const byPlayer = db.prepare('SELECT * FROM accounts WHERE player=?');
  const lookup = db.prepare('SELECT a.*,s.token FROM sessions s JOIN accounts a ON a.player=s.player WHERE s.token=? AND s.expires>?');
  const remove = db.prepare('DELETE FROM sessions WHERE token=?');
  const attempts = db.prepare('SELECT count FROM login_attempts WHERE scope=? AND expires>?');
  const fail = db.prepare(`INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(scope) DO UPDATE SET
    count=CASE WHEN expires>? THEN count+1 ELSE 1 END,
    expires=CASE WHEN expires>? THEN expires ELSE excluded.expires END`);
  const updateAccount = db.prepare('UPDATE accounts SET password=?,email=?,email_consent_at=? WHERE player=? AND password IS NULL AND judge=0');
  const stats = account => ({
    id: account.public_id, judge: Boolean(account.judge), needsPassword: !account.password && !account.judge
  });

  function newAccount(player, judge) {
    for (;;) {
      const id = first[randomInt(first.length)] + '-' + second[randomInt(second.length)] + '-' + randomInt(1000,10000);
      if (insertAccount.run(player,id,Number(judge),Date.now()).changes) return byPlayer.get(player);
    }
  }
  function sessionCookie(res, token, maxAge) {
    const secure=process.env.TED_SECURE_COOKIE==='1'?'; Secure':'';
    const age=maxAge===undefined?'':'; Max-Age='+maxAge;
    res.setHeader('Set-Cookie','ted-session='+token+'; Path=/; HttpOnly; SameSite=Lax'+age+secure);
  }
  function startSession(res, account) {
    const token = randomBytes(32).toString('hex');
    const expires = Date.now() + (account.judge ? 7*24 : account.password ? 24*30 : 24)*hour;
    insertSession.run(digest(token),account.player,expires);
    sessionCookie(res,token,account.judge?undefined:Math.floor((expires-Date.now())/1000));
    return stats(account);
  }
  function accountFor(req) {
    const token=cookie(req,'ted-session');
    return /^[a-f0-9]{64}$/.test(token??'') ? lookup.get(digest(token),Date.now()) : undefined;
  }
  return {
    current(req) {const account=accountFor(req);return account?stats(account):null;},
    player(req) {const account=accountFor(req);return account&&(account.password||account.judge)?account.player:null;},
    create(req,res,judge) {
      const existing=accountFor(req);
      if(existing && (!judge || existing.judge || existing.password))return stats(existing);
      if(existing)remove.run(existing.token);
      const previous=cookie(req,'ted-player');
      const legacy = db.prepare('SELECT 1 FROM residents WHERE player=? UNION SELECT 1 FROM plants WHERE owner=? LIMIT 1');
      if(!judge && /^[a-f0-9-]{36}$/.test(previous??'') && legacy.get(previous,previous)){
        const pending=byPlayer.get(previous);
        if(!pending)return startSession(res,newAccount(previous,false));
        if(!pending.password && !pending.judge)return startSession(res,pending);
      }
      return startSession(res,newAccount(randomUUID(),judge));
    },
    async register(req,res,{password,email,consent}) {
      const account=accountFor(req);
      if(!account || account.password || account.judge)return {status:409,error:'Start a new resident account first.'};
      if(typeof password!=='string'||password.length<6||password.length>128)return {status:400,error:'Use a password between 6 and 128 characters.'};
      const address=typeof email==='string'?email.trim():'';
      if(address && (address.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)))return {status:400,error:'Enter a valid email address.'};
      if(consent && !address)return {status:400,error:'Add an email address to opt in.'};
      const salt=randomBytes(16).toString('hex');
      const key=await deriveKey(password,salt,64);
      if(!updateAccount.run(salt+':'+key.toString('hex'),address||null,consent?Date.now():null,account.player).changes) {
        return {status:409,error:'This account already has a password.'};
      }
      remove.run(account.token);
      return startSession(res,byPlayer.get(account.player));
    },
    async login(req,res,{id,password}) {
      if(typeof id!=='string'||!validId.test(id.trim())||typeof password!=='string'||password.length>128) {
        return {status:401,error:'Check your ID and password.'};
      }
      const normalized=id.trim().toLowerCase();
      const scopes=['id:'+normalized,'ip:'+req.socket.remoteAddress];
      const now=Date.now();
      if(scopes.some((scope,index)=>(attempts.get(scope,now)?.count??0)>=(index?40:5))) {
        return {status:429,error:'Too many attempts. Try again in 15 minutes.'};
      }
      const account=byId.get(normalized);
      const [salt,hash]=account?.password?.split(':')??['0'.repeat(32),'0'.repeat(128)];
      const key=await deriveKey(password,salt,64);
      if(!timingSafeEqual(key,Buffer.from(hash,'hex'))||!account?.password){
        for(const scope of scopes)fail.run(scope,now+15*60_000,now,now);
        return {status:401,error:'Check your ID and password.'};
      }
      const existing=accountFor(req);
      if(existing)remove.run(existing.token);
      return startSession(res,account);
    },
    logout(req,res) {
      const account=accountFor(req);
      if(account)remove.run(account.token);
      sessionCookie(res,'',0);
      return {ok:true};
    }
  };
}
