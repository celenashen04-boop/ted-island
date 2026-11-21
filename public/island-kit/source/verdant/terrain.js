import * as THREE from '../../three.module.min.js';
import {C,material,add,ball,perimeter,ground} from './common.js';
import {createGeology} from './geology.js';
import {waterGroundHeight,sandStrength,waterField} from './water.js';
import {meadowOutline,meadowRows,meadowSample} from '../meadow.js';
import {refineShoreline} from '../shoreline.js';
import {frontTerraceNotch} from './greenhouse-access.js';

// Blend each side of the island outline independently into the river mouth.
// At the waterfall lip the outline follows the original cliff.
export const verdantRim=meadowOutline(perimeter,angle=>{
  const fromWest=Math.atan2(Math.sin(angle-Math.PI),Math.cos(angle-Math.PI));
  const degrees=THREE.MathUtils.radToDeg(fromWest);
  return degrees<0
    ? THREE.MathUtils.smoothstep(-degrees,8,34)
    : THREE.MathUtils.smoothstep(degrees,8,42);
});

export const terraces=[
  {x:.42,z:.54,rx:2.35,rz:1.75,y:.47},
  {x:3.7,z:1.68,rx:1.45,rz:1.05,y:.28}
];

function addTerraceSaddle(group,walkables){
  // A broad shoulder joins the two terraces underneath the pavilion approach.
  const sections=[
    [1.70,1.35,2.04],
    [1.92,1.29,2.19],
    [2.14,1.23,2.28],
    [2.36,1.17,2.40],
    [2.58,1.12,2.46],
    [2.80,1.11,2.47]
  ];
  const positions=[],indices=[],skirt=[];
  for(const [i,[x,north,south]] of sections.entries()){
    const rise=THREE.MathUtils.smoothstep(x,2.07,2.63);
    const y=THREE.MathUtils.lerp(.468,.278,rise);
    positions.push(x,y,north,x,y,south);
    if(i===0)continue;
    const j=i*2;
    indices.push(j-2,j-1,j+1,j-2,j+1,j);
    for(const side of [0,1]){
      const a=positions.slice((j-2+side)*3,(j-1+side)*3);
      const b=positions.slice((j+side)*3,(j+1+side)*3);
      const baseA=[a[0],waterGroundHeight(a[0],a[2])-.025,a[2]];
      const baseB=[b[0],waterGroundHeight(b[0],b[2])-.025,b[2]];
      skirt.push(...a,...baseA,...baseB,...a,...baseB,...b);
    }
  }
  const cap=new THREE.BufferGeometry();
  cap.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  cap.setIndex(indices);
  cap.computeVertexNormals();
  const surface=add(cap,material(C.grassLight,{side:THREE.DoubleSide}),group);
  surface.userData.navSurface='terrace';
  walkables.push(surface);
  const wall=new THREE.BufferGeometry();
  wall.setAttribute('position',new THREE.Float32BufferAttribute(skirt,3));
  wall.computeVertexNormals();
  add(wall,material(C.terracotta,{side:THREE.DoubleSide}),group).userData.walkableTrim=true;
}

