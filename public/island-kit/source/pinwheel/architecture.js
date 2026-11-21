import * as THREE from '../../three.module.min.js';
import {P,mat,mesh,beam,sphere,strip,height} from './common.js';
import {terrainHeight} from './terrain.js';
export const routes=[
  [[-.72,-.04],[-1.45,.43],[-2.05,1.07],[-2.5,1.55]],
  [[.6,.48],[1.48,1.12],[2.26,1.5],[2.9,1.75]],
  [[.55,-.53],[1.42,-1.25],[2.32,-1.85],[3.54,-2.08]],
  [[-.6,-.52],[-1.32,-1.1],[-2.38,-1.78],[-3.25,-2.0]],
  [[2.9,1.75],[3.5,1.08],[3.89,.2],[3.65,-1.25],[3.53,-2.07]],
  [[-2.5,1.55],[-3.48,1.04],[-4.15,.34],[-4.75,-.05]],
  [[3.65,-1.25],[4.03,-.72],[4.55,.05]]
];
export function createArchitecture(scene,walkables){const g=new THREE.Group();g.name='Branching play paths, towers and tunnels';scene.add(g);const ivory=mat(P.cream),sand=mat(P.sand),wood=mat(P.timber),woodLight=mat(0xd5aa88),sky=mat(P.sky),coral=mat(P.coral),lav=mat(P.lavender),metal=mat(P.metal,{metalness:.4,roughness:.52});
  const terrain=walkables[0],ray=new THREE.Raycaster();terrain.updateWorldMatrix(true,false);
  const groundAt=(x,z)=>{ray.set(new THREE.Vector3(x,5,z),new THREE.Vector3(0,-1,0));return ray.intersectObject(terrain,false)[0]?.point.y??terrainHeight(x,z)};
  const plazaY=height(0,0)+.08;const plaza=mesh(new THREE.CylinderGeometry(1.22,1.28,.15,32),sand,g,[0,plazaY-.055,0]);walkables.push(plaza);const rim=mesh(new THREE.TorusGeometry(1.17,.035,8,48),woodLight,g,[0,plazaY+.03,0]);rim.rotation.x=Math.PI/2;rim.userData.walkableTrim=true;
  const pathCurves=[];for(const [index,route] of routes.entries()){
    const pts=route.map(([x,z],i)=>[x,groundAt(x,z)+.012+([0,1].includes(index)?i/Math.max(1,route.length-1)*.54:0),z]);
    const o=strip(g,pts,index===4?.66:.76,index===4?woodLight:ivory,64);walkables.push(o);pathCurves.push(o.userData.curve);
    if(index===4){for(let i=0;i<20;i++){const p=o.userData.curve.getPoint(i/19),d=o.userData.curve.getTangent(i/19),slat=mesh(new THREE.BoxGeometry(.67,.028,.055),wood,g,[p.x,p.y+.064,p.z]);slat.rotation.y=Math.atan2(d.x,d.z)}}
    if([0,1,4,5,6].includes(index))for(let i=1;i<9;i++){
      const p=o.userData.curve.getPoint(i/9),floorY=groundAt(p.x,p.z),deckY=p.y+.035;
      if(deckY-floorY>.095)beam(g,[p.x,floorY-.025,p.z],[p.x,deckY-.018,p.z],.045,wood,8);
    }
  }
  function tower(x,z,color){const y=groundAt(x,z),deckY=y+.52,frame=mat(color);const deck=mesh(new THREE.CylinderGeometry(.84,.87,.14,20),woodLight,g,[x,deckY,z]);walkables.push(deck);for(let i=0;i<5;i++){const a=i*2*Math.PI/5,px=x+Math.cos(a)*.74,pz=z+Math.sin(a)*.74;beam(g,[px,groundAt(px,pz)-.03,pz],[px,deckY+1.33,pz],.054,frame,10);beam(g,[px,deckY+1.33,pz],[x,deckY+1.95,z],.043,frame,8);sphere(g,[px,deckY+1.34,pz],[.1,.1,.1],woodLight,10)}mesh(new THREE.CylinderGeometry(.2,.26,.12,16),wood,g,[x,deckY+1.98,z]);for(let i=0;i<10;i++){const a=i*2*Math.PI/10,b=(i+1)*2*Math.PI/10;beam(g,[x+Math.cos(a)*.83,deckY+.48,z+Math.sin(a)*.83],[x+Math.cos(b)*.83,deckY+.48,z+Math.sin(b)*.83],.025,wood,6)}return deckY}
  tower(-2.5,1.55,P.sky);tower(2.9,1.75,P.lavender);
  // Two inhabitable arch sequences form a short tunnel in the southwest headland.
  const archPath=pathCurves[3];for(let k=0;k<4;k++){
    const t=.55+k*.105,p=archPath.getPoint(t),d=archPath.getTangent(t),side=new THREE.Vector3(-d.z,0,d.x).normalize(),color=[sky,lav,coral,woodLight][k];
    const points=[];for(let i=0;i<=20;i++){const a=Math.PI-i*Math.PI/20,x=p.x+side.x*Math.cos(a)*.66,z=p.z+side.z*Math.cos(a)*.66;points.push([x,groundAt(x,z)+Math.sin(a)*1.17-.015,z])}
    for(let i=0;i<20;i++)beam(g,points[i],points[i+1],.055,color,8);
  }
  // Prepared landings face west and east future island connections.
  for(const [x,z,a] of [[-4.75,-.05,-.35],[4.55,.05,.25]]){const y=groundAt(x,z)+.015,p=mesh(new THREE.BoxGeometry(1.12,.13,.96),woodLight,g,[x,y,z]);p.rotation.y=a;walkables.push(p);for(const s of [-1,1])sphere(g,[x+s*.44,y+.08,z],[.08,.08,.08],coral,9)}
  return {group:g,pathCurves}}
