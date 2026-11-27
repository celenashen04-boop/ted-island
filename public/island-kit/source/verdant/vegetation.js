import * as THREE from '../../three.module.min.js';
import {C,material,add,ball,smoothBall,beam,inside,seeded} from './common.js';
import {inWater,waterField} from './water.js';
import {nearGreenhouseApproach} from './greenhouse-access.js';
import {containsPoint} from '../meadow.js';

export const trunks=[];
const random=seeded(2707);

export function createVegetation(scene,surface,outline){
  const g=new THREE.Group();g.name='Willow grove, fern banks and cultivated beds';g.userData.nonBlockingVegetation=true;scene.add(g);
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  function groundAt(x,z){ray.set(new THREE.Vector3(x,10,z),down);const hit=ray.intersectObject(surface,false)[0];return hit?hit.point.y:null}
  const bark=material(0x8d7862),willow=[material(0x8db577),material(0xa6cc83),material(0x79a86d)],fern=material(0x719e65,{side:THREE.DoubleSide}),moss=material(C.moss),flower=[material(0xf3b4a8),material(0xffd39e),material(0xe6c5cf)];

  function willowTree(x,z,s,name){
    const y=groundAt(x,z);
    if(y===null||waterField(x,z)<.53+.12*s||!containsPoint(outline,x,z,1.08*s+.04))return;
    const h=1.05+1.42*s;
    trunks.push({x,z,r:.12*s});
    const tree=new THREE.Group();
    tree.name=name;
    tree.userData.lifecycleTree={x,y,z,style:'willow'};
    g.add(tree);
    beam(tree,[x,y-.015,z],[x-.06*s,y+h,z+.03*s],.095*s,bark,9);
    for(let j=0;j<7;j++){
      const a=j*2*Math.PI/7+.3,rx=Math.cos(a),rz=Math.sin(a),e=[x+rx*.66*s,y+h+.2*s,z+rz*.57*s];
      beam(tree,[x,y+h*.75,z],e,.042*s,bark,7);
      smoothBall(tree,[e[0],e[1]+.02*s,e[2]],[.42*s,.31*s,.38*s],willow[j%3]);
      for(let k=0;k<3;k++){
        const da=(k-1)*.18,px=e[0]+rx*da*s,pz=e[2]+rz*da*s;
        const curve=new THREE.CatmullRomCurve3([
          new THREE.Vector3(px,e[1],pz),
          new THREE.Vector3(px+rx*.12*s,e[1]-.24*s,pz+rz*.1*s),
          new THREE.Vector3(px+rx*.18*s,e[1]-.62*s,pz+rz*.15*s)
        ]);
        add(new THREE.TubeGeometry(curve,7,.012*s,4,false),willow[(j+k+3)%3],tree);
      }
    }
    smoothBall(tree,[x,y+h+.23*s,z],[.58*s,.28*s,.5*s],willow[1]);
  }
  const willows=[
    [-4.69,2.3,1.06,'West landing willow'],
    [-3.1,3.16,.86,'West meadow willow'],
    [-1.58,3.63,.82,'Greenhouse approach willow'],
    [4.64,3.85,.88,'Rain pavilion meadow willow'],
    [4.08,-3.36,.75,'Upper pond meadow willow']
  ];
  for(const tree of willows)willowTree(...tree);

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
      if(inside(x,z,.45)&&!inWater(x,z,.08)&&groundAt(x,z)!==null){
        const size=.65+random()*.55;
        if(i%2===0&&i%20!==6)fernClump(x,z,size);
      }
    }
  }

  for(let i=0;i<75;i++){
    const x=-5.25+random()*10.4,z=2.28+random()*1.75;
    if(!inside(x,z,.44)||trunks.some(t=>Math.hypot(x-t.x,z-t.z)<.6)||x>2.7&&x<4.7)continue;
    const y=groundAt(x,z);if(y===null)continue;const r=.09+random()*.16;
    if(i%2!==0||i%20===6||nearGreenhouseApproach(x,z))continue;
    ball(g,[x,y+.09,z],[r,.12,r*.9],i%3?moss:material(C.grassDark),1);
  }

  // A single planted bed sits in the open meadow south of the pavilion.
  const planter=new THREE.Group();
  planter.name='Meadow flower bed';
  g.add(planter);
  const x=3.1,z=4.05,rx=.66,rz=.32,segments=36;
  const edgeGround=Array.from({length:segments},(_,i)=>{
    const a=i*2*Math.PI/segments,px=x+Math.cos(a)*rx,pz=z+Math.sin(a)*rz;
    return [px,groundAt(px,pz),pz];
  });
  const soilY=Math.max(groundAt(x,z),...edgeGround.map(([,y])=>y))+.045;
  const bed=add(new THREE.CircleGeometry(1,segments),material(C.soil),planter,[x,soilY,z]);
  bed.rotation.x=-Math.PI/2;
  bed.scale.set(rx,rz,1);
  bed.userData.navSurface='planting_bed';

  const clay=material(C.terracotta,{side:THREE.DoubleSide});
  const wall=[],indices=[];
  for(const [i,[px,py,pz]] of edgeGround.entries()){
    wall.push(px,py-.025,pz,px,soilY,pz);
    const j=i*2,next=(j+2)%(segments*2);
    indices.push(j,j+1,next,j+1,next+1,next);
  }
  const wallGeometry=new THREE.BufferGeometry();
  wallGeometry.setAttribute('position',new THREE.Float32BufferAttribute(wall,3));
  wallGeometry.setIndex(indices);
  wallGeometry.computeVertexNormals();
  add(wallGeometry,clay,planter);
  const lip=add(new THREE.TorusGeometry(1,.035,8,segments),clay,planter,[x,soilY,z]);
  lip.rotation.x=Math.PI/2;
  lip.scale.set(rx,rz,.54);

  const flowers=[[-.43,.025,.15,0],[-.23,-.115,.23,1],[-.155,.14,.13,0],
    [.015,-.017,.28,2],[.23,.11,.19,1],[.42,-.07,.22,0]];
  for(const [i,[dx,dz,height,color]] of flowers.entries()){
    const px=x+dx,pz=z+dz,lean=i%2?.024:-.023;
    const tip=[px+lean,soilY+height,pz+.012];
    beam(planter,[px,soilY-.009,pz],tip,.011,moss,6);
    const leaf=ball(planter,[px-lean,soilY+height*.43,pz+.018],[.054,.025,.034],moss,1);
    leaf.rotation.z=i%2?-.49:.52;
    const r=.049+.008*(i%3);
    ball(planter,[tip[0],tip[1]+.028,tip[2]],[r,r*1.13,r*.9],flower[color],1);
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
