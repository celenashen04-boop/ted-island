import * as THREE from './three.module.min.js';
import { islandIconOutlines } from './island-icons.mjs';

const accents = ['#a34733', '#256347', '#3c5596'];
const reliefs = [];
let woodMaterial;
let tagGeometry;

function woodenTag() {
  const shape = new THREE.Shape();
  shape.moveTo(-.34,.49);
  shape.lineTo(-.48,.35);
  shape.lineTo(-.48,-.39);
  shape.quadraticCurveTo(-.48,-.49,-.38,-.49);
  shape.lineTo(.38,-.49);
  shape.quadraticCurveTo(.48,-.49,.48,-.39);
  shape.lineTo(.48,.35);
  shape.lineTo(.34,.49);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape,{depth:.72,bevelThickness:.14,bevelSize:.02,bevelSegments:1,curveSegments:3});
  const position=geometry.getAttribute('position');
  const normal=geometry.getAttribute('normal');
  const uv=geometry.getAttribute('uv');
  for(let i=0;i<uv.count;i++){
    if(normal.getZ(i)>.98)uv.setXY(i,.5+position.getX(i),.5+position.getY(i));
    else uv.setXY(i,.025,.025);
  }
  // Center the thin extrusion so one side can sit just inside the bark.
  geometry.translate(0,0,-.36);
  return geometry;
}

function tagMaterial() {
  if (woodMaterial) return woodMaterial;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle='#a6794d';
  context.fillRect(0,0,128,128);
  context.fillStyle='#dfb887';
  context.fillRect(7,11,114,106);
  context.lineWidth=1.5;
  for (let row=16;row<116;row+=9) {
    context.strokeStyle=row%2 ? '#ce9d69' : '#e9c597';
    context.beginPath();
    context.moveTo(8,row);
    context.bezierCurveTo(42,row-8,77,row+5,120,row-3);
    context.stroke();
  }
  context.fillStyle='#72563c';
  context.beginPath();
  context.arc(64,17,3.5,0,Math.PI*2);
  context.fill();
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  woodMaterial=new THREE.MeshStandardMaterial({map:texture,roughness:.85});
  return woodMaterial;
}

function emblemRelief(island) {
  if (reliefs[island]) return reliefs[island];
  // Sample the same vector outlines the HUD uses, then sweep a rounded ridge
  // along each stroke. The lower half of each ridge intersects the wood face.
  const svgPath=document.createElementNS('http://www.w3.org/2000/svg','path');
  const strokes=islandIconOutlines[island].match(/[Mm][^Mm]*/g);
  const positions=[], normals=[], indices=[];
  for (const stroke of strokes) {
    svgPath.setAttribute('d',stroke);
    const length=svgPath.getTotalLength();
    const segments=Math.max(6,Math.ceil(length*1.5));
    const points=Array.from({length:segments+1},(_,i)=>{
      const {x,y}=svgPath.getPointAtLength(i/segments*length);
      return new THREE.Vector3((x-12)*.027,(11-y)*.027,0);
    });
    const closed=/z$/i.test(stroke);
    if (closed) points.pop();
    const curve=new THREE.CatmullRomCurve3(points,closed);
    const geometry=new THREE.TubeGeometry(curve,segments,.027,6,closed);
    geometry.scale(1,1,5);
    geometry.translate(0,0,.53);
    const offset=positions.length/3;
    positions.push(...geometry.getAttribute('position').array);
    normals.push(...geometry.getAttribute('normal').array);
    for (const index of geometry.index.array) indices.push(offset+index);
    geometry.dispose();
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setIndex(indices);
  const material=new THREE.MeshStandardMaterial({color:accents[island],roughness:.74});
  return reliefs[island]={geometry,material};
}

export function attachOriginEmblem(stem, proportion, height) {
  tagGeometry ??= woodenTag();
  const { height: stemHeight, radiusTop, radiusBottom } = stem.geometry.parameters;
  const stemRadius = THREE.MathUtils.lerp(radiusBottom,radiusTop,proportion);
  const emblem = new THREE.Mesh(tagGeometry, null);
  emblem.name = 'Wooden origin emblem';
  emblem.scale.set(height*.83,height,height*.09);
  emblem.position.y = stemHeight*(proportion-.5);
  emblem.visible = false;
  emblem.userData.stemRadius = stemRadius;
  stem.add(emblem);
  return emblem;
}

export function setOriginEmblem(emblem, island, yaw) {
  emblem.visible = Object.hasOwn(islandIconOutlines,island);
  if (emblem.visible) {
    emblem.material=tagMaterial();
    const {geometry,material}=emblemRelief(island);
    if (!emblem.children.length) {
      const relief=new THREE.Mesh(geometry,material);
      relief.name='Embossed island icon';
      emblem.add(relief);
    } else {
      emblem.children[0].geometry=geometry;
      emblem.children[0].material=material;
    }
  }
  emblem.rotation.y = yaw;
  const offset = emblem.userData.stemRadius + emblem.scale.z*.22;
  emblem.position.x = Math.sin(yaw)*offset;
  emblem.position.z = Math.cos(yaw)*offset;
}
