import { createHash, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
const hour = 3_600_000;
const first = ['Amber','Breezy','Dewy','Golden','Mossy','Quiet','Silver','Sunny','Velvet','Wild'];
const second = ['Acorn','Birch','Cedar','Clover','Fern','Grove','Heron','Maple','Meadow','Willow'];
const digest = token => createHash('sha256').update(token).digest('hex');
const cookie = (req, name) => (req.headers.cookie ?? '').split(';')
  .map(item => item.trim()).find(item => item.startsWith(name + '='))?.slice(name.length + 1);
const validUsername = /^[a-z0-9_-]{3,24}$/i;

export function createAccounts(db,{secureCookies=false}={}) {
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
  const columns = new Set(db.prepare('PRAGMA table_info(accounts)').all().map(column => column.name));
  for (const name of ['remind_access', 'remind_replies']) {
    if (!columns.has(name)) {
      db.exec('ALTER TABLE accounts ADD COLUMN ' + name + ' INTEGER NOT NULL DEFAULT 0');
      db.exec('UPDATE accounts SET ' + name + '=1 WHERE email_consent_at IS NOT NULL');
    }
  }
  if (!columns.has('unsubscribe_token')) db.exec('ALTER TABLE accounts ADD COLUMN unsubscribe_token TEXT');
  db.exec(`CREATE TABLE IF NOT EXISTS password_resets (
    player TEXT PRIMARY KEY REFERENCES accounts(player) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE, expires INTEGER NOT NULL
  )`);
  const emailSettings = db.prepare(`UPDATE accounts SET email=?, remind_access=?, remind_replies=?,
    email_consent_at=?, unsubscribe_token=? WHERE player=? AND judge=0`);
  const setPassword = db.prepare('UPDATE accounts SET password=? WHERE player=? AND password IS NULL AND judge=0');
  const updatePassword = db.prepare('UPDATE accounts SET password=? WHERE player=?');
  const resetForToken = db.prepare('SELECT player FROM password_resets WHERE token=? AND expires>?');
  const saveReset = db.prepare(`INSERT INTO password_resets VALUES (?,?,?) ON CONFLICT(player)
    DO UPDATE SET token=excluded.token, expires=excluded.expires`);
  const removeReset = db.prepare('DELETE FROM password_resets WHERE player=?');
  const removeSessions = db.prepare('DELETE FROM sessions WHERE player=?');
  const stopReminders = db.prepare(`UPDATE accounts SET remind_access=0,remind_replies=0,email_consent_at=NULL
    WHERE unsubscribe_token=?`);

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
  const saveAccount = db.prepare(`INSERT OR IGNORE INTO accounts(player,public_id,password,email,email_consent_at,created)
    VALUES(?,?,?,?,?,?) ON CONFLICT(player) DO UPDATE SET public_id=excluded.public_id,password=excluded.password,
    email=excluded.email,email_consent_at=excluded.email_consent_at WHERE accounts.password IS NULL AND accounts.judge=0`);
  const legacy = () => db.prepare('SELECT 1 FROM residents WHERE player=? UNION SELECT 1 FROM plants WHERE owner=? LIMIT 1');
  function legacyPlayer(req) {
    const previous=cookie(req,'ted-player');
    return /^[a-f0-9-]{36}$/.test(previous??'') && legacy().get(previous,previous) ? previous : null;
  }
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
    const secure=secureCookies?'; Secure':'';
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
  function settings(account) {
    return { email: account.email ?? '', remindAccess: Boolean(account.remind_access), remindReplies: Boolean(account.remind_replies) };
  }

  function saveEmail(account, { email, remindAccess, remindReplies }) {
    const address = typeof email === 'string' ? email.trim() : '';
    if (address && (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))) {
      return { status: 400, error: 'Check the email address.' };
    }
    const access = Boolean(address && remindAccess === true);
    const replies = Boolean(address && remindReplies === true);
    const unchanged = address === (account.email ?? '');
    const unsubscribe = address ? (unchanged && account.unsubscribe_token || randomBytes(32).toString('hex')) : null;
    emailSettings.run(address || null, Number(access), Number(replies),
      access || replies ? Date.now() : null, unsubscribe, account.player);
    if (!unchanged) removeReset.run(account.player);
    return settings(byPlayer.get(account.player));
  }

  async function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const key = await deriveKey(password, salt, 64);
    return salt + ':' + key.toString('hex');
  }

  function validPassword(password) {
    return typeof password === 'string' && password.length >= 6 && password.length <= 128;
  }

  return {
    current(req) {const account=accountFor(req);return account?stats(account):null;},
    player(req) {const account=accountFor(req);return account&&(account.password||account.judge)?account.player:null;},
    create(req,res,judge) {
      const existing=accountFor(req);
      if(existing && (!judge || existing.judge || existing.password))return stats(existing);
      if(existing)remove.run(existing.token);
      const previous=!judge&&legacyPlayer(req);
      if(previous){
        const pending=byPlayer.get(previous);
        if(!pending)return startSession(res,newAccount(previous,false));
        if(!pending.password && !pending.judge)return startSession(res,pending);
      }
      return startSession(res,newAccount(randomUUID(),judge));
    },
    async secure(req, res, { password, email, remind }) {
      const account = accountFor(req);
      if (!account || account.judge || account.password) return { status: 409, error: 'Start a new account first.' };
      if (!validPassword(password)) return { status: 400, error: 'Use a password between 6 and 128 characters.' };
      const hash = await hashPassword(password);
      db.exec('BEGIN IMMEDIATE');
      try {
        if (!setPassword.run(hash, account.player).changes) {
          db.exec('ROLLBACK');
          return { status: 409, error: 'This ID is already set up. Sign in to continue.' };
        }
        const result = saveEmail(byPlayer.get(account.player), { email, remindAccess: remind, remindReplies: typeof email === 'string' && Boolean(email.trim()) });
        if (result.error) { db.exec('ROLLBACK'); return result; }
        removeSessions.run(account.player);
        const profile = startSession(res, byPlayer.get(account.player));
        db.exec('COMMIT');
        return profile;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    email(player) { return settings(byPlayer.get(player)); },
    saveEmail(player, input) {
      const account = byPlayer.get(player);
      if (!account || account.judge) return { status: 403, error: 'Create a regular account to save an email address.' };
      return saveEmail(account, input);
    },
    unsubscribe(token) {
      if (/^[a-f0-9]{64}$/.test(token ?? '')) stopReminders.run(token);
      return { ok: true };
    },
    createReset(id) {
      const account = typeof id === 'string' && validUsername.test(id.trim()) ? byId.get(id.trim()) : null;
      if (!account?.password || !account.email) return null;
      const token = randomBytes(32).toString('hex');
      saveReset.run(account.player, digest(token), Date.now() + 30 * 60_000);
      return { token, email: account.email, id: account.public_id };
    },
    async resetPassword({token, password}) {
      if (!validPassword(password)) return { status: 400, error: 'Use a password between 6 and 128 characters.' };
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
        return { status: 400, error: 'This reset link is invalid or expired.' };
      }
      const tokenHash = digest(token);
      if (!resetForToken.get(tokenHash, Date.now())) return { status: 400, error: 'This reset link is invalid or expired.' };
      const hash = await hashPassword(password);
      const reset = resetForToken.get(tokenHash, Date.now());
      if (!reset) return { status: 400, error: 'This reset link is invalid or expired.' };
      db.exec('BEGIN IMMEDIATE');
      try {
        updatePassword.run(hash, reset.player);
        removeReset.run(reset.player);
        removeSessions.run(reset.player);
        db.exec('COMMIT');
        return { ok: true };
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    async register(req,res,{username,password,email,consent}) {
      const account=accountFor(req);
      if(account?.password || account?.judge)return {status:409,error:'Sign out before creating another account.'};
      const name=typeof username==='string'?username.trim():'';
      if(!validUsername.test(name))return {status:400,error:'Use 3–24 letters, numbers, hyphens, or underscores for your username.'};
      if(typeof password!=='string'||password.length<6||password.length>128)return {status:400,error:'Use a password between 6 and 128 characters.'};
      const address=typeof email==='string'?email.trim():'';
      if(address && (address.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)))return {status:400,error:'Enter a valid email address.'};
      if(consent && !address)return {status:400,error:'Add an email address to opt in.'};
      const previous=account?null:legacyPlayer(req);
      const oldAccount=previous&&byPlayer.get(previous);
      const player=account?.player??(previous&&!oldAccount?.password&&!oldAccount?.judge?previous:randomUUID());
      const salt=randomBytes(16).toString('hex');
      const key=await deriveKey(password,salt,64);
      let saved;
      try {
        saved=saveAccount.run(player,name,salt+':'+key.toString('hex'),address||null,consent?Date.now():null,Date.now());
      } catch(error) {
        if(error.errcode!==2067)throw error;
      }
      if(!saved?.changes) {
        return {status:409,error:byPlayer.get(player)?.password?'This account already exists. Sign in to continue.':'That username is taken.'};
      }
      // An old sign-up draft must not become a signed-in session when its password is saved.
      db.prepare('DELETE FROM sessions WHERE player=?').run(player);
      sessionCookie(res,'',0);
      return {id:name};
    },
    async login(req,res,{username,id,password}) {
      const name=username??id;
      if(typeof name!=='string'||!validUsername.test(name.trim())||typeof password!=='string'||password.length>128) {
        return {status:401,error:'Check your ID and password.'};
      }
      const normalized=name.trim().toLowerCase();
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
