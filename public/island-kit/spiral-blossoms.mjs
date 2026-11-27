import * as THREE from './three.module.min.js';

const up=new THREE.Vector3(0,1,0);
const petalMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,side:THREE.DoubleSide});
const pinks=[0xf9b2c7,0xf8cad5,0xe88aa8,0xffe1e6].map(color=>new THREE.Color(color));
const shape=new THREE.Shape();
shape.moveTo(-.4,-.6);
shape.bezierCurveTo(-.95,-.12,-.74,.48,-.24,.66);
shape.bezierCurveTo(-.08,.72,.04,.59,.09,.50);
shape.bezierCurveTo(.35,.74,.8,.37,.72,.02);
shape.bezierCurveTo(.63,-.43,.12,-.62,-.4,-.6);
const fallenPetal=new THREE.ShapeGeometry(shape,5).rotateX(-Math.PI/2);

export function makeGroundPetals(scene,model) {
  const groundCapacity=28;
  const fallingCapacity=3;
  const mesh=new THREE.InstancedMesh(fallenPetal,petalMaterial,groundCapacity+fallingCapacity);
  mesh.visible=false;
  mesh.frustumCulled=false;
  mesh.name='Fallen blossoms · terrain fitted';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  const pose=new THREE.Object3D(), groundNormal=new THREE.Vector3(), spin=new THREE.Quaternion();
  const last=new THREE.Vector3(Infinity,Infinity,Infinity);
  const targets=[];
  let interval, phase, fallDuration;

  function placeGroundPetals(position){
    last.copy(position);
    targets.length=0;
    let seed=(Math.round(position.x*13417)^Math.round(position.z*29509))>>>0;
    function random(){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      return seed/4294967296;
    }
    // Give each tree its own release timing so petals seldom fall together.
    interval=1.2+random()*.5;
    phase=random()*interval;
    fallDuration=2.2+random()*.6;
    const origin=model.group.position;
    const rotation=random()*Math.PI*2;
    for(let i=0;i<groundCapacity;i++){
      const angle=rotation+i*2.39996+(random()-.5)*.85;
      const radius=.32+Math.sqrt(random())*1.02;
      const x=position.x+Math.cos(angle)*radius;
      const z=position.z+Math.sin(angle)*radius;
      const floor=model.queryIsland(x-origin.x,z-origin.z,0);
      if(floor.blockedBy==='island_boundary'||floor.surfaceType!=='terrain'||floor.waterBelow||floor.slopeDegrees>38)continue;
      groundNormal.set(...floor.normal).normalize();
      pose.position.set(x,floor.height+origin.y,z).addScaledVector(groundNormal,.013);
      spin.setFromAxisAngle(up,random()*Math.PI*2);
      pose.quaternion.setFromUnitVectors(up,groundNormal).multiply(spin);
      const size=.036+random()*.041;
      pose.scale.set(size,1,size*(.92+random()*.32));
      pose.updateMatrix();
      mesh.setMatrixAt(targets.length,pose.matrix);
      mesh.setColorAt(targets.length,pinks[i%pinks.length]);
      targets.push(pose.position.clone());
    }
    for(let i=0;i<fallingCapacity;i++)mesh.setColorAt(targets.length+i,pinks[i]);
    mesh.instanceColor.needsUpdate=true;
    mesh.instanceMatrix.needsUpdate=true;
  }

  return {
    draw(position,visible,now=0,canopyHeight=0) {
      mesh.visible=visible;
      if(!visible)return;
      if(!last.equals(position))placeGroundPetals(position);
      let count=targets.length;
      const time=now/1000+phase;
      const newest=Math.floor(time/interval);
      for(let release=Math.max(0,newest-fallingCapacity+1);targets.length && release<=newest;release++){
        const progress=(time-release*interval)/fallDuration;
        if(progress>=1)continue;
        const target=targets[release%targets.length];
        const flutter=Math.sin(progress*Math.PI*3+release)*Math.sin(progress*Math.PI)*.18;
        const canopyOffset=.42+(release%3)*.10;
        const canopyY=.89+(release%3)*.037;
        pose.position.set(
          THREE.MathUtils.lerp(position.x+(target.x-position.x)*canopyOffset,target.x,progress)+flutter,
          THREE.MathUtils.lerp(position.y+canopyHeight*canopyY,target.y+.03,progress),
          THREE.MathUtils.lerp(position.z+(target.z-position.z)*canopyOffset,target.z,progress)-flutter*.55
        );
        pose.rotation.set(.36*Math.sin(progress*12+release),progress*4+release,.48*Math.cos(progress*9+release));
        pose.scale.set(.069,1,.078);
        pose.updateMatrix();
        mesh.setMatrixAt(count++,pose.matrix);
      }
      if(count>targets.length)mesh.instanceMatrix.needsUpdate=true;
      mesh.count=count;
    },
    dispose(){
      mesh.removeFromParent();
      mesh.dispose();
    },
  };
}
