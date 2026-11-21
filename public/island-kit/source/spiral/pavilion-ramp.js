import * as THREE from '../../three.module.min.js';
import {mat,mesh,cylinderBetween,curveRibbon} from './common.js';

export const rampEntryAngle=3.89;
export const rampWidth=1.02;
export const pavilionFloorRadius=1.49;

export function createPavilionRamp(group,terrain,pavilion,ivory,trim){
  const {x,y,z}=pavilion;
  const floorY=y+.0425,thickness=.125,halfWidth=rampWidth*.5;
  const origin=new THREE.Vector3(x,floorY,z);
  const outward=new THREE.Vector3(Math.cos(rampEntryAngle),0,Math.sin(rampEntryAngle));
  const lateral=new THREE.Vector3(outward.z,0,-outward.x);
  const rim=Array.from({length:64},(_,i)=>{
    const a=i*2*Math.PI/64;
    return new THREE.Vector3(Math.cos(a)*pavilionFloorRadius,0,Math.sin(a)*pavilionFloorRadius);
  });
  const offsets=Array.from({length:9},(_,i)=>-halfWidth+i*rampWidth/8);
  for(const p of rim){
    const u=p.dot(lateral);
    if(p.dot(outward)>1&&Math.abs(u)<halfWidth)offsets.push(u);
  }
  offsets.sort((a,b)=>a-b);
  function rimRadius(u){
    for(const [i,a] of rim.entries()){
      const b=rim[(i+1)%rim.length],ua=a.dot(lateral),ub=b.dot(lateral);
      if((ua<=u)===(ub<=u))continue;
      const r=THREE.MathUtils.lerp(a.dot(outward),b.dot(outward),(u-ua)/(ub-ua));
      if(r>0)return r;
    }
    throw new Error('Ramp exceeds pavilion rim');
  }
  const endRadius=rimRadius(0);
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  function groundAt(px,pz){
    ray.set(new THREE.Vector3(px,6,pz),down);
    const hit=ray.intersectObject(terrain,false)[0];
    if(!hit)throw new Error('Pavilion ramp extends beyond the terrain');
    return hit.point.y;
  }

  const toe=new THREE.Vector3(-5.17,0,-2.33);
  const end=origin.clone().addScaledVector(outward,endRadius);
  const line=new THREE.CatmullRomCurve3([
    toe,new THREE.Vector3(-4.49,0,-2.05),new THREE.Vector3(-3.75,0,-1.60),
    origin.clone().addScaledVector(outward,endRadius+.72).setY(0),end.clone().setY(0)
  ],false,'centripetal');
  const toeY=groundAt(toe.x,toe.z),steps=64,rows=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps,point=line.getPointAt(t);
    const tangent=line.getTangentAt(t), cross=new THREE.Vector3(-tangent.z,0,tangent.x);
    const endBlend=THREE.MathUtils.smoothstep(t,.79,1);
    cross.lerp(lateral,endBlend).normalize();
    const y=THREE.MathUtils.lerp(toeY,floorY,t+.12*t*(1-t));
    const row=offsets.map(u=>{
      const p=point.clone().addScaledVector(cross,u);
      p.addScaledVector(outward,(rimRadius(u)-endRadius)*endBlend);
      const startBlend=1-THREE.MathUtils.smoothstep(t,0,.16);
      p.y=y;
      if(startBlend>0){
        const bank=groundAt(p.x,p.z);
        // Sink the threshold slightly into the existing ground across its full width.
        p.y=THREE.MathUtils.lerp(y,bank+Math.max(0,y-toeY)-.014,startBlend);
      }
      return p;
    });
    rows.push(row);
  }

  const positions=[],geometry=new THREE.BufferGeometry();
  const base=p=>p.clone().add(new THREE.Vector3(0,-thickness,0));
  function quad(a,b,c,d){
    for(const p of [a,b,c,a,c,d])positions.push(p.x,p.y,p.z);
  }
  for(let i=0;i<steps;i++){
    const a=rows[i],b=rows[i+1],last=offsets.length-1;
    for(let j=0;j<last;j++)quad(a[j],a[j+1],b[j+1],b[j]);
  }
  const topCount=positions.length/3;
  for(let i=0;i<steps;i++){
    const a=rows[i],b=rows[i+1],last=offsets.length-1;
    quad(a[0],b[0],base(b[0]),base(a[0]));
    quad(b[last],a[last],base(a[last]),base(b[last]));
    for(let j=0;j<last;j++)quad(base(a[j+1]),base(a[j]),base(b[j]),base(b[j+1]));
  }
  for(const [row,reversed] of [[rows[0],false],[rows.at(-1),true]]){
    for(let j=0;j<row.length-1;j++){
      const a=row[j],b=row[j+1];
      if(reversed)quad(b,a,base(a),base(b));
      else quad(a,b,base(b),base(a));
    }
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.addGroup(0,topCount,0);
  geometry.addGroup(topCount,positions.length/3-topCount,1);
  geometry.computeVertexNormals();
  const ramp=mesh(geometry,[ivory,mat(0xe3cdb3,.92,{side:THREE.DoubleSide})],group);

  for(const index of [0,offsets.length-1]){
    const upperEdge=rows.slice(4,-3).map(row=>{
      const p=row[index],neighbor=row[index===0?1:index-1];
      const q=p.clone().lerp(neighbor,.32);
      return [q.x,q.y+.019,q.z];
    });
    const border=curveRibbon(upperEdge,.043,trim,group,{segments:60,lift:0});
    border.userData.walkableTrim=true;
  }
  for(const index of [18,32,46,55]){
    const row=rows[index];
    for(const side of [.19,.81]){
      const p=row[0].clone().lerp(row.at(-1),side),foot=groundAt(p.x,p.z);
      if(p.y-thickness>foot+.085){
        const post=cylinderBetween([p.x,foot-.036,p.z],[p.x,p.y-thickness+.013,p.z],.041,trim,group,10);
        post.name='Pavilion ramp support';
      }
    }
  }
  return ramp;
}
