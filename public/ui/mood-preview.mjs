// Phase 7 mood preview. Builds its own three.js scene from Ray's island models
// (read-only imports) so render.mjs, scene.mjs and world.mjs stay untouched.
// The renderer and lights copy render.mjs, so "Current" matches the game.
//
// URL: /ui/mood-preview.html?mood=current|morning|noon|dusk&view=player|world&ui=0
// Drag to look around. window.moodPreview.measure(seconds) reports frame stats.

import * as THREE from '../island-kit/three.module.min.js';
import { islands, islandScale, islandSpacing } from '../islands.mjs';
import { islandModel, canPlantOnIsland } from '../island-kit/navigation.mjs';
import { createMood, MOODS, ISLAND_HUES } from '../island-kit/mood.mjs';

const params = new URLSearchParams(location.search);
const stage = document.querySelector('.ui-mood__stage');

/* Renderer and lights: same settings as createIslandRenderer() in render.mjs. */
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
const canvas = renderer.domElement;
canvas.className = 'ui-mood__canvas';
canvas.setAttribute('aria-hidden', 'true');
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
stage.prepend(canvas);

const scene = new THREE.Scene();
const hemi = new THREE.HemisphereLight(0xffffff, 0xb4cbb9, 1.7);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
sun.position.set(-10, 18, 12);
const fill = new THREE.DirectionalLight(0xd8f4ec, .55);
fill.position.set(9, 5, -8);
scene.add(hemi, sun, fill);

const models = islands.map(island => islandModel(island.id));
for (const model of models) scene.add(model.group);

/* Placeholder plants: low-poly stand-ins until Ray's plant models are in the scene. */
const trunkGeo = new THREE.CylinderGeometry(.035, .05, 1, 6).translate(0, .5, 0);
const crownGeo = new THREE.IcosahedronGeometry(1, 0);
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a44, roughness: 1, flatShading: true });
const crownMat = new THREE.MeshStandardMaterial({ color: 0x8fbf7a, roughness: .9, flatShading: true });
const SIZES = [.32, .55, .8, 1.05]; // sprout, young, mature, large mature
const plants = new THREE.Group();
scene.add(plants);

function addPlant(x, y, z, height, spin) {
  const plant = new THREE.Group();
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.scale.set(1, height * .55, 1);
  const crown = new THREE.Mesh(crownGeo, crownMat);
  const r = height * .3;
  crown.scale.set(r, r * 1.1, r);
  crown.position.y = height * .55 + r * .7;
  plant.add(trunk, crown);
  plant.position.set(x, y, z);
  plant.rotation.y = spin;
  plants.add(plant);
  return { x, y, z, radius: r };
}

/* Player camera: the game's own spawn point and facing on Health & Wellbeing. */
const spawn = models[0].spawn();
const feet = models[0].queryIsland(spawn.x, spawn.z).height;
const player = {
  x: spawn.x, z: spawn.z, eye: feet + 1.05,
  yaw: spawn.yaw,
  pitch: spawn.pitch,
};
const world = { yaw: .25, pitch: .55 };
let cameraView = 'player'; // player | close | world. Close frames one plant to judge its shadow.
let closeUp = null;

/* Seeded random so every run places plants in the same spots. */
let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function placePlants() {
  const spots = [];
  islands.forEach((island, id) => {
    const model = models[id];
    const ox = island.x * islandSpacing, oy = island.y * islandSpacing, oz = island.z * islandSpacing;
    const chosen = [];
    const candidates = [];
    for (let x = -4.4; x <= 4.4; x += .35) for (let z = -4.4; z <= 4.4; z += .35) {
      if (canPlantOnIsland(id, x, z)) candidates.push([x, z]);
    }
    // On the home island, prefer ground in front of the player camera.
    const fx = Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    const score = ([x, z]) => {
      if (id !== 0) return random();
      const dx = x - player.x, dz = z - player.z, d = Math.hypot(dx, dz);
      const facing = (dx * fx + dz * fz) / (d || 1);
      return d < 2 || d > 7 || facing < .8 ? 2 + random() : random() * .5;
    };
    candidates.sort((a, b) => score(a) - score(b));
    for (const point of candidates) {
      if (chosen.length >= (id === 0 ? 9 : 7)) break;
      if (chosen.some(([x, z]) => Math.hypot(x - point[0], z - point[1]) < 1.0)) continue;
      chosen.push(point);
    }
    chosen.forEach(([x, z], i) => {
      const y = model.queryIsland(x, z).height;
      spots.push(addPlant(ox + x, oy + y, oz + z, SIZES[i % SIZES.length] * islandScale, random() * 6.28));
    });
  });
  return spots;
}

