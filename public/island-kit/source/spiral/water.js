import * as THREE from '../../three.module.min.js';
import {palette,mat,mesh,cylinderBetween,groundHeight} from './common.js';

export const pond={x:2.48,z:-.82,rx:1.75,rz:1.36};
export const waterSurfaceY=.13;
export function inPond(x,z,pad=0){const dx=(x-pond.x)/(pond.rx+pad),dz=(z-pond.z)/(pond.rz+pad);return dx*dx+dz*dz<1}
function edge(a,scale=1){const r=1+.085*Math.sin(3*a+.5)+.04*Math.cos(7*a);return [pond.x+Math.cos(a)*pond.rx*r*scale,pond.z+Math.sin(a)*pond.rz*r*scale]}
export function pondRadius(x,z){
  const dx=(x-pond.x)/pond.rx,dz=(z-pond.z)/pond.rz,a=Math.atan2(dz,dx);
  return Math.hypot(dx,dz)/(1+.085*Math.sin(3*a+.5)+.04*Math.cos(7*a));
}
export const pondSandStrength=(x,z)=>1-THREE.MathUtils.smoothstep(pondRadius(x,z),1.18,1.34);
export function pondTerrainHeight(x,z){
  const r=pondRadius(x,z);
  if(r<=1.03)return .105;
  if(r<=1.25)return THREE.MathUtils.lerp(.105,.165,THREE.MathUtils.smoothstep(r,1.03,1.25));
  return THREE.MathUtils.lerp(.165,groundHeight(x,z),THREE.MathUtils.smoothstep(r,1.25,1.55));
}
export function createWater(scene){
  const g=new THREE.Group();g.name='Recessed pond, dock and boat';scene.add(g);
  const water=mat(palette.water,.18,{transparent:true,opacity:.86,metalness:.05,side:THREE.DoubleSide,depthWrite:false});
  // The terrain mesh forms the sand basin and shallow bank, with no overlay seam.
  const waterY=waterSurfaceY;
  const shape=new THREE.Shape();for(let i=0;i<=64;i++){const [x,z]=edge(i*2*Math.PI/64,1.035);i===0?shape.moveTo(x,-z):shape.lineTo(x,-z)}
  const wg=new THREE.ShapeGeometry(shape,64);wg.rotateX(-Math.PI/2);
  mesh(wg,water,g,[0,waterY,0]).userData.isWater=true;
  // Timber dock: a slender pier, individual planks and paired mooring posts.
  const wood=mat(palette.wood),plank=mat(0xd7a77f);
  const dock=mesh(new THREE.BoxGeometry(.83,.14,1.63),wood,g,[3.45,.3,-2.35]);dock.rotation.y=-.28;
  const dockPlanks=[];
  for(let i=0;i<7;i++){const z=-3.06+i*.235,x=3.45+(z+2.35)*-.28;const o=mesh(new THREE.BoxGeometry(.79,.055,.19),i%2?wood:plank,g,[x,.39,z]);o.rotation.y=-.28;dockPlanks.push(o)}
  const dockAngle=-.28;
  for(const localX of [-.36,.36])for(const localZ of [-.73,.73]){
    const x=3.45+localX*Math.cos(dockAngle)+localZ*Math.sin(dockAngle);
    const z=-2.35-localX*Math.sin(dockAngle)+localZ*Math.cos(dockAngle);
    cylinderBetween([x,.03,z],[x,.67,z],.065,wood,g,8);
  }
  // Curved shell hull and two seats, resting on the pond surface.
  const boat=new THREE.Group(),boatBaseY=waterY+.085;boat.position.set(2.39,boatBaseY,-1.07);boat.rotation.y=-.57;g.add(boat);
  const hullPos=[],hullIdx=[];for(let j=0;j<=5;j++){const t=j/5,y=-.10+t*.39,w=.3+.24*t;for(let i=0;i<=16;i++){const a=i*Math.PI*2/16;const x=Math.cos(a)*.68*(.9+.1*t),z=Math.sin(a)*w*(.75+.25*Math.abs(Math.cos(a)));hullPos.push(x,y,z)}}for(let j=0;j<5;j++)for(let i=0;i<16;i++){const a=j*17+i,b=a+17;hullIdx.push(a,b,a+1,b,b+1,a+1)}
  const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.Float32BufferAttribute(hullPos,3));hg.setIndex(hullIdx);hg.computeVertexNormals();mesh(hg,mat(0xe6b68e,.72,{side:THREE.DoubleSide}),boat);
  const floorShape=new THREE.Shape();floorShape.moveTo(-.58,-.18);floorShape.lineTo(-.66,0);floorShape.lineTo(-.58,.18);floorShape.lineTo(.58,.18);floorShape.lineTo(.66,0);floorShape.lineTo(.58,-.18);floorShape.closePath();
  const floorGeometry=new THREE.ShapeGeometry(floorShape);floorGeometry.rotateX(-Math.PI/2);mesh(floorGeometry,mat(0xd5a67d,.85,{side:THREE.DoubleSide}),boat,[0,.085,0]);
  for(const x of [-.25,.24])mesh(new THREE.BoxGeometry(.075,.035,.55),wood,boat,[x,.24,0]);
  cylinderBetween([-.15,.22,-.04],[.33,.44,-.67],.027,wood,boat,8);
  return {group:g,walkables:[dock,...dockPlanks],update(t){boat.position.y=boatBaseY+.018*Math.sin(t*1.35);boat.rotation.z=.014*Math.sin(t*1.35+.55);boat.rotation.x=.01*Math.sin(t*1.02)}};
}
