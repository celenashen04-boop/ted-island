import * as THREE from '../../three.module.min.js';
import {C,material,add,ground} from './common.js';
import {shorelineVertices} from '../shoreline.js';

export const ponds=[{x:-2.65,z:-1.66,rx:1.14,rz:.83},{x:3.24,z:-2.13,rx:.92,rz:.7}];
const mainPath=[[2.67,-2.25],[1.72,-2.5],[.64,-2.66],[-.48,-2.56],[-1.58,-2.17],[-2.15,-1.78]];
const outflowPath=[[-3.35,-1.61],[-4.2,-1.42],[-5.25,-.91],[-6.02,-.57],[-6.67,-.45]];
const collectorPath=[[4.03,1.34],[4.34,.56],[4.31,-.26],[3.82,-1.15],[3.36,-1.61]];
const samplePath=(points,count)=>new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal').getPoints(count).map(p=>[p.x,p.z]);
const routes=[
  {points:samplePath(mainPath,36),radius:.235},
  {points:samplePath(outflowPath,24),radius:.31},
  {points:samplePath(collectorPath,28),radius:.09}
];
function segmentDistance(x,z,a,b){
  const dx=b[0]-a[0],dz=b[1]-a[1],t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}
export function waterField(x,z){
  let d=Infinity;
  for(const p of ponds){
    const dx=(x-p.x)/p.rx,dz=(z-p.z)/p.rz,a=Math.atan2(dz,dx);
    const irregular=1+.07*Math.sin(3*a+1)+.035*Math.cos(7*a);
    d=Math.min(d,(Math.hypot(dx,dz)/irregular-1)*Math.min(p.rx,p.rz));
  }
  for(const route of routes)for(let i=1;i<route.points.length;i++)d=Math.min(d,segmentDistance(x,z,route.points[i-1],route.points[i])-route.radius);
  return d;
}
export const inWater=(x,z,pad=0)=>waterField(x,z)<pad;
export const waterY=.163;
export function waterGroundHeight(x,z){
  const d=waterField(x,z);
  if(d<=-.12)return .09;
  if(d<=0){
    const t=(d+.12)/.12;
    return THREE.MathUtils.lerp(.09,waterY,t*t*(3-2*t+.21*(t-1)));
  }
  if(d<=.38)return THREE.MathUtils.lerp(waterY,.175,1-(1-d/.38)**4);
  return THREE.MathUtils.lerp(.175,ground(x,z),THREE.MathUtils.smoothstep(d,.38,.78));
}
export const sandStrength=(x,z)=>1-THREE.MathUtils.smoothstep(waterField(x,z),.16,.53);

function connectedWaterGeometry(triangles){
  const positions=[],indices=[],vertices=new Map();
  for(let i=0;i<triangles.length;i+=9){
    const face=[];
    for(let j=i;j<i+9;j+=3){
      const point=triangles.slice(j,j+3);
      const key=point.map(value=>Math.round(value*1000000)).join(',');
      if(!vertices.has(key)){
        vertices.set(key,positions.length/3);
        positions.push(...point);
      }
      face.push(vertices.get(key));
    }
    if(new Set(face).size<3)continue;
    const [a,b,c]=face.map(v=>v*3);
    const abx=positions[b]-positions[a],aby=positions[b+1]-positions[a+1],abz=positions[b+2]-positions[a+2];
    const acx=positions[c]-positions[a],acy=positions[c+1]-positions[a+1],acz=positions[c+2]-positions[a+2];
    const facingUp=abz*acx-abx*acz;
    const area=Math.hypot(aby*acz-abz*acy,facingUp,abx*acy-aby*acx);
    if(area<(positions[a]<-6.25&&positions[b]<-6.25&&positions[c]<-6.25?2e-7:1e-12))continue;
    if(facingUp<0)[face[1],face[2]]=[face[2],face[1]];
    indices.push(...face);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createWater(scene,terrain){
  const g=new THREE.Group();g.name='Connected pond, streams and waterfall';scene.add(g);
  const vertices=shorelineVertices(terrain,waterY,(x,z)=>waterField(x,z)-.18);
  const position=terrain.geometry.attributes.position;
  const rim=terrain.userData.rim.map(i=>[position.getX(i),position.getY(i),position.getZ(i)]);
  const lipX=-6.67;
  const outlet=[];
  for(const [i,a] of rim.entries()){
    const b=rim[(i+1)%rim.length];
    if(a[0]>-5.9||b[0]>-5.9||Math.abs((a[2]+b[2])*.5+.45)>.63)continue;
    if(a[1]>waterY&&b[1]>waterY)continue;
    const edge=a[1]<=waterY&&b[1]<=waterY?null
      :a.map((value,j)=>THREE.MathUtils.lerp(value,b[j],(waterY-a[1])/(b[1]-a[1])));
    const start=a[1]<=waterY?a:edge,end=b[1]<=waterY?b:edge;
    if(outlet.length===0)outlet.push(start);
    outlet.push(end);
  }
  // Carry the exact wet cliff edge out to the existing waterfall lip.
  outlet.sort((a,b)=>a[2]-b[2]);
  const firstZ=outlet[0]?.[2],lastZ=outlet.at(-1)?.[2];
  const lipZ=outlet.map(p=>THREE.MathUtils.lerp(-.76,-.14,(p[2]-firstZ)/(lastZ-firstZ)));
  const centerZ=-.45,sections=lipZ.length-1,levels=30,bottomY=-2.9;
  function cliffX(z){
    const index=outlet.findIndex(p=>p[2]>=z);
    if(index<=0)return outlet[index===0?0:outlet.length-1][0];
    const a=outlet[index-1],b=outlet[index];
    return THREE.MathUtils.lerp(a[0],b[0],(z-a[2])/(b[2]-a[2]));
  }
  function apronPoint(i,t){
    const z=THREE.MathUtils.lerp(outlet[i][2],lipZ[i],THREE.MathUtils.smoothstep(t,0,1));
    const x=THREE.MathUtils.lerp(cliffX(z),lipX,t);
    return [x,waterY,z];
  }
  for(let i=0;i<sections;i++){
    for(let j=0;j<6;j++){
      const a=apronPoint(i,j/6),b=apronPoint(i+1,j/6),c=apronPoint(i+1,(j+1)/6),d=apronPoint(i,(j+1)/6);
      vertices.push(...a,...d,...b,...b,...d,...c);
    }
  }
  const fallPoint=(i,j)=>{
    const t=j/levels,u=1-t;
    const x=lipX-.58*(1-u*u*u);
    const y=u*u*u*waterY+3*u*u*t*waterY+3*u*t*t*(bottomY+.8)+t*t*t*bottomY;
    return [x,y,centerZ+(lipZ[i]-centerZ)*(1+.08*t)+.014*Math.sin(t*8)*Math.sin(i/sections*Math.PI)];
  };
  for(let j=0;j<levels;j++)for(let i=0;i<sections;i++){
    const a=fallPoint(i,j),b=fallPoint(i+1,j),c=fallPoint(i+1,j+1),d=fallPoint(i,j+1);
    vertices.push(...a,...d,...b,...b,...d,...c);
  }
  const geometry=connectedWaterGeometry(vertices);
  const surface=add(geometry,material(C.water,{roughness:.14,metalness:.03,transparent:true,opacity:.86,side:THREE.DoubleSide,depthWrite:false}),g);
  surface.name='Single connected water surface and fall';
  surface.userData.isWater=true;
  return g;
}
