import * as THREE from '../../three.module.min.js';

// A low-poly underside with uneven ledges and broad, nonuniform rock volumes.
// `outline(angle, scale)` returns [x,z] and must match the island's top rim at scale 1.
export function createGeology(parent,{outline,topHeight,segments,colors,phase=0,outcrops=[],satellite=null}){
  const levels=[
    {s:1,y:0},{s:.98,y:-.22},{s:.90,y:-.68},{s:.82,y:-1.18},
    {s:.72,y:-1.75},{s:.68,y:-2.22},{s:.55,y:-2.85},
    {s:.42,y:-3.43},{s:.28,y:-4.02},{s:.19,y:-4.39}
  ];
  const shades=colors.map(c=>new THREE.Color(c));
  const positions=[],vertexColors=[];
  function triangle(a,b,c,tone){
    const color=shades[((tone%shades.length)+shades.length)%shades.length];
    for(const p of [a,b,c]){positions.push(...p);vertexColors.push(color.r,color.g,color.b)}
  }
  function point(i,j){
    const angle=i*2*Math.PI/segments,level=levels[j];
    if(j===0){const [x,z]=outline(angle,1);return [x,topHeight(x,z),z]}
    const amplitude=.035+.016*j;
    const ripple=1+amplitude*(.63*Math.sin(3*angle+phase+j*.47)+.42*Math.sin(5*angle-phase*.7-j*.68)+.24*Math.cos(7*angle+j*.31));
    const shelf=j>=3&&j<=7?.065*Math.sin(2*angle+phase+j*.8):0;
    const [px,pz]=outline(angle,level.s*ripple+shelf);
    const driftX=.085*j+.11*Math.sin(j*.71+phase),driftZ=.045*j+.12*Math.cos(j*.93-phase);
    const y=level.y+(.055+.024*j)*Math.sin(3*angle+phase+j*.56)+(.025+.009*j)*Math.cos(5*angle-j*.48);
    return [px+driftX,y,pz+driftZ]
  }
  for(let j=0;j<levels.length-1;j++)for(let i=0;i<segments;i++){
    const a=point(i,j),b=point((i+1)%segments,j),c=point(i,j+1),d=point((i+1)%segments,j+1);
    const tone=Math.floor(i/3)+Math.floor(j/2)+(Math.sin(i*1.7+j*2.3)> .68?1:0);
    triangle(a,c,b,tone);triangle(b,c,d,tone+(((i+j)%5===0)?1:0));
  }
  const center=[.085*(levels.length-1),-4.32,.045*(levels.length-1)];
  for(let i=0;i<segments;i++)triangle(point(i,levels.length-1),center,point((i+1)%segments,levels.length-1),Math.floor(i/3)+3);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));geo.computeVertexNormals();
  const body=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide}));body.castShadow=true;body.receiveShadow=true;parent.add(body);

  for(const [angle,scale,y,sx,sy,sz,tone] of outcrops){
    const [x,z]=outline(angle,scale);
    const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:colors[tone%colors.length],roughness:1,flatShading:true}));
    rock.position.set(x,y,z);rock.scale.set(sx,sy,sz);rock.rotation.set(.16,angle,.19);
    rock.castShadow=true;rock.receiveShadow=true;parent.add(rock);
  }
  if(satellite){const [angle,scale,y,size,tone]=satellite,[x,z]=outline(angle,scale),m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:colors[tone%colors.length],roughness:1,flatShading:true}));m.position.set(x,y,z);m.scale.set(size,size*.78,size*.9);m.rotation.set(.31,angle,.23);m.castShadow=true;m.receiveShadow=true;parent.add(m)}
  return body;
}
