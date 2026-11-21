import * as THREE from '../../three.module.min.js';
import {add,beam,ground,material,C} from './common.js';

export const greenhouse={x:.4,z:.55,y:.5};
export const greenhouseFront={halfWidth:.46,innerZ:-.78};
const floorY=greenhouse.y+.2075;
const doorStart=greenhouse.z-1.38;
const doorEnd=greenhouse.z+1.38;
const landingBack=2.98;
const bridgeWidth=.76;
const junctionZ=doorEnd+bridgeWidth*.5;

export function frontTerraceNotch(points){
  const {x}=greenhouse;
  const {halfWidth,innerZ}=greenhouseFront;
  const left=x-halfWidth,right=x+halfWidth;
  const outline=[];
  const spliceAt=(a,b,px)=>[px,THREE.MathUtils.lerp(a[1],b[1],(px-a[0])/(b[0]-a[0]))];
  for(const [i,a] of points.entries()){
    const b=points[(i+1)%points.length];
    if(a[1]>innerZ||a[0]<left||a[0]>right)outline.push(a);
    if(a[1]<innerZ&&b[1]<innerZ&&a[0]<left&&b[0]>=left){
      outline.push(spliceAt(a,b,left),[left,innerZ],[right,innerZ]);
    }
    if(a[1]<innerZ&&b[1]<innerZ&&a[0]<=right&&b[0]>right)outline.push(spliceAt(a,b,right));
  }
  return outline;
}

export function nearGreenhouseApproach(x,z){
  return (Math.abs(x-.4)<.61&&z>2.91&&z<3.99)
    || (x>-2.65&&x<2.6&&z>1.75+Math.max(0,2.5-Math.abs(x-.4))*.20&&z<3.21);
}

