import * as THREE from './three.module.min.js';
import { islands, islandScale, islandSpacing } from '../islands.mjs';
import { islandModel } from './navigation.mjs';

// Rendering mood (Phase 7; Cassius picked option B, Clear noon). OFF by default:
// with no ?mood= param the game renders exactly as before. ?mood=noon turns it
// on for testing, ?mood=off forces it off. Ray signs off before MOOD_DEFAULT
// changes from null. See docs/ui-handoff.md section 10.
const MOOD_DEFAULT = null;
function moodFlag() {
  const param = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('mood');
  return param === 'off' ? null : param ?? MOOD_DEFAULT;
}

export function createIslandRenderer() {
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
  const pixelSize = new THREE.Vector2();

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
  let last = 0, elapsed = 0;

  function draw(canvas, width, height, camera) {
    if (graphic.nextElementSibling !== canvas) canvas.before(graphic);
    renderer.getSize(pixelSize);
    if (pixelSize.x !== width || pixelSize.y !== height) renderer.setSize(width, height, false);
    const now = performance.now();
    const delta = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now;
    elapsed += delta;
    for (const model of models) model.update(delta, elapsed);
    renderer.render(scene, camera);
  }

  return {
    // Contact shadows need plant ground points ({ x, y, z, radius } in world units).
    // Nothing calls this yet: plants are still drawn on the 2D canvas.
    setPlantSpots(spots) { plantSpots = spots; mood?.setShadowSpots(spots); },
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
    player(canvas, { x, eye, z, yaw, pitch, island, width, height, focal }, artwork) {
      const location = islands.find(item => item.id === island);
      if (!location) return;
      for (const [index, model] of models.entries()) {
        model.group.visible = index === island || !artwork.has('island-' + index);
      }
      bridge.visible = true;
      setMoodView('player');
      const horizontal = Math.cos(pitch);
      perspective.position.set(x + location.x * islandSpacing, eye + location.y * islandSpacing, z + location.z * islandSpacing);
      perspective.lookAt(perspective.position.x + Math.sin(yaw) * horizontal,
        perspective.position.y + Math.sin(pitch), perspective.position.z - Math.cos(yaw) * horizontal);
      perspective.fov = Math.atan(height / (2 * focal)) * 360 / Math.PI;
      perspective.aspect = width / height;
      perspective.updateProjectionMatrix();
      draw(canvas, width, height, perspective);
    },
    world(canvas, { width, height, yaw, pitch, scale }, artwork) {
      for (const [index, model] of models.entries()) model.group.visible = !artwork.has('island-' + index);
      bridge.visible = false;
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
