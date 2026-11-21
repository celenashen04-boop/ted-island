import * as THREE from '../../three.module.min.js';
import {palette,mesh,islandPolygonPoint} from './common.js';
import {createGeology} from './geology.js';
import {pondTerrainHeight,pondSandStrength,pondRadius} from './water.js';
import {meadowOutline,meadowRows,meadowSample} from '../meadow.js';
import {refineShoreline} from '../shoreline.js';

function originalRim(angle, scale){
  const p=islandPolygonPoint(angle,scale);
  return [p.x,p.y];
}
export const spiralRim=meadowOutline(originalRim);

export function createTerrain(scene){
  const group=new THREE.Group();scene.add(group);group.name='Island / geological landmass';
  const N=120,R=36,positions=[],colors=[],indices=[];
  const grassLight=new THREE.Color(palette.grassLight),grassDark=new THREE.Color(palette.grassDark),sand=new THREE.Color(palette.sand);
  for(let j=0;j<=R+meadowRows;j++)for(let i=0;i<N;i++){
    const angle=i*2*Math.PI/N;
    const [x,z]=j<=R?originalRim(angle,j/R):meadowSample(angle,j-R,originalRim,spiralRim);
    const r=pondRadius(x,z),noise=THREE.MathUtils.smoothstep(r,1.35,1.6);
    const y=pondTerrainHeight(x,z)+(j===0||j>=R?0:.015*Math.sin(i/5*3+j/6*4)*noise);
    positions.push(x,y,z);
    const variation=.52+.19*Math.sin(x*.62+z*.28)+.12*Math.sin(z*.91-x*.17)+.08*Math.cos(x*1.18+z*.73);
    const tone=grassDark.clone().lerp(grassLight,THREE.MathUtils.clamp(variation,0,1)).lerp(sand,pondSandStrength(x,z));colors.push(tone.r,tone.g,tone.b);
  }
  for(let j=0;j<R+meadowRows;j++)for(let i=0;i<N;i++){const a=j*N+i,b=j*N+(i+1)%N,c=(j+1)*N+i,d=(j+1)*N+(i+1)%N;indices.push(a,c,d,a,d,b)}
  const originalCount=R*N*6, oldRim=Array.from({length:N},(_,i)=>R*N+i);
  const core=refineShoreline(positions,colors,indices.slice(0,originalCount),oldRim,
    pondTerrainHeight,(x,z)=>Math.abs(pondRadius(x,z)-1.035)*1.36,
    {maxEdge:.033,reach:.060,passes:4});
  const top=new THREE.BufferGeometry();top.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));top.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));top.setIndex(core.concat(indices.slice(originalCount)));top.computeVertexNormals();group.userData.surface=mesh(top,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),group);
  group.userData.originalTerrainIndexCount=core.length;
  createGeology(group,{
    outline:spiralRim,
    topHeight:pondTerrainHeight,segments:N,phase:.45,
    colors:[palette.rock,0xc8c0b0,0xb0ab9d,0xa9a393,0xc4baa9],
    outcrops:[[.47,.73,-1.42,.82,.55,.67,1],[1.42,.67,-1.73,.68,.48,.62,2],[4.86,.54,-2.72,.78,.52,.58,4]],
    satellite:[1.72,1.13,-1.53,.32,2]
  });
  return group;
}
