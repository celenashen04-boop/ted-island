import { islands } from './public/islands.mjs';

const hour = 3_600_000;
const durations = { plant: 48, like: 24, comment: 36 };
const isIsland = id => islands.some(island=>island.id===id);

export function createIslandAccess(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS island_access (
      player TEXT NOT NULL, island INTEGER NOT NULL, expiry INTEGER NOT NULL,
      PRIMARY KEY (player,island)
    );
    CREATE TABLE IF NOT EXISTS access_credits (
      player TEXT NOT NULL, plant TEXT NOT NULL REFERENCES plants(id), date TEXT NOT NULL,
      PRIMARY KEY (player,plant,date)
    );
    CREATE TABLE IF NOT EXISTS player_locations (
      player TEXT PRIMARY KEY, island INTEGER NOT NULL,
      x REAL, z REAL, yaw REAL, pitch REAL
    );
  `);
  const getExpiry=db.prepare('SELECT expiry FROM island_access WHERE player=? AND island=?');
  const setExpiry=db.prepare('INSERT INTO island_access VALUES (?,?,?) ON CONFLICT(player,island) DO UPDATE SET expiry=excluded.expiry');
  const creditComment=db.prepare('INSERT OR IGNORE INTO access_credits VALUES (?,?,?)');
  const getLocation=db.prepare('SELECT island,x,z,yaw,pitch FROM player_locations WHERE player=?');
  const setLocation=db.prepare(`INSERT INTO player_locations VALUES (?,?,?,?,?,?) ON CONFLICT(player) DO UPDATE SET
    island=excluded.island,x=excluded.x,z=excluded.z,yaw=excluded.yaw,pitch=excluded.pitch`);
  const location=(player,home)=>getLocation.get(player)??{island:home,x:null,z:null,yaw:null,pitch:null};
  const expiry=(player,island)=>getExpiry.get(player,island)?.expiry??0;
  const allowed=(player,home,island,now=Date.now())=>island===home||expiry(player,island)>now;
  const save=(player,island,pose={})=>setLocation.run(player,island,pose.x??null,pose.z??null,pose.yaw??null,pose.pitch??null);

  return {
    location,
    accessCards(player,home,now) {
      return islands.filter(({id})=>id!==home).map(({id})=>({
        island:id, expiry:expiry(player,id), active:allowed(player,home,id,now)
      }));
    },
    bridges(player,home,from,now) {
      return islands.filter(({id})=>id!==from).map(({id})=>({
        destination:id, open:true, permanent:true, canCross:allowed(player,home,id,now),
        ends:[from,id].sort((a,b)=>a-b).map(island=>({island,x:0,z:0}))
      }));
    },
    grant(player,home,seed,kind,now=Date.now()) {
      if(seed.owner===player||seed.island===home)return null;
      if(kind==='comment'&&!creditComment.run(player,seed.id,new Date(now).toISOString().slice(0,10)).changes)return null;
      const current=Math.max(expiry(player,seed.island),now);
      const updated=Math.min(current+durations[kind]*hour,now+120*hour);
      setExpiry.run(player,seed.island,updated);
      return {island:seed.island,expiry:updated,addedHours:(updated-current)/hour};
    },
    canVisit(player,home,island) {
      return island===home||location(player,home).island===island;
    },
    cross(player,home,destination) {
      const from=location(player,home).island;
      if(!isIsland(destination)||destination===from)return {status:400,error:'Choose a connected island.'};
      if(!allowed(player,home,destination))return {status:403,error:'Earn access to this island before crossing.'};
      save(player,destination);
      return {ok:true,island:destination};
    },
    savePose(player,home,island,pose) {
      if(location(player,home).island!==island)return false;
      save(player,island,pose);
      return true;
    }
  };
}