export function addGreenhouseAccess(group,walkables,groundAt,supportAt){
  const wood=material(C.timberLight,{side:THREE.DoubleSide,vertexColors:true});
  const stripWood=material(C.timber,{side:THREE.DoubleSide});
  const post=material(C.timber);
  const clay=material(0xb88165);
  const endGrain=material(C.timber);
  const gardenTread=material(0xbf9168);
  const bridgeTread=material(C.timberLight);
  const fastener=material(C.copper,{metalness:.34,roughness:.58});
  const pin=new THREE.CylinderGeometry(.012,.012,.007,10);
  const edge=material(0xd2a377);
  const {x}=greenhouse;
  const halfLanding=.46, width=bridgeWidth;
  const stripWidth=.055, stripHeight=.025, pitch=.22;
  function walk(mesh,kind){
    mesh.userData.navSurface=kind;
    walkables.push(mesh);
    return mesh;
  }
  function support(x,z,top){
    const y=supportAt(x,z);
    if(top>y+.06)beam(group,[x,y-.035,z],[x,top+.006,z],.042,post,7);
  }
  function landing(w,h,d,position,kind,alongX=false){
    walk(add(new THREE.BoxGeometry(w,h,d),edge,group,position),kind);
    const length=alongX?w:d, count=Math.round(length/pitch);
    for(let i=0;i<count;i++){
      const offset=((i+.5)/count-.5)*length;
      const [x,y,z]=position;
      const strip=add(new THREE.BoxGeometry(alongX?stripWidth:w-.024,stripHeight,alongX?d-.024:stripWidth),
        stripWood,group,[x+(alongX?offset:0),y+h*.5+stripHeight*.5-.003,z+(alongX?0:offset)]);
      strip.userData.walkableTrim=true;
    }
  }
  landing(halfLanding*2,.075,landingBack-doorEnd,
    [x,floorY-.0375,(doorEnd+landingBack)*.5],'door_landing');
  for(const dx of [-.33,.33])support(x+dx,2.47,floorY-.075);

  function steps(near,far,count,tread){
    const width=.84, depth=Math.abs(far-near)/count;
    const toe=Math.max(groundAt(x-width*.5,far),groundAt(x+width*.5,far),groundAt(x,far));
    const bottom=toe-.11;
    const treadThickness=.043,cap=new THREE.BoxGeometry(width,treadThickness,depth);
    const capMaterials=[endGrain,endGrain,tread,endGrain,endGrain,endGrain];
    for(let i=0;i<count;i++){
      const height=THREE.MathUtils.lerp(floorY,toe,(i+1)/(count+1));
      // The first tread is one riser below the threshold.
      const center=THREE.MathUtils.lerp(near,far,(i+.5)/count);
      const riserTop=height-treadThickness;
      const riser=add(new THREE.BoxGeometry(width,riserTop-bottom,depth),clay,group,
        [x,(riserTop+bottom)*.5,center]);
      riser.userData.walkableTrim=true;
      walk(add(cap,capMaterials,group,[x,height-treadThickness*.5,center]),'stair');
      const fastenerZ=center+Math.sign(far-near)*depth*.20;
      for(const side of [-1,1]){
        const nail=add(pin,fastener,group,[x+side*(width*.5-.049),height-.0025,fastenerZ]);
        nail.userData.walkableTrim=true;
      }
    }
  }
  steps(doorStart,-1.85,5,gardenTread);
  steps(landingBack,3.87,5,bridgeTread);

  function deck(points,span,{startTangent,endTangent,pavilion=false}={}){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');
    const length=curve.getLength();
    const count=Math.ceil(length/.17), positions=[],colors=[];
    const sections=[];
    const pavilionRim=Array.from({length:20},(_,i)=>{
      const a=i*2*Math.PI/20;
      return [3.72+1.02*Math.cos(a),1.7+1.02*Math.sin(a)];
    });
    function pavilionEdge(z){
      for(const [i,a] of pavilionRim.entries()){
        const b=pavilionRim[(i+1)%pavilionRim.length];
        if((a[1]<=z)===(b[1]<=z))continue;
        const rimX=THREE.MathUtils.lerp(a[0],b[0],(z-a[1])/(b[1]-a[1]));
        if(rimX<3.72)return new THREE.Vector3(rimX,.44,z);
      }
    }
    for(let i=0;i<=count;i++){
      const p=curve.getPointAt(i/count);
      const fixed=i===0?startTangent:i===count?endTangent:null;
      const d=fixed?new THREE.Vector3(...fixed):curve.getTangentAt(i/count);
      const normal=new THREE.Vector3(-d.z,0,d.x).normalize().multiplyScalar(span*.5);
      const row=[p.clone().sub(normal),p.clone().add(normal)];
      if(pavilion&&i===count){
        // Meet the pavilion at its circular top edge, at each end of the last board.
        row[0]=pavilionEdge(row[0].z);
        row[1]=pavilionEdge(row[1].z);
      }
      sections.push(row);
      if(i<count&&i%4===2){
        for(const offset of [-.24,.24]){
          const foot=p.clone().addScaledVector(normal,offset*2/span);
          support(foot.x,foot.z,p.y-.065);
        }
      }
    }
    const lower=p=>new THREE.Vector3(p.x,p.y-.065,p.z);
    function quad(a,b,c,d,tone){
      for(const v of [a,b,c,a,c,d]){
        positions.push(v.x,v.y,v.z);
        colors.push(tone,tone,tone);
      }
    }
    for(let i=0;i<count;i++){
      const [a,b]=sections[i],[c,d]=sections[i+1];
      if(pavilion&&i===count-1){
        const inside=pavilionRim.filter(([x,z])=>x<3.72&&z>c.z&&z<d.z)
          .sort((p,q)=>p[1]-q[1]).map(([x,z])=>new THREE.Vector3(x,.44,z));
        const seam=[c,...inside,d];
        for(let j=0;j<seam.length-1;j++){
          const u=seam[j],v=seam[j+1],fraction=z=>(z-c.z)/(d.z-c.z);
          quad(a.clone().lerp(b,fraction(u.z)),a.clone().lerp(b,fraction(v.z)),v,u,1);
        }
      }else quad(a,b,d,c,1);
      quad(a,c,lower(c),lower(a),.84);
      quad(b,lower(b),lower(d),d,.84);
    }
    const [a,b]=sections[0],[c,d]=sections[count];
    quad(a,lower(a),lower(b),b,.77);
    if(!pavilion)quad(c,d,lower(d),lower(c),.77);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.computeVertexNormals();
    const surface=walk(add(geometry,wood,group),'raised_walkway');
    surface.userData.curve=curve;


    const halfStrip=(span-.072)*.5;
    const stripGeometry=new THREE.BoxGeometry(halfStrip*2,stripHeight,stripWidth);
    const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
    let previous;
    for(let distance=pitch*.5;distance<length-.075;){
      const t=distance/length;
      const center=curve.getPointAt(t),forward=curve.getTangentAt(t);
      const across=new THREE.Vector3(forward.z,0,-forward.x).normalize();
      const up=new THREE.Vector3().crossVectors(forward,across).normalize();
      const tips=[center.clone().addScaledVector(across,-halfStrip),center.clone().addScaledVector(across,halfStrip)];
      if(previous){
        const direction=forward.clone().add(previous.forward).normalize();
        const gap=Math.min(...tips.map(p=>p.dot(direction)))-Math.max(...previous.tips.map(p=>p.dot(direction)));
        if(gap<.145){distance+=.018;continue}
      }

      // Sample the actual deck so a rigid strip can sit on the slope without hanging over it.
      const offsets=[];
      for(const side of [-1,0,1])for(const end of [-1,1]){
        const corner=center.clone().addScaledVector(across,side*halfStrip).addScaledVector(forward,end*stripWidth*.5);
        ray.set(new THREE.Vector3(corner.x,4,corner.z),down);
        const hit=ray.intersectObject(surface,false)[0];
        if(hit)offsets.push(hit.point.y-corner.y);
      }
      if(offsets.length<6||Math.max(...offsets)-Math.min(...offsets)>.015){
        distance+=.018;
        continue;
      }
      center.y+=(Math.min(...offsets)+Math.max(...offsets))*.5+.005;
      const strip=add(stripGeometry,stripWood,group,center.toArray());
      strip.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,up,forward));
      strip.name='Rectangular timber crosspiece';
      strip.userData.walkableTrim=true;
      previous={tips,forward};
      distance+=pitch;
    }
  }

  const westY=ground(-5.56,1.45)+.23;
  landing(.8,.065,width,[-3.05,.46-.0325,1.6],'raised_walkway',true);
  for(const dx of [-.29,.29])for(const dz of [-.27,.27])support(-3.05+dx,1.6+dz,.395);
  deck([[-5,westY,1.45],[-4.26,.37,1.50],[-3.45,.46,1.60]],width,
    {startTangent:[1,0,0],endTangent:[1,0,0]});
  deck([[-2.65,.46,1.60],[-2.33,.54,1.94],
    [-1.85,.63,junctionZ],[-1.45,.67,junctionZ],[-.72,.70,junctionZ],[x-halfLanding,floorY,junctionZ]],width,
    {startTangent:[1,0,0],endTangent:[1,0,0]});
  deck([[x+halfLanding,floorY,junctionZ],[1.38,.685,junctionZ],[1.92,.59,junctionZ],
    [2.23,.54,junctionZ],[2.51,.49,2.27],[2.79,.44,2.21]],width,{startTangent:[1,0,0],endTangent:[1,0,0],pavilion:true});
  deck([[-3.05,.46,1.22],[-3.31,.37,.74],[-3.65,.25,.05]],.69,{startTangent:[0,0,-1]});
}
