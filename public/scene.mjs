import { islands, islandScale, islandLandmarks, islandSpacing } from './islands.mjs';
import { onIsland, canPlant, plantStage, tileWidth, tileDepth, bridgePath, bridgeAirSpan, bridgeGateDistance, bridgeSpeedFactor, bridgeSurfaceHeight, bridgeHalfWidth, oakTreeHeightScale, traceOakConnection } from './plots.mjs';
import { islandModel, canPlantOnIsland } from './island-kit/navigation.mjs';
import { paintIslandSeed } from './island-kit/seed-art.mjs';
import { displayOriginIslands, islandIconOutlines } from './island-kit/island-icons.mjs';
import { gatePostOffset, gatePostRadius } from './island-kit/bridge-gates.mjs';

// Outline marks for the dark labels above neighboring islands.
const islandLabelColors = ['#ff947b','#75dcae','#9aafff'];
const islandLabelPaths = [];

export function createScene(canvas, { onPlant, onLanding, onThrowRequest, throwControl='tap', onCross=()=>{}, onBridgeLocked=()=>{}, onEdge=()=>{}, onFrame, artwork = new Map(), islandRenderer=null, isVisible=()=>true, isFeedbackVisible=()=>true }) {
  let plants = [];
  const keys = new Set();
  let model=null;
  let spawn={x:0,z:3.65,yaw:0,pitch:-.15,feet:0};
  let {x,z,yaw,pitch}=spawn;
  let feet=0, verticalSpeed=0, grounded=true, eye=1.05;
  let standingOnObject=false;
  let supportedPose=null;
  let arrivalFrom=null, bridgeCamera=false, nextCrossAttempt=0;
  const eyeHeight=1.05, bodyHeight=1.12, radius=.13;
  const maxStepUp=bodyHeight*.75, maxStepDown=bodyHeight/2;
  const stepTolerance=.00001;
  const near=.055, readyY=.75, gravity=9.8, seedRadius=.055;
  const useSlingshot=throwControl==='slingshot';
  const tapRange=3.2, tapFlightTime=.74, tapLandingPauseMs=160;
  // Short landscape viewports need a wider field of view to keep the ground in frame.
  const focalLength = (width, height) => Math.max(height * .77, Math.min(width * .48, height * 1.04));
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
  const treeTagsEnabled=Boolean(islandRenderer?.nativePlants);
  const treeTags=[], tagOcclusions=new Map(), cardOcclusions=new Map();
  const tagCardWidth=205, tagCardHeight=74;
  const tagFadeStart=3.43, tagRange=3.5;
  const cardSamples=[[.5,.5],[.1,.5],[.9,.5],[.28,.5],[.72,.5],[.12,.15],[.88,.15],
    [.12,.85],[.88,.85],[.5,.15],[.5,.85]];
  function createTreeTag(){
    const treeTag=document.createElement('aside');
    const tagStage=document.createElement('strong');
    const tagOrigin=document.createElement('span');
    const originLabel=document.createElement('span');
    originLabel.className='tree-origin-label';
    const originField=document.createElement('div');
    originField.className='tree-origin-field';
    originField.append(originLabel,tagOrigin);
    treeTag.className='tree-tag ui-prompt';
    treeTag.setAttribute('aria-label','Tree tag');
    treeTag.style.width=tagCardWidth+'px';
    treeTag.style.height=tagCardHeight+'px';
    treeTag.hidden=true;
    tagStage.className='ui-prompt__eyebrow';
    tagOrigin.className='tree-origin';
    treeTag.append(tagStage,originField);
    canvas.parentElement.append(treeTag);
    return {treeTag,tagStage,tagOrigin,originLabel};
  }
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const throwButton=document.getElementById('seed-mode');
  const plantingTip=document.getElementById('planting-tip');
  const moveStick=document.getElementById('move-stick');
  const movement={side:0,ahead:0};
  let stickId=null;
  const canvasReady=()=>canvas===document.activeElement && !document.querySelector('dialog[open]');
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const ctx = canvas.getContext('2d');
  const faces = [];
  const outline=[
    [-3.5,-2.5],[-3.5,2.5],[-2.5,2.5],[-2.5,3.5],
    [2.5,3.5],[2.5,2.5],[3.5,2.5],[3.5,-2.5],
    [2.5,-2.5],[2.5,-3.5],[-2.5,-3.5],[-2.5,-2.5]
  ];
  let currentIsland=null, distantFaces=[], distantLabels=[];
  let bridges=[], bridgeFaces=[], visiblePlants=[], nextBridgeNotice=0, fallLimit=-8;
  let fallbackGateFaces=[];
  let displayGates=[];
  const bridgeTrees = new Map();
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
  function face(vertices, color, alpha = 1, decal = null, layer = 2, mesh = faces) {
    const [a,b,c] = vertices;
    const u = b.map((v,i)=>v-a[i]), v = c.map((n,i)=>n-a[i]);
    const normal = [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const length = Math.hypot(...normal) || 1;
    const lighting = .82 + .27*(normal[0]*-.45+normal[1]*.8+normal[2]*.39)/length;
    mesh.push({points:vertices.map(p=>p.map((n,i)=>n+origin[i])),normal,color:color && tint(color,lighting),alpha,decal,layer});
  }
  function box(x,y,z,w,h,d,color,top=color,layer=2,mesh=faces) {
    const X=x+w/2, Z=z+d/2, Y=y+h; x-=w/2;z-=d/2;
    const a=[x,y,z], b=[X,y,z], c=[X,y,Z], e=[x,y,Z];
    const A=[x,Y,z], B=[X,Y,z], C=[X,Y,Z], E=[x,Y,Z];
    face([a,b,c,e],color,1,null,layer,mesh);face([A,E,C,B],top,1,null,layer,mesh);
    face([a,A,B,b],color,1,null,layer,mesh);face([b,B,C,c],color,1,null,layer,mesh);
    face([e,c,C,E],color,1,null,layer,mesh);face([a,e,E,A],color,1,null,layer,mesh);
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
  function crystal(x,y,z,rx,ry,rz,color,sides=7,layer=2) {
    const ring=Array.from({length:sides},(_,i)=>[x+rx*Math.cos(i*2*Math.PI/sides),y,z+rz*Math.sin(i*2*Math.PI/sides)]);
    ring.forEach((a,i)=>{
      const b=ring[(i+1)%sides];
      face([a,[x,y+ry,z],b],color,1,null,layer);
      face([a,b,[x,y-ry*.72,z]],color,1,null,layer);
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
    // Fill the whole footprint beneath the tiles so their antialiased edges
    // cannot reveal rock or sky between them.
    face(outline.map(([x,z])=>[x*tileWidth,0,z*tileDepth]),lawn[0],1,null,.5);
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
      box(a,c,b,.25,.28,.25,pick(rocks),pick(moss),0);
      crystal(a,c,b,.165,.18,.16,pick(rocks),4,0);
    }
  }
  function setIsland(id,carryPose=false){
    if(currentIsland===id)return;
    const current=islands.find(island=>island.id===id);
    if(!current)return;
    const previous=islands.find(island=>island.id===currentIsland);
    currentIsland=id;
    tagOcclusions.clear();
    cardOcclusions.clear();
    supportedPose=null;
    arrivalFrom=carryPose && previous ? previous.id : null;
    if(arrivalFrom!==null){
      x+=(previous.x-current.x)*islandSpacing;
      z+=(previous.z-current.z)*islandSpacing;
      const dy=(previous.y-current.y)*islandSpacing;
      feet+=dy;
      eye+=dy;
      standingOnObject=false;
    }
    if(islandRenderer){
      model=islandModel(id);
      spawn=model.spawn();
      spawn.feet=model.queryIsland(spawn.x,spawn.z).height;
      if(arrivalFrom===null){
        ({x,z,yaw,pitch,feet}=spawn);
        verticalSpeed=0;grounded=true;standingOnObject=false;eye=feet+eyeHeight;bridgeCamera=false;
      }
    }
    distantFaces=[];distantLabels=[];
    const savedOrigin=origin;
    const size=6.1;
    for(const island of islands){
      if(island.id===id)continue;
      const firstFace=distantFaces.length;
      origin=[(island.x-current.x)*islandSpacing,(island.y-current.y)*islandSpacing,(island.z-current.z)*islandSpacing];
      const rim=[...outline].reverse().map(([x,z])=>[x*tileWidth,0,z*tileDepth]);
      if(islandRenderer){
        distantLabels.push({id:island.id,name:island.name,position:[origin[0],origin[1]+3.85*islandScale,origin[2]],center:[...origin]});
        continue;
      }
      face([...rim].reverse(),island.color,1,null,-1,distantFaces);
      for(let i=0;i<rim.length;i++){
        const corner=rim[i],next=rim[(i+1)%rim.length];
        const edge=[corner[0]*.85,-.75,corner[2]*.85];
        const nextEdge=[next[0]*.85,-.75,next[2]*.85];
        face([corner,next,nextEdge,edge],i%2?'#a5a0a1':'#b2a2a7',1,null,-1,distantFaces);
        face([edge,nextEdge,[0,-4.1,.35]],i%2?'#88889d':'#a294a0',1,null,-1,distantFaces);
      }
      for(const [x,z,y] of islandLandmarks){
        box(x*size,0,z*size,.82,y*size,.74,'#d3b49e','#f3d5b8',-1,distantFaces);
        box(x*size,y*size,z*size,.98,.13,.88,'#f3d5b8',undefined,-1,distantFaces);
      }
      for(const [x,z] of [[-.33,-.22],[.38,.18]]){
        box(x*size,0,z*size,.16,.86,.16,'#997b75',undefined,-1,distantFaces);
        box(x*size,.68,z*size,.84,.38,.75,'#dc9da2','#efb3b0',-1,distantFaces);
      }
      for(let i=firstFace;i<distantFaces.length;i++)distantFaces[i].islandId=island.id;
      distantLabels.push({id:island.id,name:island.name,position:[origin[0],origin[1]+3.85,origin[2]],center:[...origin]});
    }
    origin=savedOrigin;
  }

  function drawBough(points,thickness,colors) {
    const sides=9;
    const rings=points.map(([px,py,pz],index)=>{
      const before=points[Math.max(0,index-1)],after=points[Math.min(index+1,points.length-1)];
      const [dx,dy,dz]=after.map((value,i)=>value-before[i]);
      const horizontal=Math.hypot(dx,dz)||1, length=Math.hypot(dx,dy,dz)||1;
      const across=[-dz/horizontal,0,dx/horizontal];
      const up=[-dx*dy/(horizontal*length),horizontal/length,-dz*dy/(horizontal*length)];
      return Array.from({length:sides},(_,side)=>{
        const angle=(side+.15)*Math.PI*2/sides+index*.018;
        const radius=thickness(index/(points.length-1));
        const width=Math.cos(angle)*radius, height=Math.sin(angle)*radius*.86;
        return [px+across[0]*width+up[0]*height,py+up[1]*height,pz+across[2]*width+up[2]*height];
      });
    });
    for(let index=1;index<rings.length;index++){
      const a=rings[index-1],b=rings[index];
      for(let side=0;side<sides;side++){
        const next=(side+1)%sides;
        face([a[side],b[side],b[next],a[next]],colors[side%colors.length],1,null,1.6,bridgeFaces);
      }
    }
    face(rings[0],colors[0],1,null,1.6,bridgeFaces);
    face([...rings.at(-1)].reverse(),colors[1],1,null,1.6,bridgeFaces);
  }

  function drawFallbackGate({ path, gate, destination }) {
    const { distance, height, outward } = gate;
    const open=gate.opening>=.86;
    const savedOrigin=origin;
    origin=[0,0,0];
    function gateBox(length, width, y, h, depth, offset, tint) {
      const point=(d,o,e)=>{
        const [x,,z]=path.point(distance+depth+d,offset+o);
        return [x,height+e,z];
      };
      const corners=[[-length/2,-width/2],[length/2,-width/2],[length/2,width/2],[-length/2,width/2]];
      const low=corners.map(([d,o])=>point(d,o,y));
      const high=corners.map(([d,o])=>point(d,o,y+h));
      face(low,tint,1,null,1.6,fallbackGateFaces);
      face([...high].reverse(),tint,1,null,1.6,fallbackGateFaces);
      for(let i=0;i<4;i++){
        const j=(i+1)%4;
        face([low[i],high[i],high[j],low[j]],tint,1,null,1.6,fallbackGateFaces);
      }
    }
    const wood='#a2754f', slats='#c1976b', cap='#dfb68d';
    for(const side of [-1,1]){
      const hinge=side*.68;
      gateBox(.18,.18,-.26,1.36,0,hinge,wood);
      gateBox(.22,.22,1.07,.09,0,hinge,cap);
      for(const y of [.31,.81]){
        if(open)gateBox(.67,.075,y,.085,-outward*.31,hinge,wood);
        else gateBox(.075,.68,y,.085,0,hinge-side*.33,wood);
      }
      for(let i=0;i<3;i++){
        const inset=.15+i*.20;
        const depth=open?-outward*inset:0;
        const offset=open?hinge:hinge-side*inset;
        gateBox(.085,.082,.23,.7,depth,offset,slats);
      }
    }
    if(!open){
      const seal=['#c55a48','#438465','#5168b4'][destination];
      gateBox(.13,.22,.58,.22,0,0,seal);
    }
    origin=savedOrigin;
  }

  function redrawFallbackGates(){
    fallbackGateFaces=[];
    for(const gate of displayGates)drawFallbackGate({path:gate.path,gate,destination:gate.destination});
  }

  function growBridgeMeshes(next,worldBridges) {
    bridgeFaces=[];
    bridgeTrees.clear();
    const oldGates=new Map(displayGates.map(gate=>[gate.key,gate]));
    function makeGate(path,index){
      const outward=index===0?1:-1;
      const from=path.endpoints[index].island, destination=path.endpoints[1-index].island;
      const key=`${from}:${destination}`;
      const distance=bridgeGateDistance(path,index,currentIsland,Boolean(model));
      const [x,,z]=path.point(distance);
      const [frontX,,frontZ]=path.point(distance+outward);
      const height=bridgeSurfaceHeight(path,distance,0);
      return {key,path,destination,distance,outward,height,center:[x,height,z],yaw:Math.atan2(frontX-x,frontZ-z),
        opening:from===currentIsland ? oldGates.get(key)?.opening??0 : 0};
    }
    bridges=next.flatMap(bridge=>{
      if (!(bridge.ends??bridge.span?.ends)?.some(end=>end.island===currentIsland)) return [];
      const path=bridgePath(bridge,currentIsland,Boolean(islandRenderer));
      if(!path)return [];
      const air=bridgeAirSpan(path,currentIsland,Boolean(model));
      const index=path.endpoints.findIndex(end=>end.island===currentIsland);
      const gate=bridge.open&&bridge.permanent&&index>=0?makeGate(path,index):null;
      return [{...bridge,path,air,gate}];
    });
    fallLimit=Math.min(-8,...bridges.filter(bridge=>bridge.canCross)
      .map(({path})=>Math.min(...path.endpoints.map(end=>end.y))-8));
    const visuals=worldBridges?.length
      ? [...bridges.filter(bridge=>!bridge.permanent),...worldBridges.filter(bridge=>bridge.permanent)
        .map(bridge=>({...bridge,path:bridgePath(bridge,currentIsland,Boolean(model))})).filter(bridge=>bridge.path)]
      : bridges;
    displayGates=[];
    for (const {span,path,open,permanent} of visuals) {
      for (const [index,end] of path.endpoints.entries()) {
        if(permanent&&open){
          const local=bridges.find(bridge=>end.island===currentIsland && bridge.destination===path.endpoints[1-index].island);
          displayGates.push(local?.gate??makeGate(path,index));
        }
        if (!permanent && (end.island!==currentIsland || (open && plants.find(plant=>plant.id===span.seed)?.growth!==4))) {
          bridgeTrees.set(end.island+':'+span.seed,{...end.tree,id:span.seed,growth:span.growth,remote:end.island!==currentIsland});
        }
        traceOakConnection(path,index,permanent?4:span.growth,open,drawBough);
      }
    }
    if(!islandRenderer)redrawFallbackGates();
    refreshVisiblePlants();
    islandRenderer?.setBridgeFaces(bridgeFaces,currentIsland);
    islandRenderer?.setGates?.(currentIsland,displayGates);
  }

  function refreshVisiblePlants() {
    visiblePlants=[...plants.filter(plant=>!bridgeTrees.has(currentIsland+':'+plant.id)),...bridgeTrees.values()];
  }

  function drawIslandLabel({id,name},[x,y]){
    islandLabelPaths[id]??=new Path2D(islandIconOutlines[id]);
    const iconSize=16, gap=6, padding=6;
    ctx.save();
    ctx.font='600 13px system-ui';
    ctx.textAlign='left';ctx.textBaseline='middle';
    const w=Math.min(width-16,ctx.measureText(name).width+iconSize+gap+padding*2);
    const left=clamp(x-w/2,8,width-w-8);
    ctx.beginPath();ctx.roundRect(left,y-12,w,24,6);
    ctx.fillStyle='#203747d9';ctx.fill();
    ctx.save();
    ctx.translate(left+padding,y-iconSize/2);
    ctx.scale(iconSize/24,iconSize/24);
    ctx.strokeStyle=islandLabelColors[id];ctx.lineWidth=1.9;
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.stroke(islandLabelPaths[id]);
    ctx.restore();
    ctx.fillStyle='#fff8e9';ctx.fillText(name,left+padding+iconSize+gap,y,w-iconSize-gap-padding*2);
    ctx.restore();
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
    if(model){
      const nav=model.queryIsland(x,z,0);
      return nav.blockedBy!=='island_boundary' && (y<nav.height-.035 ||
        Boolean(nav.blockedBy && y<nav.height+1.7));
    }
    return colliders.some(box=>x>box.left && x<box.right && y>box.bottom && y<box.top
      && z>box.back && z<box.front);
  }

  function clearPath(tx,ty,tz){
    const steps=Math.ceil(Math.hypot(tx-x,tz-z)*(model?4:20));
    for(let i=1;i<steps;i++){
      const fraction=i/steps;
      if(insideSolid(x+(tx-x)*fraction,eye+(ty-eye)*fraction,z+(tz-z)*fraction))return false;
    }
    return true;
  }

  function plantAt(x,y,checkDepth=false){
    return plantHits.findLast(hit=>x>=hit.left&&x<=hit.right&&y>=hit.top&&y<=hit.bottom&&
      (!checkDepth || !islandRenderer?.plantIsOccluded(x,y,width,height,hit.depth,hit.id)));
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

  function slingTrajectory(dx,dy){
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
    return predictThrow(releasePosition(),Math.sin(heading)*horizontalSpeed,
      speed*Math.sin(launchPitch),-Math.cos(heading)*horizontalSpeed);
  }

  function releasePosition(){
    const launchDistance=.56;
    const viewport=canvas.getBoundingClientRect();
    const focal=focalLength(viewport.width,viewport.height);
    const drop=focal>0 ? (readyY-.5)*viewport.height*launchDistance/focal : 0;
    const releaseHeight=eye+Math.sin(pitch)*launchDistance-Math.cos(pitch)*drop;
    const forwardOffset=Math.cos(pitch)*launchDistance+Math.sin(pitch)*drop;
    return [x+Math.sin(yaw)*forwardOffset,releaseHeight,z-Math.cos(yaw)*forwardOffset];
  }

  function tapTrajectory(){
    const reach=.56;
    const releaseHeight=eye-.23;
    const forwardX=Math.sin(yaw), forwardZ=-Math.cos(yaw);
    const speed=(tapRange-reach)/tapFlightTime;
    const ground=model?.queryIsland(x+forwardX*tapRange,z+forwardZ*tapRange,0);
    const targetHeight=ground?.blockedBy==='island_boundary'?feet:(ground?.height??0);
    const lift=(targetHeight+seedRadius-releaseHeight)/tapFlightTime+gravity*tapFlightTime/2;
    const arc=predictThrow([x+forwardX*reach,releaseHeight,z+forwardZ*reach],
      forwardX*speed,lift,forwardZ*speed,true);
    const {width,height}=canvas.getBoundingClientRect();
    const halfView=Math.atan2(Math.max(1,height*.5-24),focalLength(width,height));
    const angles=arc.samples.map(({position:[px,py,pz]})=>Math.atan2(py-eye,
      (px-x)*forwardX+(pz-z)*forwardZ));
    const low=Math.min(...angles), high=Math.max(...angles);
    pitch=high-low<=2*halfView?clamp(pitch,high-halfView,low+halfView):(low+high)/2;
    return arc;
  }

  function predictThrow([fromX,releaseHeight,fromZ],vx,lift,vz,stopAtGround=false){
    const point=t=>[fromX+vx*t,releaseHeight+lift*t-gravity*t*t/2,fromZ+vz*t];
    const timeToHeight=y=>(lift+Math.sqrt(Math.max(0,lift*lift+2*gravity*(releaseHeight-y))))/gravity;
    const groundTime=timeToHeight(seedRadius);
    const [tx,,tz]=point(groundTime);
    const hitsGround=onIsland(tx,tz);
    const limit=model?(stopAtGround?tapFlightTime:timeToHeight(-2)):hitsGround||stopAtGround?groundTime:timeToHeight(-3.6);

    // Sweep between consecutive prediction samples so thin features still register a hit.
    const samples=[{time:0,position:point(0)}];
    while(samples.at(-1).time<limit){
      const previous=samples.at(-1);
      const time=Math.min(limit,previous.time+1/60);
      const position=point(time);
      if(model){
        const [px,py,pz]=position;
        const nav=model.queryIsland(px,pz,seedRadius);
        samples.push({time,position});
        if(nav.blockedBy==='island_boundary')continue;
        const hitsObstacle=nav.blockedBy&&py<=nav.height+1.7;
        if(!hitsObstacle && py>nav.height+seedRadius+.008)continue;
        const open=!hitsObstacle && canPlantOnIsland(currentIsland,px,pz) &&
          !plants.some(plant=>Math.hypot(plant.x-px,plant.z-pz)<.4*islandScale);
        return {point,samples,duration:time,result:open?'planted':'blocked',landing:{x:px,z:pz},
          impact:[px,nav.height,pz],normal:[0,1,0]};
      }
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
    if(model||!hitsGround)return {point,samples,duration:limit,result:'miss'};
    const open=canPlant(tx,tz)&&!plants.some(p=>Math.hypot(p.x-tx,p.z-tz)<.4);
    return {point,samples,duration:limit,result:open?'planted':'blocked',
      landing:{x:tx,z:tz},impact:[tx,0,tz],normal:[0,1,0]};
  }

  function setThrowMode(active){
    throwing=active;
    pull=null;
    canvas.parentElement?.classList.toggle('is-throwing',active);
    throwButton.setAttribute('aria-pressed',String(active));
    const label = active ? 'Cancel throw' : throwButton.dataset?.launchLabel ?? 'Plant a seed';
    throwButton.setAttribute('aria-label',label);
    throwButton.title = label + ' (Q)';
    plantingTip.hidden=!active;
    canvas.focus({preventScroll:true});
  }

  function toggleThrow(){
    if(flight || document.querySelector('dialog[open]'))return;
    if(!throwing&&!onThrowRequest())return;
    setThrowMode(!throwing);
  }

  function plantSize(plant){
    return [.11,.28,.51,.82,1.12][plant.growth] ?? .11;
  }

  function plantHeight(plant){
    return plantSize(plant)*(plant.growth>=3?oakTreeHeightScale:1)*(plant.displayScale??1);
  }

  function plantPolygon(target,points,color){
    target.beginPath();
    points.forEach(([x,y],i)=>i?target.lineTo(x,y):target.moveTo(x,y));
    target.closePath();
    target.fillStyle=color;
    target.fill();
  }

  function oakLeaf(target,x,y,size,angle,lobed,color){
    target.save();
    target.translate(x,y);target.rotate(angle);target.scale(size,size);
    const edge=lobed?[[0,0],[.24,-.22],[.39,-.19],[.52,-.40],[.69,-.33],[.88,-.35],[1,-.12],
      [.87,.11],[.65,.18],[.53,.10],[.34,.22],[.19,.13]]
      :[[0,0],[.22,-.23],[.62,-.32],[1,-.12],[.74,.15],[.37,.22]];
    plantPolygon(target,edge,color);
    plantPolygon(target,[[0,0],[1,-.12],[.65,.18],[.34,.22]],'#71854d');
    target.restore();
  }

  function drawOak(wide,tall,growth,target=ctx){
    target.save();
    target.scale(wide,tall);
    if(growth<=2){
      const young=growth===2;
      plantPolygon(target,[[-.036,0],[.036,0],[.057,-.66],[.014,-.82],[-.012,-.47]],young?'#8c6244':'#667b46');
      oakLeaf(target,.014,-.58,.49,-.53,young,'#a8b76b');
      oakLeaf(target,.012,-.42,.45,3.62,young,'#8fa459');
      if(young){
        oakLeaf(target,.028,-.27,.32,-.38,true,'#91a55b');
        oakLeaf(target,.022,-.70,.36,-1.29,true,'#bec780');
      }
    }else{
      const mature=growth===4;
      plantPolygon(target,[[-.17,0],[-.083,-.15],[-.059,-.49],[-.026,-.79],[.061,-.82],
        [.076,-.47],[.086,-.14],[.16,0]],'#936747');
      plantPolygon(target,[[-.17,0],[-.083,-.15],[-.059,-.49],[-.026,-.79],[.014,-.71],[.007,-.30],[-.024,0]],'#76533d');
      plantPolygon(target,[[-.055,-.39],[-.28,-.59],[-.34,-.71],[-.25,-.67],[.01,-.49]],'#856044');
      plantPolygon(target,[[.044,-.46],[.31,-.71],[.38,-.70],[.24,-.53],[.075,-.34]],'#a77650');
      const crown=[
        [-.22,-.7,.24,.19,'#899b55','#acbc69'],
        [.23,-.69,.24,.20,'#81944f','#a0b060'],
        [0,-.83,.30,.20,'#9eae5c','#c0c779']
      ];
      if(mature) crown.unshift([-.38,-.57,.20,.16,'#829450','#a1b261'],
        [.39,-.56,.19,.17,'#879950','#a7b968']);
      for(const [x,y,w,h,shade,light] of crown){
        const outline=[[-.95,.16],[-.92,-.42],[-.53,-.83],[.05,-1],[.65,-.75],[1,-.18],[.75,.49],[.15,.74],[-.59,.65]];
        const facet=points=>points.map(([dx,dy])=>[x+dx*w,y+dy*h]);
        plantPolygon(target,facet(outline),shade);
        plantPolygon(target,facet([outline[1],outline[2],outline[3],outline[4],[.48,-.2],[-.35,.14]]),light);
        plantPolygon(target,facet([[-.35,.14],[.48,-.2],outline[5],outline[6],outline[7]]),mature?'#96a65b':'#a0af61');
      }
    }
    target.restore();
  }

  function seedHeight(plant,now) {
    return .105+(reducedMotion?.matches?0:Math.sin(now*.003+(plant.specimen?0:plant.x*2+plant.z))*.038);
  }

  const contributions = new Map();
  const islandColors = ['#F05A3C', '#1E9E6A', '#3358E0'];

  function drawContribution(plant, scale, now) {
    const effect = contributions.get(plant.id);
    if (!effect) return;
    if (!isFeedbackVisible()) return;
    effect.start ??= now;
    const age = now - effect.start;
    const water = effect.kind === 'water';
    const duration = water ? 700 : 600;
    if (age >= duration) { contributions.delete(plant.id); return; }
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = islandColors[plant.originalIsland] ?? '#1E9E6A';
    ctx.lineWidth = 2;
    for (const delay of water ? [0, 110] : [0]) {
      const progress = (age - delay) / (duration - delay);
      if (progress < 0) continue;
      const radius = clamp(scale * .36, 18, 112) * (.2 + .8 * progress);
      ctx.globalAlpha = (1 - progress) * (water ? .8 : .45);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * .32, 0, 0, Math.PI * 2);
      if (water) ctx.stroke();
      else ctx.fill();
    }
    ctx.restore();
  }

  function drawPlant(project,plant,scale,now,depth) {
    const ground=plant.y??0;
    const [sx,sy]=project([plant.x,ground+.016,plant.z]);
    const wide=plantSize(plant)*scale*(plant.displayScale??1);
    const tall=plantHeight(plant)*scale;
    const sprite=artwork.get(['seed','sprout','young','tree','mature'][plant.growth]);
    const spriteWidth=sprite ? Math.min(wide*2,wide*sprite.width/sprite.height) : 0;
    const seedY=seedHeight(plant,now);
    const visible=islandRenderer || plant.remote || clearPath(plant.x,ground+(plant.growth?plantHeight(plant)*.62:seedY),plant.z);
    if(model && !visible)return;
    const [seedX,seedScreenY]=project([plant.x,ground+seedY,plant.z]);
    ctx.save();ctx.translate(sx,sy);
    drawContribution(plant, scale, now);
    ctx.restore();
    if(!islandRenderer){
      ctx.save();ctx.translate(sx,sy);
      const soilSize=plant.growth?1:.66;
      ctx.beginPath();ctx.ellipse(0,0,.12*scale*soilSize,.055*scale*soilSize,0,0,Math.PI*2);
      ctx.fillStyle='#715642';ctx.fill();
      if(!plant.growth){
        ctx.restore();
        drawSeed(seedX,seedScreenY,clamp(.061*scale,5,24),-.45,ctx,plant.island??currentIsland);
      }else if(sprite){
        ctx.drawImage(sprite,-spriteWidth/2,-tall,spriteWidth,tall);
        ctx.restore();
      }else{
        drawOak(wide,tall,plant.growth);
        ctx.restore();
      }
    }
    const centerX=plant.growth?sx:seedX;
    const top=plant.growth?sy-tall*1.19:seedScreenY-clamp(.061*scale,5,24)*1.45;
    const halfWidth=Math.max(12,plant.growth ? (spriteWidth/2 || wide*.60) : .078*scale);
    if(!plant.remote && visible && !plant.specimen){
      plantHits.push({id:plant.id,depth,left:centerX-halfWidth,right:centerX+halfWidth,top:top-5,bottom:sy+8});
    }
  }

  function overlaps(box,px,pz){
    return px+radius>box.left && px-radius<box.right
      && pz+radius>box.back && pz-radius<box.front;
  }

  function hitsPlantedTree(px,pz,step,fromX=x,fromZ=z){
    return visiblePlants.some(plant=>{
      if(plant.remote)return false;
      if(islandRenderer?.nativePlants){
        return plant.growth>0 && Math.hypot(px-plant.x,pz-plant.z)<1.5 &&
          Boolean(islandRenderer.blocksPlantedMovement(currentIsland,plant,fromX,fromZ,px,pz,step,radius,bodyHeight));
      }
      if(plant.specimen)return false;
      if(plant.growth<3)return false;
      const ground=plant.y??0;
      const trunkHeight=plantHeight(plant)*.48;
      if(step>=ground+trunkHeight || step+bodyHeight<=ground)return false;
      const oldDistance=Math.hypot(fromX-plant.x,fromZ-plant.z);
      const distance=Math.hypot(px-plant.x,pz-plant.z);
      return distance<radius+plantSize(plant)*.07*(plant.displayScale??1) &&
        ((px===fromX && pz===fromZ) || distance<oldDistance);
    });
  }

  function supportsBridge(bridge,distance){
    if(!bridge.open)return false;
    if(bridge.canCross)return true;
    if(bridge.gate && (distance-bridge.gate.distance)*bridge.gate.outward<=0)return true;
    if(arrivalFrom!==bridge.destination)return false;
    return bridge.path.endpoints[0].island===currentIsland ? distance<=bridge.air.handoff : distance>=bridge.air.handoff;
  }

  function standingBridge(){
    if(!grounded)return null;
    for(const bridge of bridges){
      const {path}=bridge;
      const {distance,offset}=path.locate(x,z);
      if(distance<0 || distance>path.length || Math.abs(offset)>bridgeHalfWidth || !supportsBridge(bridge,distance))continue;
      if(Math.abs(feet-bridgeSurfaceHeight(path,distance,offset))<.1)return {bridge,distance};
    }
    return null;
  }

  function bridgeFloorAt(px,pz,ceiling){
    let floor=-Infinity;
    for(const bridge of bridges){
      const {path}=bridge;
      const {distance,offset}=path.locate(px,pz);
      if(!supportsBridge(bridge,distance))continue;
      if(distance<0 || distance>path.length || Math.abs(offset)>bridgeHalfWidth)continue;
      const height=bridgeSurfaceHeight(path,distance,offset);
      if(height<=ceiling && height>floor)floor=height;
    }
    return floor;
  }

  function floorAt(px,pz,ceiling,bridgeFloor=bridgeFloorAt(px,pz,ceiling)){
    if(model){
      const floor=Math.max(model.floorHeight(px,pz,ceiling),bridgeFloor);
      const solidFloor=standingOnObject
        ?model.solidFloorAt(px,pz,ceiling,feet-maxStepDown,radius)
        :-Infinity;
      return Math.max(floor,solidFloor);
    }
    let floor=ceiling>=0&&onIsland(px,pz)?Math.max(0,bridgeFloor):bridgeFloor;
    for(const box of colliders){
      if(box.top<=ceiling&&box.top>floor&&overlaps(box,px,pz))floor=box.top;
    }
    return floor;
  }

  function showLockedGate(destination){
    if(performance.now()<nextBridgeNotice)return;
    nextBridgeNotice=performance.now()+3200;
    onBridgeLocked(destination);
  }

  function updateBridgeGates(dt){
    let fallbackChanged=false;
    for(const {gate,path,canCross,destination} of bridges){
      if(!gate)continue;
      const {distance,offset}=path.locate(x,z);
      const depth=(distance-gate.distance)*gate.outward;
      const near=Math.hypot(depth,offset);
      const nearDeck=Math.abs(feet-gate.height)<1.15;
      const returning=arrivalFrom===destination && depth>-.45;
      const open=(canCross||returning) && nearDeck && near<(gate.opening>0?3.45:2.70);
      const previous=gate.opening;
      const target=open?1:0;
      const increment=reducedMotion?.matches?1:dt*(open?2.65:1.9);
      gate.opening=previous+clamp(target-previous,-increment,increment);
      if(previous!==gate.opening){
        const amount=gate.opening;
        islandRenderer?.setGateOpening?.(gate.key,amount*amount*(3-2*amount));
        fallbackChanged ||= (previous<.86)!==(amount<.86);
      }
      if(!canCross && !returning && nearDeck && depth<=0 && depth>=-1.35 && Math.abs(offset)<.78)
        showLockedGate(destination);
    }
    if(!islandRenderer&&fallbackChanged)redrawFallbackGates();
  }

  function moveTo(px,pz){
    if(px===x && pz===z)return;
    for(const {gate,path,canCross,destination} of bridges){
      if(!gate)continue;
      const before=path.locate(x,z), after=path.locate(px,pz);
      const d0=(before.distance-gate.distance)*gate.outward;
      const d1=(after.distance-gate.distance)*gate.outward;
      // The fixed posts are solid in both states. If a player was placed
      // inside an expanded post boundary, allow motion away from its centre.
      const start=[d0,feet,before.offset], end=[d1,feet,after.offset];
      if(Math.abs(d0)<.4 && Math.abs(feet-gate.height)<1.6){
        for(const offset of [-gatePostOffset,gatePostOffset]){
          const reach=gatePostRadius+radius;
          const inside=Math.abs(d0)<=reach && Math.abs(before.offset-offset)<=reach;
          if(inside && Math.hypot(d1,after.offset-offset)>Math.hypot(d0,before.offset-offset))continue;
          const post={left:-gatePostRadius,right:gatePostRadius,bottom:gate.height-.38-bodyHeight,
            top:gate.height+1.13,back:offset-gatePostRadius,front:offset+gatePostRadius};
          if(sweepBox(start,end,post,radius))return;
        }
      }
      if((canCross && gate.opening>=.86) || d1<=d0 || d0>0 || d1<-.06-radius)continue;
      const block={left:-.06,right:.06,bottom:gate.height-bodyHeight,top:gate.height+1.05,
        back:-.74,front:.74};
      if(!sweepBox(start,end,block,radius))continue;
      if(!canCross)showLockedGate(destination);
      return;
    }
    const nav=model?.queryIsland(px,pz,radius);
    const groundWalkable=nav?nav.walkable:onIsland(px,pz,radius);
    const stepCeiling=feet+maxStepUp+stepTolerance;
    const bridgeFloor=bridgeFloorAt(px,pz,grounded ? stepCeiling : feet+.001);
    if(!groundWalkable && !Number.isFinite(bridgeFloor)){
      if(grounded){
        const nearbyBridge = bridges.find(({path, open}) => {
          const {distance, offset} = path.locate(px,pz);
          return open && distance >= 0 && distance <= path.length && Math.abs(offset) <= bridgeHalfWidth;
        });
        if (performance.now() >= nextBridgeNotice) {
          nextBridgeNotice = performance.now() + 3200;
          if (nearbyBridge && !nearbyBridge.canCross) {
            onBridgeLocked(nearbyBridge.path.endpoints.find(end => end.island !== currentIsland)?.island);
          } else if (!nearbyBridge) onEdge();
        }
      }
      return;
    }
    let step=feet;
    let solidFloor=-Infinity;
    if(nav && groundWalkable && nav.height>stepCeiling && !Number.isFinite(bridgeFloor))return;
    if(grounded){
      if(standingOnObject){
        solidFloor=model.solidFloorAt(px,pz,feet+.001,feet-maxStepDown,radius);
      }
      const reachableGround=groundWalkable && nav?.height<=stepCeiling ? nav.height : -Infinity;
      const floor=nav?Math.max(reachableGround,bridgeFloor,solidFloor):floorAt(px,pz,stepCeiling,bridgeFloor);
      if (!Number.isFinite(floor)) return;
      step=(nav||floor===bridgeFloor)&&floor>=feet-maxStepDown?floor:Math.max(feet,floor);
    }
    if(model){
      if(model.blocksMovement(x,z,px,pz,step,radius,bodyHeight)){
        const minimum=Math.max(step,feet)+.001;
        if(!grounded || !groundWalkable || minimum>stepCeiling)return;
        solidFloor=model.solidFloorAt(px,pz,stepCeiling,minimum,radius);
        if(!Number.isFinite(solidFloor))return;
        if(model.blocksMovement(x,z,x,z,feet+bodyHeight,radius,solidFloor-feet,0) ||
          model.blocksMovement(x,z,px,pz,solidFloor,radius,bodyHeight) ||
          model.blocksMovement(px,pz,px,pz,solidFloor,radius,bodyHeight))return;
        step=solidFloor;
      }
    }else{
      for(const box of colliders){
        if(box.top>step+.001 && box.bottom<step+bodyHeight && overlaps(box,px,pz))return;
      }
    }
    if(hitsPlantedTree(px,pz,step))return;
    x=px;z=pz;feet=step;
    if(grounded)standingOnObject=step===solidFloor;
  }

  function walk(dt){
    updateBridgeGates(dt);
    if(canvasReady() && (!flight || useSlingshot)){
      const side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+movement.side;
      const ahead=Number(keys.has('KeyW'))-Number(keys.has('KeyS'))+movement.ahead;
      yaw+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*dt*1.8;
      pitch=clamp(pitch+(Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')))*dt*1.6,-1.33,1.16);
      if(side||ahead){
        const deck=standingBridge();
        const pace=deck ? bridgeSpeedFactor(deck.distance,deck.bridge.air) : 1;
        const speed=dt*2.65*pace/Math.max(1,Math.hypot(side,ahead));
        moveTo(x+(Math.sin(yaw)*ahead+Math.cos(yaw)*side)*speed,z);
        moveTo(x,z+(-Math.cos(yaw)*ahead+Math.sin(yaw)*side)*speed);
      }
    }
    verticalSpeed-=9.8*dt;
    let floor=floorAt(x,z,feet+.001);
    if(!Number.isFinite(floor) && model){
      // Restore support immediately if a bridge closes or a saved pose is below the floor.
      let safe=supportedPose ?? spawn;
      let safeFloor=floorAt(safe.x,safe.z,safe.feet+.001);
      if(!Number.isFinite(safeFloor) && safe!==spawn){
        safe=spawn;
        safeFloor=floorAt(safe.x,safe.z,safe.feet+.001);
      }
      if(Number.isFinite(safeFloor)){
        ({x,z}=safe);
        feet=floor=safeFloor;
        verticalSpeed=0;
        standingOnObject=false;
      }
    }
    const nextFeet=feet+verticalSpeed*dt;
    grounded=nextFeet<=floor;
    if(grounded){feet=floor;verticalSpeed=0;}
    else feet=nextFeet;
    if(feet < fallLimit){
      ({x,z,yaw,pitch,feet}=spawn);
      verticalSpeed=0;grounded=true;standingOnObject=false;bridgeCamera=false;arrivalFrom=null;
      if(throwing)setThrowMode(false);
    }
    if(grounded) supportedPose={x,z,feet};
    const deck=standingBridge();
    if(arrivalFrom!==null && grounded && deck?.bridge.destination!==arrivalFrom)arrivalFrom=null;
    const targetEye=feet+eyeHeight;
    const smoothing=Boolean(deck)||bridgeCamera;
    eye=smoothing && !reducedMotion?.matches ? eye+(targetEye-eye)*(1-Math.exp(-18*dt)) : targetEye;
    bridgeCamera=Boolean(deck)||(smoothing && Math.abs(eye-targetEye)>.005);
    if(deck?.bridge.canCross && performance.now()>=nextCrossAttempt){
      const {bridge,distance}=deck;
      const towardEnd=bridge.path.endpoints[0].island===currentIsland;
      const passed=towardEnd ? distance>bridge.air.handoff+.34 : distance<bridge.air.handoff-.34;
      if(passed){
        nextCrossAttempt=performance.now()+700;
        onCross(bridge.destination);
      }
    }
  }

  function draw(now){
    requestAnimationFrame(draw);
    walk(last?Math.min(.045,(now-last)/1000):0);
    last=now;
    if(flight && now>=flight.start+flight.duration*1000+(useSlingshot?0:tapLandingPauseMs)){
      const {result,landing,throwX,throwZ,throwYaw}=flight;
      flight=null;
      if(landing){
        // Badge front is +Z. Its Y rotation points from the landing back to
        // the player position captured on release, even for an angled throw.
        const dx=throwX-landing.x, dz=throwZ-landing.z;
        const emblemYaw=Math.hypot(dx,dz)<.001
          ? Math.atan2(-Math.sin(throwYaw),Math.cos(throwYaw)) : Math.atan2(dx,dz);
        const scale=model?islandScale:1;
        onLanding(result,{x:landing.x/scale,z:landing.z/scale,emblemYaw});
      }else onLanding(result,landing);
    }
    if (!isVisible()) {
      for(const tag of treeTags)tag.treeTag.hidden=true;
      contributions.clear();
      return;
    }
    for (const [id, effect] of contributions) {
      if (effect.start !== null && now - effect.start > 700) contributions.delete(id);
    }
    const bounds=canvas.getBoundingClientRect();
    width=bounds.width;height=bounds.height;
    if(!width||!height)return;
    const ratio=Math.min(devicePixelRatio||1,2);
    const pixelsX=Math.round(width*ratio),pixelsY=Math.round(height*ratio);
    if(canvas.width!==pixelsX || canvas.height!==pixelsY){canvas.width=pixelsX;canvas.height=pixelsY;}
    ctx.setTransform(ratio,0,0,ratio,0,0);
    if(islandRenderer){
      ctx.clearRect(0,0,width,height);
      const garden=visiblePlants.map(plant=>({id:plant.id,island:plant.island??currentIsland,originalIsland:plant.originalIsland,emblemYaw:plant.emblemYaw,
        previewOriginIsland:plant.previewOriginIsland,
        x:plant.x,y:plant.y??0,z:plant.z,
        dormant:plant.dormant,displayScale:plant.displayScale,
        growth:plant.growth,width:plantSize(plant)*(plant.displayScale??1),height:plantHeight(plant),seedY:seedHeight(plant,now),
        specimen:plant.specimen,previewStage:plant.previewStage,previewStarted:plant.previewStarted,previewDuration:plant.previewDuration}));
      islandRenderer.player(canvas,{x,eye,z,yaw,pitch,island:currentIsland,width,height,focal:focalLength(width,height)},artwork,garden,plantPaint);
    }else sky();
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
    for(const item of islandRenderer?[]:[...distantFaces,...faces,...bridgeFaces,...fallbackGateFaces]){
      if(item.islandId!==undefined&&artwork.has('island-'+item.islandId))continue;
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
    for(const island of distantLabels){
      const image=artwork.get('island-'+island.id),center=view(island.center);
      if(image&&center[2]>near){
        const [x,y]=screen(center);
        const maxSize=focal*8/center[2];
        const w=Math.min(maxSize,maxSize*image.width/image.height);
        const h=w*image.height/image.width;
        visible.push({image,bounds:[x-w/2,y-h*.35,w,h],layer:-1,depth:center[2]});
      }
      const anchor=view(island.position);
      if(anchor[2]<=near)continue;
      const point=screen(anchor);
      if(point[0]>=0 && point[0]<=width && point[1]>=12 && point[1]<=height-12){
        visible.push({label:island,point,layer:-.7,depth:anchor[2]});
      }
    }
    for(const plant of visiblePlants){
      const depth=view([plant.x,(plant.y??0)+.016,plant.z])[2];
      if(depth>.18)visible.push({plant,depth,layer:plant.remote?1.5:2});
    }
    // The camera stays above the island. Paint its continuous walking surface
    // before structures so a large tile cannot cover smaller objects on it.
    visible.sort((a,b)=>a.layer-b.layer || b.depth-a.depth);
    plantHits=[];
    for(const {item,pixels,plant,depth,decal,label,point,image,bounds} of visible){
      if(image){ctx.drawImage(image,...bounds);continue;}
      if(label){drawIslandLabel(label,point);continue;}
      if(plant){drawPlant(project,plant,focal/depth,now,depth);continue;}
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
    const arc=useSlingshot && (pulling?slingTrajectory(pull.dx*pull.gain,pull.dy*pull.gain):flight);
    if(arc)drawTrajectory(arc,view,screen,Boolean(flight));
    if(throwing){
      if(useSlingshot)drawSling();
      else drawSeed(width/2,height*readyY,14,-.34,ctx,currentIsland);
    }
    if(flight){
      const t=clamp((now-flight.start)/1000,0,flight.duration);
      const position=view(flight.point(t));
      if(position[2]>near){
        const [sx,sy]=screen(position);
        drawSeed(sx,sy,clamp(.085*focal/position[2],6,22),t*10-.64,ctx,currentIsland);
      }
    }
    let ideaBounds=null;
    if (onFrame) {
      const plant = !throwing && !flight && (plantAt(width / 2, height / 2) ||
        plantHits.findLast(hit => hit.left < width * .55 && hit.right > width * .45 &&
          hit.top < height * .69 && hit.bottom > height * .38));
      const projectedLanding = flight?.impact && view(flight.impact);
      const plantLanding = projectedLanding?.[2] > near ? screen(projectedLanding) : null;
      const bridge = bridges.map(({path}) => path.endpoints.find(end => end.island === currentIsland))
        .filter(Boolean).map(end => view([end.x,end.y,end.z]))
        .filter(point => point[2] > near).map(screen)
        .find(([x,y]) => x > 0 && x < width && y > 0 && y < height);
      ideaBounds=onFrame({
        width, height, plant,
        bridge: bridge && { x: bridge[0], y: bridge[1] },
        landing: plantLanding && { x: plantLanding[0], y: plantLanding[1], valid: flight.result === 'planted' },
      });
    }
    if(treeTagsEnabled)drawTreeTags(view,screen,now,ideaBounds);
    const clickable=!throwing&&!flight&&cursor&&plantAt(cursor.x,cursor.y);
    canvas.classList?.toggle('over-plant',Boolean(clickable));
  }

  function visibleTagAnchor(plant,view,screen,now){
    const form=islandRenderer.plantedStage(currentIsland,plant.id);
    const anchorHeight=plant.growth===0 ? seedHeight(plant,now)
      : plant.previewStage==='sprout'||plant.growth===1 ? .28
      : form==='sapling' ? .74 : 1.19;
    const anchor=view([plant.x,(plant.y??0)+anchorHeight,plant.z]);
    const depth=anchor[2];
    const distance=Math.hypot(...anchor);
    if(depth<.28 || distance>=tagRange)return;
    const [px,py]=screen(anchor);
    if(px<0 || px>width || py<0 || py>height)return;
    let occlusion=tagOcclusions.get(plant.id);
    if(!occlusion || now-occlusion.time>140 || Math.abs(px-occlusion.x)+Math.abs(py-occlusion.y)>18 ||
       Math.abs(depth-occlusion.depth)>.35){
      const hidden=islandRenderer.tagIsOccluded(px,py,width,height,depth,plant.id);
      occlusion={time:now,x:px,y:py,depth,hidden};
      tagOcclusions.set(plant.id,occlusion);
    }
    if(!occlusion.hidden)return {plant,px,py,distance,depth};
  }

  function drawTreeTags(view,screen,now,ideaBounds){
    const tags=[];
    if(!throwing && !flight && isFeedbackVisible()){
      const plantsInView=visiblePlants.filter(plant=>!plant.remote);
      for(const plant of plantsInView){
        const anchor=visibleTagAnchor(plant,view,screen,now);
        if(anchor)tags.push(anchor);
      }
      tags.sort((first,second)=>first.distance-second.distance);
    }
    const occupied=[];
    for(const anchor of tags){
      const index=occupied.length;
      const tag=treeTags[index]??(treeTags[index]=createTreeTag());
      drawTreeTag(anchor,tag,occupied,now,ideaBounds);
    }
    for(let index=occupied.length;index<treeTags.length;index++)treeTags[index].treeTag.hidden=true;
  }

  function tagCardBlocked(plantId,slot,rect,depth,now){
    const key=plantId+':'+slot;
    const previous=cardOcclusions.get(key);
    const {left,top,right,bottom}=rect;
    if(previous && now-previous.time<100 && previous.width===width && previous.height===height &&
       Math.abs(previous.left-left)+Math.abs(previous.top-top)+Math.abs(previous.right-right)+
       Math.abs(previous.bottom-bottom)<12 && Math.abs(previous.depth-depth)<.15)return previous.blocked;
    // A visible trunk anchor alone cannot tell whether a nearby object crosses the card.
    const blocked=cardSamples.some(([u,v])=>islandRenderer.tagIsOccluded(
      left+(right-left)*u,top+(bottom-top)*v,width,height,depth,plantId));
    cardOcclusions.set(key,{...rect,depth,time:now,width,height,blocked});
    return blocked;
  }

  function drawTreeTag({plant,px,py,distance,depth},{treeTag,tagStage,tagOrigin,originLabel},occupied,now,ideaBounds){
    const scaleDistance=Math.min(distance,5)+Math.max(0,distance-5)*.45;
    const scale=Math.min(1,2.9/scaleDistance,width/(tagCardWidth+10));
    const fade=clamp((distance-tagFadeStart)/(tagRange-tagFadeStart),0,1);
    const originNames=displayOriginIslands(plant)
      .map(id=>islands.find(island=>island.id===id)?.name)
      .filter(Boolean);
    const label=originNames.length>1?'Origin islands:':'Origin island:';
    const origin=originNames.join('\n')||'—';
    const cardHeight=tagCardHeight+16*Math.max(0,originNames.length-1);
    const cardWidthPx=tagCardWidth*scale, cardHeightPx=cardHeight*scale;
    const right=px+cardWidthPx+44*scale<width || px<width*.5;
    const xOffsets=[39*scale,-cardWidthPx-39*scale];
    if(!right)xOffsets.reverse();
    let placement, bestOverlap=Infinity;
    const yOffsets=[-cardHeightPx-14*scale,13*scale,-2*cardHeightPx-21*scale,cardHeightPx+20*scale];
    for(const [row,yOffset] of yOffsets.entries()){
      for(const [column,xOffset] of xOffsets.entries()){
        const left=clamp(px+xOffset,5,Math.max(5,width-cardWidthPx-5));
        const top=clamp(py+yOffset,5,Math.max(5,height-cardHeightPx-5));
        const rect={left,top,right:left+cardWidthPx,bottom:top+cardHeightPx};
        // Keep the interactive idea card clear even when every candidate is crowded.
        const gap=10;
        if(ideaBounds && left<ideaBounds.right+gap && rect.right>ideaBounds.left-gap &&
           top<ideaBounds.bottom+gap && rect.bottom>ideaBounds.top-gap)continue;
        let overlap=0;
        for(const other of occupied){
          overlap+=Math.max(0,Math.min(rect.right,other.right)-Math.max(left,other.left)+5)*
            Math.max(0,Math.min(rect.bottom,other.bottom)-Math.max(top,other.top)+5);
        }
        const side=right?column:1-column;
        if(overlap<bestOverlap && !tagCardBlocked(plant.id,row*2+side,rect,depth,now)){
          placement=rect;
          bestOverlap=overlap;
        }
        if(bestOverlap===0)break;
      }
      if(bestOverlap===0)break;
    }
    if(!placement)return;
    occupied.push(placement);
    const {left,top}=placement;
    const toRight=px<left+cardWidthPx*.5;
    const edge=toRight?left:placement.right;
    const joinY=clamp(py,top+12*scale,placement.bottom-12*scale);
    const opacity=1-fade*fade*(3-2*fade);
    const stage=plant.previewLabel ?? (plant.dormant
      ? 'Dormant · '+plantStage(plant.growth) : plantStage(plant.growth));
    treeTag.dataset.originSource=plant.originalIsland!=null||plant.originIslands?.length
      ?'recorded':plant.previewOriginIsland!=null?'preview':'unknown';
    if(tagStage.textContent!==stage)tagStage.textContent=stage;
    if(originLabel.textContent!==label)originLabel.textContent=label;
    if(tagOrigin.textContent!==origin){
      tagOrigin.textContent=origin;
      treeTag.style.height=cardHeight+'px';
    }
    treeTag.hidden=false;
    treeTag.style.transform=`translate(${left}px,${top}px) scale(${scale})`;
    treeTag.style.opacity=opacity;
    ctx.save();
    if(ideaBounds){
      ctx.beginPath();
      ctx.rect(0,0,width,height);
      ctx.rect(ideaBounds.left,ideaBounds.top,ideaBounds.right-ideaBounds.left,ideaBounds.bottom-ideaBounds.top);
      ctx.clip('evenodd');
    }
    ctx.globalAlpha*=opacity;
    ctx.strokeStyle='#fff';
    ctx.lineWidth=scale;
    ctx.beginPath();
    ctx.moveTo(px,py);
    ctx.lineTo(edge+(toRight?-12:12)*scale,joinY);
    ctx.lineTo(edge,joinY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px,py,2.5*scale,0,Math.PI*2);
    ctx.fillStyle='#fff';
    ctx.fill();
    ctx.restore();
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
    const centerX=width/2,centerY=height*readyY;
    const sx=centerX+(pull?.dx??0),sy=centerY+(pull?.dy??0);
    ctx.save();
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(centerX-24,centerY+9);ctx.lineTo(sx,sy);ctx.lineTo(centerX+24,centerY+9);
    ctx.strokeStyle='#472d20';ctx.lineWidth=9;ctx.stroke();
    ctx.strokeStyle='#d99a62';ctx.lineWidth=5;ctx.stroke();
    ctx.restore();
    drawSeed(sx,sy,14,-.34,ctx,currentIsland);
  }

  const plantPaint = {oak:drawOak,seed:drawSeed};

  function drawSeed(sx,sy,radius,angle,target,island){
    target.save();target.translate(sx,sy);target.rotate(angle);target.scale(radius,radius);
    if(paintIslandSeed(target,island)){
      target.restore();
      return;
    }
    const sprite=artwork.get('seed');
    if(sprite){
      const ratio=sprite.width/sprite.height,w=Math.min(2.2,2.2*ratio),h=w/ratio;
      target.drawImage(sprite,-w/2,-h/2,w,h);
      target.restore();
      return;
    }
    plantPolygon(target,[[-.67,-.34],[.66,-.34],[.61,.37],[.38,.77],[0,1.04],[-.40,.73],[-.64,.34]],'#a86b3e');
    plantPolygon(target,[[-.62,-.28],[-.11,-.33],[.09,.37],[0,1.04],[-.40,.73]],'#d29454');
    plantPolygon(target,[[-.1,-.33],[.66,-.34],[.61,.37],[.38,.77],[0,1.04],[.14,.32]],'#935634');
    plantPolygon(target,[[-.77,-.23],[-.71,-.63],[-.43,-.91],[.03,-1.04],[.49,-.94],
      [.73,-.62],[.78,-.27],[.43,-.15],[-.38,-.14]],'#74543b');
    plantPolygon(target,[[-.71,-.63],[-.43,-.91],[.03,-1.04],[.49,-.94],[.73,-.62],[.13,-.5],[-.43,-.48]],'#a47c51');
    plantPolygon(target,[[-.18,-.95],[-.13,-1.27],[.07,-1.32],[.15,-1.20],[.02,-.97]],'#805c42');
    target.restore();
  }

  function look(dx,dy){
    yaw+=dx*.0035;
    pitch=clamp(pitch-dy*.0035,-1.33,1.16);
  }
  let pointer=null, traveled=0, lastPointer=null;
  const tapSlop=event=>throwing&&!useSlingshot&&event.pointerType==='touch'?10:4;
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0 && event.pointerType!=='touch')return;
    canvas.focus();
    if(throwing && useSlingshot){
      const rect=canvas.getBoundingClientRect();
      const centerX=rect.left+rect.width/2,centerY=rect.top+rect.height*readyY;
      if(!pull&&Math.hypot(event.clientX-centerX,event.clientY-centerY)<=30){
        const gain=event.pointerType==='touch' ? Math.max(1,145/Math.max(45,rect.height*(1-readyY)-14)) : 1;
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
    if(traveled>tapSlop(event) && (!flight || useSlingshot))look(dx,dy);
  });
  canvas.addEventListener('pointerup',event=>{
    if(pull?.id===event.pointerId){
      const dx=clamp(event.clientX-pull.centerX,-175,175)*pull.gain;
      const dy=clamp(event.clientY-pull.centerY,-175,175)*pull.gain;
      pull=null;
      if(Math.hypot(dx,dy)<10)return;
      flight={...slingTrajectory(dx,dy),start:performance.now(),throwX:x,throwZ:z,throwYaw:yaw};
      setThrowMode(false);
      return;
    }
    if(event.pointerId!==pointer)return;
    pointer=null;
    if(traveled>tapSlop(event) || flight)return;
    const {x,y}=pointerPosition(event);
    if(throwing){
      if(!useSlingshot && onThrowRequest()){
        flight={...tapTrajectory(),start:performance.now(),throwX:x,throwZ:z,throwYaw:yaw};
        setThrowMode(false);
      }
      return;
    }
    const picked=islandRenderer?.pickTree?.(x,y,width,height);
    const plant=picked ? plants.find(plant=>!plant.specimen && plant.id===picked) : plantAt(x,y,true);
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
  function updatePlants(next) {
    plants = model ? next.map(plant => {
      const x = plant.x * islandScale, z = plant.z * islandScale;
      return {...plant,x,z,y:model.queryIsland(x,z,0).height};
    }) : next;
    refreshVisiblePlants();
  }
  return {
    showContribution(plantId, kind) {
      if (!reducedMotion?.matches && plants.some(plant => plant.id === plantId)) {
        contributions.set(plantId, { kind, start: null });
      }
    },
    updatePlants,
    update(next,islandId,links=[],{carryPose=false,worldBridges}={}){
      if (currentIsland !== islandId) contributions.clear();
      setIsland(islandId,carryPose);
      updatePlants(next);
      growBridgeMeshes(links,worldBridges);
    },
    pose(){return grounded && (!model || model.queryIsland(x,z).walkable)?{x,z,yaw,pitch}:null;},
    arrive(position){
      supportedPose=null;
      ({x,z}=position);
      feet=position.feet??model?.queryIsland(x,z).height??0;
      yaw=position.yaw??yaw;
      pitch=position.pitch??pitch;
      verticalSpeed=0;grounded=true;standingOnObject=false;eye=feet+eyeHeight;flight=null;arrivalFrom=null;bridgeCamera=false;
      if(throwing)setThrowMode(false);
    },
    faceBridge(destination){
      const bridge=bridges.find(({path})=>path.endpoints.some(end=>end.island===destination));
      if(!bridge)return false;
      const [near,far]=bridge.path.endpoints.toSorted((a,b)=>Number(b.island===currentIsland)-Number(a.island===currentIsland));
      const target=Math.hypot(near.x-x,near.z-z)<1?far:near;
      yaw=Math.atan2(target.x-x,z-target.z);
      pitch=target===far?Math.atan2(far.y-near.y,bridge.path.length)*.65-.06:-.12;
      return true;
    },
    // Stand a short walk from a plant on this island and look at it, so the
    // View idea pill picks it up. Tries the side the player is on first, then
    // works around the plant until it finds open, walkable ground.
    facePlant(id){
      const plant=plants.find(item=>item.id===id);
      if(!plant)return false;
      const groundAt=(px,pz)=>{
        if(!model)return onIsland(px,pz,radius)?0:null;
        const nav=model.queryIsland(px,pz,radius);
        if(!nav.walkable || nav.blockedBy || model.blocksMovement(px,pz,px,pz,nav.height,radius,bodyHeight) ||
           hitsPlantedTree(px,pz,nav.height,px,pz))return null;
        return nav.height;
      };
      const start=Math.atan2(x-plant.x,z-plant.z);
      let spot=null;
      for(const distance of [1.5,2.1,1.1]){
        for(let step=0;step<16&&!spot;step++){
          const angle=start+Math.ceil(step/2)*(step%2?1:-1)*Math.PI/8;
          const px=plant.x+Math.sin(angle)*distance, pz=plant.z+Math.cos(angle)*distance;
          const height=groundAt(px,pz);
          if(height!==null)spot={x:px,z:pz,feet:height};
        }
        if(spot)break;
      }
      if(!spot)return false;
      ({x,z,feet}=spot);
      supportedPose=null;arrivalFrom=null;bridgeCamera=false;
      verticalSpeed=0;grounded=true;standingOnObject=false;eye=feet+eyeHeight;flight=null;
      if(throwing)setThrowMode(false);
      resetInput();
      const groundY=model?model.queryIsland(plant.x,plant.z,0).height:0;
      yaw=Math.atan2(plant.x-x,z-plant.z);
      pitch=clamp(Math.atan2(groundY+.35-eye,Math.hypot(plant.x-x,plant.z-z)),-.7,.2);
      return true;
    },
    reset(){
      supportedPose=null;
      ({x,z,yaw,pitch,feet}=spawn);
      verticalSpeed=0;grounded=true;standingOnObject=false;eye=feet+eyeHeight;flight=null;arrivalFrom=null;bridgeCamera=false;
      if(throwing)setThrowMode(false);
      resetInput();
    }
  };
}
