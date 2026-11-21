import * as THREE from '../../three.module.min.js';
export const C={grass:0xb4d86e,grassLight:0xd0e595,grassDark:0x93bb64,moss:0x719966,rock:0xb8ad91,rockDark:0x827f6e,terracotta:0xc4896e,timber:0xa87852,timberLight:0xd1a479,copper:0x9b8067,water:0x7dd4cf,glass:0xbdece0,cream:0xf6ead4,soil:0xa17b5e,flower:0xf3b7a6};
export const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.9,...extra});
export const ground=(x,z)=>.07+.07*Math.sin(x*.9+z*.6)+.05*Math.cos(z*1.6-x*.3);
export const boundary=a=>1+.085*Math.sin(3*a-.4)+.065*Math.sin(6*a+1.5)+.027*Math.cos(11*a);
export function perimeter(a,s=1){const r=boundary(a)*s;return [Math.cos(a)*6.2*r+.18*Math.sin(a*2),Math.sin(a)*4.58*r]}
export function inside(x,z,margin=.25){const a=Math.atan2(z/4.58,x/6.2),r=Math.hypot(x/6.2,z/4.58);return r<boundary(a)-margin/6}
export function add(geo,mat,parent,pos){const o=new THREE.Mesh(geo,mat);if(pos)o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
export function ball(parent,pos,scale,mat,detail=1){const o=add(new THREE.IcosahedronGeometry(1,detail),mat,parent,pos);o.scale.set(...scale);return o}
export function smoothBall(parent,pos,scale,mat){const o=add(new THREE.SphereGeometry(1,16,12),mat,parent,pos);o.scale.set(...scale);return o}
export function beam(parent,a,b,r,mat,n=8){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);const o=add(new THREE.CylinderGeometry(r,r,d.length(),n),mat,parent);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o}
export function ribbon(parent,points,width,mat,{segments=48,lift=.025}={}){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal'),v=[],ix=[];for(let i=0;i<=segments;i++){const t=i/segments,p=curve.getPoint(t),d=curve.getTangent(t),n=new THREE.Vector3(-d.z,0,d.x).normalize();for(const s of [-1,1])v.push(p.x+n.x*width*s/2,p.y+lift,p.z+n.z*width*s/2);if(i<segments){const k=i*2;ix.push(k,k+1,k+2,k+1,k+3,k+2)}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();const o=add(g,mat,parent);o.userData.curve=curve;o.userData.width=width;return o}
export function seeded(seed){let s=seed>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296)}
