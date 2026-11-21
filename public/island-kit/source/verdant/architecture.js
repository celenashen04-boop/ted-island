import * as THREE from '../../three.module.min.js';
import {C,material,add,beam,ball,ground} from './common.js';
import {addBotanicalDisplay} from './botanical-display.js';
import {addGreenhouseAccess,greenhouse} from './greenhouse-access.js';
export function createArchitecture(scene,walkables){const g=new THREE.Group();g.name='Timber greenhouse and connected walkways';scene.add(g);const wood=material(C.timber),light=material(C.timberLight),copper=material(C.copper,{metalness:.27,roughness:.4}),glass=material(0xa6ccd2,{metalness:.04,roughness:.09,transparent:true,opacity:.60,side:THREE.DoubleSide,depthWrite:false}),soil=material(C.soil),cream=material(C.cream);
  const terrainSurface=walkables[0],terraces=walkables.slice(),supportRay=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  function supportGround(x,z){supportRay.set(new THREE.Vector3(x,5,z),down);return supportRay.intersectObject(terrainSurface,false)[0]?.point.y??ground(x,z)}
  const {x,z,y}=greenhouse;
  // Plinth and slender arched timber ribs define the greenhouse's memorable silhouette.
  const base=add(new THREE.BoxGeometry(3.32,.18,2.76),material(C.terracotta),g,[x,y+.08,z]);
  base.userData.navSurface='greenhouse_floor';
  walkables.push(base);
  const floor=add(new THREE.BoxGeometry(3.08,.035,2.76),material(0xe9dec3),g,[x,y+.19,z]);
  floor.userData.navSurface='greenhouse_floor';
  walkables.push(floor);
  const roofY=(u)=>y+1.43+1.14*Math.sqrt(Math.max(0,1-(u/1.62)**2));
  const bays=[-1.38,-.65,0,.65,1.38];
  const arch=Array.from({length:21},(_,i)=>-1.62+i*3.24/20);
  for(const zz of bays){
    const pts=arch.map(u=>[x+u,roofY(u),z+zz]);for(let i=0;i<20;i++)beam(g,pts[i],pts[i+1],.043,wood,7);
    for(const side of [-1,1])beam(g,[x+side*1.62,y+.22,z+zz],[x+side*1.62,roofY(side*1.62),z+zz],.048,wood);
  }
  for(const side of [-1,1]){
    for(let j=0;j<4;j++){
      const z0=z+bays[j],z1=z+bays[j+1],verts=[],idx=[];for(let i=0;i<=10;i++){const u=(i/10)*1.62*side;verts.push(x+u,roofY(u),z0,x+u,roofY(u),z1);if(i<10){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();add(geo,glass,g);
      const wall=add(new THREE.PlaneGeometry(z1-z0,1.2),glass,g,[x+side*1.625,y+.81,(z0+z1)/2]);wall.rotation.y=Math.PI/2;
    }
    beam(g,[x+side*1.62,roofY(1.62),z-1.36],[x+side*1.62,roofY(1.62),z+1.36],.04,copper);
  }
  // End walls and doorway leave the plants visible from the walking path.
  const mullions=[-1.62,-.82,.82,1.62];
  for(const zz of [bays[0],bays.at(-1)]){
    for(const u of mullions.slice(1,-1))beam(g,[x+u,y+.22,z+zz],[x+u,roofY(u),z+zz],.045,wood);
    beam(g,[x-1.63,y+1.37,z+zz],[x+1.63,y+1.37,z+zz],.039,wood);
    for(let i=0;i<3;i++){
      const left=mullions[i],right=mullions[i+1],sill=y+1.37;
      const pane=new THREE.Shape();
      pane.moveTo(left,sill);
      for(const u of [left,...arch.filter(u=>u>left&&u<right),right])pane.lineTo(u,roofY(u));
      pane.lineTo(right,sill);
      pane.closePath();
      const window=add(new THREE.ShapeGeometry(pane),glass,g,[x,0,z+zz]);
      window.name='Greenhouse arched window';
      window.castShadow=false;
    }
  }
  for(const side of [-1,1]){const p=add(new THREE.PlaneGeometry(.77,1.16),glass,g,[x+side*1.2,y+.78,z+1.39]);p.rotation.y=Math.PI;const p2=add(new THREE.PlaneGeometry(.77,1.16),glass,g,[x+side*1.2,y+.78,z-1.39]);p2.rotation.y=Math.PI}
  beam(g,[x,roofY(0)+.04,z-1.45],[x,roofY(0)+.04,z+1.45],.055,copper);
  // A tropical collection and a dryland collection share the greenhouse aisle.
  for(const side of [-1,1]){
    const box=add(new THREE.BoxGeometry(.52,.19,2.12),wood,g,[x+side*.91,y+.37,z]);
    box.userData.nonBlockingDecoration=true;
    const bed=add(new THREE.BoxGeometry(.48,.04,2.06),soil,g,[x+side*.91,y+.49,z]);
    bed.userData.navSurface='greenhouse_planter';
    addBotanicalDisplay(g,x+side*.91,y+.51,z,side);
  }
  function supportAt(x,z){
    supportRay.set(new THREE.Vector3(x,5,z),down);
    return supportRay.intersectObjects(terraces,false)[0]?.point.y??supportGround(x,z);
  }
  addGreenhouseAccess(g,walkables,supportGround,supportAt);
  // The west landing is part of the raised walk. The east connection sits on the meadow.
  const bx=-5.56,bz=1.45,by=ground(bx,bz)+.16;
  const pad=add(new THREE.BoxGeometry(1.12,.14,1.03),light,g,[bx,by,bz]);
  pad.userData.navSurface='bridge_landing';
  walkables.push(pad);
  for(const side of [-1,1]){
    const dz=side*.43;
    beam(g,[bx,by+.05,bz+dz],[bx,by+.53,bz+dz],.04,copper);
  }
  return {group:g}
}
