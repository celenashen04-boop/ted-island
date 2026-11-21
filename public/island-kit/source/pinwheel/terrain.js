import * as THREE from '../../three.module.min.js';
import {P,mat,mesh,edge,height} from './common.js';
import {createGeology} from './geology.js';
import {pools,poolRadius,waterLevel} from './water.js';
import {meadowOutline,meadowRows,meadowSample} from '../meadow.js';
import {refineShoreline} from '../shoreline.js';

export const pinwheelRim=meadowOutline(edge);

export function terrainHeight(x,z){
  let y=height(x,z);
  for(const p of pools){
    const r=poolRadius(p,x,z),level=waterLevel(p);
    if(r<=1){
      const t=Math.min(1,r),rise=t*t*(3-2*t);
      y=level-.06+.042*rise;
    }else if(r<=1.14){
      const t=(r-1)/.14,rise=t*t*(3-2*t);
      y=level-.018+.034*rise;
    }else if(r<1.55){
      const t=(r-1.14)/.41,blend=t*t*(3-2*t);
      y=(level+.016)*(1-blend)+y*blend;
    }
  }
  return y;
}

function sandBlend(x,z){
  let amount=0;
  for(const p of pools){const r=poolRadius(p,x,z);amount=Math.max(amount,r<=1.42?1:Math.max(0,Math.min(1,(1.7-r)/.28)))}
  return amount;
}

export function createTerrain(scene,walkables){
  const g=new THREE.Group();g.name='Four headlands and hanging geology';scene.add(g);
  const N=192,R=32,v=[],ix=[],colors=[];
  for(let j=0;j<=R+meadowRows;j++)for(let i=0;i<N;i++){
    const sector=Math.floor(i/4),t=(i%4)/4;
    const sample=angle=>j<=R?edge(angle,j/R):meadowSample(angle,j-R,edge,pinwheelRim);
    const p0=sample(sector*2*Math.PI/48),p1=sample((sector+1)*2*Math.PI/48);
    const x=p0[0]*(1-t)+p1[0]*t,z=p0[1]*(1-t)+p1[1]*t;
    const y=j>=R?terrainHeight(p0[0],p0[1])*(1-t)+terrainHeight(p1[0],p1[1])*t:terrainHeight(x,z);
    v.push(x,y,z);
    const c=new THREE.Color(P.mintLight).lerp(new THREE.Color(P.mint),Math.min(j/R,1)*.78);
    c.multiplyScalar(.99+.025*Math.sin(i*.18+j*.41));
    c.lerp(new THREE.Color(P.sand),sandBlend(x,z));colors.push(c.r,c.g,c.b);
  }
  for(let j=0;j<R+meadowRows;j++)for(let i=0;i<N;i++){
    const a=j*N+i,b=j*N+(i+1)%N,c=(j+1)*N+i,d=(j+1)*N+(i+1)%N;
    ix.push(a,c,d,a,d,b);
  }
  const rim=Array.from({length:N},(_,i)=>(R+meadowRows)*N+i);
  const nearPool=(x,z)=>Math.min(...pools.map(pool=>
    Math.abs(poolRadius(pool,x,z)-1.073)*Math.min(pool.rx,pool.rz)));
  const triangles=refineShoreline(v,colors,ix,rim,terrainHeight,nearPool,{maxEdge:.032,reach:.050,passes:4});
  const top=new THREE.BufferGeometry();top.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
  top.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));top.setIndex(triangles);top.computeVertexNormals();
  const surface=mesh(top,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),g);
  walkables.push(surface);g.userData.surface=surface;

  createGeology(g,{
    outline:pinwheelRim,topHeight:terrainHeight,segments:48,phase:2.28,
    colors:[P.rock,0xcbc1af,0xb0b2a6,0xa2a99d,0xb9b1a4],
    outcrops:[[5.52,.72,-1.48,.81,.56,.66,1],[.25,.69,-1.8,.71,.48,.6,2],[3.11,.54,-2.73,.79,.51,.65,4]],
    satellite:[5.95,1.12,-1.55,.31,2]
  });

  // Small sandy clearings are kept fully inside the geological rim.
  for(const [cx,cz,rx,rz] of [[-3.15,-1.95,.57,.3],[3.45,1.55,.6,.34],[2.45,-2.68,.42,.24]]){
    const points=[],faces=[],n=32;points.push(cx,terrainHeight(cx,cz)+.012,cz);
    for(let i=0;i<n;i++){
      const a=i*2*Math.PI/n,x=cx+Math.cos(a)*rx*(1+.08*Math.sin(3*a)),z=cz+Math.sin(a)*rz*(1+.06*Math.cos(5*a));
      points.push(x,terrainHeight(x,z)+.012,z);if(i<n-1)faces.push(0,i+1,i+2);
    }
    faces.push(0,n,1);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    geo.setIndex(faces);geo.computeVertexNormals();mesh(geo,mat(P.sand,{side:THREE.DoubleSide}),g);
  }
  return g;
}
