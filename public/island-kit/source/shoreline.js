import * as THREE from '../three.module.min.js';

// Clip the horizontal water plane against the same triangles the terrain renders.
export function shorelineVertices(terrain,level,domain){
  const {position}=terrain.geometry.attributes,index=terrain.geometry.index;
  const vertices=Array.from({length:position.count},(_,i)=>{
    const x=position.getX(i),z=position.getZ(i);
    return [x,position.getY(i)-level,z,domain(x,z)];
  });
  const out=[];
  for(let i=0;i<index.count;i+=3){
    const triangle=[vertices[index.getX(i)],vertices[index.getX(i+1)],vertices[index.getX(i+2)]];
    if(triangle.every(p=>p[1]>0)||triangle.every(p=>p[3]>0))continue;
    const polygon=clip(clip(triangle,3),1);
    for(let k=1;k<polygon.length-1;k++){
      for(const [x,,z] of [polygon[0],polygon[k],polygon[k+1]])out.push(x,level,z);
    }
  }
  return out;
}

function clip(polygon,axis){
  const result=[];
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length];
    if(a[axis]<=0)result.push(a);
    if((a[axis]<=0)!==(b[axis]<=0)){
      const t=a[axis]/(a[axis]-b[axis]);
      result.push(a.map((value,j)=>THREE.MathUtils.lerp(value,b[j],t)));
    }
  }
  return result;
}

// Densify only the channel banks. Adjacent triangles share each split edge.
export function refineShoreline(positions,colors,indices,boundary,height,domain,
  {maxEdge=.074,reach=.22,passes=3}={}){
  const values=[];
  for(let i=0;i<positions.length;i+=3)values.push(domain(positions[i],positions[i+2]));
  const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
  const rim=new Set(boundary.map((a,i)=>edgeKey(a,boundary[(i+1)%boundary.length])));
  let triangles=indices;
  for(let pass=0;pass<passes;pass++){
    const midpoints=new Map(),out=[];
    function midpoint(i,j){
      const key=edgeKey(i,j);
      if(midpoints.has(key))return midpoints.get(key);
      const length=Math.hypot(positions[i*3]-positions[j*3],positions[i*3+2]-positions[j*3+2]);
      if(rim.has(key)||length<=maxEdge||Math.min(values[i],values[j])>reach+length*.5)return -1;
      const x=(positions[i*3]+positions[j*3])*.5,z=(positions[i*3+2]+positions[j*3+2])*.5;
      const mid=positions.length/3;
      positions.push(x,height(x,z),z);
      for(let channel=0;channel<3;channel++)colors.push((colors[i*3+channel]+colors[j*3+channel])*.5);
      values.push(domain(x,z));
      midpoints.set(key,mid);
      return mid;
    }
    for(let i=0;i<triangles.length;i+=3){
      let [a,b,c]=triangles.slice(i,i+3);
      let ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
      const count=Number(ab>=0)+Number(bc>=0)+Number(ca>=0);
      if(count===0)out.push(a,b,c);
      else if(count===3)out.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
      else if(count===1){
        if(bc>=0){[a,b,c]=[b,c,a];ab=bc}
        else if(ca>=0){[a,b,c]=[c,a,b];ab=ca}
        out.push(a,ab,c,ab,b,c);
      }else{
        if(ab<0){[a,b,c]=[b,c,a];[ab,bc]=[bc,ca]}
        else if(bc<0){[a,b,c]=[c,a,b];[ab,bc]=[ca,ab]}
        out.push(a,ab,c,ab,bc,c,ab,b,bc);
      }
    }
    triangles=out;
  }
  return triangles;
}
