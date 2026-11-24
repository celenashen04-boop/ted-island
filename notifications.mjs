const hour = 3_600_000;
const day = 24*hour;

export function createNotifications(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY, recipient TEXT NOT NULL, type TEXT NOT NULL,
      plant TEXT, island INTEGER, comment INTEGER, created INTEGER NOT NULL,
      read INTEGER NOT NULL DEFAULT 0, event_key TEXT NOT NULL,
      UNIQUE(recipient,event_key)
    );
    CREATE INDEX IF NOT EXISTS notifications_recipient ON notifications(recipient,created);
    CREATE TABLE IF NOT EXISTS plant_activity (
      plant TEXT PRIMARY KEY REFERENCES plants(id), last_activity INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS plant_activity_date ON plant_activity(last_activity);
  `);
  db.prepare('INSERT OR IGNORE INTO plant_activity SELECT id,? FROM plants').run(Date.now());
  const store = db.prepare('INSERT OR IGNORE INTO notifications(recipient,type,plant,island,comment,created,event_key) VALUES(?,?,?,?,?,?,?)');
  const list = db.prepare(`SELECT n.id,n.type,n.plant,n.island,n.comment,n.created,n.read,p.title
    FROM notifications n LEFT JOIN plants p ON p.id=n.plant
    WHERE n.recipient=? ORDER BY n.created DESC,n.id DESC LIMIT 50`);
  const read=db.prepare('UPDATE notifications SET read=1 WHERE recipient=? AND id=?');
  const touch=db.prepare('INSERT INTO plant_activity VALUES(?,?) ON CONFLICT(plant) DO UPDATE SET last_activity=excluded.last_activity');
  const nearExpiry=db.prepare('SELECT player,island,expiry FROM island_access WHERE expiry>? AND expiry<=?');
  const inactive=db.prepare('SELECT a.plant,a.last_activity,p.owner FROM plant_activity a JOIN plants p ON p.id=a.plant WHERE a.last_activity<=?');
  const contributors=db.prepare(`SELECT player FROM activity WHERE seed=? UNION
    SELECT player FROM watering WHERE plant=? UNION SELECT player FROM comments WHERE seed=?`);
  const warning=db.prepare("SELECT created FROM notifications WHERE recipient=? AND event_key=?");
  const oldBridgeTable=db.prepare("SELECT name FROM sqlite_master WHERE name='bridges'").get();
  const oldBridgeHasAnchor=oldBridgeTable && db.prepare('PRAGMA table_info(bridges)').all().some(col=>col.name==='anchor_seed');
  const unlinkBridge=oldBridgeHasAnchor?db.prepare('UPDATE bridges SET anchor_seed=NULL WHERE anchor_seed=?'):null;
  const removeChildren=[
    ['access_credits','plant'],['watering','plant'],['comments','seed'],
    ['follows','seed'],['activity','seed'],['placements','seed'],['plant_activity','plant'],
    ['notifications','plant'],['plants','id']
  ].map(([table,key])=>db.prepare('DELETE FROM '+table+' WHERE '+key+'=?'));

  function add(event) {
    if (!event.recipient) return false;
    return Boolean(store.run(event.recipient,event.type,event.plant??null,event.island??null,
      event.comment??null,event.now??Date.now(),event.key).changes);
  }

  return {
    add,
    list: player=>list.all(player),
    markRead(player,id){return Boolean(read.run(player,id).changes);},
    touch: (plant,now=Date.now())=>touch.run(plant,now),
    process(now=Date.now()) {
      let changed = false;
      for (const row of nearExpiry.all(now,now+6*hour)) {
        changed=add({recipient:row.player,type:'access-ending',island:row.island,
          key:'access:'+row.island+':'+row.expiry,now})||changed;
      }
      for (const row of inactive.all(now-12*day)) {
        const age = now-row.last_activity;
        if(age<335*day){
          if(age<15*day)changed=add({recipient:row.owner,type:'thirsty',plant:row.plant,key:'thirsty:'+row.plant+':'+row.last_activity,now})||changed;
          continue;
        }
        const key='retention:'+row.plant+':'+row.last_activity;
        const residents=new Set([row.owner,...contributors.all(row.plant,row.plant,row.plant).map(({player})=>player)]);
        for(const recipient of residents)changed=add({recipient,type:'retention',plant:row.plant,key,now})||changed;
        const sent=warning.get(row.owner,key);
        if(age<365*day||!sent||now-sent.created<30*day)continue;
        unlinkBridge?.run(row.plant);
        for(const remove of removeChildren)remove.run(row.plant);
        changed=true;
      }
      return changed;
    }
  };
}
