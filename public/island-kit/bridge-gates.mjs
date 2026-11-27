import * as THREE from './three.module.min.js';

export const gatePostOffset = .60;
export const gatePostRadius = .105;
const bark = new THREE.MeshStandardMaterial({color:0x987550,roughness:.93});
const branchWood = new THREE.MeshStandardMaterial({color:0xb18c61,roughness:.9});
const binding = new THREE.MeshStandardMaterial({color:0x755e42,roughness:.91});
const accents = [0xbd664f,0x638460,0x6676a4].map(color => new THREE.MeshStandardMaterial({color,roughness:.75}));

function branch(group, points, radius, endRadius, material, roundedEnd=false) {
  const curve = new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)));
  const segments = roundedEnd?48:9, sides = roundedEnd?12:7;
  const geometry = new THREE.TubeGeometry(curve,segments,radius,sides);
  const position = geometry.getAttribute('position');
  for (let ring=0;ring<=segments;ring++) {
    const t=ring/segments;
    const point=curve.getPointAt(t);
    // Keep the post's crown in one surface so the rounded end has no cap seam.
    const cap=roundedEnd?THREE.MathUtils.clamp((t-.96)/.04,0,1):0;
    const taper=THREE.MathUtils.lerp(1,endRadius/radius,t)*Math.sqrt(1-cap*cap);
    for (let side=0;side<=sides;side++) {
      const i=ring*(sides+1)+side;
      position.setXYZ(i,
        THREE.MathUtils.lerp(point.x,position.getX(i),taper),
        THREE.MathUtils.lerp(point.y,position.getY(i),taper),
        THREE.MathUtils.lerp(point.z,position.getZ(i),taper));
    }
  }
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);
  group.add(mesh);
}

const knotGeometry = new THREE.SphereGeometry(1,10,7);
function knot(group, at, scale, material) {
  const mesh=new THREE.Mesh(knotGeometry,material);
  mesh.position.set(...at);
  mesh.scale.set(...scale);
  group.add(mesh);
}

export function createBridgeGate(destination) {
  const root=new THREE.Group();
  root.name='Curved timber bridge gate';
  const posts=new THREE.Group();
  root.add(posts);
  const leaves=[];
  for(const side of [-1,1]){
    const x=side*gatePostOffset;
    branch(posts,[[x,-.38,0],[x,.28,0],[x+side*.025,.72,.015],[x-side*.04,1.20,.04]],.145,.069,bark,true);
    branch(posts,[[x,.17,0],[x-side*.07,-.08,-.14],[x-side*.15,-.29,-.20]],.096,.032,bark);
    for(const y of [.36,.78])knot(posts,[x,y,0],[.129,.045,.129],binding);

    const leaf=new THREE.Group();
    leaf.position.x=x;
    root.add(leaf);
    leaves.push({leaf,side});
    const u=-side;
    branch(leaf,[[0,.35,0],[u*.18,.25,.02],[u*.40,.24,-.015],[u*.57,.38,0]],.047,.039,branchWood);
    branch(leaf,[[0,.78,0],[u*.17,.88,.02],[u*.37,.82,-.025],[u*.57,.68,0]],.052,.043,bark);
    for(const [distance,low,high] of [[.15,.28,.84],[.32,.25,.83],[.47,.29,.74]]){
      branch(leaf,[[u*distance,low,0],[u*(distance-.045),.50,.024],[u*(distance+.015),high,0]],.029,.023,branchWood);
    }
    branch(leaf,[[u*.57,.38,0],[u*.55,.52,.01],[u*.57,.68,0]],.039,.042,bark);
    if(side===1)knot(leaf,[u*.57,.53,-.055],[.068,.083,.034],accents[destination]);
  }
  return {
    root,
    setOpening(opening) {
      for(const {leaf,side} of leaves)leaf.rotation.y=side*opening*Math.PI*.51;
    },
    dispose() {
      root.traverse(node=>{if(node.isMesh&&node.geometry!==knotGeometry)node.geometry.dispose();});
      root.removeFromParent();
    },
  };
}
