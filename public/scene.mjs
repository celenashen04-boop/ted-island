import { onIsland, canPlant, tileWidth, tileDepth } from './plots.mjs';

export function createScene(canvas, { onPlant, onLanding, onThrowRequest }) {
  let plants = [];
  const keys = new Set();
  const spawn={x:0,z:3.65,yaw:0,pitch:-.15};
  let {x,z,yaw,pitch}=spawn;
  let feet=0, verticalSpeed=0, grounded=true, eye=1.05;
  const eyeHeight=1.05, bodyHeight=1.12, radius=.13, maxStep=.25;
  const near=.055, slingY=.75;
  const focalLength=(width,height)=>Math.max(height*.77,width*.48);
  const colliders=[];

  function collider(x,y,z,w,h,d){
    colliders.push({
      left:origin[0]+x-w/2,right:origin[0]+x+w/2,
      back:origin[2]+z-d/2,front:origin[2]+z+d/2,
      bottom:origin[1]+y,top:origin[1]+y+h
    });
  }

  function solidBox(x,y,z,w,h,d,color,top=color){
    box(x,y,z,w,h,d,color,top);
    collider(x,y,z,w,h,d);
  }
  let last=0, flight=null, throwing=false, pull=null;
  let plantHits=[], cursor=null;
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const throwButton=document.getElementById('seed-mode');
  const seedLabel=document.getElementById('seed-label')??throwButton;
  const moveStick=document.getElementById('move-stick');
  const movement={side:0,ahead:0};
  let stickId=null;
  const canvasReady=()=>canvas===document.activeElement && !document.querySelector('dialog[open]');
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const ctx = canvas.getContext('2d');
  const faces = [];
  let origin, seed = 417;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const pick = list => list[Math.floor(random()*list.length)];
  const sand = '#ecc5a6', cream = '#ffdab5', terracotta = '#b97260';
  const moss = ['#a6ad66','#919c59','#b5b572','#829251'];
  const rocks = ['#706e7b','#85808a','#a4918d','#8e8180','#9b8b86'];
  const petals = ['#e89c9e','#ffb8ab','#f5a6a6','#ffc8b3'];
  function tint(hex, light) {
    const n = parseInt(hex.slice(1),16);
    const channel = shift => Math.round(Math.max(0,Math.min(255,((n>>shift)&255)*light)));
    return 'rgb('+[channel(16),channel(8),channel(0)].join(',')+')';
  }
  function face(vertices, color, alpha = 1, decal = null, layer = 2) {
    const [a,b,c] = vertices;
    const u = b.map((v,i)=>v-a[i]), v = c.map((n,i)=>n-a[i]);
    const normal = [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const length = Math.hypot(...normal) || 1;
    const lighting = .82 + .27*(normal[0]*-.45+normal[1]*.8+normal[2]*.39)/length;
    faces.push({points:vertices.map(p=>p.map((n,i)=>n+origin[i])),normal,color:color && tint(color,lighting),alpha,decal,layer});
  }
  function box(x,y,z,w,h,d,color,top=color,layer=2) {
    const X=x+w/2, Z=z+d/2, Y=y+h; x-=w/2;z-=d/2;
    const a=[x,y,z], b=[X,y,z], c=[X,y,Z], e=[x,y,Z];
    const A=[x,Y,z], B=[X,Y,z], C=[X,Y,Z], E=[x,Y,Z];
    face([a,b,c,e],color,1,null,layer);face([A,E,C,B],top,1,null,layer);
    face([a,A,B,b],color,1,null,layer);face([b,B,C,c],color,1,null,layer);
    face([e,c,C,E],color,1,null,layer);face([a,e,E,A],color,1,null,layer);
  }
  function arch(x,y,z,r,leg,thickness,depth) {
    const R=r+thickness, spring=y+leg;
    for (const side of [-1,1]) solidBox(x+side*(r+thickness/2),y,z,thickness,leg,depth,sand);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
      const point=(radius,angle,side)=>[x+radius*Math.cos(angle),spring+radius*Math.sin(angle),z+side*depth/2];
      const [p,q,s,t]=[point(r,a,1),point(R,a,1),point(R,b,1),point(r,b,1)];
      const [P,Q,S,T]=[point(r,a,-1),point(R,a,-1),point(R,b,-1),point(r,b,-1)];
      const color=i%3===1?cream:sand;
      face([p,q,s,t],color);face([P,T,S,Q],color);
      face([q,Q,S,s],color);face([p,t,T,P],'#ffc68e');
    }
  }
  function crystal(x,y,z,rx,ry,rz,color,sides=7) {
    const ring=Array.from({length:sides},(_,i)=>[x+rx*Math.cos(i*2*Math.PI/sides),y,z+rz*Math.sin(i*2*Math.PI/sides)]);
    ring.forEach((a,i)=>{
      const b=ring[(i+1)%sides];
      face([a,[x,y+ry,z],b],color);
      face([a,b,[x,y-ry*.72,z]],color);
    });
  }
  function branch(a,b,r,color){
    const points=p=>[[p[0]-r,p[1],p[2]-r],[p[0]+r,p[1],p[2]-r],[p[0]+r,p[1],p[2]+r],[p[0]-r,p[1],p[2]+r]];
    const A=points(a),B=points(b);
    for(let i=0;i<4;i++){const j=(i+1)%4;face([A[i],B[i],B[j],A[j]],color);}
  }
  function tree(x,z,size) {
    const fork=[x,.88*size,z];
    branch([x,0,z],fork,.10*size,'#876052');
    collider(x,0,z,.20*size,fork[1],.20*size);
    for(let i=0;i<6;i++){
      const angle=i*2.4, spread=(.38+random()*.45)*size;
      const b=[x+Math.cos(angle)*spread,(1.32+random()*.48)*size,z+Math.sin(angle)*spread];
      branch(fork,b,.046*size,'#8e6054');
      for(let j=0;j<4;j++) crystal(b[0]+(random()-.5)*size*.65,b[1]+random()*.23*size,b[2]+(random()-.5)*size*.65,(.22+random()*.23)*size,(.15+random()*.15)*size,(.21+random()*.22)*size,pick(petals),6);
    }
  }
  function panel(x,y,z,w,h,paint,color=null,alpha=1){
    face([[x-w/2,y,z],[x+w/2,y,z],[x+w/2,y+h,z],[x-w/2,y+h,z]],color,alpha,paint);
  }
  function glyph(symbol, glass) {
    return (g,w,h)=>{
      g.strokeStyle=glass?'#e6edff':'#ffdfbc';g.fillStyle=g.strokeStyle;
      g.lineWidth=3;g.lineJoin='round';g.lineCap='round';
      if(glass){
        const glow=g.createLinearGradient(0,0,w,h);
        glow.addColorStop(0,'rgba(221,209,255,.72)');glow.addColorStop(1,'rgba(158,162,246,.32)');
        g.fillStyle=glow;g.fillRect(0,0,w,h);g.strokeRect(1,1,w-2,h-2);g.fillStyle='#f8f1ff';
      }
      g.save();g.translate(w/2,h*.52);g.scale(.91,.91);
      const line=(...pts)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();};
      const ring=(x,y,r,start=0,end=2*Math.PI)=>{g.beginPath();g.arc(x,y,r,start,end);g.stroke();};
      if(symbol===0){for(const x of [-14,0,14]){ring(x,-8,4);g.beginPath();g.arc(x,10,7,Math.PI,2*Math.PI);g.stroke();}}
      if(symbol===1){g.strokeRect(-10,-10,20,20);g.strokeRect(-5,-5,10,10);for(let q=-7;q<=7;q+=7){line([q,-11],[q,-16]);line([q,11],[q,16]);line([-11,q],[-16,q]);line([11,q],[16,q]);}}
      if(symbol===2){ring(-4,-14,3);ring(-5,6,11,.1,4.15);line([-4,-7],[-3,3],[8,3],[15,13],[19,11]);line([-3,-3],[7,-3]);}
      if(symbol===3){line([-10,14],[9,-13]);g.beginPath();g.moveTo(-3,4);g.quadraticCurveTo(-11,-15,13,-15);g.quadraticCurveTo(16,0,-3,4);g.stroke();g.beginPath();g.moveTo(-6,9);g.quadraticCurveTo(-21,10,-18,-7);g.quadraticCurveTo(-5,-5,-6,9);g.stroke();}
      if(symbol===4){ring(-3,-9,9,2.95,6.05);line([-4,11],[-6,-8],[-2,-10],[1,3],[5,0],[11,3],[14,12],[7,20],[-2,17],[-12,8],[-10,5],[-4,11]);}
      if(symbol===5){line([0,-9],[-6,-13],[-17,-13],[-17,10],[-7,10],[0,14],[7,10],[17,10],[17,-13],[6,-13],[0,-9],[0,14]);}
      g.restore();
    };
  }
  const lawn = ['#a5b76e','#afbe75','#aab974','#a4b56a','#b5c17b'];
  function terrainTile(i,j,depth,rock,turf,grass){
    const left=(i-.5)*tileWidth,right=(i+.5)*tileWidth;
    const back=(j-.5)*tileDepth,front=(j+.5)*tileDepth;
    const corners=[[left,back],[right,back],[right,front],[left,front]];
    const at=(index,y)=>[corners[index][0],y,corners[index][1]];
    face([at(0,-depth),at(1,-depth),at(2,-depth),at(3,-depth)],rock,1,null,0);
    // Only the grass is exposed above each terrain column.
    face([at(0,0),at(3,0),at(2,0),at(1,0)],grass,1,null,1);
    const neighbors=[[i,j-1],[i+1,j],[i,j+1],[i-1,j]];
    neighbors.forEach(([x,z],side)=>{
      if(onIsland(x*tileWidth,z*tileDepth))return;
      const next=(side+1)%4;
      face([at(side,-depth),at(side,-.16),at(next,-.16),at(next,-depth)],rock,1,null,0);
      face([at(side,-.16),at(side,0),at(next,0),at(next,-.16)],turf,1,null,0);
    });
  }
  function meadow(x,z) {
    for(let i=0;i<3;i++){
      const px=x+(random()-.5)*.57, pz=z+(random()-.5)*.48;
      const height=.045+random()*.11;
      crystal(px,.045,pz,.063+random()*.05,height,.056,pick(moss),5);
      if(random()<.33) crystal(px,height*.58+.055,pz,.047,.032,.047,pick(['#ffe2a0','#f5b9a6','#e4d2f4']),5);
    }
  }
  {
    const terrain=Math.sqrt(3);
    origin=[0,0,0];
    for(let j=-3;j<=3;j++)for(let i=-3;i<=3;i++){
      const radius=Math.hypot(i,j);
      if(Math.abs(i)+Math.abs(j)===6) continue;
      const tx=i*tileWidth,tz=j*tileDepth;
      const depth=.45+(4-radius)*.30+random()*.31;
      const color=pick(rocks), turf=pick(lawn);
      terrainTile(i,j,depth,color,pick(moss),turf);
      if(radius<3.15){
        const extra=.28+(3.15-radius)*.25+random()*.31;
        box(tx+(random()-.5)*.15,-depth-extra,tz+(random()-.5)*.14,(.55+random()*.23)*terrain,extra+.03,(.50+random()*.17)*terrain,pick(rocks),undefined,0);
      }
      const edge=Math.abs(i)>=2 || j<=-2;
      if(edge && random()<.77){
        meadow(tx-.26,tz+.26);
        if(random()<.45)meadow(tx+.34,tz-.27);
      }
      if(edge && radius>2.8 && random()<.22){
        solidBox(tx-.12,0,tz,.4,.10+random()*.16,.32,pick(rocks),turf);
      }
    }
    // A narrow path leaves open lawns on either side of the central building.
    const approach=2.48*terrain;
    for(let stepZ=1.52;stepZ<approach;stepZ+=.34){
      solidBox(0,0,stepZ,.72,.055,.23,sand,cream);
    }
    for(const side of [-1,1]){
      const groveX=side*1.46*terrain;
      tree(groveX,-1.22*terrain,1.02+random()*.33);
      if(side===-1)tree(groveX,.98*terrain,.80);
      meadow(groveX,1.57*terrain);
    }
    origin=[0,0,.40];
    solidBox(0,-.05,.48,2.55,.28,1.26,sand,cream);
    const stairX=0;
    solidBox(stairX,0,-.91,1.72,.95,1.51,sand,cream);
    for(let j=0;j<8;j++)solidBox(stairX,.225,-.19+j*.145,1.18,.73-j*.091,.15,sand,cream);
    arch(stairX,.95,-.87,.59,.83,.25,.58);
    const flagX=.95, towerY=3.06;
    solidBox(flagX,0,-1.03,.65,towerY,.64,sand,cream);
    box(flagX,towerY,-1.03,.77,.15,.73,cream);
    box(flagX,towerY-.16,-.663,.75,.045,.09,'#ae7f61');
    const flagTop=towerY-.17, flagBottom=flagTop-1.11;
    const flagColor=terracotta;
    box(flagX,flagBottom,-.665,.55,1.11,.027,flagColor);
    face([[flagX-.275,flagBottom,-.65],[flagX,flagBottom-.19,-.65],[flagX+.275,flagBottom,-.65]],flagColor);
    panel(flagX,flagBottom+.04,-.647,.54,1.02,glyph(0,false));
    solidBox(.92,.23,.86,.66,.11,.64,cream);
    panel(.92,.34,.79,.66,1.02,glyph(0,true));
    collider(.92,.34,.79,.66,1.02,.03);
    origin=[0,0,0];
    for(const sign of [-1,1]){
      const a=sign*(2.98*terrain+random()*.27), b=(random()-.5)*2, c=-.68-random()*.69;
      box(a,c,b,.25,.28,.25,pick(rocks),pick(moss));
      crystal(a,c,b,.165,.18,.16,pick(rocks),4);
    }
  }
  let width, height;
  function sky(){
    const sky=ctx.createLinearGradient(0,0,width*.3,height);
    sky.addColorStop(0,'#738cbf');sky.addColorStop(.53,'#91a7d3');sky.addColorStop(1,'#bdc9eb');
    ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    ctx.save();ctx.scale(width,height);
    for(const [x,y,s] of [[.05,.16,.08],[.85,.12,.082],[.18,.83,.11],[.87,.72,.10],[.59,.95,.13],[.01,.53,.095]]){
      for(let j=0;j<7;j++){
        const u=x+(j-3)*s*.22,v=y-Math.sin(j*Math.PI/6)*s*.22,r=s*(.34+.19*Math.sin(j*2.09)**2);
        const cloud=ctx.createRadialGradient(u,v,0,u,v,r);
        cloud.addColorStop(0,'rgba(255,237,240,.31)');cloud.addColorStop(.55,'rgba(251,239,248,.20)');cloud.addColorStop(1,'rgba(242,237,255,0)');
        ctx.fillStyle=cloud;ctx.fillRect(u-r,v-r,2*r,2*r);
      }
    }
    ctx.restore();
  }
  function insideSolid(x,y,z){
    return colliders.some(box=>x>box.left && x<box.right && y>box.bottom && y<box.top
      && z>box.back && z<box.front);
  }

  function clearPath(tx,ty,tz){
    const steps=Math.ceil(Math.hypot(tx-x,tz-z)*20);
    for(let i=1;i<steps;i++){
      const fraction=i/steps;
      if(insideSolid(x+(tx-x)*fraction,eye+(ty-eye)*fraction,z+(tz-z)*fraction))return false;
    }
    return true;
  }

  function plantAt(x,y){
    return plantHits.findLast(hit=>x>=hit.left&&x<=hit.right&&y>=hit.top&&y<=hit.bottom);
  }

  function sweepBox(start,end,box,radius){
    const mins=[box.left,box.bottom,box.back],maxs=[box.right,box.top,box.front];
    let entry=0,exit=1,normal=[0,1,0];
    for(let axis=0;axis<3;axis++){
      const delta=end[axis]-start[axis];
      const low=mins[axis]-radius,high=maxs[axis]+radius;
      if(Math.abs(delta)<1e-7){
        if(start[axis]<low||start[axis]>high)return null;
        continue;
      }
      const first=((delta>0?low:high)-start[axis])/delta;
      const last=((delta>0?high:low)-start[axis])/delta;
      if(first>entry){
        entry=first;
        normal=[0,0,0];
        normal[axis]=-Math.sign(delta);
      }
      exit=Math.min(exit,last);
      if(entry>exit)return null;
    }
    return {fraction:entry,normal};
  }

  function trajectory(dx,dy){
    const pullDistance=Math.max(1,Math.hypot(dx,dy));
    const strength=clamp((pullDistance-10)/135,0,1)**1.65;
    const turn=clamp(Math.atan2(-dx,Math.max(dy,pullDistance*.54)),-.87,.87);
    const heading=yaw+turn;
    // Keep both the horizontal heading and the initial velocity in front of the camera.
    const maxForwardPitch=pitch<0
      ? Math.atan2(Math.cos(turn)*Math.cos(pitch),-Math.sin(pitch))-.04
      : 1.10;
    const launchPitch=Math.min(clamp(pitch+.50+.49*dy/pullDistance,.10,1.10),maxForwardPitch);
    const speed=1.65+strength*11.95;
    const horizontalSpeed=speed*Math.cos(launchPitch);
    const lift=speed*Math.sin(launchPitch);
    const gravity=9.8, seedRadius=.055, launchDistance=.56;
    const viewport=canvas.getBoundingClientRect();
    const focal=focalLength(viewport.width,viewport.height);
    const drop=focal>0 ? (slingY-.5)*viewport.height*launchDistance/focal : 0;
    const releaseHeight=eye+Math.sin(pitch)*launchDistance-Math.cos(pitch)*drop;
    const forwardOffset=Math.cos(pitch)*launchDistance+Math.sin(pitch)*drop;
    const fromX=x+Math.sin(yaw)*forwardOffset,fromZ=z-Math.cos(yaw)*forwardOffset;
    const vx=Math.sin(heading)*horizontalSpeed,vz=-Math.cos(heading)*horizontalSpeed;
    const point=t=>[fromX+vx*t,releaseHeight+lift*t-gravity*t*t/2,fromZ+vz*t];
    const timeToHeight=y=>(lift+Math.sqrt(Math.max(0,lift*lift+2*gravity*(releaseHeight-y))))/gravity;
    const groundTime=timeToHeight(seedRadius);
    const [tx,,tz]=point(groundTime);
    const hitsGround=onIsland(tx,tz);
    const limit=hitsGround?groundTime:timeToHeight(-3.6);

    // Sweep between consecutive prediction samples so thin features still register a hit.
    const samples=[{time:0,position:point(0)}];
    while(samples.at(-1).time<limit){
      const previous=samples.at(-1);
      const time=Math.min(limit,previous.time+1/60);
      const position=point(time);
      let hit=null;
      for(const box of colliders){
        const candidate=sweepBox(previous.position,position,box,seedRadius);
        if(candidate&&(!hit||candidate.fraction<hit.fraction))hit=candidate;
      }
      if(hit){
        const duration=previous.time+(time-previous.time)*hit.fraction;
        const center=point(duration);
        samples.push({time:duration,position:center});
        const impact=center.map((value,axis)=>value-hit.normal[axis]*seedRadius);
        return {point,samples,duration,result:'blocked',impact,normal:hit.normal};
      }
      samples.push({time,position});
    }
    if(!hitsGround)return {point,samples,duration:limit,result:'miss'};
    const open=canPlant(tx,tz)&&!plants.some(p=>Math.hypot(p.x-tx,p.z-tz)<.4);
    return {point,samples,duration:limit,result:open?'planted':'blocked',
      landing:{x:tx,z:tz},impact:[tx,0,tz],normal:[0,1,0]};
  }

  function setThrowMode(active){
    throwing=active;
    pull=null;
    canvas.parentElement?.classList.toggle('is-throwing',active);
    throwButton.setAttribute('aria-pressed',String(active));
    seedLabel.textContent=active?'Cancel throw':'Throw seed';
    canvas.focus({preventScroll:true});
  }

  function toggleThrow(){
    if(flight || document.querySelector('dialog[open]'))return;
    if(!throwing&&!onThrowRequest())return;
    setThrowMode(!throwing);
  }

  function plantSize(plant){
    return plant.likes>=5?.76:plant.likes>=2?.52:plant.likes?.34:.11;
  }

  function drawPlant(project,plant,scale,now) {
    const [sx,sy]=project([plant.x,.016,plant.z]);
    const tall=plantSize(plant)*scale;
    const seedY=.105+(reducedMotion?.matches?0:Math.sin(now*.003+plant.x*2+plant.z)*.038);
    const [seedX,seedScreenY]=project([plant.x,seedY,plant.z]);
    ctx.save();ctx.translate(sx,sy);
    ctx.beginPath();ctx.ellipse(0,0,.12*scale,.055*scale,0,0,Math.PI*2);
    ctx.fillStyle='#715642';ctx.fill();
    if(!plant.likes){
      ctx.restore();
      drawSeed(seedX,seedScreenY,clamp(.061*scale,5,24),-.45);
    }else{
      ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(tall*.24,-tall*.5,0,-tall);
      ctx.strokeStyle='#526837';ctx.lineWidth=Math.max(1.5,scale*.023);ctx.stroke();
      for(const [side,level,color] of [[1,.65,'#a8ce70'],[-1,.42,'#79a658']]){
        ctx.beginPath();ctx.ellipse(side*tall*.18,-tall*level,tall*.20,tall*.073,side*-.55,0,Math.PI*2);
        ctx.fillStyle=color;ctx.fill();
      }
      if(plant.likes>=5){
        for(let petal=0;petal<6;petal++){
          const a=petal*Math.PI/3;
          ctx.beginPath();ctx.arc(Math.cos(a)*tall*.105,-tall+Math.sin(a)*tall*.105,tall*.082,0,Math.PI*2);
          ctx.fillStyle='#ffc2c5';ctx.fill();
        }
        ctx.beginPath();ctx.arc(0,-tall,tall*.066,0,Math.PI*2);ctx.fillStyle='#ffe29c';ctx.fill();
      }
      ctx.restore();
    }
    const centerX=plant.likes?sx:seedX;
    const top=plant.likes?sy-tall*1.2:seedScreenY-clamp(.061*scale,5,24)*1.2;
    const halfWidth=Math.max(12,(plant.likes ? .17 : .078)*scale);
    if(clearPath(plant.x,plant.likes?plantSize(plant)*.62:seedY,plant.z)){
      plantHits.push({id:plant.id,left:centerX-halfWidth,right:centerX+halfWidth,top:top-5,bottom:sy+8});
    }
  }

  function overlaps(box,px,pz){
    return px+radius>box.left && px-radius<box.right
      && pz+radius>box.back && pz-radius<box.front;
  }

  function floorAt(px,pz,ceiling){
    let floor=ceiling>=0&&onIsland(px,pz)?0:-Infinity;
    for(const box of colliders){
      if(box.top<=ceiling&&box.top>floor&&overlaps(box,px,pz))floor=box.top;
    }
    return floor;
  }

  function moveTo(px,pz){
    const step=grounded?Math.max(feet,floorAt(px,pz,feet+maxStep)):feet;
    for(const box of colliders){
      if(box.top>step+.001 && box.bottom<step+bodyHeight && overlaps(box,px,pz))return;
    }
    x=px;z=pz;feet=step;
  }

  function walk(dt){
    if(canvasReady()){
      const side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+movement.side;
      const ahead=Number(keys.has('KeyW'))-Number(keys.has('KeyS'))+movement.ahead;
      yaw+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*1.8;
      pitch=clamp(pitch+(Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')))*dt*1.6,-1.33,1.16);
      if(side||ahead){
        const speed=dt*2.65/Math.max(1,Math.hypot(side,ahead));
        moveTo(x+(Math.sin(yaw)*ahead+Math.cos(yaw)*side)*speed,z);
        moveTo(x,z+(-Math.cos(yaw)*ahead+Math.sin(yaw)*side)*speed);
      }
    }
    verticalSpeed-=9.8*dt;
    const floor=floorAt(x,z,feet+.001);
    const nextFeet=feet+verticalSpeed*dt;
    grounded=nextFeet<=floor;
    if(grounded){feet=floor;verticalSpeed=0;}
    else feet=nextFeet;
    if(feet < -8){
      ({x,z,yaw,pitch}=spawn);
      feet=0;verticalSpeed=0;grounded=true;
      if(throwing)setThrowMode(false);
    }
    eye=feet+eyeHeight;
  }

  function draw(now){
    requestAnimationFrame(draw);
    walk(last?Math.min(.045,(now-last)/1000):0);
    last=now;
    if(flight && now>=flight.start+flight.duration*1000){
      const {result,landing}=flight;
      flight=null;
      onLanding(result,landing);
    }
    const bounds=canvas.getBoundingClientRect();
    width=bounds.width;height=bounds.height;
    if(!width||!height)return;
    const ratio=Math.min(devicePixelRatio||1,2);
    const pixelsX=Math.round(width*ratio),pixelsY=Math.round(height*ratio);
    if(canvas.width!==pixelsX || canvas.height!==pixelsY){canvas.width=pixelsX;canvas.height=pixelsY;}
    ctx.setTransform(ratio,0,0,ratio,0,0);
    sky();
    const cs=Math.cos(yaw),sn=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const focal=focalLength(width,height);
    function view([wx,wy,wz]){
      const dx=wx-x,dy=wy-eye,dz=wz-z;
      const ahead=dx*sn-dz*cs;
      return [dx*cs+dz*sn,dy*cp-ahead*sp,ahead*cp+dy*sp];
    }
    const screen=([vx,vy,d])=>[width*.5+focal*vx/d,height*.5-focal*vy/d];
    const project=point=>screen(view(point));
    const visible=[];
    for(const item of faces){
      const [px,py,pz]=item.points[0], [nx,ny,nz]=item.normal;
      if(nx*(x-px)+ny*(eye-py)+nz*(z-pz)<=0)continue;
      const points=item.points.map(view), clipped=[];
      for(let i=0;i<points.length;i++){
        const a=points[i],b=points[(i+1)%points.length];
        if(a[2]>=near)clipped.push(a);
        if((a[2]>=near)!==(b[2]>=near)){
          const t=(near-a[2])/(b[2]-a[2]);
          clipped.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,near]);
        }
      }
      if(clipped.length<3)continue;
      const pixels=clipped.map(screen);
      if(pixels.every(p=>p[0]<0)||pixels.every(p=>p[0]>width)||pixels.every(p=>p[1]<0)||pixels.every(p=>p[1]>height))continue;
      visible.push({item,pixels,layer:item.layer,depth:clipped.reduce((sum,p)=>sum+p[2],0)/clipped.length,
        decal:item.decal&&points.every(p=>p[2]>=near)});
    }
    for(const plant of plants){
      const depth=view([plant.x,.016,plant.z])[2];
      if(depth>.18)visible.push({plant,depth,layer:2});
    }
    // The camera stays above the island. Paint its continuous walking surface
    // before structures so a large tile cannot cover smaller objects on it.
    visible.sort((a,b)=>a.layer-b.layer || b.depth-a.depth);
    plantHits=[];
    for(const {item,pixels,plant,depth,decal} of visible){
      if(plant){drawPlant(project,plant,focal/depth,now);continue;}
      if(item.color){
        ctx.globalAlpha=item.alpha;ctx.fillStyle=item.color;ctx.beginPath();
        pixels.forEach(([sx,sy],i)=>i?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy));
        ctx.closePath();ctx.fill();
        if(item.alpha===1){ctx.strokeStyle=item.color;ctx.lineWidth=.65;ctx.stroke();}
        ctx.globalAlpha=1;
      }
      if(decal){
        const [bl,,tr,tl]=pixels;
        const w=(item.points[1][0]-item.points[0][0])*100;
        const h=(item.points[3][1]-item.points[0][1])*100;
        ctx.save();
        ctx.transform((tr[0]-tl[0])/w,(tr[1]-tl[1])/w,(bl[0]-tl[0])/h,(bl[1]-tl[1])/h,tl[0],tl[1]);
        item.decal(ctx,w,h);ctx.restore();
      }
    }
    const pulling=pull && Math.hypot(pull.dx,pull.dy)*pull.gain>=10;
    const arc=pulling?trajectory(pull.dx*pull.gain,pull.dy*pull.gain):flight;
    if(arc)drawTrajectory(arc,view,screen,Boolean(flight));
    if(throwing)drawSling();
    if(flight){
      const t=clamp((now-flight.start)/1000,0,flight.duration);
      const position=view(flight.point(t));
      if(position[2]>near){
        const [sx,sy]=screen(position);
        drawSeed(sx,sy,clamp(.085*focal/position[2],6,22),t*10-.64);
      }
    }
    const clickable=!throwing&&!flight&&cursor&&plantAt(cursor.x,cursor.y);
    canvas.classList?.toggle('over-plant',Boolean(clickable));
  }

  function drawTrajectory(arc,view,screen,inFlight){
    const color=arc.result==='planted'?'#b7ff92':arc.result==='miss'?'#d6fca8':'#ffd594';
    ctx.save();
    ctx.globalAlpha=inFlight ? .46 : 1;
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();
    let started=false;
    for(const {position} of arc.samples){
      const point=view(position);
      if(point[2]<=near){started=false;continue;}
      const [sx,sy]=screen(point);
      if(started)ctx.lineTo(sx,sy);
      else ctx.moveTo(sx,sy);
      started=true;
    }
    ctx.strokeStyle='#143d2a';ctx.lineWidth=4;ctx.stroke();
    ctx.strokeStyle='#89ff75';ctx.lineWidth=1.65;ctx.stroke();

    // Sample the same ballistic path the released seed follows.
    const beadCount=clamp(Math.round(arc.duration*13),9,19);
    for(let i=1;i<=beadCount;i++){
      const point=view(arc.point(arc.duration*i/(beadCount+1)));
      if(point[2]<=near)continue;
      const [sx,sy]=screen(point);
      const size=clamp(5.8-point[2]*.63,2.25,5.6);
      ctx.beginPath();ctx.arc(sx,sy,size,0,Math.PI*2);
      ctx.fillStyle=color;ctx.fill();
      ctx.strokeStyle='#143d2a';ctx.lineWidth=1.6;ctx.stroke();
    }
    if(arc.impact){
      const [nx,ny,nz]=arc.normal;
      const [x,y,z]=arc.impact;
      const offset=[x+nx*.018,y+ny*.018,z+nz*.018];
      for(const radius of [.20,.29]){
        ctx.beginPath();
        let drawing=false;
        for(let i=0;i<=24;i++){
          const a=i*Math.PI/12;
          const u=Math.cos(a)*radius,v=Math.sin(a)*radius;
          const point=view([offset[0]+(nx?0:u),offset[1]+(ny?0:nx?u:v),offset[2]+(nz?0:v)]);
          if(point[2]<=near){drawing=false;continue;}
          const [sx,sy]=screen(point);
          if(drawing)ctx.lineTo(sx,sy);
          else ctx.moveTo(sx,sy);
          drawing=true;
        }
        ctx.strokeStyle='#143d2a';ctx.lineWidth=4;ctx.stroke();
        ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawSling(){
    const centerX=width/2,centerY=height*slingY;
    const sx=centerX+(pull?.dx??0),sy=centerY+(pull?.dy??0);
    ctx.save();
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(centerX-24,centerY+9);ctx.lineTo(sx,sy);ctx.lineTo(centerX+24,centerY+9);
    ctx.strokeStyle='#472d20';ctx.lineWidth=9;ctx.stroke();
    ctx.strokeStyle='#d99a62';ctx.lineWidth=5;ctx.stroke();
    ctx.restore();
    drawSeed(sx,sy,14,-.34);
  }

  function drawSeed(sx,sy,radius,angle){
    ctx.save();ctx.translate(sx,sy);ctx.rotate(angle);ctx.scale(radius,radius);
    const coat=ctx.createLinearGradient(-.65,-.85,.72,.75);
    coat.addColorStop(0,'#fff0a4');coat.addColorStop(.42,'#e9a24e');coat.addColorStop(1,'#7d4629');
    ctx.beginPath();ctx.moveTo(0,-1.15);
    ctx.bezierCurveTo(.42,-.86,.83,-.43,.79,.22);
    ctx.bezierCurveTo(.75,1.19,-.74,1.2,-.79,.28);
    ctx.bezierCurveTo(-.83,-.32,-.42,-.83,0,-1.15);
    ctx.closePath();
    ctx.fillStyle=coat;ctx.fill();
    ctx.strokeStyle='#51311d';ctx.lineWidth=.16;ctx.stroke();
    ctx.beginPath();ctx.moveTo(-.08,-.79);ctx.quadraticCurveTo(-.39,-.12,-.15,.65);
    ctx.strokeStyle='#fff1b7';ctx.lineWidth=.095;ctx.stroke();
    ctx.restore();
  }

  function look(dx,dy){
    yaw+=dx*.0035;
    pitch=clamp(pitch-dy*.0035,-1.33,1.16);
  }
  let pointer=null, traveled=0, lastPointer=null;
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0 && event.pointerType!=='touch')return;
    canvas.focus();
    if(throwing){
      const rect=canvas.getBoundingClientRect();
      const centerX=rect.left+rect.width/2,centerY=rect.top+rect.height*slingY;
      if(!pull&&Math.hypot(event.clientX-centerX,event.clientY-centerY)<=30){
        const gain=event.pointerType==='touch' ? Math.max(1,145/Math.max(45,rect.height*(1-slingY)-14)) : 1;
        pull={id:event.pointerId,centerX,centerY,dx:0,dy:0,gain};
        canvas.setPointerCapture(event.pointerId);
        return;
      }
    }
    if(pointer!==null || pull)return;
    pointer=event.pointerId;traveled=0;lastPointer=cursor=pointerPosition(event);
    canvas.setPointerCapture(pointer);
  });
  canvas.addEventListener('pointermove',event=>{
    if(pull?.id===event.pointerId){
      pull.dx=clamp(event.clientX-pull.centerX,-175,175);
      pull.dy=clamp(event.clientY-pull.centerY,-175,175);
      return;
    }
    cursor=pointerPosition(event);
    if(event.pointerId!==pointer)return;
    const dx=event.pointerType==='touch'?cursor.x-lastPointer.x:event.movementX;
    const dy=event.pointerType==='touch'?cursor.y-lastPointer.y:event.movementY;
    lastPointer=cursor;
    traveled+=Math.abs(dx)+Math.abs(dy);
    if(traveled>4)look(dx,dy);
  });
  canvas.addEventListener('pointerup',event=>{
    if(pull?.id===event.pointerId){
      const dx=clamp(event.clientX-pull.centerX,-175,175)*pull.gain;
      const dy=clamp(event.clientY-pull.centerY,-175,175)*pull.gain;
      pull=null;
      if(Math.hypot(dx,dy)<10)return;
      flight={...trajectory(dx,dy),start:performance.now()};
      setThrowMode(false);
      return;
    }
    if(event.pointerId!==pointer)return;
    pointer=null;
    if(traveled>4 || throwing || flight)return;
    const {x,y}=pointerPosition(event);
    const plant=plantAt(x,y);
    if(plant)onPlant(plant.id);
  });
  function pointerPosition(event){
    const rect=canvas.getBoundingClientRect();
    return {x:event.clientX-rect.left,y:event.clientY-rect.top};
  }
  canvas.addEventListener('pointerleave',()=>{cursor=null;});
  canvas.addEventListener('lostpointercapture',event=>{
    if(pointer===event.pointerId)pointer=null;
    if(pull?.id===event.pointerId)pull=null;
  });
  function updateStick(event){
    const rect=moveStick.getBoundingClientRect();
    const reach=rect.width*.31;
    const dx=(event.clientX-rect.left-rect.width/2)/reach;
    const dy=(event.clientY-rect.top-rect.height/2)/reach;
    const magnitude=Math.hypot(dx,dy);
    const value=clamp((magnitude-.10)/.90,0,1)/Math.max(magnitude,.001);
    movement.side=dx*value;movement.ahead=-dy*value;
    moveStick.style.setProperty('--stick-x',movement.side*reach+'px');
    moveStick.style.setProperty('--stick-y',-movement.ahead*reach+'px');
  }
  function resetStick(){
    stickId=null;movement.side=0;movement.ahead=0;
    moveStick?.style.removeProperty('--stick-x');
    moveStick?.style.removeProperty('--stick-y');
  }
  moveStick?.addEventListener('pointerdown',event=>{
    if(stickId!==null || event.button!==0)return;
    event.preventDefault();
    canvas.focus({preventScroll:true});
    stickId=event.pointerId;
    moveStick.setPointerCapture(stickId);
    updateStick(event);
  });
  moveStick?.addEventListener('pointermove',event=>{
    if(stickId===event.pointerId)updateStick(event);
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture']){
    moveStick?.addEventListener(type,event=>{
      if(stickId===event.pointerId)resetStick();
    });
  }
  throwButton.addEventListener('click',toggleThrow);
  window.addEventListener('keydown',event=>{
    if(!canvasReady() || event.ctrlKey || event.metaKey || event.altKey)return;
    if(event.code==='KeyQ'&&!event.repeat){event.preventDefault();toggleThrow();return;}
    if(event.code==='Escape'&&throwing){setThrowMode(false);return;}
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
    keys.add(event.code);
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));
  const resetInput=()=>{keys.clear();resetStick();};
  canvas.addEventListener('blur',resetInput);
  window.addEventListener('blur',resetInput);
  requestAnimationFrame(draw);
  return { update(next){plants=next;} };
}