const mood = createMood({
  scene, renderer, canvas, hemi, sun, fill,
  islands: models.map((model, id) => ({ group: model.group, hue: ISLAND_HUES[id] })),
});
const spots = placePlants();
mood.setShadowSpots(spots);
{
  // Close view: stand 2 units from the nearest home-island plant, on the camera side.
  const o = islands[0];
  const ox = o.x * islandSpacing, oz = o.z * islandSpacing;
  const near = spots.slice(0, 9).sort((a, b) =>
    Math.hypot(a.x - ox - player.x, a.z - oz - player.z) - Math.hypot(b.x - ox - player.x, b.z - oz - player.z))[0];
  const dx = player.x + ox - near.x, dz = player.z + oz - near.z, d = Math.hypot(dx, dz);
  closeUp = { target: near, from: [near.x + dx / d * 2.6, near.y + 1.6, near.z + dz / d * 2.6] };
}

/* Cameras: same maths as render.mjs player() and world(). */
const perspective = new THREE.PerspectiveCamera(52, 1, .055, 150 * islandScale);
const overview = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 175 * islandScale);
const focalLength = (w, h) => Math.max(h * .77, w * .48);

function aim(width, height) {
  if (cameraView === 'close') {
    perspective.position.set(...closeUp.from);
    perspective.lookAt(closeUp.target.x, closeUp.target.y + .25, closeUp.target.z);
    perspective.fov = Math.atan(height / (2 * focalLength(width, height))) * 360 / Math.PI;
    perspective.aspect = width / height;
    perspective.updateProjectionMatrix();
    return perspective;
  }
  if (cameraView === 'player') {
    const o = islands[0];
    const horizontal = Math.cos(player.pitch);
    perspective.position.set(player.x + o.x * islandSpacing, player.eye + o.y * islandSpacing, player.z + o.z * islandSpacing);
    perspective.lookAt(perspective.position.x + Math.sin(player.yaw) * horizontal,
      perspective.position.y + Math.sin(player.pitch), perspective.position.z - Math.cos(player.yaw) * horizontal);
    perspective.fov = Math.atan(height / (2 * focalLength(width, height))) * 360 / Math.PI;
    perspective.aspect = width / height;
    perspective.updateProjectionMatrix();
    return perspective;
  }
  const scale = Math.min(width / 8, height / 5.6);
  const unit = islandSpacing / scale;
  overview.left = -width * .5 * unit; overview.right = width * .5 * unit;
  overview.top = height * .53 * unit; overview.bottom = -height * .47 * unit;
  const distance = 75 * islandScale;
  overview.position.set(Math.sin(world.yaw) * Math.cos(world.pitch) * distance, Math.sin(world.pitch) * distance,
    Math.cos(world.yaw) * Math.cos(world.pitch) * distance);
  overview.lookAt(0, 0, 0);
  overview.updateProjectionMatrix();
  return overview;
}

/* Frame loop with a rolling frame-time log. */
const frames = [];
const size = new THREE.Vector2();
let last = 0, elapsed = 0;
const fpsOut = document.querySelector('[data-fps]');
let shownAt = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const width = stage.clientWidth, height = stage.clientHeight;
  renderer.getSize(size);
  if (size.x !== width || size.y !== height) renderer.setSize(width, height, false);
  const delta = last ? Math.min(.05, (now - last) / 1000) : 0;
  if (last) { frames.push(now - last); if (frames.length > 600) frames.shift(); }
  last = now;
  elapsed += delta;
  for (const model of models) model.update(delta, elapsed);
  renderer.render(scene, aim(width, height));
  if (fpsOut && frames.length >= 30 && now - shownAt > 500) {
    shownAt = now;
    const recent = frames.slice(-60);
    const avg = recent.reduce((a, b) => a + b, 0) / (recent.length || 1);
    fpsOut.textContent = `${Math.round(1000 / avg)} fps · ${renderer.info.render.calls} draws · ${Math.round(renderer.info.render.triangles / 1000)}k tris`;
  }
}

