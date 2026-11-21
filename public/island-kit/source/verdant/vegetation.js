import * as THREE from '../../three.module.min.js';
import {C,material,add,ball,smoothBall,beam,inside,seeded} from './common.js';
import {inWater} from './water.js';

export const trunks=[];
const random=seeded(2707);

export function createVegetation(scene,surface){
  const g=new THREE.Group();g.name='Willow grove, fern banks and cultivated beds';scene.add(g);
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  function groundAt(x,z){ray.set(new THREE.Vector3(x,10,z),down);const hit=ray.intersectObject(surface,false)[0];return hit?hit.point.y:null}
  function anchoredRoot(x,z){for(let i=0;i<=30;i++){const f=1-i*.018,px=x*f,pz=z*f,y=groundAt(px,pz);if(y!==null&&inside(px,pz,.38))return [px,pz,y]}return null}
  const bark=material(0x8d7862),willow=[material(0x8db577),material(0xa6cc83),material(0x79a86d)],fern=material(0x719e65,{side:THREE.DoubleSide}),moss=material(C.moss),flower=[material(0xf3b4a8),material(0xffd39e),material(0xe6c5cf)];

  function willowTree(x,z,s){
    const root=anchoredRoot(x,z);if(!root)return;[x,z]=root;
    const y=root[2],h=1.05+1.42*s;trunks.push({x,z,r:.12*s});
    beam(g,[x,y-.015,z],[x-.06*s,y+h,z+.03*s],.095*s,bark,9);
    for(let j=0;j<7;j++){
      const a=j*2*Math.PI/7+.3,rx=Math.cos(a),rz=Math.sin(a),e=[x+rx*.66*s,y+h+.2*s,z+rz*.57*s];
      beam(g,[x,y+h*.75,z],e,.042*s,bark,7);
      smoothBall(g,[e[0],e[1]+.02*s,e[2]],[.42*s,.31*s,.38*s],willow[j%3]);
      for(let k=0;k<3;k++){
        const da=(k-1)*.18,px=e[0]+rx*da*s,pz=e[2]+rz*da*s;
        const curve=new THREE.CatmullRomCurve3([
          new THREE.Vector3(px,e[1],pz),
          new THREE.Vector3(px+rx*.12*s,e[1]-.24*s,pz+rz*.1*s),
          new THREE.Vector3(px+rx*.18*s,e[1]-.62*s,pz+rz*.15*s)
        ]);
        add(new THREE.TubeGeometry(curve,7,.012*s,4,false),willow[(j+k+3)%3],g);
      }
    }
    smoothBall(g,[x,y+h+.23*s,z],[.58*s,.28*s,.5*s],willow[1]);
  }
  for(const t of [[-4.69,2.3,1.06],[-3.1,3.16,.86],[-1.48,3.04,.82],[4.8,3.06,.88],[5.1,-3.08,.75]])willowTree(...t);

  function fernClump(x,z,s){
    const y=groundAt(x,z);if(y===null)return;
    const v=[],ix=[];
    const tri=(a,b,c)=>{const k=v.length/3;v.push(...a,...b,...c);ix.push(k,k+1,k+2)};
    for(let j=0;j<6;j++){
      const a=j*Math.PI/3+.2,dx=Math.cos(a),dz=Math.sin(a),L=.39*s;
      for(let k=0;k<5;k++){
        const t=k/5,u=(k+1)/5,py=q=>y-.012*s+.24*s*Math.sin(q*Math.PI*.86);
        const p=[x+dx*L*t,py(t),z+dz*L*t],q=[x+dx*L*u,py(u),z+dz*L*u],side=[-dz*.012*s,0,dx*.012*s];
        tri([p[0]+side[0],p[1],p[2]+side[2]],[p[0]-side[0],p[1],p[2]-side[2]],q);
        if(k===0)continue;
        for(const sign of [-1,1]){
          const root=[p[0],p[1],p[2]],mid=[p[0]-dz*sign*.075*s,p[1]+.025*s,p[2]+dx*sign*.075*s],tip=[p[0]+dx*.035*s-dz*sign*.15*s,p[1]-.035*s,p[2]+dz*.035*s+dx*sign*.15*s];
          tri(root,mid,tip);
        }
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setIndex(ix);geo.computeVertexNormals();add(geo,fern,g);
  }
  for(const zone of [[-3.4,-2.7,1.4,.7,24],[1.9,-3.19,2.3,.42,22],[3.72,-1.08,1.2,.6,15]]){
    const [cx,cz,rx,rz,n]=zone;
    for(let i=0;i<n;i++){
      const x=cx+(random()-.5)*2*rx,z=cz+(random()-.5)*2*rz;
      if(inside(x,z,.45)&&!inWater(x,z,.08)&&groundAt(x,z)!==null)fernClump(x,z,.65+random()*.55);
    }
  }

  for(let i=0;i<75;i++){
    const x=-5.25+random()*10.4,z=2.28+random()*1.75;
    if(!inside(x,z,.44)||trunks.some(t=>Math.hypot(x-t.x,z-t.z)<.6)||x>2.7&&x<4.7)continue;
    const y=groundAt(x,z);if(y===null)continue;const r=.09+random()*.16;
    ball(g,[x,y+.09,z],[r,.12,r*.9],i%3?moss:material(C.grassDark),1);
  }

  const soil=material(C.soil),rim=material(C.terracotta);
  for(const [x,z,rx,rz,planted] of [[-1.22,-.28,.73,.48,false],[2.07,2.57,.69,.43,false],[2.9,3.0,.8,.4,true]]){
    const terrainY=groundAt(x,z);if(terrainY===null)continue;const y=terrainY+.01;
    const bed=add(new THREE.CylinderGeometry(1,1,.05,24),soil,g,[x,y,z]);bed.scale.set(rx,1,rz);
    const edge=add(new THREE.TorusGeometry(1,.037,7,28),rim,g,[x,y+.035,z]);edge.rotation.x=Math.PI/2;edge.scale.set(rx,rz,1);
    if(planted)for(let i=0;i<6;i++){
      const px=x+(i-2.5)*.23;
      beam(g,[px,y+.025,z],[px,y+.32,z],.013,moss,5);
      ball(g,[px,y+.35,z],[.075,.1,.07],flower[i%3],1);
    }
  }

  // Vines are attached to the greenhouse walls, with their roots at its raised base.
  const vine=material(0x6d9e64);
  for(const side of [-1,1])for(let i=0;i<4;i++){
    const x=.4+side*1.66,z=-.45+i*.62;
    const curve=new THREE.CatmullRomCurve3([[x,.52,z],[x+side*.04,1.03,z+.13],[x,1.42,z-.09],[x+side*.05,1.83,z+.07]].map(p=>new THREE.Vector3(...p)));
    add(new THREE.TubeGeometry(curve,16,.016,5,false),vine,g);
    for(let j=0;j<4;j++){const p=curve.getPoint(j/4+.12);ball(g,[p.x,p.y,p.z],[.11,.04,.06],vine,0)}
  }
  return g;
}
