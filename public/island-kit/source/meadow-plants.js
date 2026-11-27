import * as THREE from '../three.module.min.js';
import {containsPoint} from './meadow.js';
import {palette,mat as harborMat,sphere as harborSphere,cylinderBetween} from './spiral/common.js';
import {C,material,add,ball} from './verdant/common.js';
import {P,mat as playMat,beam,sphere as playSphere} from './pinwheel/common.js';

function bladeFan(group,x,y,z,heading,material,{count,height,reach,width,spread=2*Math.PI}){
  const positions=[];
  for(let i=0;i<count;i++){
    const angle=heading+i*spread/count,dx=Math.cos(angle),dz=Math.sin(angle);
    const h=height*(.63+.37*Math.sin((i+1)*2.4)**2);
    const root=[0,-.018,0],tip=[dx*reach,h*.87,dz*reach];
    const middle=[dx*reach*.43,h*.78,dz*reach*.43];
    const left=[middle[0]-dz*width,middle[1]-.022,middle[2]+dx*width];
    const right=[middle[0]+dz*width,middle[1]-.022,middle[2]-dx*width];
    positions.push(...root,...left,...middle,...root,...middle,...right,
      ...middle,...left,...tip,...middle,...tip,...right);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.set(x,y,z);
  mesh.receiveShadow=true;
  group.add(mesh);
}

function harborGarden(group, groundAt) {
  const leaves = [harborMat(0xa7cf7e),harborMat(palette.leafLight)];
  const flowers = [0xf7bac9,0xffe2b3,0xe7d6ed].map(color=>harborMat(color));
  const irisLeaf=harborMat(0x80a587, .9, {side:THREE.DoubleSide});
  return (x,y,z,slot,cluster,heading)=>{
    if(slot===null){
      bladeFan(group,x,y,z,heading,irisLeaf,{count:5,height:.23,reach:.13,width:.022,spread:Math.PI*1.4});
      if(cluster%3!==1){
        const h=.23+.025*(cluster%3);
        cylinderBetween([x,y-.014,z],[x,y+h,z],.01,leaves[0],group,6);
        for(let j=0;j<3;j++){
          const a=heading+j*2*Math.PI/3;
          const petal=harborSphere(x+Math.cos(a)*.046,y+h,z+Math.sin(a)*.046,
            .052,.025,.032,flowers[2],group,8);
          petal.rotation.y=-a;
        }
        harborSphere(x,y+h+.024,z,.024,.025,.024,flowers[1],group,8);
      }
      return;
    }
    if(slot%3!==2){
      const size=.11+.028*((slot+cluster)%4);
      harborSphere(x,y+.075,z,size,.115,size*.94,leaves[slot%2],group,10);
      const px=x+Math.cos(heading)*size*.7,pz=z+Math.sin(heading)*size*.7;
      const py=groundAt(px,pz);
      if(slot%2===0&&py!==null)harborSphere(px,py+.055,pz,size*.67,.084,size*.66,leaves[1],group,9);
      return;
    }
    for(let k=0;k<3;k++){
      const angle=heading+k*2*Math.PI/3;
      const px=x+Math.cos(angle)*.099,pz=z+Math.sin(angle)*.099,py=groundAt(px,pz);
      if(py===null)continue;
      const h=.14+.041*((cluster+k)%3);
      cylinderBetween([px,py-.017,pz],[px,py+h,pz],.012,leaves[0],group,6);
      harborSphere(px,py+h+.025,pz,.058,.051,.058,flowers[(cluster+k)%3],group,10);
    }
  };
}

function springsGarden(group) {
  const moss = material(C.moss), youngMoss = material(C.grassDark);
  const fern = material(C.moss,{side:THREE.DoubleSide});
  const sedge = material(0x8f9d54,{side:THREE.DoubleSide});
  const dock = material(0x6f995f,{side:THREE.DoubleSide});
  const seedhead = material(0xbd9366);
  return (x,y,z,slot,cluster,heading)=>{
    if(slot===null){
      if(cluster%3===0){
        bladeFan(group,x,y,z,heading,dock,{count:5,height:.13,reach:.18,width:.054});
      }else{
        bladeFan(group,x,y,z,heading,sedge,{count:7,height:.25,reach:.15,width:.019});
        ball(group,[x,y+.21,z],[.027,.064,.024],seedhead,1);
        const stalk=new THREE.Mesh(new THREE.CylinderGeometry(.007,.009,.22,6),sedge);
        stalk.position.set(x,y+.096,z);
        group.add(stalk);
      }
      return;
    }
    if(slot%3===1){
      const r=.10+.025*((cluster+slot)%4);
      ball(group,[x,y+.041,z],[r,.075,r*.85],cluster%2?moss:youngMoss,1);
      return;
    }
    // Low fans of paired leaflets echo the ferns beside the streams.
    const positions=[];
    const length=.18+.045*((slot+cluster)%3);
    for(let i=0;i<5;i++){
      const angle=heading+i*2*Math.PI/5, dx=Math.cos(angle), dz=Math.sin(angle);
      const point=(t,lateral=0)=>[
        dx*length*t-dz*lateral,
        -.018+length*.68*Math.sin(t*2.25),
        dz*length*t+dx*lateral
      ];
      for(let j=0;j<6;j++){
        const t=j/6;
        const width=.09*(1-t*.7);
        positions.push(...point(t,.009),...point(t,-.009),...point(t+1/6));
        if(j===0)continue;
        for(const side of [-1,1]){
          positions.push(...point(t),...point(t+.08,side*width),...point(t+.14));
        }
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.computeVertexNormals();
    add(geometry,fern,group,[x,y,z]);
  };
}

function playGarden(group) {
  const mint=[0x80bfa4,0x9fceb0].map(color=>playMat(color));
  const petals=[P.coral,P.yellow,P.lavender,P.sky].map(color=>playMat(color));
  const stalk=playMat(0x79b68d), center=playMat(0xfbf3d9);
  const ribbons=[0x81ba9d,0x99cabb].map(color=>playMat(color,{side:THREE.DoubleSide}));
  return (x,y,z,slot,cluster,heading)=>{
    if(slot===null){
      if(cluster%2===0){
        bladeFan(group,x,y,z,heading,ribbons[0],{count:5,height:.16,reach:.14,width:.044});
        bladeFan(group,x,y,z,heading+.5,ribbons[1],{count:4,height:.23,reach:.11,width:.027});
      }else{
        const h=.20+.04*(cluster%3);
        const dx=Math.cos(heading)*.074,dz=Math.sin(heading)*.074;
        beam(group,[x,y-.014,z],[x+dx,y+h,z+dz],.014,stalk,7);
        playSphere(group,[x+dx,y+h-.032,z+dz],[.065,.073,.062],petals[cluster%4],10);
        playSphere(group,[x+dx,y+h-.09,z+dz],[.031,.019,.031],center,9);
      }
      return;
    }
    if(slot%3!==0){
      const r=.086+.024*((cluster+slot)%4);
      playSphere(group,[x,y+.07,z],[r,.10,r*.88],mint[slot%2],9);
      return;
    }
    const s=.59+.07*((slot+cluster)%3), h=.45*s;
    const bloom=new THREE.Group();
    bloom.position.set(x,y,z);
    bloom.rotation.y=heading+Math.PI*.33;
    group.add(bloom);
    beam(bloom,[0,-.015,0],[0,h,0],.025*s,stalk,7);
    for(let i=0;i<5;i++){
      const angle=i*2*Math.PI/5;
      const petal=playSphere(bloom,[Math.cos(angle)*.14*s,h+Math.sin(angle)*.14*s,0],
        [.15*s,.10*s,.048*s],petals[(slot+cluster)%4],10);
      petal.rotation.z=angle;
    }
    playSphere(bloom,[0,h,.05*s],[.095*s,.095*s,.05*s],center,11);
  };
}

const layouts = {
  spiral: {seed:7021,garden:harborGarden},
  verdant: {seed:4079,garden:springsGarden},
  pinwheel: {seed:8257,garden:playGarden}
};

export function addMeadowPlants(id, island, terrain, inner, outer, wet) {
  const {garden} = layouts[id];
  let seed=layouts[id].seed;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const plants = new THREE.Group();
  plants.name = 'Meadow planting';
  plants.userData.nonBlockingVegetation = true;
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0,-1,0);
  function groundAt(x,z){
    ray.set(new THREE.Vector3(x,8,z),down);
    return ray.intersectObject(terrain,false)[0]?.point.y??null;
  }
  const plant = garden(plants,groundAt);
  const roots=[];
  const occupied=[];
  const rockBody=terrain.parent.children[1];
  island.updateMatrixWorld(true);
  island.traverse(mesh=>{
    if(!mesh.isMesh||mesh===terrain||mesh===rockBody||mesh.userData.isWater)return;
    const bounds=new THREE.Box3().setFromObject(mesh);
    if(bounds.max.y>.02)occupied.push(bounds);
  });
  const xs=outer.map(p=>p[0]),zs=outer.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  function fits(x,z){
    if(!containsPoint(outer,x,z,.34)||wet(x,z,.39))return false;
    return !occupied.some(({min,max})=>x>min.x-.26&&x<max.x+.26&&z>min.z-.26&&z<max.z+.26);
  }

  function plantAt(x,z,cluster,spacing){
    if(!fits(x,z)||roots.some(([px,pz])=>Math.hypot(x-px,z-pz)<spacing))return;
    const y=groundAt(x,z);
    if(y===null)return;
    const slot=random()<.42?null:Math.floor(random()*7);
    const heading=random()*2*Math.PI;
    // Retain the seeded spacing and variety while thinning each patch.
    if((roots.length+cluster)%2===0&&(Math.floor(roots.length/2)+cluster*3)%10!==0)
      plant(x,y,z,slot,cluster,heading);
    roots.push([x,z]);
  }

  const patches=[];
  // Pick centres on the ground plane. Weight the added meadow, but let patches cross its old edge.
  for(let i=0;i<900&&patches.length<25;i++){
    const x=THREE.MathUtils.lerp(minX,maxX,random()), z=THREE.MathUtils.lerp(minZ,maxZ,random());
    if(i%3!==0&&containsPoint(inner,x,z,0))continue;
    if(!fits(x,z)||patches.some(p=>Math.hypot(x-p.x,z-p.z)<p.spacing))continue;
    patches.push({x,z,spacing:.94+random()*.70,spread:.37+random()*.55,heading:random()*Math.PI});
  }
  for(const [cluster,patch] of patches.entries()){
    const size=2+Math.floor(random()*6);
    for(let i=0;i<40&&i<size*5;i++){
      const angle=random()*2*Math.PI, distance=Math.sqrt(random())*patch.spread;
      const a=Math.cos(angle)*distance,b=Math.sin(angle)*distance*(.55+random()*.45);
      plantAt(patch.x+Math.cos(patch.heading)*a-Math.sin(patch.heading)*b,
        patch.z+Math.sin(patch.heading)*a+Math.cos(patch.heading)*b,cluster,.25+random()*.12);
      if(roots.filter(([x,z])=>Math.hypot(x-patch.x,z-patch.z)<patch.spread).length>=size)break;
    }
  }

  // A handful of lone plants soften the transitions without making an edge border.
  for(let i=0, added=0;i<420&&added<16;i++){
    const x=THREE.MathUtils.lerp(minX,maxX,random()),z=THREE.MathUtils.lerp(minZ,maxZ,random());
    const before=roots.length;
    plantAt(x,z,i,.64);
    added+=roots.length-before;
  }
  island.add(plants);
}
