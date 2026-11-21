import * as THREE from '../three.module.min.js';
import {createTerrain as spiralTerrain} from './spiral/terrain.js';
import {createArchitecture as spiralArchitecture,pavilion} from './spiral/architecture.js';
import {createWater as spiralWater,pondRadius,pondTerrainHeight,waterSurfaceY as spiralWaterY} from './spiral/water.js';
import {createVegetation as spiralVegetation,treeColliders} from './spiral/vegetation.js';
import {insideIsland,islandPolygonPoint,groundHeight} from './spiral/common.js';
import {createTerrain as verdantTerrain} from './verdant/terrain.js';
import {createArchitecture as verdantArchitecture} from './verdant/architecture.js';
import {createWater as verdantWater,inWater as inVerdantWater,waterY as verdantWaterY} from './verdant/water.js';
import {createVegetation as verdantVegetation,trunks} from './verdant/vegetation.js';
import {createInstallations as verdantInstallations} from './verdant/installations.js';
import {inside as insideVerdant,perimeter,ground as verdantGround} from './verdant/common.js';
import {createTerrain as pinwheelTerrain,terrainHeight} from './pinwheel/terrain.js';
import {createArchitecture as pinwheelArchitecture} from './pinwheel/architecture.js';
import {createWater as pinwheelWater,inWater as inPinwheelWater,pools as pinwheelPools,poolRadius as pinwheelPoolRadius,waterLevel as pinwheelWaterLevel} from './pinwheel/water.js';
import {createVegetation as pinwheelVegetation,colliders} from './pinwheel/vegetation.js';
import {createInstallations as pinwheelInstallations} from './pinwheel/installations.js';
import {inside as insidePinwheel,edge} from './pinwheel/common.js';

export const ISLANDS={
  spiral:{name:'Spiral Harbor',theme:'Health, Wellbeing & Accessibility'},
  verdant:{name:'Verdant Springs',theme:'Sustainability & Environmental HCI'},
  pinwheel:{name:'Pinwheel Island',theme:"Games, Play & Children's Technology"}
};

const landings={
  spiral:[[-4.6,-.16,-1,1.12],[4.45,1.25,1,1.12]],
  verdant:[[-5.56,1.45,-1,1.03],[5.35,1.92,1,1.03]],
  pinwheel:[[-4.75,-.05,-1,.96],[4.55,.05,1,.96]]
};

function tag(mesh,kind){mesh.userData.navSurface=kind}

/**
 * Builds one island at its original scale. Add `group` to your Three.js scene.
 * Call update(deltaSeconds, elapsedSeconds) each frame to retain the moving parts.
 * No camera, controls, player, renderer, or physics engine is created here.
 */
