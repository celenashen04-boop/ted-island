import * as THREE from '../../three.module.min.js';
import {C,material,add,beam,ball,ribbon,ground} from './common.js';
export const greenhouse={x:.4,z:.55,y:.5};
export const walkRoutes=[
  [[-5.45,.23,1.43],[-4.23,.33,1.48],[-2.95,.4,1.56],[-1.45,.49,1.69],[.32,.53,1.84]],
  [[1.9,.53,.65],[2.35,.49,.91],[2.85,.4,1.35],[3.55,.35,1.72]],
  [[-3.05,.4,1.56],[-3.45,.32,.85],[-3.65,.24,.05]]
];
export function createArchitecture(scene,walkables){const g=new THREE.Group();g.name='Timber greenhouse and connected walkways';scene.add(g);const wood=material(C.timber),light=material(C.timberLight),copper=material(C.copper,{metalness:.27,roughness:.4}),glass=material(0x9ed6ca,{metalness:.04,roughness:.09,transparent:true,opacity:.68,side:THREE.DoubleSide,depthWrite:false}),soil=material(C.soil),cream=material(C.cream);
  const terrainSurface=walkables[0],supportRay=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  function supportGround(x,z){supportRay.set(new THREE.Vector3(x,5,z),down);return supportRay.intersectObject(terrainSurface,false)[0]?.point.y??ground(x,z)}
  const {x,z,y}=greenhouse;
  // Plinth and slender arched timber ribs define the greenhouse's memorable silhouette.
  const base=add(new THREE.BoxGeometry(3.32,.18,2.76),material(C.terracotta),g,[x,y+.08,z]);walkables.push(base);
  add(new THREE.BoxGeometry(3.08,.035,2.54),material(0xe9dec3),g,[x,y+.19,z]);
  const roofY=(u)=>y+1.43+1.14*Math.sqrt(Math.max(0,1-(u/1.62)**2));
  for(const zz of [-1.3,-.65,0,.65,1.3]){
    const pts=[];for(let i=0;i<=20;i++){const u=-1.62+i*3.24/20;pts.push([x+u,roofY(u),z+zz])}for(let i=0;i<20;i++)beam(g,pts[i],pts[i+1],.043,wood,7);
    for(const side of [-1,1])beam(g,[x+side*1.62,y+.22,z+zz],[x+side*1.62,roofY(side*1.62),z+zz],.048,wood);
  }
  for(const side of [-1,1]){
    for(let j=0;j<4;j++){
      const z0=z-1.3+j*.65,z1=z0+.65,verts=[],idx=[];for(let i=0;i<=10;i++){const u=(i/10)*1.62*side;verts.push(x+u,roofY(u),z0,x+u,roofY(u),z1);if(i<10){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();add(geo,glass,g);
      const wall=add(new THREE.PlaneGeometry(.65,1.2),glass,g,[x+side*1.625,y+.81,(z0+z1)/2]);wall.rotation.y=Math.PI/2;
    }
    beam(g,[x+side*1.62,roofY(1.62),z-1.36],[x+side*1.62,roofY(1.62),z+1.36],.04,copper);
  }
  // End walls and doorway leave the plants visible from the walking path.
  for(const zz of [-1.38,1.38]){for(const u of [-1.62,-.82,.82,1.62])beam(g,[x+u,y+.22,z+zz],[x+u,roofY(u),z+zz],.045,wood);beam(g,[x-1.63,y+1.37,z+zz],[x+1.63,y+1.37,z+zz],.039,wood)}
  for(const side of [-1,1]){const p=add(new THREE.PlaneGeometry(.77,1.16),glass,g,[x+side*1.2,y+.78,z+1.39]);p.rotation.y=Math.PI;const p2=add(new THREE.PlaneGeometry(.77,1.16),glass,g,[x+side*1.2,y+.78,z-1.39]);p2.rotation.y=Math.PI}
  beam(g,[x,roofY(0)+.04,z-1.45],[x,roofY(0)+.04,z+1.45],.055,copper);
  // Parallel cultivated benches and interior saplings.
  for(const side of [-1,1]){add(new THREE.BoxGeometry(.52,.19,2.12),wood,g,[x+side*.91,y+.37,z]);add(new THREE.BoxGeometry(.48,.04,2.06),soil,g,[x+side*.91,y+.49,z]);for(let i=0;i<7;i++){const zz=z-.86+i*.29,xx=x+side*.91;beam(g,[xx,y+.5,zz],[xx,y+.75+(i%3)*.1,zz],.012,material(C.moss),5);ball(g,[xx,y+.78+(i%3)*.1,zz],[.12,.16,.11],material(i%3?C.grassDark:0x7cae79),1)}}
  // Continuous deck ribbons, planking, and support posts at intervals.
  const routes=[];for(const [rIndex,points] of walkRoutes.entries()){const deck=ribbon(g,points,rIndex===0?.9:.75,light,{segments:54,lift:.045});walkables.push(deck);routes.push(deck.userData.curve);for(let i=0;i<=18;i++){const p=deck.userData.curve.getPoint(i/18),t=deck.userData.curve.getTangent(i/18),o=add(new THREE.BoxGeometry(rIndex===0?.87:.72,.025,.055),wood,g,[p.x,p.y+.075,p.z]);o.rotation.y=Math.atan2(t.x,t.z);if(i%3===0)beam(g,[p.x,supportGround(p.x,p.z)-.045,p.z],[p.x,p.y+.075,p.z],.048,wood,7)}}
  // Two clean connection landings at opposite ends of the system.
  for(const [bx,bz,a] of [[-5.56,1.45,0],[5.35,1.92,.42]]){const by=ground(bx,bz)+.16;const p=add(new THREE.BoxGeometry(1.12,.14,1.03),light,g,[bx,by,bz]);p.rotation.y=a;walkables.push(p);for(const side of [-1,1])beam(g,[bx+side*.39,by+.05,bz],[bx+side*.39,by+.53,bz],.04,copper)}
  return {group:g,routes}
}
