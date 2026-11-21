import * as THREE from '../../three.module.min.js';
import {C,material,add,ball,perimeter,ground} from './common.js';
import {createGeology} from './geology.js';
import {waterGroundHeight,sandStrength} from './water.js';

export const terraces=[
  {x:.42,z:.54,rx:2.35,rz:1.75,y:.47},
  {x:3.7,z:1.68,rx:1.45,rz:1.05,y:.28}
];

export function createTerrain(scene,walkables){
  const g=new THREE.Group();g.name='Asymmetric landmass and terraces';scene.add(g);
  const N=144,R=32,v=[],colors=[],ix=[];
  const grassDark=new THREE.Color(C.grassDark),grassLight=new THREE.Color(C.grassLight),sand=new THREE.Color(0xd8c9a4);
  for(let j=0;j<=R;j++)for(let i=0;i<N;i++){
    const sector=Math.floor(i/4),t=(i%4)/4,scale=j/R;
    const [x0,z0]=perimeter(sector*2*Math.PI/36,scale),[x1,z1]=perimeter((sector+1)*2*Math.PI/36,scale);
    const x=THREE.MathUtils.lerp(x0,x1,t),z=THREE.MathUtils.lerp(z0,z1,t);
    const y=j===R?THREE.MathUtils.lerp(ground(x0,z0),ground(x1,z1),t):waterGroundHeight(x,z);
    v.push(x,y,z);
    const variation=.52+.17*Math.sin(x*.57+z*.26)+.11*Math.cos(z*.83-x*.18)+.045*Math.sin(x*1.27+z*.71);
    const tone=grassDark.clone().lerp(grassLight,THREE.MathUtils.clamp(variation,0,1)).lerp(sand,sandStrength(x,z));
    colors.push(tone.r,tone.g,tone.b);
  }
  for(let j=0;j<R;j++)for(let i=0;i<N;i++){
    const a=j*N+i,b=j*N+(i+1)%N,c=(j+1)*N+i,d=(j+1)*N+(i+1)%N;
    ix.push(a,c,d,a,d,b);
  }
  const topGeo=new THREE.BufferGeometry();
  topGeo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
  topGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  topGeo.setIndex(ix);topGeo.computeVertexNormals();
  const top=add(topGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide}),g);walkables.push(top);g.userData.surface=top;

  createGeology(g,{
    outline:perimeter,topHeight:ground,segments:36,phase:1.38,
    colors:[C.rock,0xc5bba9,0xaaa797,0xa69f8f,0xc4b9a5],
    outcrops:[[5.45,.73,-1.45,.84,.54,.63,1],[.36,.68,-1.74,.66,.47,.6,2],[4.12,.53,-2.69,.75,.5,.65,4]],
    satellite:[5.83,1.14,-1.45,.34,2]
  });

  // The upper terrace geometry and navigation stay unchanged.
  for(const t of terraces){
    const shape=new THREE.Shape(),n=20;
    for(let i=0;i<=n;i++){
      const a=i*2*Math.PI/n,r=1+.06*Math.sin(a*5+2),x=Math.cos(a)*t.rx*r,z=Math.sin(a)*t.rz*r;
      i?shape.lineTo(x,-z):shape.moveTo(x,-z);
    }
    const bottom=ground(t.x,t.z)-.08;
    const wall=new THREE.ExtrudeGeometry(shape,{depth:t.y-bottom,bevelEnabled:false,curveSegments:1});
    wall.rotateX(-Math.PI/2);wall.translate(t.x,bottom,t.z);
    add(wall,material(C.terracotta,{side:THREE.DoubleSide}),g).userData.walkableTrim=true;
    const cap=new THREE.ShapeGeometry(shape);cap.rotateX(-Math.PI/2);cap.translate(t.x,t.y,t.z);
    const surface=add(cap,material(C.grassLight,{side:THREE.DoubleSide}),g);walkables.push(surface);
  }
  for(const [x,z,sc] of [[-4.9,2.5,1],[-3.8,3.4,.75],[4.9,2.95,.73],[5.25,-.62,.62]]){
    const y=ground(x,z);
    ball(g,[x,y+.26*sc,z],[.66*sc,.35*sc,.48*sc],material(C.rock),0);
    ball(g,[x-.12*sc,y+.49*sc,z+.05*sc],[.43*sc,.13*sc,.32*sc],material(C.moss),1);
  }
  return g;
}