export function createIsland(id,{position=[0,0,0],rotationY=0,scale=1}={}){
  if(!ISLANDS[id])throw new Error(`Unknown island: ${id}`);
  if(!(scale>0))throw new Error('Island scale must be positive');
  const group=new THREE.Group();group.name=`CHI 2027 / ${ISLANDS[id].name}`;
  const walkables=[];let water,kinetic,inside,wet,waterHeight,baseHeight,obstacles=[],architecture;

  if(id==='spiral'){
    treeColliders.length=0;
    const terrain=spiralTerrain(group);walkables.push(terrain.userData.surface);
    architecture=spiralArchitecture(group);walkables.push(...architecture.walkables);
    water=spiralWater(group);walkables.push(...water.walkables);spiralVegetation(group,terrain.userData.surface);
    inside=insideIsland;wet=(x,z,pad)=>pondRadius(x,z)<1.035+pad/1.36;
    waterHeight=()=>spiralWaterY;baseHeight=pondTerrainHeight;
    obstacles=treeColliders.map(o=>({type:'circle',kind:'tree',x:o.x,z:o.z,r:o.r}));
    tag(walkables[0],'terrain',id);tag(walkables[1],'pavilion_floor',id);tag(walkables[2],'ramp',id);
    for(const stair of architecture.stairs)tag(stair,'stair',id);
    for(const landing of architecture.landings)tag(landing,'bridge_landing',id);
    tag(architecture.terrace,'terrace',id);
    for(const [index,deck] of water.walkables.entries())tag(deck,index===0?'dock':'dock_plank',id);
  }else if(id==='verdant'){
    trunks.length=0;
    const terrain=verdantTerrain(group,walkables);architecture=verdantArchitecture(group,walkables);
    water=verdantWater(group);verdantVegetation(group,terrain.userData.surface);
    kinetic=verdantInstallations(group,walkables);
    inside=insideVerdant;wet=(x,z,pad)=>inVerdantWater(x,z,pad);
    waterHeight=()=>verdantWaterY+.018;baseHeight=verdantGround;
    obstacles=trunks.map(o=>({type:'circle',kind:'tree',x:o.x,z:o.z,r:o.r}));
    obstacles.push({type:'greenhouse_walls',x:.4,z:.55,halfWidth:1.66,halfDepth:1.39,doorHalfWidth:.48});
    tag(walkables[0],'terrain',id);tag(walkables[1],'terrace',id);tag(walkables[2],'terrace',id);
    tag(walkables[3],'greenhouse_floor',id);
    for(let i=4;i<7;i++)tag(walkables[i],'raised_walkway',id);
    for(let i=7;i<9;i++)tag(walkables[i],'bridge_landing',id);
    tag(walkables[9],'pavilion_deck',id);
  }else{
    colliders.length=0;
    const terrain=pinwheelTerrain(group,walkables);architecture=pinwheelArchitecture(group,walkables);
    water=pinwheelWater(group);pinwheelVegetation(group,terrain.userData.surface);
    kinetic=pinwheelInstallations(group);
    inside=insidePinwheel;wet=(x,z,pad)=>inPinwheelWater(x,z,pad);
    waterHeight=(x,z)=>pinwheelWaterLevel(pinwheelPools.reduce((best,p)=>pinwheelPoolRadius(p,x,z)<pinwheelPoolRadius(best,x,z)?p:best));baseHeight=terrainHeight;
    obstacles=colliders.map(o=>({type:'circle',kind:'tree',x:o.x,z:o.z,r:o.r}));
    obstacles.push({type:'circle',kind:'pinwheel_mast',x:0,z:0,r:.38});
    tag(walkables[0],'terrain',id);tag(walkables[1],'plaza',id);
    for(let i=2;i<9;i++)tag(walkables[i],[0,1].includes(i-2)?'ramp':i===6?'raised_walkway':'path',id);
    for(let i=9;i<11;i++)tag(walkables[i],'tower_deck',id);
    for(let i=11;i<13;i++)tag(walkables[i],'bridge_landing',id);
  }

  // Stable names let a GLB loader match navigation JSON regardless of creation order.
  walkables.forEach((object,index)=>{object.name=`NAV_${id}_${object.userData.navSurface}_${index}`});
  group.position.set(...position);group.rotation.y=rotationY;group.scale.setScalar(scale);
  group.updateMatrixWorld(true);
  const ray=new THREE.Raycaster();
  const normalMatrix=new THREE.Matrix3();
  function localHit(x,z){
    group.updateWorldMatrix(true,false);
    const start=group.localToWorld(new THREE.Vector3(x,8,z));
    const below=group.localToWorld(new THREE.Vector3(x,7,z));
    ray.set(start,below.sub(start).normalize());
    const hit=ray.intersectObjects(walkables,false)[0];
    if(!hit)return null;
    const point=group.worldToLocal(hit.point.clone());
    normalMatrix.getNormalMatrix(hit.object.matrixWorld);
    const n=hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();if(n.y<0)n.negate();
    return {height:point.y,normal:[n.x,n.y,n.z],slopeDegrees:Math.acos(Math.min(1,n.y))*180/Math.PI,
      surfaceType:hit.object.userData.navSurface||'terrain',mesh:hit.object};
  }
  function blockedReason(x,z,radius=.22){
    if(!inside(x,z,radius))return 'island_boundary';
    for(const o of obstacles){
      if(o.type==='circle'&&Math.hypot(x-o.x,z-o.z)<o.r+radius)return o.kind;
      if(o.type==='greenhouse_walls'){
        const dx=Math.abs(x-o.x),dz=Math.abs(z-o.z);
        if(dx>1.35-radius&&dx<1.73+radius&&dz<1.31+radius)return 'greenhouse_wall';
        if(dz>1.29-radius&&dz<1.53+radius&&dx>.48-radius&&dx<1.67+radius)return 'greenhouse_wall';
      }
    }
    return null;
  }
  function query(x,z,{radius=.22}={}){
    const hit=localHit(x,z),reason=blockedReason(x,z,radius);
    const height=hit?.height??baseHeight(x,z),waterBelow=wet(x,z,0);
    const waterSurfaceY=waterBelow?waterHeight(x,z):null;
    const waterDepth=waterBelow?Math.max(0,waterSurfaceY-height):0;
    return {x,z,height,normal:hit?.normal??[0,1,0],
      slopeDegrees:hit?.slopeDegrees??0,surfaceType:hit?.surfaceType??'terrain',
      walkable:reason===null,blockedBy:reason,waterBelow,waterSurfaceY,waterDepth,
      traversal:waterDepth>0?'wade':'walk'};
  }
  function toWorld(x,y,z){group.updateWorldMatrix(true,false);return group.localToWorld(new THREE.Vector3(x,y,z))}
  function fromWorld(world){group.updateWorldMatrix(true,false);return group.worldToLocal(world.clone())}
  function bridgeLandings(){return landings[id].map(([x,z,out,width],i)=>{
    const q=query(x,z,{radius:0});const p=toWorld(x,q.height,z),d=new THREE.Vector3(out,0,0).transformDirection(group.matrixWorld);
    return {id:`${id}-${i?'east':'west'}`,local:[x,q.height,z],world:p.toArray(),outward:d.toArray(),width:width*scale};
  })}
  function boundary(){const n=id==='spiral'?120:id==='verdant'?36:48;return Array.from({length:n},(_,i)=>{
    const a=i*2*Math.PI/n,p=id==='spiral'?islandPolygonPoint(a):id==='verdant'?perimeter(a):edge(a);
    return id==='spiral'?[p.x,p.y]:p;
  })}
  function navigationManifest({cellSize=.16}={}){
    const extent={minX:-7,maxX:7,minZ:-5.5,maxZ:5.5};
    const width=Math.floor((extent.maxX-extent.minX)/cellSize)+1,depth=Math.floor((extent.maxZ-extent.minZ)/cellSize)+1;
    const waterMask=[];for(let j=0;j<depth;j++){let row='';for(let i=0;i<width;i++)row+=wet(extent.minX+i*cellSize,extent.minZ+j*cellSize,0)?'1':'0';waterMask.push(row)}
    return {id,name:ISLANDS[id].name,units:'Three.js units',upAxis:'Y',boundaryXZ:boundary(),
      waterMask:{originXZ:[extent.minX,extent.minZ],cellSize,width,depth,rows:waterMask},
      waterTraversal:{mode:'crossable',waterMaskBlocksMovement:false,depthProvidedBy:'query().waterDepth'},
      obstacles,walkableNodes:walkables.map(o=>({name:o.name,type:o.userData.navSurface})),
      bridgeLandings:bridgeLandings(),notes:['The water mask marks a wading area, not an obstacle. Use query() for exact water depth and ground height.','Island boundaries and solid obstacles block movement. Small plants and decorative details are nonblocking.','The GLB is a visual snapshot; run the source update() method for animation.']};
  }
  return {id,name:ISLANDS[id].name,group,walkables,obstacles,boundary,query,blockedReason,toWorld,fromWorld,bridgeLandings,navigationManifest,
    queryWorld(point,options){const p=fromWorld(point),info=query(p.x,p.z,options);return {...info,worldPosition:toWorld(p.x,info.height,p.z).toArray()}},
    update(deltaSeconds,elapsedSeconds){if(id==='spiral')water.update(elapsedSeconds);else if(id==='verdant')kinetic.update(deltaSeconds);else kinetic.update(elapsedSeconds)},
    dispose(){group.traverse(o=>{if(o.geometry)o.geometry.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material]))m?.dispose?.()});group.removeFromParent()}
  };
}
