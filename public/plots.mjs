import { islands, islandScale, islandSpacing } from './islands.mjs';
import { islandModel } from './island-kit/navigation.mjs';

export const plots = [
  [-2.13, 1.7], [-3.10, .55], [-1.08, 2.72], [1.10, 2.72],
  [2.19, 1.76], [3.11, .55], [-2.12, -2.19], [2.13, -2.19]
];

const growthStages=['Seed planted','Sprout','Young plant','Tree','Mature tree'];

export function plantStage(growth) {
  return growthStages[growth] ?? growthStages[0];
}

export const tileWidth = .85 * Math.sqrt(3);
export const tileDepth = .74 * Math.sqrt(3);

export function onIsland(x, z, margin = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const inside = (px, pz) => {
    const i = Math.abs(Math.round(px / tileWidth));
    const j = Math.abs(Math.round(pz / tileDepth));
    return i <= 3 && j <= 3 && i + j < 6;
  };
  return inside(x-margin,z-margin) && inside(x-margin,z+margin)
    && inside(x+margin,z-margin) && inside(x+margin,z+margin);
}

export function inBuilding(x,z,margin=0) {
  return Math.abs(x) < 1.28+margin && z > -1.3-margin && z < 1.53+margin;
}

export function canPlant(x,z) {
  return onIsland(x,z,.10) && !inBuilding(x,z,.10)
    && !(Math.abs(x)<.42 && z>1.43);
}

export const bridgeHalfWidth = .65;
export const oakTreeHeightScale = 1.6;
const boughRadius = .69;
const boughOval = .86;

export function bridgePath(bridge, currentIsland, useKit=true) {
  const placements=bridge.ends??bridge.span?.ends;
  if (!placements) return null;
  const origin = islands.find(island=>island.id===currentIsland);
  const ends = placements.map(plant=>({...plant, location:islands.find(island=>island.id===plant.island)}));
  if (!origin || ends.length!==2 || ends.some(end=>!end.location)) return null;
  const [first,last] = ends.map(end=>end.location);
  const lengthBetweenIslands = Math.hypot(last.x-first.x,last.z-first.z);
  if (!lengthBetweenIslands) return null;
  const dx = (last.x-first.x)/lengthBetweenIslands;
  const dz = (last.z-first.z)/lengthBetweenIslands;
  const endpoints = ends.map(({island,x,z,location},index)=>{
    const sign=index===0?1:-1;
    const offsetX=(location.x-origin.x)*islandSpacing;
    const offsetZ=(location.z-origin.z)*islandSpacing;
    const y=(location.y-origin.y)*islandSpacing;
    if(useKit){
      const model=islandModel(island);
      const landing=model.landingFor(ends[1-index].island);
      const [wx,wy,wz]=landing.world;
      if(bridge.permanent){
        const point={x:wx-origin.x*islandSpacing,z:wz-origin.z*islandSpacing,y:wy-origin.y*islandSpacing+.04};
        return {island,...point,tree:point};
      }
      const treeX=x*islandScale,treeZ=z*islandScale;
      const ground=model.queryIsland(treeX,treeZ,0).height;
      return {island,x:wx-origin.x*islandSpacing,z:wz-origin.z*islandSpacing,y:wy-origin.y*islandSpacing+.04,
        tree:{x:offsetX+treeX,y:y+ground,z:offsetZ+treeZ}};
    }
    let distance=0;
    while(onIsland((distance+.05)*dx*sign,(distance+.05)*dz*sign,bridgeHalfWidth+.15))distance+=.05;
    const point={x:offsetX+distance*dx*sign,z:offsetZ+distance*dz*sign,y:y+.06};
    return {island,...point,tree:bridge.permanent?point:{x:offsetX+x,y,z:offsetZ+z}};
  });
  const [start,end] = endpoints;
  const length = Math.hypot(end.x-start.x,end.z-start.z);
  const alongX=(end.x-start.x)/length, alongZ=(end.z-start.z)/length;
  return {
    endpoints,length,
    point(distance,offset=0) {
      const t=distance/length;
      const approach=bridge.permanent?Math.min(5/length,.25):0;
      const ramp=Math.max(0,Math.min(1,(t-approach)/(1-2*approach)));
      // Keep the deck above the island rim while leaving either landing.
      const elevation=bridge.permanent?ramp*ramp*(3-2*ramp):t;
      return [start.x+alongX*distance-alongZ*offset,
        start.y+(end.y-start.y)*elevation+.35*Math.sin(Math.PI*t),
        start.z+alongZ*distance+alongX*offset];
    },
    locate(x,z) {
      return {distance:(x-start.x)*alongX+(z-start.z)*alongZ,offset:(z-start.z)*alongX-(x-start.x)*alongZ};
    }
  };
}

export function bridgeAirSpan(path, currentIsland, useKit) {
  const origin = islands.find(island => island.id === currentIsland);
  const mid = path.length / 2;
  const shore = (end, index) => {
    const island = islands.find(item => item.id === end.island);
    const offsetX = (island.x - origin.x) * islandSpacing;
    const offsetZ = (island.z - origin.z) * islandSpacing;
    const model = useKit ? islandModel(island.id) : null;
    const sign = index === 0 ? 1 : -1;
    const anchor = index === 0 ? 0 : path.length;
    const onLandAt = distance => {
      const [x,,z] = path.point(distance);
      return model ? model.containsLand(x-offsetX,z-offsetZ) : onIsland(x-offsetX,z-offsetZ);
    };
    let inside = anchor;
    if (!onLandAt(inside)) return anchor;
    let outside = anchor + sign * .25;
    while (Math.abs(outside-anchor) < mid && onLandAt(outside)) {
      inside = outside;
      outside += sign * .25;
    }
    if (Math.abs(outside-anchor) >= mid) return mid;
    for (let i=0;i<8;i++) {
      const sample = (inside+outside)*.5;
      if (onLandAt(sample)) inside=sample;
      else outside=sample;
    }
    return (inside+outside)*.5;
  };
  const start = shore(path.endpoints[0],0), end = shore(path.endpoints[1],1);
  return { start,end,handoff:(start+end)*.5 };
}

