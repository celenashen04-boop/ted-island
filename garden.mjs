import { randomUUID } from 'node:crypto';
import { createNotifications } from './notifications.mjs';
import { createIslandAccess } from './island-access.mjs';
import { islands } from './public/islands.mjs';

function growthStage({likes,commentCount,participantCount,replyParticipantCount,otherParticipated}) {
  if (likes>=6 && commentCount>=8 && participantCount>=4 && replyParticipantCount>=2) return 4;
  if (likes>=2 && commentCount>=2 && participantCount>=2) return 2;
  return likes>=1 && otherParticipated ? 1 : 0;
}

export function createGarden(db) {
  if (!db.prepare('PRAGMA table_info(plants)').all().some(column => column.name === 'question')) {
    db.exec("ALTER TABLE plants ADD COLUMN question TEXT NOT NULL DEFAULT ''");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS residents (
      seq INTEGER PRIMARY KEY, player TEXT NOT NULL UNIQUE, island INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS resident_profiles (
      player TEXT PRIMARY KEY REFERENCES residents(player),
      linkedin TEXT NOT NULL DEFAULT '',
      photo BLOB,
      photo_type TEXT
    );
    CREATE TABLE IF NOT EXISTS placements (
      seed TEXT NOT NULL REFERENCES plants(id), island INTEGER NOT NULL,
      x REAL NOT NULL, z REAL NOT NULL, PRIMARY KEY(seed,island)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY, seed TEXT NOT NULL REFERENCES plants(id), player TEXT NOT NULL,
      island INTEGER NOT NULL, body TEXT NOT NULL, created TEXT NOT NULL,
      reply_to INTEGER REFERENCES comments(id)
    );
    CREATE TABLE IF NOT EXISTS follows (
      seed TEXT NOT NULL REFERENCES plants(id), player TEXT NOT NULL, PRIMARY KEY(seed,player)
    );
    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY, seed TEXT NOT NULL REFERENCES plants(id), player TEXT NOT NULL,
      island INTEGER NOT NULL, kind TEXT NOT NULL
    );
    INSERT OR IGNORE INTO placements (seed,island,x,z)
      SELECT id,island,x,z FROM plants WHERE x IS NOT NULL AND z IS NOT NULL;
  `);

  if (!db.prepare('PRAGMA table_info(comments)').all().some(column => column.name === 'reply_to')) {
    db.exec('ALTER TABLE comments ADD COLUMN reply_to INTEGER REFERENCES comments(id)');
  }
  if (!db.prepare('PRAGMA table_info(resident_profiles)').all().some(column => column.name === 'share_linkedin')) {
    db.exec('ALTER TABLE resident_profiles ADD COLUMN share_linkedin INTEGER NOT NULL DEFAULT 0');
  }
  // V1 bridge history stays available in existing databases during rollout.
  const access = createIslandAccess(db);
  const notifications = createNotifications(db);
  const transaction = (work) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };
  const resident = db.prepare('SELECT seq,island FROM residents WHERE player=?');
  const assign = db.prepare(`INSERT OR IGNORE INTO residents(player,island)
    SELECT ?, COALESCE((SELECT island FROM plants WHERE owner=? ORDER BY planted_at LIMIT 1),
      (SELECT count(*) % ? FROM residents))`);
  function home(player) {
    let row = resident.get(player);
    if (!row) {
      assign.run(player,player,islands.length);
      row = resident.get(player);
    }
    return row;
  }
  const profileLookup = db.prepare(`SELECT linkedin,share_linkedin AS shareLinkedin,photo IS NOT NULL AS hasPhoto
    FROM resident_profiles WHERE player=?`);
  const legacyHome = db.prepare('SELECT island FROM plants WHERE owner=? ORDER BY planted_at LIMIT 1');
  const selectHome = db.prepare(`INSERT INTO residents(player,island) VALUES (?,?)
    ON CONFLICT(player) DO UPDATE SET island=excluded.island`);
  const save = db.prepare('INSERT INTO resident_profiles(player,linkedin,share_linkedin) VALUES (?,?,?)');
  const updateLinkedinSharing = db.prepare("UPDATE resident_profiles SET share_linkedin=? WHERE player=? AND linkedin<>''");
  const photoFor = db.prepare('SELECT photo,photo_type AS type FROM resident_profiles WHERE player=?');
  function profile(player) {
    const saved=profileLookup.get(player);
    const existing=resident.get(player) ?? legacyHome.get(player);
    const island=islands.some(entry=>entry.id===existing?.island)?existing.island:null;
    return { completed:Boolean(saved), island, linkedin:saved?.linkedin??'',
      shareLinkedin:Boolean(saved?.shareLinkedin), hasPhoto:Boolean(saved?.hasPhoto) };
  }
  function finishProfile(player,{island,linkedin,shareLinkedin}) {
    return transaction(()=>{
      const previous=profile(player);
      if(previous.completed)return {status:409,error:'Your profile is already set up.'};
      selectHome.run(player,island);
      save.run(player,linkedin,Number(shareLinkedin));
      return profile(player);
    });
  }
  function setLinkedinSharing(player, enabled) {
    return updateLinkedinSharing.run(Number(enabled),player).changes ? profile(player) : null;
  }
  const seed = db.prepare('SELECT id,owner,island,title,length(pdf) AS fileSize FROM plants WHERE id=?');
  const placement = db.prepare('SELECT 1 FROM placements WHERE seed=? AND island=?');
  const occupied = db.prepare('SELECT 1 FROM placements WHERE island=? AND (x-?)*(x-?)+(z-?)*(z-?) < .16');
  const place = db.prepare('INSERT INTO placements VALUES (?,?,?,?)');
  const insert = db.prepare(`INSERT INTO plants (id,owner,island,plot,title,idea,pdf,planted_at,x,z,question)
    VALUES (?,?,?,(SELECT COALESCE(MAX(plot),-1)+1 FROM plants WHERE island=?),?,?,?,?,?,?,?)`);
  const water = db.prepare('INSERT OR IGNORE INTO watering VALUES (?,?)');
  const comment = db.prepare('INSERT INTO comments(seed,player,island,body,created,reply_to) VALUES (?,?,?,?,?,?)');
  const commentById = db.prepare('SELECT player,island FROM comments WHERE id=? AND seed=?');
  const queueActivity = db.prepare('INSERT INTO activity(seed,player,island,kind) VALUES (?,?,?,?)');
  const cards = db.prepare(`SELECT p.id,p.title,p.idea,p.question,p.island AS originalIsland,
    p.owner=? AS mine,length(p.pdf)>0 AS hasArticle,COALESCE(author.public_id,'Resident '||r.seq) AS creator,
    p.owner AS owner,activityClock.last_activity AS lastActivity,
    CASE WHEN profile.share_linkedin=1 THEN NULLIF(profile.linkedin,'') END AS authorLinkedin,
    (SELECT count(*) FROM watering WHERE plant=p.id) AS likes,
    (SELECT count(*) FROM comments WHERE seed=p.id) AS commentCount,
    EXISTS(SELECT 1 FROM watering WHERE plant=p.id AND player=?) AS watered,
    EXISTS(SELECT 1 FROM follows WHERE seed=p.id AND player=?) AS following
    FROM plants p LEFT JOIN residents r ON r.player=p.owner
    LEFT JOIN resident_profiles profile ON profile.player=p.owner
    LEFT JOIN accounts author ON author.player=p.owner
    JOIN plant_activity activityClock ON activityClock.plant=p.id
    WHERE EXISTS(SELECT 1 FROM placements WHERE seed=p.id) ORDER BY p.planted_at,p.id`);
  const locations = db.prepare('SELECT seed,island,x,z FROM placements');
  const discussions = db.prepare(`SELECT c.id,c.seed,c.island,c.body,c.created,c.reply_to AS replyTo,COALESCE(author.public_id,'Resident '||r.seq) AS resident,
    parent.island AS replyIsland,COALESCE(parentAuthor.public_id,'Resident '||parentResident.seq) AS replyResident,
    CASE WHEN parent.id IS NULL THEN 0 ELSE c.player<>parent.player END AS repliesToAnother
    FROM comments c LEFT JOIN residents r ON r.player=c.player
    LEFT JOIN comments parent ON parent.id=c.reply_to
    LEFT JOIN residents parentResident ON parentResident.player=parent.player
    LEFT JOIN accounts author ON author.player=c.player
    LEFT JOIN accounts parentAuthor ON parentAuthor.player=parent.player ORDER BY c.id`);
  const contributors = db.prepare(`SELECT DISTINCT a.seed,a.island,COALESCE(author.public_id,'Resident '||r.seq) AS resident,a.player
    FROM activity a JOIN residents r ON r.player=a.player LEFT JOIN accounts author ON author.player=a.player
    WHERE a.kind IN ('like','comment')
    UNION SELECT DISTINCT w.plant,r.island,COALESCE(author.public_id,'Resident '||r.seq),w.player FROM watering w JOIN residents r ON r.player=w.player LEFT JOIN accounts author ON author.player=w.player`);
  const follow = db.prepare('INSERT OR IGNORE INTO follows VALUES (?,?)');
  const unfollow = db.prepare('DELETE FROM follows WHERE seed=? AND player=?');
  const followers=db.prepare('SELECT player FROM follows WHERE seed=? AND player<>?');
  function recordActivity(id,player,island,kind,excluded=[]) {
    const entry=queueActivity.run(id,player,island,kind).lastInsertRowid;
    for(const follower of followers.all(id,player)){
      if(!excluded.includes(follower.player))notifications.add({recipient:follower.player,type:'follow-'+kind,plant:id,
        key:'follow:'+entry,island});
    }
  }
  const updates = db.prepare(`SELECT a.id,a.seed,a.island,a.kind,p.title FROM activity a JOIN plants p ON p.id=a.seed
    JOIN follows f ON f.seed=a.seed WHERE f.player=? AND a.player<>? ORDER BY a.id DESC LIMIT 12`);

  function canVisit(player,island) {
    return access.canVisit(player,home(player).island,island);
  }
  function snapshot(player) {
    const island=home(player).island, now=Date.now();
    const position=access.location(player,island);
    const day=86_400_000;
    const allLocations=locations.all(), allComments=discussions.all(), allContributors=contributors.all();
    const bySeed=new Map(cards.all(player,player,player).map(card=>[card.id,{
      ...card,
      comments:allComments.filter(item=>item.seed===card.id),
      contributors:allContributors.filter(item=>item.seed===card.id),
      plantedOn:allLocations.filter(item=>item.seed===card.id).map(item=>item.island)
    }]));
    for(const card of bySeed.values()){
      const residents=new Set(card.contributors.map(item=>item.resident));
      const repliers=new Set(card.comments.filter(item=>item.repliesToAnother).map(item=>item.resident));
      card.participantCount=residents.size;
      card.replyParticipantCount=repliers.size;
      card.growth=growthStage({...card,otherParticipated:card.contributors.some(item=>item.player!==card.owner)});
      const inactiveDays=(now-card.lastActivity)/day;
      card.dormant=inactiveDays>=15;
      card.displayScale=card.dormant?Math.max(.28,1-(inactiveDays-15)*.72/15):1;
      delete card.lastActivity;
      delete card.owner;
      for(const contributor of card.contributors)delete contributor.player;
    }
    const bridges=access.bridges(player,island,position.island,now);
    const outward=access.accessCards(player,island,now);
    const available=new Set([island,...outward.filter(card=>card.active).map(card=>card.island)]);
    const worldBridges=islands.flatMap(({id})=>access.bridges(player,island,id,now)
      .filter(bridge=>bridge.destination>id)
      .map(bridge=>({...bridge,canCross:bridge.ends.every(end=>available.has(end.island)||end.island===position.island)})));
    const accessible=new Set([island,position.island]);
    const islandSummary=islands.map(entry=>{
      const local=allLocations.filter(item=>item.island===entry.id).map(item=>bySeed.get(item.seed)).filter(Boolean);
      const mature=local.filter(item=>item.growth===4&&!item.dormant).length;
      return {...entry,mature,total:local.length};
    });
    const visiblePlants=allLocations.filter(item=>accessible.has(item.island)&&bySeed.has(item.seed));
    const readableSeeds=new Set(visiblePlants.map(item=>item.seed));
    return {
      home:island, position, islands:islandSummary, bridges, worldBridges, access:outward, serverTime:now,
      catalog:[...bySeed.values()].filter(card=>card.originalIsland!==island&&islands.some(entry=>entry.id===card.originalIsland))
        .map(({id,title,idea,question,originalIsland,growth,plantedOn})=>({
          id,title,idea,question,originalIsland,growth,plantedHere:plantedOn.includes(island)
        })),
      plants:visiblePlants.map(({seed,...location})=>({...bySeed.get(seed),...location})),
      notifications:notifications.list(player),
      updates:updates.all(player,player).filter(item=>readableSeeds.has(item.seed))
    };
  }
  function plant(player, {x,z,title,idea,question,pdf,adopt}) {
    const island=home(player).island;
    return transaction(()=>{
      if(access.location(player,island).island!==island)return {status:403,error:'Return to your home island to plant.'};
      const source=adopt?seed.get(adopt):null;
      if(adopt&&(!source||source.island===island||!islands.some(entry=>entry.id===source.island))) {
        return {status:404,error:'Choose a seed from another island in the catalog.'};
      }
      if(adopt&&placement.get(adopt,island))return {id:adopt,unchanged:true};
      if(occupied.get(island,x,x,z,z))return {status:409,error:'A seed is already there. Aim at another spot.'};
      const id=adopt||randomUUID();
      if(!adopt){
        insert.run(id,player,island,island,title,idea,pdf,new Date().toISOString(),x,z,question);
        notifications.touch(id);
      }
      place.run(id,island,x,z);
      if(adopt)recordActivity(id,player,island,'plant');
      return {id,access:adopt?access.grant(player,island,source,'plant'):null};
    });
  }
  function participate(player,id,island,kind,body='',replyTo=null) {
    if(!placement.get(id,island)||!canVisit(player,island))return {status:404,error:'This plant is unavailable on that island.'};
    if(kind==='like'&&seed.get(id).owner===player)return {status:403,error:'Other residents can water your plant.'};
    const parent=replyTo===null?null:commentById.get(replyTo,id);
    if(replyTo!==null&&!parent)return {status:400,error:'This reply must refer to a comment on the same plant.'};
    const residentIsland=home(player).island;
    return transaction(()=>{
      if(kind==='like'&&!water.run(id,player).changes)return {ok:true,changed:false};
      const author=seed.get(id).owner;
      if(kind==='comment'){
        const created=Date.now();
        const commentId=Number(comment.run(id,player,residentIsland,body,new Date(created).toISOString(),replyTo).lastInsertRowid);
        if(parent?.player!==player)notifications.add({recipient:parent?.player,type:'reply',plant:id,comment:commentId,key:'reply:'+commentId,now:created});
        if(author!==player && author!==parent?.player)notifications.add({recipient:author,type:'comment',plant:id,comment:commentId,key:'comment:'+commentId,now:created});
      }
      notifications.touch(id);
      recordActivity(id,player,residentIsland,kind,kind==='comment'?[author,parent?.player]:[]);
      return {ok:true,changed:true,access:access.grant(player,residentIsland,seed.get(id),kind)};
    });
  }
  function setFollow(player,id,island,enabled) {
    if(!placement.get(id,island)||!canVisit(player,island))return {status:404,error:'This plant is unavailable.'};
    (enabled?follow:unfollow).run(id,player);
    return {ok:true};
  }
  function canRead(player,id){
    return db.prepare('SELECT island FROM placements WHERE seed=?').all(id)
      .some(row=>canVisit(player,row.island));
  }
  const findExport=db.prepare('SELECT id,title,idea,question,island,planted_at,pdf,owner FROM plants WHERE id=?');
  const wasContributor=db.prepare('SELECT 1 FROM activity WHERE seed=? AND player=? UNION SELECT 1 FROM watering WHERE plant=? AND player=?');
  function exportPlant(player,id){
    const row=findExport.get(id);
    if(!row || (row.owner!==player&&!wasContributor.get(id,player,id,player)))return null;
    const {pdf,owner,...plant}=row;
    return {plant, articleBase64:pdf.length?Buffer.from(pdf).toString('base64'):null,
      discussion:discussions.all().filter(item=>item.seed===id)};
  }
  return {
    exportPlant,
    runMaintenance(now){return transaction(()=>notifications.process(now));},
    markNotification(player,id){return notifications.markRead(player,id);},
    cross(player,island){return access.cross(player,home(player).island,island);},
    savePose(player,island,pose){return access.savePose(player,home(player).island,island,pose);},
    home,snapshot,plant,participate,setFollow,canRead,profile,finishProfile,photoFor,setLinkedinSharing };
}
