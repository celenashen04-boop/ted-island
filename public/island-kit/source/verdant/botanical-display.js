import * as THREE from '../../three.module.min.js';
import {add,beam,material,smoothBall} from './common.js';

export function addBotanicalDisplay(parent,x,y,z,side){
  const collection=new THREE.Group();
  collection.name=side<0?'Tropical greenhouse collection':'Dryland greenhouse collection';
  collection.position.set(x,y,z);
  collection.scale.y=1.32;
  collection.userData.nonBlockingVegetation=true;
  parent.add(collection);

  const leafMaterial=color=>material(color,{side:THREE.DoubleSide});
  const stem=material(0x65905c), jade=material(0x77a56a), pink=material(0xdf86ad);
  const pale=material(0xf6bfd0), gold=material(0xe3ac56), cream=material(0xffecca);
  const fern=leafMaterial(0x83b964), tropical=leafMaterial(0x508c65);
  const agave=leafMaterial(0x78afaa), blue=leafMaterial(0x9bc3b7);
  const rosetteLeaf=leafMaterial(0xb1a3bc), rosetteInner=leafMaterial(0xa1baa1);

  function specimen(name,depth,rotation){
    const group=new THREE.Group();
    group.name=name;
    group.position.z=depth;
    group.rotation.y=rotation;
    collection.add(group);
    return group;
  }

  function leaf(group,base,angle,reach,rise,arch,width,mat,split=false){
    const [x,y,z]=base,dx=Math.cos(angle),dz=Math.sin(angle);
    const v=[],ix=[],steps=12;
    for(let i=0;i<=steps;i++){
      const t=i/steps,span=width*(.035+.965*Math.sin(Math.PI*t)**.68);
      const edge=split&&i>=3&&i<steps-1&&i%2===0?span*.30:span;
      const px=x+dx*reach*t,pz=z+dz*reach*t,py=y+rise*t+arch*Math.sin(Math.PI*t);
      v.push(px+dz*edge,py-edge*.25,pz-dx*edge,px,py,pz,px-dz*edge,py-edge*.25,pz+dx*edge);
      if(i>0){
        const a=(i-1)*3,b=i*3;
        ix.push(a,b,a+1,a+1,b,b+1,a+1,b+1,a+2,a+2,b+1,b+2);
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
    geo.setIndex(ix);
    geo.computeVertexNormals();
    add(geo,mat,group);
  }

  if(side<0){
    const orchid=specimen('Pink orchid',-.74,.4);
    for(let i=0;i<5;i++)leaf(orchid,[0,-.012,0],i*2.4,.13,.06,.055,.027,tropical);
    const spray=new THREE.CatmullRomCurve3([[0,-.015,0],[0,.24,-.035],[.015,.43,-.025],[.065,.55,.025]]
      .map(p=>new THREE.Vector3(...p)));
    add(new THREE.TubeGeometry(spray,16,.008,6,false),stem,orchid);
    for(const t of [.63,.79,.96]){
      const p=spray.getPoint(t);
      for(let k=0;k<5;k++){
        const a=k*2*Math.PI/5;
        const petal=smoothBall(orchid,[p.x+Math.cos(a)*.036,p.y+Math.sin(a)*.036,p.z+.017],
          [.037,.022,.012],k%2?pink:pale);
        petal.rotation.z=a;
      }
      smoothBall(orchid,[p.x,p.y-.008,p.z+.038],[.018,.014,.012],gold);
    }

    const fan=specimen('Maidenhair fern',-.26,.3);
    for(let i=0;i<5;i++){
      const angle=i*2.4,dx=Math.cos(angle),dz=Math.sin(angle);
      const point=t=>[dx*.16*t,-.012+.28*Math.sin(t*1.51),dz*.16*t];
      for(let k=0;k<6;k++)beam(fan,point(k/6),point((k+1)/6),.004,stem,5);
      for(let k=2;k<=6;k++)for(const sign of [-1,1]){
        const p=point(k/6);
        leaf(fan,p,angle+sign*1.03,.059-.004*k,.013,.011,.022-.001*k,fern);
      }
    }

    const monstera=specimen('Split-leaf monstera',.26,1.0);
    for(let i=0;i<5;i++){
      const a=i*2.4,h=.15+.055*(i%4),tip=[Math.cos(a)*.049,h,Math.sin(a)*.049];
      beam(monstera,[0,-.016,0],tip,.007,stem,6);
      leaf(monstera,tip,a,.13,.024,.036,.049,tropical,true);
    }

    const lily=specimen('Golden calla lily',.73,-.55);
    for(let i=0;i<5;i++)leaf(lily,[0,-.012,0],i*2.4,.12,.081,.063,.034,tropical);
    for(let i=0;i<2;i++){
      const px=i*.077-.036,h=.33+i*.12;
      beam(lily,[px,-.018,0],[px,h,0],.008,stem,6);
      leaf(lily,[px,h-.032,0],i*2.1,.083,.087,.038,.043,leafMaterial(0xffe3a2));
      smoothBall(lily,[px,h+.032,.012],[.012,.046,.013],gold);
    }
    return;
  }

  const alpine=specimen('Blue agave',-.74,.3);
  for(let i=0;i<11;i++){
    const inner=i>=7;
    leaf(alpine,[0,-.015,0],i*2.4,inner?.074:.17,inner?.31:.14,inner?.054:.094,
      inner?.021:.038,i%2?agave:blue);
  }

  const echeveria=specimen('Lavender echeveria',-.26,.4);
  for(let i=0;i<16;i++){
    const inner=i>=9;
    leaf(echeveria,[0,-.008,0],i*2.4,inner?.097:.165,inner?.12:.061,
      inner?.044:.039,inner?.028:.039,inner?rosetteInner:rosetteLeaf);
  }

  const shrub=specimen('Miniature jade tree',.24,0);
  const fork=[0,.23,0];
  beam(shrub,[0,-.02,0],fork,.018,stem,7);
  for(let i=0;i<5;i++){
    const a=i*2.4,dx=Math.cos(a),dz=Math.sin(a),h=.27+.046*(i%4);
    const end=[dx*.11,h,dz*.11];
    beam(shrub,fork,end,.01,stem,6);
    for(let k=0;k<3;k++){
      const b=a+k*2.1;
      const pad=smoothBall(shrub,[end[0]+Math.cos(b)*.029,h+k*.027,end[2]+Math.sin(b)*.029],
        [.049,.019,.027],jade);
      pad.rotation.set(0,-b,.36);
    }
  }

  const aloe=specimen('Coral torch aloe',.73,.66);
  const coral=material(0xe98f70);
  for(let i=0;i<8;i++)leaf(aloe,[0,-.015,0],i*2.4,.10+.017*(i%3),.13+.035*(i%4),.065,.023,i%2?agave:tropical);
  beam(aloe,[0,-.016,0],[0,.49,0],.009,stem,6);
  for(let i=0;i<10;i++){
    const a=i*2.4,r=.04-.0022*i;
    const floret=smoothBall(aloe,[Math.cos(a)*r,.34+i*.018,Math.sin(a)*r],
      [.018,.033,.018],i>=8?cream:coral);
    floret.rotation.set(0,-a,-.45);
  }
}