/* Controls */
const moodButtons = [...document.querySelectorAll('[data-mood]')];
const viewButtons = [...document.querySelectorAll('[data-view]')];
const layerBoxes = [...document.querySelectorAll('[data-layer]')];

function sync() {
  for (const b of moodButtons) b.setAttribute('aria-pressed', String(b.dataset.mood === mood.mood));
  for (const b of viewButtons) b.setAttribute('aria-pressed', String(b.dataset.view === cameraView));
  const isCurrent = mood.mood === 'current';
  for (const box of layerBoxes) box.disabled = isCurrent;
  const query = new URLSearchParams(location.search);
  query.set('mood', mood.mood); query.set('view', cameraView);
  history.replaceState(null, '', `?${query}`);
  document.querySelector('[data-mood-name]').textContent = MOODS[mood.mood].label;
}

for (const b of moodButtons) b.addEventListener('click', () => { mood.apply(b.dataset.mood, mood.view); sync(); });
function setView(view) {
  cameraView = ['player', 'close', 'world'].includes(view) ? view : 'player';
  mood.apply(mood.mood, cameraView === 'world' ? 'world' : 'player');
}
for (const b of viewButtons) b.addEventListener('click', () => { setView(b.dataset.view); sync(); });
for (const box of layerBoxes) box.addEventListener('change', () => mood.setLayers({ [box.dataset.layer]: box.checked }));

/* Drag to look around (player) or rotate the world (overview). */
let drag = null;
stage.addEventListener('pointerdown', e => {
  if (e.target !== stage && e.target !== canvas) return;
  drag = { x: e.clientX, y: e.clientY }; stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag = { x: e.clientX, y: e.clientY };
  if (cameraView === 'close') return;
  if (cameraView === 'player') {
    player.yaw += dx * .005;
    player.pitch = Math.max(-1, Math.min(.8, player.pitch - dy * .004));
  } else {
    world.yaw -= dx * .006;
    world.pitch = Math.max(.2, Math.min(1.2, world.pitch + dy * .004));
  }
});
stage.addEventListener('pointerup', () => { drag = null; });
stage.addEventListener('pointercancel', () => { drag = null; });

if (params.get('ui') === '0') document.documentElement.classList.add('ui-mood--bare');
mood.apply(params.get('mood') ?? 'current');
setView(params.get('view') ?? 'player');
sync();
requestAnimationFrame(frame);

/* For automated measurement: average fps and 95th percentile frame time over N seconds. */
window.moodPreview = {
  set(moodId, view, layers) { if (layers) mood.setLayers(layers); mood.apply(moodId); setView(view); sync(); },
  // Uncapped cost: render N frames back to back, forcing the GPU to finish each one
  // with a 1-pixel read. Returns milliseconds per frame (lower is better).
  benchmark(count = 120) {
    const gl = renderer.getContext();
    const pixel = new Uint8Array(4);
    const width = stage.clientWidth, height = stage.clientHeight;
    const camera = aim(width, height);
    for (let i = 0; i < 10; i++) { renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); }
    const times = [];
    for (let i = 0; i < count; i++) {
      const t = performance.now();
      for (const model of models) model.update(1 / 60, elapsed + i / 60);
      renderer.render(scene, camera);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      times.push(performance.now() - t);
    }
    times.sort((a, b) => a - b);
    return { median: +times[count >> 1].toFixed(2), p95: +times[Math.floor(count * .95)].toFixed(2) };
  },
  async measure(seconds = 5) {
    await new Promise(r => setTimeout(r, 1000)); // warm-up
    frames.length = 0;
    await new Promise(r => setTimeout(r, seconds * 1000));
    const sorted = [...frames].sort((a, b) => a - b);
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    return {
      fps: +(1000 / avg).toFixed(1),
      p95ms: +sorted[Math.floor(sorted.length * .95)].toFixed(1),
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      pixelRatio: renderer.getPixelRatio(),
      size: `${stage.clientWidth}x${stage.clientHeight}`,
      gl: (() => { const gl = renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'; })(),
    };
  },
};
