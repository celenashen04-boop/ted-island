import * as THREE from '../../three.module.min.js';
import {palette,mesh,islandPolygonPoint} from './common.js';
import {createGeology} from './geology.js';
import {pondTerrainHeight,pondSandStrength,pondRadius} from './water.js';

export function createTerrain(scene){
  const group=new THREE.Group();scene.add(group);group.name='Island / geological landmass';
  const N=120,R=36,positions=[],colors=[],indices=[];
  const grassLight=new THREE.Color(palette.grassLight),grassDark=new THREE.Color(palette.grassDark),sand=new THREE.Color(palette.sand);
  for(let j=0;j<=R;j++)for(let i=0;i<N;i++){
    const scale=j/R,p=islandPolygonPoint(i*2*Math.PI/N,scale),x=p.x,z=p.y;
    const r=pondRadius(x,z),noise=THREE.MathUtils.smoothstep(r,1.35,1.6);
    const y=pondTerrainHeight(x,z)+(j===0||j===R?0:.015*Math.sin(i/5*3+j/6*4)*noise);
    positions.push(x,y,z);
    const variation=.52+.19*Math.sin(x*.62+z*.28)+.12*Math.sin(z*.91-x*.17)+.08*Math.cos(x*1.18+z*.73);
    const tone=grassDark.clone().lerp(grassLight,THREE.MathUtils.clamp(variation,0,1)).lerp(sand,pondSandStrength(x,z));colors.push(tone.r,tone.g,tone.b);
  }
  for(let j=0;j<R;j++)for(let i=0;i<N;i++){const a=j*N+i,b=j*N+(i+1)%N,c=(j+1)*N+i,d=(j+1)*N+(i+1)%N;indices.push(a,c,d,a,d,b)}
  const top=new THREE.BufferGeometry();top.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));top.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));top.setIndex(indices);top.computeVertexNormals();group.userData.surface=mesh(top,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),group);
  createGeology(group,{
    outline:(angle,scale)=>{const p=islandPolygonPoint(angle,scale);return [p.x,p.y]},
    topHeight:pondTerrainHeight,segments:N,phase:.45,
    colors:[palette.rock,0xc8c0b0,0xb0ab9d,0xa9a393,0xc4baa9],
    outcrops:[[.47,.73,-1.42,.82,.55,.67,1],[1.42,.67,-1.73,.68,.48,.62,2],[4.86,.54,-2.72,.78,.52,.58,4]],
    satellite:[1.72,1.13,-1.53,.32,2]
  });
  return group;
}
