import * as THREE from '../../three.module.min.js';
export const P={mint:0xb9dfad,mintLight:0xd5edbe,mintDark:0x8fc9a0,rock:0xc3baa5,rockDark:0x8e9589,cream:0xfff2d5,yellow:0xffd77b,coral:0xf3a08f,sky:0x9bd5e6,lavender:0xcab9e9,timber:0xb5866b,metal:0x9faaa8,sand:0xf3dfb5,water:0x9fdfdf};
export const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.86,...extra});
export const boundary=a=>.76+.29*Math.max(0,Math.cos(4*a-.48))**2+.052*Math.sin(4*a+.7)+.035*Math.sin(9*a+.4);
export function edge(a,s=1){const r=boundary(a)*s;return [Math.cos(a)*6.55*r,Math.sin(a)*5.22*r]}
export function height(x,z){const hill=(hx,hz,h,w)=>h*Math.exp(-((x-hx)**2+(z-hz)**2)/w);return .08+.04*Math.sin(x*.9+z*.5)+hill(3.9,.8,.18,5)+hill(-3.5,1.9,.22,5)+hill(-3.3,-2.4,.13,4)+hill(2.5,-2.8,.16,5)}
export function inside(x,z,m=.25){const a=Math.atan2(z/5.22,x/6.55);return Math.hypot(x/6.55,z/5.22)<boundary(a)-m/6}
export function mesh(geo,material,parent,pos){const o=new THREE.Mesh(geo,material);if(pos)o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
export function beam(parent,a,b,r,material,n=8){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p),o=mesh(new THREE.CylinderGeometry(r,r,d.length(),n),material,parent);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o}
export function sphere(parent,pos,size,material,seg=14){const o=mesh(new THREE.SphereGeometry(1,seg,Math.max(8,seg-2)),material,parent,pos);o.scale.set(...size);return o}
export function strip(parent,points,width,material,segments=54){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal'),v=[],ix=[];for(let i=0;i<=segments;i++){const p=curve.getPoint(i/segments),t=curve.getTangent(i/segments),n=new THREE.Vector3(-t.z,0,t.x).normalize();for(const s of [-1,1])v.push(p.x+n.x*width*s/2,p.y+.035,p.z+n.z*width*s/2);if(i<segments){const k=i*2;ix.push(k,k+1,k+2,k+1,k+3,k+2)}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();const o=mesh(g,material,parent);o.userData.curve=curve;return o}
export function rng(seed){let s=seed>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296)}
