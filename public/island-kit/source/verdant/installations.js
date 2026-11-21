import * as THREE from '../../three.module.min.js';
import {C,material,add,beam,ball,ground} from './common.js';
import {waterGroundHeight} from './water.js';
export function createInstallations(scene,walkables){const g=new THREE.Group();g.name='Rain harvest, waterwheel and wind mechanisms';scene.add(g);const wood=material(C.timber),copper=material(C.copper,{metalness:.35,roughness:.52}),light=material(C.timberLight),glass=material(0xb8d3b3,{roughness:.75,side:THREE.DoubleSide});
  // Pavilion: six tilted collector leaves feed a copper hub and a visible cistern.
  const x=3.72,z=1.7,y=.36;const deck=add(new THREE.CylinderGeometry(1.02,1.07,.16,20),light,g,[x,y,z]);walkables.push(deck);for(let i=0;i<6;i++){const a=i*Math.PI/3;beam(g,[x+Math.cos(a)*.78,y+.08,z+Math.sin(a)*.78],[x+Math.cos(a)*.78,y+1.78,z+Math.sin(a)*.78],.047,wood,9)}
  const canopyV=[],canopyI=[];for(let i=0;i<6;i++){const a=i*Math.PI/3,b=(i+1)*Math.PI/3,k=canopyV.length/3;canopyV.push(x,y+1.42,z,x+Math.cos(a)*1.08,y+1.91,z+Math.sin(a)*1.08,x+Math.cos(b)*1.08,y+1.91,z+Math.sin(b)*1.08);canopyI.push(k,k+1,k+2);beam(g,[x,y+1.42,z],[x+Math.cos(a)*1.08,y+1.91,z+Math.sin(a)*1.08],.027,copper,7)}const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(canopyV,3));cg.setIndex(canopyI);cg.computeVertexNormals();add(cg,glass,g);const rim=add(new THREE.TorusGeometry(1.08,.034,7,48),copper,g,[x,y+1.91,z]);rim.rotation.x=Math.PI/2;
  const cistern=add(new THREE.CylinderGeometry(.3,.34,.61,20),material(C.terracotta),g,[x,y+.47,z]);const band=add(new THREE.TorusGeometry(.32,.025,7,24),copper,g,[x,y+.7,z]);band.rotation.x=Math.PI/2;beam(g,[x,y+1.4,z],[x,y+.78,z],.045,copper,9);
  // The connected water mesh and sandy terrain form the collector's ground channel.
  // Waterwheel stands in the pond outflow: rim, radial spokes and broad paddles rotate together.
  const wheelX=-3.65,wheelZ=-1.5,wheelY=.76;
  const wheel=new THREE.Group();wheel.position.set(wheelX,wheelY,wheelZ);g.add(wheel);
  for(const zz of [-.24,.24]){
    add(new THREE.TorusGeometry(.62,.055,8,32),wood,wheel,[0,0,zz]);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;beam(wheel,[0,0,zz],[Math.cos(a)*.6,Math.sin(a)*.6,zz],.025,light,6)}
  }
  for(let i=0;i<12;i++){const a=i*Math.PI/6,p=add(new THREE.BoxGeometry(.26,.075,.57),wood,wheel,[Math.cos(a)*.62,Math.sin(a)*.62,0]);p.rotation.z=a+Math.PI/2}
  beam(g,[wheelX,wheelY,wheelZ-.53],[wheelX,wheelY,wheelZ+.53],.075,copper,10);
  for(const zz of [wheelZ-.52,wheelZ+.52])beam(g,[wheelX,waterGroundHeight(wheelX,zz)-.025,zz],[wheelX,wheelY,zz],.055,wood);
  // A pair of small three-blade wind indicators sit in the cultivated zone.
  const rotors=[];for(const [wx,wz,h] of [[4.98,.2,1.7],[1.55,3.74,1.38]]){const gy=ground(wx,wz);beam(g,[wx,gy,wz],[wx,gy+h,wz],.04,copper,8);const rotor=new THREE.Group();rotor.position.set(wx,gy+h,wz);g.add(rotor);for(let i=0;i<3;i++){const a=i*2*Math.PI/3;const blade=add(new THREE.BoxGeometry(.1,.53,.025),material(C.cream,{side:THREE.DoubleSide}),rotor,[Math.sin(a)*.37,Math.cos(a)*.37,0]);blade.rotation.z=-a}ball(rotor,[0,0,.02],[.1,.1,.1],copper,1);rotors.push(rotor)}
  return {group:g,update(dt){wheel.rotation.z-=dt*.38;for(const r of rotors)r.rotation.z+=dt*.42}}
}
