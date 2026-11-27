import * as THREE from '../../three.module.min.js';
import {P,mat,mesh,beam,sphere,inside,rng} from './common.js';
import {inWater} from './water.js';
export const colliders=[];
const random=rng(3027);
export function createVegetation(scene,surface){const g=new THREE.Group();g.name='Mint groves, sculptural flowers and seed beds';g.userData.nonBlockingVegetation=true;scene.add(g);const bark=mat(0x987f6d),leaf=[mat(P.mintDark),mat(0x9fceb0),mat(0x80bfa4)],flower=[mat(P.coral),mat(P.yellow),mat(P.lavender),mat(P.sky)],stems=mat(0x79b68d),soil=mat(0xb29a79),rim=mat(P.sand);
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  function groundAt(x,z){ray.set(new THREE.Vector3(x,10,z),down);const hit=ray.intersectObject(surface,false)[0];return hit?hit.point.y:null}
  function anchoredRoot(x,z){for(let i=0;i<=20;i++){const f=1-i*.012,px=x*f,pz=z*f,y=groundAt(px,pz);if(y!==null&&inside(px,pz,.38))return [px,pz,y]}return null}
  function tree(x,z,s,k){if(!inside(x,z,.38)||inWater(x,z,.45))return;const root=anchoredRoot(x,z);if(!root)return;[x,z]=root;const y=root[2],h=1.05+1.2*s;colliders.push({x,z,r:.12*s});const mintTree=new THREE.Group();mintTree.name='Mint grove tree';mintTree.userData.lifecycleTree={x,y,z,style:'mint'};g.add(mintTree);beam(mintTree,[x,y-.015,z],[x-.06*s,y+h,z+.04*s],.095*s,bark,9);for(const [dx,dy,dz,sc,n] of [[0,.11,0,.63,0],[-.38,-.03,.08,.43,1],[.31,-.08,-.14,.48,2],[.05,.35,.12,.4,1]])sphere(mintTree,[x+dx*s,y+h+dy*s,z+dz*s],[sc*s,sc*.84*s,sc*.82*s],leaf[(n+k)%3],14)}
  for(const t of [[-4.4,.75,.8,0],[-3.65,3.05,.72,1],[-1.38,3.36,.79,2],[1.04,3.64,.78,0],[4.61,2.24,.82,1],[4.96,-2.45,.67,2],[.16,-3.55,.68,0],[-3.95,-2.96,.72,1],[-4.67,-1.67,.61,2]])tree(...t);
  // Oversized blooms act as quiet landmarks at the path edges.
  function bloom(x,z,s,c){if(!inside(x,z,.43))return;const root=anchoredRoot(x,z);if(!root)return;[x,z]=root;const y=root[2],h=.45*s;beam(g,[x,y-.015,z],[x,y+h,z],.025*s,stems,7);for(let i=0;i<5;i++){const a=i*2*Math.PI/5,p=sphere(g,[x+Math.cos(a)*.14*s,y+h+Math.sin(a)*.14*s,z],[.15*s,.1*s,.048*s],flower[c],10);p.rotation.z=a}sphere(g,[x,y+h,z+.05*s],[.095*s,.095*s,.05*s],mat(0xfbf3d9),12)}
  for(const [x,z,s,c] of [[-2.05,2.72,1,0],[2.37,3.11,.86,1],[4.93,-1.43,.9,2],[2.58,-3.54,.83,3],[-4.1,1.2,.76,3]])bloom(x,z,s,c);
  // Garden clusters follow the headland edges, leaving paths and seed beds open.
  const zones=[[-4.05,.25,1.0,.55,18],[1.13,3.07,1.45,.55,17],[4.0,-2.9,.65,.42,14],[-2.66,-3.05,1.0,.4,17]];for(const [cx,cz,rx,rz,n] of zones)for(let i=0;i<n;i++){const x=cx+(random()-.5)*2*rx,z=cz+(random()-.5)*2*rz;if(!inside(x,z,.5)||inWater(x,z,.25)||colliders.some(t=>Math.hypot(x-t.x,z-t.z)<.55))continue;const y=groundAt(x,z);if(y===null)continue;const r=.12+random()*.15;if(i%2===0&&i%20!==6)sphere(g,[x,y+.1,z],[r,.13,r*.9],leaf[i%3],9)}
  for(const [x,z,rx,rz] of [[-1.5,2.2,.62,.4],[1.95,.04,.56,.38]]){const terrainY=groundAt(x,z);if(terrainY===null)continue;const y=terrainY+.01,bed=mesh(new THREE.CylinderGeometry(1,1,.045,24),soil,g,[x,y,z]);bed.scale.set(rx,1,rz);bed.userData.navSurface='planting_bed';const ring=mesh(new THREE.TorusGeometry(1,.03,7,28),rim,g,[x,y+.033,z]);ring.rotation.x=Math.PI/2;ring.scale.set(rx,rz,1);for(const a of [.4,2.6,4.8]){const px=x+Math.cos(a)*rx*.8,pz=z+Math.sin(a)*rz*.8;beam(g,[px,y+.022,pz],[px,y+.15,pz],.012,stems,5);sphere(g,[px,y+.17,pz],[.035,.035,.035],flower[(Math.floor(a)+1)%4],8)}}
  return g}