export function bridgeSpeedFactor(distance, {start,end}) {
  const t = Math.max(0,Math.min(1,Math.min(distance-start,end-distance)/2.75));
  return 1+.35*t*t*(3-2*t);
}

export function bridgeGateDistance(path, index, currentIsland, useKit) {
  const outward = index === 0 ? 1 : -1;
  const anchor = index === 0 ? 0 : path.length;
  let shore = 0;
  if (useKit) {
    const origin = islands.find(item => item.id === currentIsland);
    const island = islands.find(item => item.id === path.endpoints[index].island);
    const model = islandModel(island.id);
    const border = model.boundary().map(point => {
      const [x,z] = model.localToIsland(...point);
      return path.locate(x+(island.x-origin.x)*islandSpacing,z+(island.z-origin.z)*islandSpacing);
    });
    // Clip the island outline to the whole deck strip plus room for a player.
    // A shoreline measured only in the centre can leave land beside the gate.
    const edge = bridgeHalfWidth+.16;
    const include = distance => { shore = Math.max(shore,(distance-anchor)*outward); };
    for (const [i,a] of border.entries()) {
      const b = border[(i+1)%border.length];
      if (Math.abs(a.offset)<=edge) include(a.distance);
      if (a.offset===b.offset) continue;
      for (const limit of [-edge,edge]) {
        const t = (limit-a.offset)/(b.offset-a.offset);
        if (t>0&&t<1) include(a.distance+(b.distance-a.distance)*t);
      }
    }
  }
  return anchor+outward*Math.min(path.length*.5-1,shore+.46);
}

function boughCrown(distance, length) {
  return .24*Math.sin(Math.PI*distance/length);
}

export function bridgeSurfaceHeight(path,distance,offset) {
  const crossSection = Math.sqrt(Math.max(0,1-(offset/boughRadius)**2));
  return path.point(distance)[1]+boughCrown(distance,path.length)-boughRadius*boughOval*(1-crossSection);
}

export function traceOakConnection(path,index,growth,joined,drawBough) {
  if(growth<2)return;
  const end=path.endpoints[index], sign=index===0?1:-1;
  const anchor=index===0?0:path.length;
  const bark=['#977451','#ac885f','#876647','#806047'];
  const moss=['#aaba70','#b3be79','#92a15e','#819658'];
  const thickness=[0,0,.062,.145,.34][growth];
  const strands=growth===2?1:growth===3?2:3;
  for(let strand=0;strand<strands;strand++){
    const main=joined && strand===0;
    const radius=main?boughRadius:thickness*(1-strand*.075);
    const extent=main?.5:joined?.625:[0,0,0,.095,.41][growth];
    const curve=t=>{
      const distance=anchor+sign*t*path.length;
      if(main){
        const point=path.point(distance);
        point[1]+=boughCrown(distance,path.length)-radius*boughOval;
        return point;
      }
      const phase=(t*1.18+strand/3+index*.08)*Math.PI*2;
      const offset=Math.cos(phase)*(.33+.48*Math.sin(Math.PI*t));
      const point=path.point(distance,sign*offset);
      point[1]+=.38*Math.sin(Math.PI*t)+.19*Math.sin(phase)-(joined?.45:.12);
      return point;
    };
    const start=curve(0);
    const branchHeight=[0,0,.23,.38,.52][growth]*(growth>=3?oakTreeHeightScale:1);
    const base=[end.tree.x,end.tree.y+branchHeight+strand*.03,end.tree.z];
    const rootReach=growth===2?.44:1;
    const root=Array.from({length:9},(_,step)=>{
      const t=rootReach*step/8;
      return base.map((value,axis)=>value+(start[axis]-value)*t+(axis===1?.16*Math.sin(Math.PI*t):0));
    });
    if(end.tree.x!==end.x || end.tree.z!==end.z)drawBough(root,t=>radius*(extent?.43+.57*t:.9-.56*t),bark);
    if(!extent)continue;
    const segments=Math.ceil(extent*38);
    const limbs=Array.from({length:segments+1},(_,step)=>curve(extent*step/segments));
    drawBough(limbs,t=>main?radius:radius*(1-.73*t**5),bark);
    for(let t=.045+strand*.025;t<extent-.036;t+=.09){
      const patch=Array.from({length:7},(_,step)=>{
        const point=curve(t+step*.005);
        if(main){
          const distance=anchor+sign*(t+step*.005)*path.length;
          const edge=path.point(distance,sign*.40);
          point[0]=edge[0];point[2]=edge[2];point[1]+=radius*.64;
        }else point[1]+=radius*.64;
        return point;
      });
      drawBough(patch,t=>Math.max(.032,radius*.55*Math.sin(Math.PI*t)**.52),moss);
    }
    if(growth!==4 || main)continue;
    for(const t of [.19+strand*.018,.41+strand*.024]){
      if(t+.055>extent)continue;
      const fork=Array.from({length:12},(_,step)=>{
        const s=step/11;
        const point=curve(t+s*.055);
        const curl=Math.sin(s*Math.PI*.76)*.50;
        point[0]+=sign*curl;point[2]+=sign*curl*.66;
        point[1]-=Math.sin(s*Math.PI*.62)*.55;
        return point;
      });
      drawBough(fork,t=>.135*(1-.61*t**4),bark);
    }
  }
}
