import * as THREE from '../../three.module.min.js';
import {palette,mat,mesh,sphere,cylinderBetween,curveRibbon,groundHeight} from './common.js';

export const pavilion={x:-1.38,z:.55,y:.73,r:1.38};
export const rampPoints=[[-4.65,groundHeight(-4.65,-1.92)+.12,-1.92],[-4.05,.38,-1.75],[-3.48,.47,-1.32],[-2.8,.56,-.95],[-2.25,.65,-.55],[-1.9,.71,-.05],[-1.63,.73,.32]];
export function createArchitecture(scene){
  const g=new THREE.Group();g.name='Pavilion and circulation';scene.add(g);
  const ivory=mat(palette.ivory),warm=mat(0xf5e8d1),trim=mat(0xdfbc9c),pink=mat(0xf3c3c0),dark=mat(0x8c9584);
  // Rounded raised terrace, with a continuous fascia and a low rim.
  const terrace=mesh(new THREE.CylinderGeometry(1.56,1.62,.24,64),warm,g,[pavilion.x,pavilion.y-.11,pavilion.z]);
  const pavilionFloor=mesh(new THREE.CylinderGeometry(1.49,1.49,.035,64),ivory,g,[pavilion.x,pavilion.y+.025,pavilion.z]);
  const ring=mesh(new THREE.TorusGeometry(1.49,.032,8,64),trim,g,[pavilion.x,pavilion.y+.045,pavilion.z]);ring.rotation.x=Math.PI/2;ring.userData.walkableTrim=true;
  for(let i=0;i<9;i++){const a=i*2*Math.PI/9;const x=pavilion.x+Math.cos(a)*1.43,z=pavilion.z+Math.sin(a)*1.43;sphere(x,pavilion.y-.34,z,.15,.24,.15,warm,g,10)}
  // A light umbrella with five gently arched shell panels and an open central oculus.
  const centerY=2.83,outerY=2.49,rad=1.71,inner=.31,petals=5;
  for(let p=0;p<petals;p++){
    const pos=[],idx=[],steps=16,rings=9;
    for(let j=0;j<=rings;j++){const t=j/rings,r=inner+(rad-inner)*t;for(let i=0;i<=steps;i++){const a=(p+i/steps)*2*Math.PI/petals;const ripple=.04*Math.sin(i/steps*Math.PI);const y=centerY+(outerY-centerY)*t+.21*Math.sin(t*Math.PI)+ripple;pos.push(pavilion.x+Math.cos(a)*r,y,pavilion.z+Math.sin(a)*r)}}
    for(let j=0;j<rings;j++)for(let i=0;i<steps;i++){const a=j*(steps+1)+i,b=a+steps+1;idx.push(a,b,a+1,b,b+1,a+1)}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(geo,mat(p%2?0xffefe0:0xfff7ec,.83,{side:THREE.DoubleSide}),g);
    const a=p*2*Math.PI/petals;const e=[pavilion.x+Math.cos(a)*rad,outerY,pavilion.z+Math.sin(a)*rad];cylinderBetween([pavilion.x+Math.cos(a)*.32,centerY,pavilion.z+Math.sin(a)*.32],e,.026,trim,g,7);
  }
  const oculus=mesh(new THREE.TorusGeometry(.3,.055,10,48),trim,g,[pavilion.x,centerY+.015,pavilion.z]);oculus.rotation.x=Math.PI/2;
  sphere(pavilion.x,centerY-.08,pavilion.z,.19,.08,.19,mat(0xffd5ae),g,20);
  for(let i=0;i<6;i++){const a=(i+.45)*2*Math.PI/6;const x=pavilion.x+Math.cos(a)*1.29,z=pavilion.z+Math.sin(a)*1.29;cylinderBetween([x,pavilion.y+.03,z],[x,2.43,z],.057,ivory,g,12);sphere(x,2.43,z,.095,.095,.095,trim,g,12)}
  // Curved benches follow the circular plan and leave two clear entries.
  for(const [start,end] of [[.05,1.16],[2.06,3.23],[4.13,5.31]]){
    const pts=[];for(let i=0;i<=22;i++){const a=start+(end-start)*i/22;pts.push([pavilion.x+Math.cos(a)*.91,pavilion.y+.41,pavilion.z+Math.sin(a)*.91])}
    curveRibbon(pts,.38,warm,g,{segments:44,lift:0});
    for(const a of [start+.12,end-.12]){const x=pavilion.x+Math.cos(a)*.91,z=pavilion.z+Math.sin(a)*.91;cylinderBetween([x,pavilion.y+.07,z],[x,pavilion.y+.4,z],.065,trim,g,8)}
  }
  const ramp=curveRibbon(rampPoints,1.02,ivory,g,{segments:70,lift:.045});
  // Side ribbon and modest posts make the accessible route readable at island scale.
  for(const side of [-1,1]){
    const edge=[];for(let i=0;i<=40;i++){const t=i/40,p=ramp.userData.curve.getPoint(t),d=ramp.userData.curve.getTangent(t),n=new THREE.Vector3(-d.z,0,d.x).normalize();edge.push([p.x+n.x*.51*side,p.y+.09,p.z+n.z*.51*side])}
    curveRibbon(edge,.055,trim,g,{segments:40,lift:0});
  }
  // Short stair approach from the north garden.
  const stairStart=new THREE.Vector2(-2.85,2.85),stairEnd=new THREE.Vector2(-2.11,1.64);
  const stairCount=8;
  const stairDepth=stairStart.distanceTo(stairEnd)/stairCount;
  const stairRotation=Math.atan2(stairStart.x-stairEnd.x,stairStart.y-stairEnd.y);
  const stairGround=groundHeight(stairStart.x,stairStart.y);
  const stepMeshes=[];
  for(let i=0;i<stairCount;i++){
    const {x,y:z}=stairStart.clone().lerp(stairEnd,(i+.5)/stairCount);
    const top=THREE.MathUtils.lerp(stairGround,pavilion.y+.0425,(i+1)/stairCount);
    const bottom=Math.min(stairGround,groundHeight(x,z))-.06;
    const step=mesh(new THREE.BoxGeometry(.98,top-bottom,stairDepth+.012),ivory,g,[x,(top+bottom)/2,z]);
    step.rotation.y=stairRotation;
    stepMeshes.push(step);
  }
  // Two intentional bridge thresholds, open for later island connections.
  const thresholds=[[-4.6,-.16,-Math.PI/2],[4.45,1.25,Math.PI/2]];
  const landingMeshes=[];
  for(const [x,z,a] of thresholds){const y=groundHeight(x,z)+.04;const deck=mesh(new THREE.BoxGeometry(1.18,.14,1.12),warm,g,[x,y,z]);deck.rotation.y=a;landingMeshes.push(deck);for(const side of [-1,1]){const bx=x+Math.sin(a)*.46*side,bz=z+Math.cos(a)*.46*side;cylinderBetween([bx,y+.1,bz],[bx,y+.55,bz],.048,trim,g,10);sphere(bx,y+.57,bz,.09,.09,.09,pink,g,12)}}
  return {group:g,ramp:ramp.userData.curve,walkables:[pavilionFloor,ramp,...stepMeshes,...landingMeshes,terrace],stairs:stepMeshes,landings:landingMeshes,terrace};
}
