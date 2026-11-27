import * as THREE from '../../three.module.min.js';
import {palette,mat,mesh,sphere,cylinderBetween,seeded,insideIsland} from './common.js';
import {inPond} from './water.js';
import {pavilion} from './architecture.js';

export const treeColliders=[];
const rand=seeded(2027);
export function createVegetation(scene,surface){
  const g=new THREE.Group();g.name='Flowering and green gardens';g.userData.nonBlockingVegetation=true;scene.add(g);
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  function groundAt(x,z){ray.set(new THREE.Vector3(x,10,z),down);const hit=ray.intersectObject(surface,false)[0];return hit?hit.point.y:null}
  function anchoredRoot(x,z){for(let i=0;i<=30;i++){const factor=1-i*.018,px=x*factor,pz=z*factor,y=groundAt(px,pz);if(y!==null&&insideIsland(px,pz,.36))return [px,pz,y]}return null}
  const bark=mat(0x9b806e),pink=[mat(palette.pink),mat(palette.pinkLight),mat(0xf8b8c9)],green=[mat(palette.leaf),mat(palette.leafLight)],shrub=mat(0xa7cf7e),flower=[mat(0xf7bac9),mat(0xffe2b3),mat(0xe7d6ed)];
  function tree(x,z,size){const root=anchoredRoot(x,z);if(!root)return;[x,z]=root;const y=root[2],h=1.05+1.42*size;treeColliders.push({x,z,r:.13*size});
    const crownTree=new THREE.Group();crownTree.name='Flowering tree';
    crownTree.userData.lifecycleTree={x,y,z,style:'blossom'};g.add(crownTree);
    cylinderBetween([x,y,z],[x-.055*size,y+h*.56,z+.035*size],.11*size,bark,crownTree,9);
    cylinderBetween([x-.055*size,y+h*.56,z+.035*size],[x,y+h,z],.082*size,bark,crownTree,9);
    for(const sign of [-1,1])cylinderBetween([x,y+h*.63,z],[x+sign*.37*size,y+h*.91,z+sign*.12*size],.043*size,bark,crownTree,7);
    for(const [dx,dy,dz,s,k] of [[0,.05,0,.69,0],[-.43,-.02,.1,.54,1],[.36,-.05,.13,.56,2],[-.12,.25,-.24,.54,1],[.18,.2,.28,.44,0]])sphere(x+dx*size,y+h+dy*size,z+dz*size,s*size,s*.75*size,s*.8*size,pink[k],crownTree,12);
    const petals=new THREE.Group();petals.name='Scenery petals';crownTree.add(petals);
    for(let i=0;i<9;i++){const a=rand()*Math.PI*2,r=.23+rand()*.77,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r,py=groundAt(px,pz);if(py===null)continue;const p=mesh(new THREE.PlaneGeometry(.08,.11),pink[i%3],petals,[px,py+.012,pz]);p.rotation.set(-Math.PI/2,0,a)}
  }
  const trees=[[-4.66,2.2,1],[-3.94,3.17,.82],[-.42,3.18,.98],[1.1,2.92,.81],[4.72,2.26,.9],[.34,-3.27,.86],[5.02,-2.88,.75]];
  const groveClearings=[[-5.13,1.03],[-3.43,-3.12],[-.42,-2.74],[2.04,2.53],[3.65,3.25]];
  for(const [x,z,size] of trees)tree(x,z,size);
  // Retain the shrub and flower layout around the newly open clearings.
  const gardenClearings=[...treeColliders.map(({x,z})=>[x,z]),...groveClearings.map(([x,z])=>anchoredRoot(x,z)).filter(Boolean)];
  // Layer small shrubs and flowering clusters in clear areas, with seeded placement.
  const clearsLandings=(x,z)=>!(x>4.35 && z>-1.75 && z<1.65)
    && !(x<-4.25 && z>-1.75 && z<.1);
  const clear=(x,z)=>clearsLandings(x,z)&&insideIsland(x,z,.5)&&!inPond(x,z,.48)&&Math.hypot(x-pavilion.x,z-pavilion.z)>2.04&&!(x<-1.5&&x>-4.8&&z>-2.2&&z<.5)&&!(x<-1.3&&x>-3.3&&z>1&&z<3.1)&&!gardenClearings.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<.75);
  for(let i=0,count=0;i<450&&count<82;i++){
    const x=(rand()-.5)*11.6,z=(rand()-.5)*8.9;if(!clear(x,z))continue;const y=groundAt(x,z);if(y===null)continue;count++;const r=.11+rand()*.16;
    const flowering=count%5===0, height=flowering?0:.14+rand()*.07;
    if(count%2!==0||count%20===2)continue;
    if(flowering){for(let k=0;k<3;k++){const a=k*2*Math.PI/3,fx=x+Math.cos(a)*.13,fz=z+Math.sin(a)*.13,fy=groundAt(fx,fz);if(fy===null)continue;cylinderBetween([fx,fy-.012,fz],[fx,fy+.2,fz],.015,green[0],g,5);sphere(fx,fy+.24,fz,.075,.065,.075,flower[(count+k)%3],g,8)}}
    else{sphere(x,y+.1,z,r,height,r,shrub,g,9);if(count%3===0){const px=x+r*.5,pz=z-r*.3,py=groundAt(px,pz);if(py!==null)sphere(px,py+.09,pz,r*.68,.12,r*.66,green[1],g,9)}}
  }
  // Two open research planting beds: subtle soil fields with tiny edge markers.
  const soil=mat(0xb9aa85),rim=mat(0xe6d7ad);
  for(const [x,z,rx,rz] of [[-.05,-1.55,.68,.42],[1.34,1.15,.66,.44]]){
    const terrainY=groundAt(x,z);if(terrainY===null)continue;const y=terrainY+.01;const bed=mesh(new THREE.CylinderGeometry(1,1,.045,24),soil,g,[x,y,z]);bed.scale.set(rx,1,rz);bed.userData.navSurface='planting_bed';
    const edge=mesh(new THREE.TorusGeometry(1,.025,6,28),rim,g,[x,y+.035,z]);edge.rotation.x=Math.PI/2;edge.scale.set(rx,rz,1);
    for(const a of [.5,2.7,4.8]){const fx=x+Math.cos(a)*rx*.72,fz=z+Math.sin(a)*rz*.72;cylinderBetween([fx,y+.022,fz],[fx,y+.2,fz],.014,green[0],g,5);sphere(fx,y+.22,fz,.045,.045,.045,flower[1],g,7)}
  }
  return g;
}
