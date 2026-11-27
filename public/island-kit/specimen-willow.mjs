import * as THREE from './three.module.min.js';
import { add, beam, material } from './source/verdant/common.js';
import { makeGroundPetals } from './spiral-blossoms.mjs';
import { attachOriginEmblem, setOriginEmblem } from './origin-emblem.mjs';
import { displayOriginIsland } from './island-icons.mjs';

const up = new THREE.Vector3(0, 1, 0);
const foldedCrowns = new Map();
const treeStyles = {
  willow: { greens:[0x9ac477,0x83ac66,0xa9cc84], dormant:0x93956c, dry:0xc19b5d, branches:5, reach:1, fold:.25 },
  blossom: { greens:[0x71964d,0x8cb35e,0xabc47b], dormant:0x8c9371, dry:0xc5a69d, branches:4, reach:1.25, fold:.12 },
  grove: { greens:[0x9bc47f,0x80ab70,0xb5d790], dormant:0x9a9c67, dry:0xaf784d, branches:4, reach:1, fold:.19 },
  mint: { greens:[0x94c9a6,0x78b69e,0xb4ddba], dormant:0x829b88, dry:0xb4a16c, branches:3, reach:.88, fold:.24 },
};

function makeSprout(style, type) {
  const sprout = new THREE.Group();
  const stem = material(type==='mint'?0x569479:0x6f984b);
  const rounded=type==='blossom'||type==='grove';
  const top = rounded ? [.025,.24,0] : [.025,.29,-.018];
  const bend = rounded ? [.008,.12,-.025] : [-.018,.15,.01];
  beam(sprout, [0,0,0], bend, .013, stem, 8);
  beam(sprout, bend, top, .011, stem, 8);
  const leafGeometry = new THREE.SphereGeometry(1, 14, 8);
  const leaves = [
    [[-.132, .354, .053], 0x9fc878],
    [[.147, .397, -.069], type==='blossom'?style.greens[0]:style.greens[1]],
    [[.003, .348, -.151], type==='mint'?style.greens[2]:0xa8c783],
  ];
  if(type==='blossom'){
    leaves.splice(0,leaves.length,[[-.084,.39,.045],style.greens[0]],[[.14,.37,-.03],style.greens[1]]);
  }else if(rounded){
    leaves.splice(0,leaves.length,[[-.15,.32,.04],0x92b372],[[.16,.30,-.04],0xadc881]);
  }else if(type==='mint'){
    leaves[0]=[[-.122,.30,.12],style.greens[0]];
    leaves[1]=[[.15,.34,-.09],style.greens[1]];
    leaves.pop();
  }
  for (const [end,shade] of leaves) {
    const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...top));
    const leaf = add(leafGeometry, material(shade), sprout);
    leaf.position.copy(direction).multiplyScalar(.55).add(new THREE.Vector3(...top));
    leaf.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    leaf.scale.set(type==='blossom'?.045:rounded?.078:type==='mint'?.066:.050,direction.length()*.65,type==='mint'?.031:.021);
  }
  return sprout;
}

function makeEarlyWillow(top, bark, young, style) {
  const tree = new THREE.Group();
  tree.name = young ? 'Young tree' : 'Sapling';
  const leafGeometry = new THREE.SphereGeometry(1, 14, 10);
  const greens = style.greens.map(color=>material(color));
  const crownHeight = young ? .22 : .12;
  const leader = [-.06, top - crownHeight, .03];
  const fork = [0, top * (young ? .57 : .47), 0];
  beam(tree, [0, 0, 0], fork, young ? .058 : .038, bark, 9);
  beam(tree, fork, leader, young ? .044 : .026, bark, 8);
  const crown = add(leafGeometry, greens[0], tree, leader);
  crown.scale.set(young ? .31 : .135, crownHeight, young ? .29 : .12);

  const branches = young ? style.branches : 3;
  for (let index = 0; index < branches; index++) {
    const angle = index * Math.PI * 2 / branches + .42;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const reach = (young ? .49 + .09 * (index % 2) : .14 + .045 * (index % 2))*style.reach;
    const tipHeight = young ? top - .40 - .21 * (index % 2) : top * (.75 - .09 * index);
    const tip = [dx * reach, tipHeight, dz * reach];
    const base = [0, fork[1] + (young ? .13 : top * .04) * (index % 2), 0];
    beam(tree, base, tip, young ? .024 : .013, bark, 7);
    const tuft = add(leafGeometry, greens[index % greens.length], tree, tip);
    tuft.rotation.z = -.42 * dx;
    tuft.rotation.x = .42 * dz;
    tuft.scale.set(young ? .27 : .084, young ? .18 : .095, young ? .23 : .078);

    if (young) {
      const hanging = [tip[0] + dx * .07, tip[1] - .25, tip[2] + dz * .07];
      beam(tree, tip, hanging, .009, greens[index % greens.length], 5);
    }
  }
  return tree;
}

