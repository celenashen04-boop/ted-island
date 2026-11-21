import { randomUUID } from 'node:crypto';
import { islands } from './public/islands.mjs';

function growthStage({likes,commentCount,participantCount,replyParticipantCount}) {
  if (likes>=6 && commentCount>=8 && participantCount>=4 && replyParticipantCount>=2) return 4;
  if (likes>=4 && commentCount>=4 && participantCount>=3) return 3;
  if (likes>=2 && commentCount>=2 && participantCount>=2) return 2;
  return likes>=1 ? 1 : 0;
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
    CREATE TABLE IF NOT EXISTS bridges (
      a INTEGER NOT NULL, b INTEGER NOT NULL, opened INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(a,b), CHECK(a<b)
    );
    CREATE TABLE IF NOT EXISTS bridge_contributions (
      id INTEGER PRIMARY KEY, a INTEGER NOT NULL, b INTEGER NOT NULL, player TEXT NOT NULL,
      island INTEGER NOT NULL, points INTEGER NOT NULL, cross_reply INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(a,b) REFERENCES bridges(a,b)
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

  if (!db.prepare('PRAGMA table_info(bridge_contributions)').all().some(column => column.name === 'cross_reply')) {
    db.exec('ALTER TABLE bridge_contributions ADD COLUMN cross_reply INTEGER NOT NULL DEFAULT 0');
  }
  if (!db.prepare('PRAGMA table_info(comments)').all().some(column => column.name === 'reply_to')) {
    db.exec('ALTER TABLE comments ADD COLUMN reply_to INTEGER REFERENCES comments(id)');
  }
  if (!db.prepare('PRAGMA table_info(resident_profiles)').all().some(column => column.name === 'share_linkedin')) {
    db.exec('ALTER TABLE resident_profiles ADD COLUMN share_linkedin INTEGER NOT NULL DEFAULT 0');
  }
  db.exec('CREATE INDEX IF NOT EXISTS bridge_contribution_pair ON bridge_contributions(a,b,player)');
  if (!db.prepare('PRAGMA table_info(bridges)').all().some(column => column.name === 'anchor_seed')) {
    db.exec('ALTER TABLE bridges ADD COLUMN anchor_seed TEXT REFERENCES plants(id)');
  }

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
  const startBridge = db.prepare('INSERT OR IGNORE INTO bridges(a,b) VALUES (?,?)');
  const water = db.prepare('INSERT OR IGNORE INTO watering VALUES (?,?)');
  const comment = db.prepare('INSERT INTO comments(seed,player,island,body,created,reply_to) VALUES (?,?,?,?,?,?)');
  const commentById = db.prepare('SELECT player,island FROM comments WHERE id=? AND seed=?');
  const queueActivity = db.prepare('INSERT INTO activity(seed,player,island,kind) VALUES (?,?,?,?)');
  const credit = db.prepare('INSERT INTO bridge_contributions(a,b,player,island,points,cross_reply) VALUES (?,?,?,?,?,?)');
  const firstBridgeSide = db.prepare(`SELECT island FROM bridge_contributions
    WHERE a=? AND b=? AND player=? AND points>0 ORDER BY id LIMIT 1`);
  const participation = db.prepare(`SELECT island, count(*) AS residents, sum(comments) AS comments, max(reply) AS reply
    FROM (SELECT island, player, min(2,sum(points=5)) AS comments, max(cross_reply) AS reply
          FROM bridge_contributions WHERE a=? AND b=? AND points>0 GROUP BY island,player)
    GROUP BY island`);
  const open = db.prepare('UPDATE bridges SET opened=1,anchor_seed=? WHERE a=? AND b=?');
  const pendingAnchor = db.prepare('SELECT * FROM bridges WHERE anchor_seed IS NULL');
  const connectedPairs = db.prepare(`SELECT b.* FROM bridges b
    JOIN placements a ON a.seed=? AND a.island=b.a
    JOIN placements z ON z.seed=a.seed AND z.island=b.b
    JOIN plants p ON p.id=a.seed AND p.island IN (b.a,b.b)
    WHERE b.opened=0`);
  const anchorCandidates = db.prepare(`SELECT p.id,a.x AS ax,a.z AS az,b.x AS bx,b.z AS bz
    FROM plants p JOIN placements a ON a.seed=p.id AND a.island=?
    JOIN placements b ON b.seed=p.id AND b.island=?
    WHERE p.island IN (a.island,b.island) ORDER BY p.planted_at,p.id`);
  const growthCounts = db.prepare(`SELECT
    (SELECT count(*) FROM watering WHERE plant=p.id) AS likes,
    (SELECT count(*) FROM comments WHERE seed=p.id) AS commentCount,
    (SELECT count(*) FROM residents r WHERE EXISTS(SELECT 1 FROM activity WHERE seed=p.id AND player=r.player)
      OR EXISTS(SELECT 1 FROM watering WHERE plant=p.id AND player=r.player)) AS participantCount,
    (SELECT count(DISTINCT c.player) FROM comments c JOIN comments parent ON parent.id=c.reply_to
      JOIN residents r ON r.player=c.player WHERE c.seed=p.id AND c.player<>parent.player) AS replyParticipantCount
    FROM plants p WHERE p.id=?`);
  const bridgesFor = db.prepare(`SELECT b.*,
    EXISTS(SELECT 1 FROM bridge_contributions g WHERE g.a=b.a AND g.b=b.b AND g.player=?) AS eligible
    FROM bridges b WHERE b.a=? OR b.b=?`);
  function requirements(a,b) {
    const rows = participation.all(a,b);
    const endpoints = [a,b].map(island => {
      const side = rows.find(row => row.island === island);
      return { island, residents: Math.min(2,side?.residents ?? 0), comments: Math.min(3,side?.comments ?? 0) };
    });
    const foundations = endpoints.reduce((sum,side)=>sum+side.residents*10,0);
    const discussion = Math.min(4,endpoints.reduce((sum,side)=>sum+side.comments,0));
    const crossReply = rows.some(row=>row.reply===1);
    return {endpoints,foundations,discussion,crossReply,progress:foundations+discussion*10+(crossReply?20:0)};
  }
  function openMatureBridge({a,b}) {
    if (requirements(a,b).progress!==100) return;
    const anchor = anchorCandidates.all(a,b).find(candidate=>growthStage(growthCounts.get(candidate.id))===4);
    if (anchor) open.run(anchor.id,a,b);
  }
  transaction(()=>{
    for (const pair of pendingAnchor.all()) {
      if (pair.opened) {
        const anchor = anchorCandidates.all(pair.a,pair.b)[0];
        if (anchor) open.run(anchor.id,pair.a,pair.b);
      } else openMatureBridge(pair);
    }
  });
  const related = db.prepare(`SELECT b.* FROM bridges b
    WHERE (b.a=? OR b.b=?) AND (b.a=? OR b.b=?)
      AND EXISTS(SELECT 1 FROM placements WHERE seed=? AND island=b.a)
      AND EXISTS(SELECT 1 FROM placements WHERE seed=? AND island=b.b)`);
  const cards = db.prepare(`SELECT p.id,p.title,p.idea,p.question,p.island AS originalIsland,
    p.owner=? AS mine,length(p.pdf)>0 AS hasArticle,r.seq AS creator,
    CASE WHEN profile.share_linkedin=1 THEN NULLIF(profile.linkedin,'') END AS authorLinkedin,
    (SELECT count(*) FROM watering WHERE plant=p.id) AS likes,
    (SELECT count(*) FROM comments WHERE seed=p.id) AS commentCount,
    EXISTS(SELECT 1 FROM watering WHERE plant=p.id AND player=?) AS watered,
    EXISTS(SELECT 1 FROM follows WHERE seed=p.id AND player=?) AS following
    FROM plants p LEFT JOIN residents r ON r.player=p.owner
    LEFT JOIN resident_profiles profile ON profile.player=p.owner
    WHERE EXISTS(SELECT 1 FROM placements WHERE seed=p.id) ORDER BY p.planted_at,p.id`);
  const locations = db.prepare('SELECT seed,island,x,z FROM placements');
  const discussions = db.prepare(`SELECT c.id,c.seed,c.island,c.body,c.created,c.reply_to AS replyTo,r.seq AS resident,
    parent.island AS replyIsland,parentResident.seq AS replyResident,
    CASE WHEN parent.id IS NULL THEN 0 ELSE c.player<>parent.player END AS repliesToAnother
    FROM comments c LEFT JOIN residents r ON r.player=c.player
    LEFT JOIN comments parent ON parent.id=c.reply_to
    LEFT JOIN residents parentResident ON parentResident.player=parent.player ORDER BY c.id`);
  const contributors = db.prepare(`SELECT DISTINCT a.seed,a.island,r.seq AS resident
    FROM activity a JOIN residents r ON r.player=a.player
    UNION SELECT DISTINCT w.plant,r.island,r.seq FROM watering w JOIN residents r ON r.player=w.player`);
  const follow = db.prepare('INSERT OR IGNORE INTO follows VALUES (?,?)');
  const unfollow = db.prepare('DELETE FROM follows WHERE seed=? AND player=?');
  const updates = db.prepare(`SELECT a.id,a.seed,a.island,a.kind,p.title FROM activity a JOIN plants p ON p.id=a.seed
    JOIN follows f ON f.seed=a.seed WHERE f.player=? AND a.player<>? ORDER BY a.id DESC LIMIT 12`);

  function residentBridges(player,island,bySeed) {
    return bridgesFor.all(player,island,island).map(row=>{
      const progress=requirements(row.a,row.b);
      let span;
      if (bySeed) {
        const candidates = anchorCandidates.all(row.a,row.b);
        const anchor = candidates.find(candidate=>candidate.id===row.anchor_seed)
          ?? candidates.reduce((lead,candidate)=>!lead || bySeed.get(candidate.id).growth>bySeed.get(lead.id).growth ? candidate : lead,null);
        if (anchor) span={seed:anchor.id,title:bySeed.get(anchor.id).title,
          growth:row.opened?4:bySeed.get(anchor.id).growth,
          ends:[{island:row.a,x:anchor.ax,z:anchor.az},{island:row.b,x:anchor.bx,z:anchor.bz}]};
      }
      return {...progress,destination:row.a===island?row.b:row.a,span,
        progress:row.opened?100:progress.progress,
        legacyOpen:Boolean(row.opened&&progress.progress<100),
        open:Boolean(row.opened),canCross:Boolean(row.opened&&row.eligible)};
    });
  }
  function canVisit(player, island) {
    const from=home(player).island;
    return from===island||residentBridges(player,from).some(bridge=>bridge.destination===island&&bridge.canCross);
  }
  function snapshot(player) {
    const island=home(player).island;
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
      card.growth=growthStage(card);
    }
    const bridges=residentBridges(player,island,bySeed);
    const accessible=new Set([island,...bridges.filter(bridge=>bridge.canCross).map(bridge=>bridge.destination)]);
    const visiblePlants=allLocations.filter(item=>accessible.has(item.island)&&bySeed.has(item.seed));
    const readableSeeds=new Set(visiblePlants.map(item=>item.seed));
    return {
      home:island, islands, bridges,
      catalog:[...bySeed.values()].filter(card=>card.originalIsland!==island&&islands.some(entry=>entry.id===card.originalIsland))
        .map(({id,title,idea,question,originalIsland,growth,plantedOn})=>({
          id,title,idea,question,originalIsland,growth,plantedHere:plantedOn.includes(island)
        })),
      plants:visiblePlants.map(({seed,...location})=>({...bySeed.get(seed),...location})),
      updates:updates.all(player,player).filter(item=>readableSeeds.has(item.seed))
    };
  }
  function plant(player, {x,z,title,idea,question,pdf,adopt}) {
    const island=home(player).island;
    return transaction(()=>{
      const source=adopt?seed.get(adopt):null;
      if(adopt&&(!source||source.island===island||!islands.some(entry=>entry.id===source.island))) {
        return {status:404,error:'Choose a seed from another island in the catalog.'};
      }
      if(adopt&&placement.get(adopt,island))return {status:409,error:'This seed is already planted on your island.'};
      if(occupied.get(island,x,x,z,z))return {status:409,error:'A seed is already there. Aim at another spot.'};
      const id=adopt||randomUUID();
      if(!adopt)insert.run(id,player,island,island,title,idea,pdf,new Date().toISOString(),x,z,question);
      place.run(id,island,x,z);
      if(adopt){
        const a=Math.min(island,source.island), b=Math.max(island,source.island);
        startBridge.run(a,b);
        queueActivity.run(id,player,island,'plant');
        for (const pair of connectedPairs.all(id)) openMatureBridge(pair);
      }
      return {id};
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
      if(kind==='comment')comment.run(id,player,residentIsland,body,new Date().toISOString(),replyTo);
      queueActivity.run(id,player,residentIsland,kind);
      const origin=seed.get(id).island;
      for(const bridge of related.all(residentIsland,residentIsland,origin,origin,id,id)){
        if(bridge.opened&&kind!=='comment')continue;
        const previousSide=firstBridgeSide.get(bridge.a,bridge.b,player);
        if(!bridge.opened&&previousSide&&previousSide.island!==residentIsland)continue;
        const other=bridge.a===residentIsland?bridge.b:bridge.a;
        const crossReply=kind==='comment'&&parent?.island===other;
        // A cross-island reply can occupy one of the resident's two counted comment slots.
        credit.run(bridge.a,bridge.b,player,residentIsland,bridge.opened?0:kind==='like'?1:5,Number(crossReply));
      }
      for (const pair of connectedPairs.all(id)) openMatureBridge(pair);
      return {ok:true,changed:true};
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
  return { home,snapshot,plant,participate,setFollow,canRead,profile,finishProfile,photoFor,setLinkedinSharing };
}