export function createTerrain(scene,walkables){
  const g=new THREE.Group();g.name='Asymmetric landmass and terraces';scene.add(g);
  const N=144,R=32,v=[],colors=[],ix=[];
  const grassDark=new THREE.Color(C.grassDark),grassLight=new THREE.Color(C.grassLight),sand=new THREE.Color(0xd8c9a4);
  const rimRow=R+meadowRows;
  for(let j=0;j<=rimRow;j++)for(let i=0;i<N;i++){
    const sector=Math.floor(i/4),t=(i%4)/4,scale=j/R;
    const sample=angle=>j<=R?perimeter(angle,scale):meadowSample(angle,j-R,perimeter,verdantRim);
    const [x0,z0]=sample(sector*2*Math.PI/36),[x1,z1]=sample((sector+1)*2*Math.PI/36);
    const x=THREE.MathUtils.lerp(x0,x1,t),z=THREE.MathUtils.lerp(z0,z1,t);
    const y=j>=R&&waterField(x,z)>=.78
      ? THREE.MathUtils.lerp(ground(x0,z0),ground(x1,z1),t)
      : waterGroundHeight(x,z);
    v.push(x,y,z);
    const variation=.52+.17*Math.sin(x*.57+z*.26)+.11*Math.cos(z*.83-x*.18)+.045*Math.sin(x*1.27+z*.71);
    const tone=grassDark.clone().lerp(grassLight,THREE.MathUtils.clamp(variation,0,1)).lerp(sand,sandStrength(x,z));
    colors.push(tone.r,tone.g,tone.b);
  }
  for(let j=0;j<R+meadowRows;j++)for(let i=0;i<N;i++){
    const a=j*N+i,b=j*N+(i+1)%N,c=(j+1)*N+i,d=(j+1)*N+(i+1)%N;
    ix.push(a,c,d,a,d,b);
  }
  const rim=Array.from({length:N},(_,i)=>rimRow*N+i);
  const triangles=refineShoreline(v,colors,ix,rim,waterGroundHeight,
    (x,z)=>Math.abs(waterField(x,z)),{maxEdge:.040,reach:.068,passes:4});
  const topGeo=new THREE.BufferGeometry();
  topGeo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
  topGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  topGeo.setIndex(triangles);topGeo.computeVertexNormals();
  const top=add(topGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide}),g);walkables.push(top);g.userData.surface=top;
  top.userData.navSurface='terrain';
  top.userData.rim=rim;

  createGeology(g,{
    outline:verdantRim,topHeight:ground,segments:36,phase:1.38,
    topRim:rim.map(i=>v.slice(i*3,i*3+3)),
    colors:[C.rock,0xc5bba9,0xaaa797,0xa69f8f,0xc4b9a5],
    outcrops:[[5.45,.73,-1.45,.84,.54,.63,1],[.36,.68,-1.74,.66,.47,.6,2],[4.12,.53,-2.69,.75,.5,.65,4]],
    satellite:[5.83,1.14,-1.45,.34,2]
  });

  for(const [index,t] of terraces.entries()){
    const n=20,points=[];
    for(let i=0;i<n;i++){
      const a=i*2*Math.PI/n,r=1+.06*Math.sin(a*5+2),x=Math.cos(a)*t.rx*r,z=Math.sin(a)*t.rz*r;
      points.push([x+t.x,z+t.z]);
    }
    const outline=index===0?frontTerraceNotch(points):points;
    const shape=new THREE.Shape(outline.map(([x,z])=>new THREE.Vector2(x-t.x,t.z-z)));
    const bottom=ground(t.x,t.z)-.08;
    const wall=new THREE.ExtrudeGeometry(shape,{depth:t.y-bottom,bevelEnabled:false,curveSegments:1});
    wall.rotateX(-Math.PI/2);wall.translate(t.x,bottom,t.z);
    add(wall,material(C.terracotta,{side:THREE.DoubleSide}),g).userData.walkableTrim=true;
    const cap=new THREE.ShapeGeometry(shape);cap.rotateX(-Math.PI/2);cap.translate(t.x,t.y,t.z);
    const surface=add(cap,material(C.grassLight,{side:THREE.DoubleSide}),g);
    surface.userData.navSurface='terrace';
    walkables.push(surface);
  }
  addTerraceSaddle(g,walkables);
  for(const [x,z,sc] of [[-4.9,2.5,1],[-3.8,3.4,.75],[4.9,2.95,.73],[5.25,-.62,.62]]){
    const y=ground(x,z);
    ball(g,[x,y+.26*sc,z],[.66*sc,.35*sc,.48*sc],material(C.rock),0);
    ball(g,[x-.12*sc,y+.49*sc,z+.05*sc],[.43*sc,.13*sc,.32*sc],material(C.moss),1);
  }
  return g;
}
