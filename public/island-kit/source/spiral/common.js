import * as THREE from '../../three.module.min.js';

export const palette={grass:0xbfdc7c,grassLight:0xd2e693,grassDark:0xa4cb72,rock:0xbab3a1,rockLight:0xd2cabb,rockDark:0x938f81,ivory:0xfff7e7,sand:0xf4dfb2,pink:0xf4a8bb,pinkLight:0xffc9d2,leaf:0x83bd79,leafLight:0xaed88e,water:0x9edbd8,wood:0xbb8a69};
export const mat=(color,roughness=1,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
export const groundHeight=(x,z)=>.09+.17*Math.exp(-((x+1.4)**2+(z-.5)**2)/7)+.08*Math.sin(x*1.25+z*.45)+.045*Math.cos(z*2.1-x*.5);
export function islandRadius(a){return 1+.065*Math.sin(3*a+.4)+.045*Math.sin(5*a-1.1)+.028*Math.cos(9*a+.3)}
export function islandPoint(a,scale=1){const r=islandRadius(a)*scale;return new THREE.Vector2(Math.cos(a)*6.2*r,Math.sin(a)*4.75*r)}
export function islandPolygonPoint(a,scale=1){
  const u=((a/(2*Math.PI)*24)%24+24)%24,sector=Math.floor(u),t=u-sector;
  const p0=islandPoint(sector*2*Math.PI/24),p1=islandPoint((sector+1)*2*Math.PI/24);
  return new THREE.Vector2(THREE.MathUtils.lerp(p0.x,p1.x,t)*scale,THREE.MathUtils.lerp(p0.y,p1.y,t)*scale);
}
export function insideIsland(x,z,margin=.2){const a=Math.atan2(z/4.75,x/6.2);const r=Math.hypot(x/6.2,z/4.75);return r<islandRadius(a)-margin/6}
export function mesh(geometry,material,parent,position){const o=new THREE.Mesh(geometry,material);if(position)o.position.set(...position);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
export function cylinderBetween(a,b,r,material,parent,segments=10){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va);const o=mesh(new THREE.CylinderGeometry(r,r,d.length(),segments),material,parent);o.position.copy(va.add(vb).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o}
export function sphere(x,y,z,sx,sy,sz,material,parent,segments=12){const o=mesh(new THREE.SphereGeometry(1,segments,Math.max(8,segments/2)),material,parent,[x,y,z]);o.scale.set(sx,sy,sz);return o}
export function curveRibbon(points,width,material,parent,{lift=.04,segments=60,sideHeight=0}={}){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');const verts=[],uv=[],indices=[];for(let i=0;i<=segments;i++){const t=i/segments,p=curve.getPoint(t),d=curve.getTangent(t),n=new THREE.Vector3(-d.z,0,d.x).normalize();for(const s of [-1,1]){verts.push(p.x+n.x*width*s/2,p.y+lift,p.z+n.z*width*s/2);uv.push(t,s)}if(i<segments){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2)}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const o=mesh(geo,material,parent);o.userData.curve=curve;o.userData.width=width;return o}
export function seeded(seed){let s=seed>>>0;return()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296}}
