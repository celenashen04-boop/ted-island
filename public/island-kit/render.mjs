import * as THREE from './three.module.min.js';
import { islands, islandScale, islandSpacing } from '../islands.mjs';
import { islandModel } from './navigation.mjs';
import { createPlantBillboards } from './plant-billboards.mjs';
import { createPlantedTrees } from './planted-trees.mjs';
import { createBridgeGate } from './bridge-gates.mjs';

// Rendering mood (Phase 7; Cassius picked option B, Clear noon). OFF by default:
// with no ?mood= param the game renders exactly as before. ?mood=noon turns it
// on for testing, ?mood=off forces it off. Ray signs off before MOOD_DEFAULT
// changes from null. See docs/ui-handoff.md section 10.
const MOOD_DEFAULT = null;
function moodFlag() {
  const param = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('mood');
  return param === 'off' ? null : param ?? MOOD_DEFAULT;
}

export function createIslandRenderer({nativePlants=false}={}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return null;
  }
  const graphic = renderer.domElement;
  graphic.className = 'island-renderer';
  graphic.setAttribute('aria-hidden', 'true');
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb4cbb9, 1.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
  sun.position.set(-10, 18, 12);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd8f4ec, .55);
  fill.position.set(9, 5, -8);
  scene.add(fill);

  const models = islands.map(island => islandModel(island.id));
  for (const model of models) scene.add(model.group);
  const perspective = new THREE.PerspectiveCamera(52, 1, .055, 150 * islandScale);
  const overview = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 175 * islandScale);
  const bridge = new THREE.Mesh(new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  bridge.visible = false;
  scene.add(bridge);
  const gateGroup = new THREE.Group();
  const gates = new Map();
  scene.add(gateGroup);
  const pixelSize = new THREE.Vector2();
  const plants = createPlantBillboards(scene);
  const trees = nativePlants ? createPlantedTrees(scene,models) : null;
  const pickRay = new THREE.Raycaster();
  const pickPoint = new THREE.Vector2();
  const cameraForward = new THREE.Vector3();
  const offsetToMesh = new THREE.Vector3();
  const tagBounds = new WeakMap();
  const tagHits = [];
  let tagOccluders, tagIsland;

  function nearbyTagOccluders() {
    const nearby = [];
    const roots = [models[tagIsland]?.group, bridge, gateGroup, ...trees.tagTargets()];
    for (const root of roots) {
      root?.traverseVisible(mesh => {
        if (!mesh.isMesh) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        if (!materials.some(material => material?.visible && !material.transparent)) return;
        const source = mesh.isInstancedMesh ? mesh : mesh.geometry;
        if (!source.boundingSphere) source.computeBoundingSphere();
        if (!source.boundingSphere || !Number.isFinite(source.boundingSphere.radius)) return;
        let sphere = tagBounds.get(mesh);
        if (!sphere) {
          sphere = new THREE.Sphere();
          tagBounds.set(mesh, sphere);
        }
        sphere.copy(source.boundingSphere).applyMatrix4(mesh.matrixWorld);
        if (sphere.center.distanceToSquared(perspective.position) > (6.5 + sphere.radius) ** 2) return;
        nearby.push({ mesh, sphere, id: root.userData.tagId });
      });
    }
    return nearby;
  }

  // Mood: loaded only when the flag is on, so the default game never requests mood.mjs.
  let mood = null, moodView = 'player', plantSpots = [];
  const moodId = moodFlag();
  if (moodId) import('./mood.mjs').then(({ createMood, MOODS, ISLAND_HUES }) => {
    if (!MOODS[moodId] || moodId === 'current') return;
    mood = createMood({ scene, renderer, canvas: graphic, hemi, sun, fill,
      islands: models.map((model, id) => ({ group: model.group, hue: ISLAND_HUES[id] })) });
    mood.setShadowSpots(plantSpots);
    mood.apply(moodId, moodView);
  }).catch(() => {});
  function setMoodView(view) {
    if (mood && moodView !== view) mood.apply(undefined, view);
    moodView = view;
  }
  let last = 0, elapsed = 0, frameMs = 0;

  function draw(canvas, width, height, camera) {
    if (graphic.nextElementSibling !== canvas) canvas.before(graphic);
    renderer.getSize(pixelSize);
    if (pixelSize.x !== width || pixelSize.y !== height) renderer.setSize(width, height, false);
    const now = performance.now();
    const interval = last ? now - last : 0;
    const delta = Math.min(.05, interval / 1000);
    if (interval > 0 && interval < 250) frameMs = frameMs ? frameMs * .9 + interval * .1 : interval;
    last = now;
    elapsed += delta;
    for (const model of models) model.update(delta, elapsed);
    renderer.render(scene, camera);
  }

  return {
    metrics() { return frameMs ? {view:moodView === 'player' ? 'Player View' : 'World View', calls:renderer.info.render.calls, ms:frameMs} : null; },
    // Contact shadows need plant ground points ({ x, y, z, radius } in world units).
    // Nothing calls this yet: plants are still drawn on the 2D canvas.
    setPlantSpots(spots) { plantSpots = spots; mood?.setShadowSpots(spots); },
    setGates(island, definitions) {
      const location=islands.find(item=>item.id===island);
      if(!location)return;
      gateGroup.position.set(location.x*islandSpacing,location.y*islandSpacing,location.z*islandSpacing);
      const keep=new Set();
      for(const {key,destination,center,yaw,opening} of definitions){
        keep.add(key);
        if(!gates.has(key)){
          const gate=createBridgeGate(destination);
          gates.set(key,gate);
          gateGroup.add(gate.root);
        }
        const gate=gates.get(key);
        gate.root.position.set(...center);
        gate.root.rotation.y=yaw;
        gate.setOpening(opening);
      }
      for(const [key,gate] of gates){
        if(keep.has(key))continue;
        gate.dispose();
        gates.delete(key);
      }
    },
    setGateOpening(key,opening) {
      gates.get(key)?.setOpening(opening);
    },
    setBridgeFaces(faces, island) {
      const location = islands.find(item => item.id === island);
      if (!location) return;
      const positions = [], colors = [];
      const color = new THREE.Color();
      for (const face of faces) {
        color.set(face.color);
        for (let i = 1; i < face.points.length - 1; i++) {
          for (const point of [face.points[0], face.points[i], face.points[i + 1]]) {
            positions.push(...point);
            colors.push(color.r, color.g, color.b);
          }
        }
      }
      bridge.geometry.dispose();
      bridge.geometry = new THREE.BufferGeometry();
      bridge.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      bridge.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      bridge.position.set(location.x * islandSpacing, location.y * islandSpacing, location.z * islandSpacing);
    },
    nativePlants,
    blocksPlantedMovement(island,plant,...motion) {
      return trees?.blocksPlanted(island,plant,...motion) ?? false;
    },
    plantedStage(island,id) {
      return trees?.stage(island,id);
    },
    tagIsOccluded(x, y, width, height, depth, plantId) {
      tagOccluders ??= nearbyTagOccluders();
      pickPoint.set(x / width * 2 - 1, 1 - y / height * 2);
      pickRay.setFromCamera(pickPoint, perspective);
      const {origin,direction} = pickRay.ray;
      pickRay.far = Math.min(6.5, Math.max(0, depth / direction.dot(cameraForward) - .025));
      for (const {mesh,sphere,id} of tagOccluders) {
        if (id === plantId) continue;
        offsetToMesh.subVectors(sphere.center,origin);
        const along = offsetToMesh.dot(direction);
        if (along + sphere.radius < 0 || along - sphere.radius > pickRay.far ||
            offsetToMesh.lengthSq() - along ** 2 > sphere.radius ** 2) continue;
        tagHits.length = 0;
        mesh.raycast(pickRay,tagHits);
        if (tagHits.some(hit => {
          const material = Array.isArray(mesh.material) ? mesh.material[hit.face.materialIndex] : mesh.material;
          return material?.visible && !material.transparent;
        })) return true;
      }
      return false;
    },
    pickTree(x,y,width,height) {
      if(!trees || !width || !height)return null;
      pickPoint.set(x/width*2-1,1-y/height*2);
      pickRay.setFromCamera(pickPoint,perspective);
      pickRay.far=Infinity;
      for(const {object,distance} of pickRay.intersectObjects(trees.tagTargets(),true)){
        let id;
        for(let part=object;part;part=part.parent){
          if(!part.visible)break;
          if(part.userData.tagId){id=part.userData.tagId;break;}
        }
        if(!id)continue;
        const depth=distance*pickRay.ray.direction.dot(perspective.getWorldDirection(cameraForward));
        return this.plantIsOccluded(x,y,width,height,depth,id)?null:id;
      }
      return null;
    },
    plantIsOccluded(x, y, width, height, depth, plantId) {
      pickPoint.set(x / width * 2 - 1, 1 - y / height * 2);
      pickRay.setFromCamera(pickPoint, perspective);
      const distance = depth / pickRay.ray.direction.dot(perspective.getWorldDirection(cameraForward));
      pickRay.far = Math.max(0, distance - .025);
      const otherTrees = trees?.tagTargets().filter(root=>root.userData.tagId!==plantId) ?? [];
      return pickRay.intersectObjects([...models.filter(model=>model.group.visible).map(model=>model.group),bridge,gateGroup,...otherTrees], true)
        .some(({object,face}) => {
          for (let part=object;part;part=part.parent) if (!part.visible) return false;
          const material = Array.isArray(object.material) ? object.material[face.materialIndex] : object.material;
          return material?.visible && !material.transparent;
        });
    },
    player(canvas, { x, eye, z, yaw, pitch, island, width, height, focal }, artwork, garden, paint) {
      const location = islands.find(item => item.id === island);
      if (!location) return;
      for (const [index, model] of models.entries()) {
        model.group.visible = index === island || !artwork.has('island-' + index);
      }
      bridge.visible = true;
      gateGroup.visible = true;
      const origin = [location.x * islandSpacing,location.y * islandSpacing,location.z * islandSpacing];
      const native = trees?.drawPlanted(island,garden,origin,performance.now());
      plants.draw(garden,origin,yaw,artwork,paint,native);
      setMoodView('player');
      const horizontal = Math.cos(pitch);
      perspective.position.set(x + location.x * islandSpacing, eye + location.y * islandSpacing, z + location.z * islandSpacing);
      perspective.lookAt(perspective.position.x + Math.sin(yaw) * horizontal,
        perspective.position.y + Math.sin(pitch), perspective.position.z - Math.cos(yaw) * horizontal);
      perspective.fov = Math.atan(height / (2 * focal)) * 360 / Math.PI;
      perspective.aspect = width / height;
      perspective.updateProjectionMatrix();
      draw(canvas, width, height, perspective);
      perspective.getWorldDirection(cameraForward);
      tagIsland = island;
      tagOccluders = null;
    },
    world(canvas, { width, height, yaw, pitch, scale }, artwork) {
      for (const [index, model] of models.entries()) model.group.visible = !artwork.has('island-' + index);
      bridge.visible = false;
      gateGroup.visible = false;
      trees?.hidePlanted();
      plants.hide();
      setMoodView('world');
      const unit = islandSpacing / scale;
      overview.left = -width * .5 * unit;
      overview.right = width * .5 * unit;
      overview.top = height * .53 * unit;
      overview.bottom = -height * .47 * unit;
      const distance = 75 * islandScale;
      overview.position.set(Math.sin(yaw) * Math.cos(pitch) * distance, Math.sin(pitch) * distance,
        Math.cos(yaw) * Math.cos(pitch) * distance);
      overview.lookAt(0, 0, 0);
      overview.updateProjectionMatrix();
      draw(canvas, width, height, overview);
    },
  };
}