function earlyDormancy(group, stage, bark, tint) {
  const isSprout = stage === 'sprout';
  const tip = isSprout ? stemSegments(group, 1).at(-1).tip : null;
  const dormantTint = new THREE.Color(tint);
  const shades = new Map();
  const foliage = [];
  for (const mesh of group.children) {
    if (mesh.material === bark || (isSprout && mesh.geometry.type === 'CylinderGeometry')) continue;
    const live = mesh.material.color.clone();
    shades.set(mesh.material, { live, dull: live.clone().lerp(dormantTint, .88) });
    if (mesh.geometry.type !== 'SphereGeometry') continue;

    const position = mesh.position.clone();
    const scale = mesh.scale.clone();
    const restingPosition = position.clone();
    const restingScale = scale.clone();
    const restingRotation = mesh.quaternion.clone();
    if (isSprout) {
      const direction = position.clone().sub(tip);
      direction.set(direction.x * .45, -direction.length(), direction.z * .45).normalize();
      restingPosition.copy(tip).addScaledVector(direction, scale.y * .88);
      restingRotation.setFromUnitVectors(up, direction);
      restingScale.x *= .51;
      restingScale.z *= .72;
    } else {
      restingPosition.y -= scale.y * .45;
      restingScale.multiply(new THREE.Vector3(.70, .62, .76));
    }
    foliage.push({ mesh, position, scale, rotation: mesh.quaternion.clone(), restingPosition, restingScale, restingRotation });
  }
  let previousAmount;
  return amount => {
    if (amount === previousAmount) return;
    previousAmount = amount;
    for (const [leafMaterial, { live, dull }] of shades) leafMaterial.color.copy(live).lerp(dull, amount);
    for (const leaf of foliage) {
      leaf.mesh.position.copy(leaf.position).lerp(leaf.restingPosition, amount);
      leaf.mesh.scale.copy(leaf.scale).lerp(leaf.restingScale, amount);
      leaf.mesh.quaternion.copy(leaf.rotation).slerp(leaf.restingRotation, amount);
    }
  };
}

function stemSegments(stage, scale, bark) {
  return stage.children
    .filter(part => part.geometry?.type === 'CylinderGeometry' && (!bark || part.material === bark))
    .map(part => {
      const { height, radiusTop, radiusBottom } = part.geometry.parameters;
      const half = up.clone().multiplyScalar(height * .5).applyQuaternion(part.quaternion);
      return {
        base: part.position.clone().sub(half).multiplyScalar(scale),
        tip: part.position.clone().add(half).multiplyScalar(scale),
        radius: Math.max(radiusTop,radiusBottom)*scale,
      };
    });
}

