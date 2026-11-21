import * as THREE from '../../three.module.min.js';
import {C,material,add,ground} from './common.js';

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
export const waterY=.145;
const surfaceY=waterY+.018;
export function waterGroundHeight(x,z){
  const d=waterField(x,z);
  if(d<=-.12)return .09;
  if(d<=0)return THREE.MathUtils.lerp(.09,waterY,THREE.MathUtils.smoothstep(d,-.12,0));
  if(d<=.38)return THREE.MathUtils.lerp(waterY,.175,THREE.MathUtils.smoothstep(d,0,.38));
  return THREE.MathUtils.lerp(.175,ground(x,z),THREE.MathUtils.smoothstep(d,.38,.78));
}
export const sandStrength=(x,z)=>1-THREE.MathUtils.smoothstep(waterField(x,z),.16,.53);

// Clip a triangle against the connected pond and channel footprint.
function clippedTriangle(a,b,c,vertices){
  const triangle=[a,b,c],polygon=[];
  for(let i=0;i<3;i++){
    const p=triangle[i],q=triangle[(i+1)%3],insideP=p[2]<=0,insideQ=q[2]<=0;
    if(insideP)polygon.push(p);
    if(insideP!==insideQ){const t=p[2]/(p[2]-q[2]);polygon.push([THREE.MathUtils.lerp(p[0],q[0],t),THREE.MathUtils.lerp(p[1],q[1],t),0])}
  }
  for(let i=1;i<polygon.length-1;i++)for(const p of [polygon[0],polygon[i],polygon[i+1]])vertices.push(p[0],surfaceY,p[1]);
}
export function createWater(scene){
  const g=new THREE.Group();g.name='Connected pond, streams and waterfall';scene.add(g);
  const vertices=[],step=.065,xMin=-6.67,xMax=4.52,zMin=-3.42,zMax=1.62;
  const nx=Math.ceil((xMax-xMin)/step),nz=Math.ceil((zMax-zMin)/step),field=[];
  for(let j=0;j<=nz;j++){
    const row=[];for(let i=0;i<=nx;i++){const x=xMin+i*step,z=zMin+j*step;row.push([x,z,waterField(x,z)])}field.push(row);
  }
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
    const a=field[j][i],b=field[j][i+1],c=field[j+1][i+1],d=field[j+1][i];
    if(a[2]>0&&b[2]>0&&c[2]>0&&d[2]>0)continue;
    clippedTriangle(a,b,c,vertices);clippedTriangle(a,c,d,vertices);
  }
  // Use the surface's own boundary samples at the lip, so the curtain has no gap.
  const lipZ=[];
  for(let j=0;j<nz;j++){
    const a=field[j][0],b=field[j+1][0];
    if(a[2]<=0)lipZ.push(a[1]);
    if((a[2]<=0)!==(b[2]<=0))lipZ.push(THREE.MathUtils.lerp(a[1],b[1],a[2]/(a[2]-b[2])));
  }
  const last=field[nz][0];if(last[2]<=0)lipZ.push(last[1]);
  const centerZ=-.45,sections=lipZ.length-1,levels=30,bottomY=-2.9;
  const fallPoint=(i,j)=>{
    const t=j/levels,u=1-t;
    const x=xMin-.58*(1-u*u*u);
    const y=u*u*u*surfaceY+3*u*u*t*surfaceY+3*u*t*t*(bottomY+.8)+t*t*t*bottomY;
    return [x,y,centerZ+(lipZ[i]-centerZ)*(1+.08*t)+.014*Math.sin(t*8)*Math.sin(i/sections*Math.PI)];
  };
  for(let j=0;j<levels;j++)for(let i=0;i<sections;i++){
    const a=fallPoint(i,j),b=fallPoint(i+1,j),c=fallPoint(i+1,j+1),d=fallPoint(i,j+1);
    vertices.push(...a,...d,...b,...b,...d,...c);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const surface=add(geometry,material(C.water,{roughness:.14,metalness:.03,transparent:true,opacity:.86,side:THREE.DoubleSide,depthWrite:false}),g);
  surface.name='Single connected water surface and fall';
  surface.userData.isWater=true;
  return g;
}
