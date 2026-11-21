import * as THREE from '../../three.module.min.js';
import {P,mat,mesh} from './common.js';
export const pools=[{x:1.26,z:-3.14,rx:.88,rz:.58},{x:-3.75,z:-.67,rx:.58,rz:.46}];
export function inWater(x,z,pad=.03){return pools.some(p=>poolRadius(p,x,z)<1.09+pad/Math.min(p.rx,p.rz))}
// Both the pond mesh and its basin use the same irregular boundary.
export function poolRadius(p,x,z){const dx=(x-p.x)/p.rx,dz=(z-p.z)/p.rz,a=Math.atan2(dz,dx);return Math.hypot(dx,dz)/(1+.065*Math.sin(5*a+.5))}
// Set each waterline below the lowest natural meadow height along its shore.
export function waterLevel(p){return p.x>0?.095:.18}
export function createWater(scene){
  const g=new THREE.Group();g.name='Shallow playful pools';scene.add(g);
  const water=mat(P.water,{roughness:.13,metalness:.03,transparent:true,opacity:.91,side:THREE.DoubleSide,depthWrite:false});
  for(const p of pools){
    const N=96,v=[p.x,waterLevel(p),p.z],ix=[];
    for(let i=0;i<N;i++){
      const a=i*2*Math.PI/N,r=1.2*(1+.065*Math.sin(5*a+.5));
      v.push(p.x+Math.cos(a)*p.rx*r,waterLevel(p),p.z+Math.sin(a)*p.rz*r);
      ix.push(0,i+1,(i+1)%N+1);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setIndex(ix);geo.computeVertexNormals();
    mesh(geo,water,g).userData.isWater=true;
    if(p.x>0){
      // A small, grounded pebble trail makes the shallow pond a place to play.
      const stones=[[-.47,-.12,.16,P.cream],[-.16,.12,.14,P.yellow],[.17,-.05,.15,P.coral],[.46,.1,.13,P.lavender]];
      for(const [dx,dz,r,color] of stones){
        const stone=mesh(new THREE.CylinderGeometry(r*.96,r*1.1,.11,16),mat(color,{roughness:.92}),g,[p.x+dx,waterLevel(p)-.018,p.z+dz]);
        stone.rotation.y=(dx+dz)*.8;
      }
    }
  }
  return g;
}