function makeCompactTree(willow, top, matureTop, bark, young, style, type) {
  const tree=new THREE.Group();
  tree.name=young?'Young tree':'Sapling';
  const wood=stemSegments(willow,1,bark);
  const trunkCount=type==='mint'?1:2;
  const yScale=top/matureTop;
  const lateral=young?.92:.68;
  const position=point=>[point.x*lateral,point.y*yScale,point.z*lateral];
  for(const [index,segment] of wood.entries()){
    if(!young && index>=trunkCount)break;
    // The young tree follows the real trunk and short forks of its mature form.
    const end=index<trunkCount ? segment.tip : segment.base.clone().lerp(segment.tip,.82);
    beam(tree,position(segment.base),position(end),segment.radius*(young?.68:.42),bark,8);
  }

  const foliage=new THREE.SphereGeometry(1,14,10);
  const shades=style.greens.map(color=>material(color));
  const crown=willow.children.filter(part=>part.geometry?.type==='SphereGeometry')
    .sort((a,b)=>(b.position.y+b.scale.y)-(a.position.y+a.scale.y));
  const tip=wood[trunkCount-1].tip;
  if(type==='blossom'){
    for(const [i,side] of (young?[-1,1,0]:[-1,1]).entries()){
      const offset=side*(young?.34:.11);
      const centerY=top-(side===0?.17:young?.35+i*.065:.18+i*.15);
      const center=[tip.x*lateral+offset,centerY,tip.z*lateral+(i%2?.11:-.05)];
      const joint=[tip.x*lateral,Math.min(tip.y*yScale-.035,centerY-.12),tip.z*lateral];
      beam(tree,joint,center,young?.017:.011,bark,7);
      const spray=add(foliage,shades[i],tree,center);
      spray.rotation.z=side*.48;
      spray.scale.set(young?.32:.13,young?.17:.08,young?.21:.075);
    }
  }else if(young){
    const density=type==='mint'?2:3;
    for(const [i,part] of crown.slice(0,density).entries()){
      const group=add(foliage,shades[i%shades.length],tree,
        [part.position.x*.74,part.position.y-.01,part.position.z*.74]);
      group.scale.copy(part.scale).multiplyScalar(type==='mint'?.73:.78);
      if(i===0)group.position.y=top-group.scale.y;
    }
  }else if(type==='mint'){
    const [x,y,z]=position(tip);
    for(const [dx,dy,dz,size] of [[0,.12,0,.16],[-.095,.025,.05,.12]]){
      const bud=add(foliage,shades[dx===0?0:1],tree,[x+dx,y+dy,z+dz]);
      bud.scale.set(size,size*.84,size*.88);
    }
  }else{
    const [x,y,z]=position(tip);
    for(const [dx,dy,dz,rx,ry,k] of [[-.12,-.025,.04,.12,.115,1],[.11,.035,-.022,.12,.098,2],[0,.14,0,.102,.104,0]]){
      const bud=add(foliage,shades[k],tree,[x+dx,y+dy,z+dz]);
      bud.scale.set(rx,ry,rx*.72);
    }
  }
  return tree;
}

function hitsStem({base,tip,radius}, x,z,nextX,nextZ,feet,bodyRadius,bodyHeight) {
  if (feet + bodyHeight <= base.y || feet >= tip.y) return false;
  const rise = tip.y-base.y;
  const low = Math.max(0,(feet-base.y)/rise);
  const high = Math.min(1,(feet+bodyHeight-base.y)/rise);
  const dx = tip.x-base.x, dz = tip.z-base.z;
  const lengthSquared = dx*dx+dz*dz;
  function distanceSquared(px,pz) {
    const t = lengthSquared ? THREE.MathUtils.clamp(((px-base.x)*dx+(pz-base.z)*dz)/lengthSquared,low,high) : low;
    return (px-base.x-dx*t)**2+(pz-base.z-dz*t)**2;
  }
  const next = distanceSquared(nextX,nextZ);
  // A stage change can happen while someone is already touching the stem.
  return next < (bodyRadius+radius)**2 &&
    ((x===nextX && z===nextZ) || next < distanceSquared(x,z));
}

function witherGeometry(source, style, type) {
  const {widthSegments,heightSegments}=source.parameters;
  const key=[type,widthSegments,heightSegments].join(':');
  if(foldedCrowns.has(key))return foldedCrowns.get(key);
  // Reshape the leaf surface into broad folds while keeping its top and base.
  const geometry = source.clone();
  const folded = source.clone();
  const position = folded.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const fold = (1 - y * y) * Math.cos(5 * angle + 2 * y);
    const radius = 1 + fold * style.fold;
    const curl = (1 - y * y) * (.055 + .072 * Math.sin(3 * angle));
    if (type === 'blossom') {
      const pinch = .74 + .09 * Math.sin(2 * angle + 1.8 * y) - .10 * y;
      const droop = (1 - y * y) * (.23 + .15 * x);
      position.setXYZ(i, x * pinch + (1 + y) * .09, y * .78 - droop, z * pinch);
    } else {
      position.setXYZ(i, x * radius + curl, y - curl * .6, z * radius);
    }
  }
  folded.computeVertexNormals();
  geometry.morphAttributes.position = [position];
  geometry.morphAttributes.normal = [folded.getAttribute('normal')];
  folded.dispose();
  foldedCrowns.set(key,geometry);
  return geometry;
}

export function createTreeLifecycle(scene, source, treeScale=.88, model=null) {
  const type=source.userData.lifecycleTree?.style??'willow';
  const style=treeStyles[type];
  const root = new THREE.Group();
  root.name = source.name + ' · growth preview';
  root.visible = false;
  scene.add(root);
  const sprout = makeSprout(style,type);

  const willow = source.clone(false);
  for(const part of source.children)if(part.isMesh)willow.add(part.clone());
  willow.name = 'Mature '+source.name;
  const trunk = source.children[0];
  const pivot = up.clone().multiplyScalar(-trunk.geometry.parameters.height / 2)
    .applyQuaternion(trunk.quaternion).add(trunk.position);
  const palettes = new Map();
  const tendrils = [];
  const crowns = [];
  let crownGeometry;
  for (const part of [...willow.children]) {
    part.position.sub(pivot);
    if (part.geometry.type === 'CylinderGeometry') continue;

    const isTendril = part.geometry.type === 'TubeGeometry';
    const original = part.material;
    const key = (isTendril ? 'tendril' : 'canopy') + original.uuid;
    if (!palettes.has(key)) {
      const live = original.color.clone();
      const dormant = type === 'blossom'
        ? live.clone().lerp(new THREE.Color(0xbea9a0), .82)
        : live.clone().lerp(new THREE.Color(style.dormant), .83);
      const withered = type === 'blossom'
        ? dormant.clone().lerp(new THREE.Color(style.dry), .92)
        : live.clone().lerp(new THREE.Color(isTendril ? 0x937449 : style.dry), .85);
      palettes.set(key, { material: original.clone(), live, dormant, withered });
    }
    part.material = palettes.get(key).material;
    if (isTendril) {
      const anchor = new THREE.Group();
      const base = part.geometry.parameters.path.points[0];
      anchor.position.copy(base).sub(pivot);
      const axis = new THREE.Vector3(anchor.position.z, 0, -anchor.position.x).normalize();
      part.position.sub(anchor.position);
      anchor.add(part);
      willow.add(anchor);
      tendrils.push({ anchor, axis });
    } else {
      crownGeometry ??= witherGeometry(part.geometry,style,type);
      part.geometry = crownGeometry;
      part.updateMorphTargets();
      crowns.push(part);
    }
  }

  const matureTop = new THREE.Box3().setFromObject(willow).max.y;
  if(type==='blossom'){
    const tallest=crowns.reduce((a,b)=>a.position.y+a.scale.y>b.position.y+b.scale.y?a:b);
    for(const [index,crown] of crowns.entries()){
      crown.scale.set(crown.scale.x*.98,crown.scale.y*.68,crown.scale.z*.97);
      crown.position.x*=1.12;
      crown.position.z*=1.06;
      crown.position.y-=index%2*.08;
    }
    tallest.position.y=matureTop-tallest.scale.y;
  }
  // The side clusters shed first, exposing the forked branches.
  const canopy = crowns.map((crown, index) => ({ crown, height: crown.position.y, scale: crown.scale.clone(),
    sheds: type === 'blossom' && (index === 1 || index === 2) }));
  let groundPetals;
  const sapling = type==='willow' ? makeEarlyWillow(matureTop*.59,trunk.material,false,style)
    : makeCompactTree(willow,matureTop*.59,matureTop,trunk.material,false,style,type);
  const young = type==='willow' ? makeEarlyWillow(matureTop,trunk.material,true,style)
    : makeCompactTree(willow,matureTop,matureTop,trunk.material,true,style,type);
  const dormancy = new Map([
    ['sprout', earlyDormancy(sprout,'sprout',trunk.material,style.dormant)],
    ['sapling', earlyDormancy(sapling,'sapling',trunk.material,style.dormant)],
    ['young', earlyDormancy(young,'young',trunk.material,style.dormant)],
  ]);
  const trees = new THREE.Group();
  trees.scale.setScalar(treeScale);
  trees.add(sapling, young, willow);
  root.add(sprout, trees);
  const sproutStems = stemSegments(sprout,1);
  const saplingStems = stemSegments(sapling,treeScale,trunk.material);
  const youngStems = stemSegments(young,treeScale,trunk.material);
  const matureStems = stemSegments(willow,treeScale,trunk.material);
  const emblems = new Set([
    attachOriginEmblem(sprout.children[0],.69,.072),
    attachOriginEmblem(sapling.children[0],.57,.13),
    attachOriginEmblem(young.children[0],.59,.18),
    attachOriginEmblem(willow.children[0],.60,.21),
  ]);
  let markedOrigin, emblemYaw;
  const stems = new Map([['sprout',sproutStems],['sapling',saplingStems],['young',youngStems],
    ['mature',matureStems],['dormant',matureStems],['withered',matureStems],['revived',matureStems]]);

  return {
    object: root,
    blocksMovement(specimen,x,z,nextX,nextZ,feet,radius,height) {
      const solidStems = stems.get(specimen.previewStage);
      return solidStems?.some(stem => hitsStem(stem,
        x-specimen.x,z-specimen.z,nextX-specimen.x,nextZ-specimen.z,feet-specimen.y,radius,height)) ?? false;
    },
    hide() {
      root.visible=false;
      groundPetals?.draw(root.position,false);
    },
    remove() {
      groundPetals?.dispose();
      const sourceGeometries=new Set(source.children.map(part=>part.geometry));
      const sourceMaterials=new Set(source.children.map(part=>part.material));
      const geometries=new Set(), materials=new Set();
      root.traverse(part=>{
        if(!part.isMesh || emblems.has(part) || emblems.has(part.parent))return;
        if(!sourceGeometries.has(part.geometry) && part.geometry!==crownGeometry)geometries.add(part.geometry);
        if(!sourceMaterials.has(part.material))materials.add(part.material);
      });
      for(const geometry of geometries)geometry.dispose();
      for(const partMaterial of materials)partMaterial.dispose();
      root.removeFromParent();
    },
    draw(specimen, origin, now) {
      if (!specimen || !specimen.growth) {
        root.visible = false;
        groundPetals?.draw(root.position,false);
        return;
      }
      root.visible = true;
      const originIsland = displayOriginIsland(specimen);
      const yaw = specimen.emblemYaw ?? 0;
      if (originIsland !== markedOrigin || yaw !== emblemYaw) {
        for (const emblem of emblems) setOriginEmblem(emblem,originIsland,yaw);
        markedOrigin = originIsland;
        emblemYaw = yaw;
      }
      root.position.set(origin[0] + specimen.x, origin[1] + specimen.y, origin[2] + specimen.z);
      const stage = specimen.previewStage;
      if(type==='blossom'){
        const bloom=!specimen.dormant && !specimen.dormancyAmount && (stage==='mature'||stage==='revived');
        if(bloom&&model&&!groundPetals)groundPetals=makeGroundPetals(scene,model);
        groundPetals?.draw(root.position,bloom,now,matureTop*treeScale*.86);
      }
      const progress = specimen.previewStarted == null ? 1
        : THREE.MathUtils.clamp((now - specimen.previewStarted) / specimen.previewDuration, 0, 1);
      const dormant = specimen.dormant || stage === 'dormant';
      // The server's inactivity curve drives foliage only. Plant height and collision stay fixed.
      const amount = specimen.dormancyAmount ?? (dormant ? progress : 0);
      sprout.visible = stage === 'sprout';
      trees.visible = !sprout.visible;
      sapling.visible = stage === 'sapling';
      young.visible = stage === 'young';
      willow.visible = !sapling.visible && !young.visible;

      const early = dormancy.get(stage);
      if (early) {
        early(amount);
        return;
      }
      const wilt = stage === 'withered' ? .25 + progress * .75 : amount * .68;
      const shed = stage === 'withered' ? THREE.MathUtils.smoothstep(progress, .12, .85) : 0;
      for (const { crown, height, scale, sheds } of canopy) {
        const remaining = sheds ? 1 - shed : 1;
        crown.visible = remaining > 0;
        crown.morphTargetInfluences[0] = wilt;
        crown.position.y = height - scale.y * .32 * amount;
        crown.scale.set(scale.x * (1 - .23 * amount) * remaining,
          scale.y * (1 - .29 * amount) * remaining, scale.z * (1 - .23 * amount) * remaining);
      }
      for (const { anchor, axis } of tendrils) anchor.quaternion.setFromAxisAngle(axis, wilt * .48);
      for (const { material: leafMaterial, live, dormant, withered } of palettes.values()) {
        if (stage === 'withered') leafMaterial.color.copy(dormant).lerp(withered, progress);
        else leafMaterial.color.copy(live).lerp(dormant, amount);
      }
    },
  };
}
