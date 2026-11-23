// Rendering mood options for Phase 7 (preview only, not wired into the game).
// Each mood sets four layers: sky (a CSS gradient behind the transparent
// WebGL canvas, the same way the game draws its sky today), distance fog,
// a light per-island tint, and cheap blob contact shadows under plants.
// None of them use shadow maps or post-processing.
//
// To adopt one later, render.mjs would call createMood() once behind a flag
// and pass its own scene, lights and island groups. Check with Ray first.
//
//   const mood = createMood({ scene, renderer, canvas, hemi, sun, fill, islands: [{ group, hue }] });
//   mood.setShadowSpots([{ x, y, z, radius }]);   // ground point under each plant
//   mood.apply('morning', 'player');              // or 'world'
//   mood.setLayers({ sky: true, fog: true, tint: true, shadows: true });

import * as THREE from '../island-kit/three.module.min.js';

// Island hues from tokens.css (--color-island-*), in island id order.
export const ISLAND_HUES = ['#F05A3C', '#1E9E6A', '#3358E0'];

// The live game today, copied from render.mjs and style.css.
const CURRENT = {
  label: 'Current',
  sky: { player: 'linear-gradient(#738cbf, #bdc9eb)', world: 'linear-gradient(120deg, #182d3c, #355964)' },
  fog: null,
  exposure: 1.08,
  hemi: ['#ffffff', '#b4cbb9', 1.7],
  sun: ['#fff0d8', 2.1, [-10, 18, 12]],
  fill: ['#d8f4ec', .55, [9, 5, -8]],
  tint: 0,
  shadow: null,
};

export const MOODS = {
  current: CURRENT,

  // A. Soft pink and lilac, low contrast, light fog.
  morning: {
    label: 'A · Pastel morning',
    sky: {
      player: 'radial-gradient(60% 40% at 78% 18%, #fff3e8cc, #fff3e800 70%), linear-gradient(#aebbe8 0%, #d9cfef 46%, #f6dfe4 72%, #f6e6e2 100%)',
      world: 'radial-gradient(70% 50% at 70% 10%, #fff3e8aa, #fff3e800 70%), linear-gradient(160deg, #aebbe8 0%, #d9cfef 50%, #f6dfe4 100%)',
    },
    fog: { color: '#f2dde4', player: [9, 46], world: [82, 150] },
    exposure: 1.04,
    hemi: ['#fff1f4', '#c4b6d6', 1.75],
    sun: ['#ffe4d2', 1.9, [-10, 14, 14]],
    fill: ['#d9d0f4', .7, [9, 5, -8]],
    tint: .07,
    shadow: { color: '#3a2f5c', opacity: .4, size: 2.3, stretch: 1, offset: 0 },
  },

  // B. Bright clear blue, crisp, very light fog only at distance.
  noon: {
    label: 'B · Clear noon',
    sky: {
      player: 'linear-gradient(#6fa6e0 0%, #a9cdee 48%, #e3f1f5 74%, #eef6f2 100%)',
      world: 'linear-gradient(160deg, #6fa6e0 0%, #a9cdee 55%, #e3f1f5 100%)',
    },
    fog: { color: '#e2eff4', player: [16, 70], world: [86, 170] },
    exposure: 1.1,
    hemi: ['#ffffff', '#b9cfbf', 1.6],
    sun: ['#fff8ec', 2.4, [-6, 22, 8]],
    fill: ['#d8f4ec', .5, [9, 5, -8]],
    tint: .04,
    shadow: { color: '#14233a', opacity: .52, size: 2, stretch: 1, offset: 0 },
  },

  // C. Warm amber and dusty violet, denser fog, longer shadows.
  dusk: {
    label: 'C · Warm dusk',
    sky: {
      player: 'radial-gradient(55% 35% at 22% 70%, #ffd2a1cc, #ffd2a100 70%), linear-gradient(#5f6aa6 0%, #a888b4 34%, #eaa98e 64%, #f5c79e 100%)',
      world: 'radial-gradient(60% 45% at 20% 80%, #ffd2a1aa, #ffd2a100 70%), linear-gradient(160deg, #5f6aa6 0%, #a888b4 45%, #eaa98e 80%, #f5c79e 100%)',
    },
    fog: { color: '#e8b49a', player: [7, 38], world: [80, 140] },
    exposure: 1.02,
    hemi: ['#ffd9c2', '#7f7aa6', 1.45],
    sun: ['#ffb27a', 2.3, [-16, 8, 10]],
    fill: ['#b9a8e6', .8, [9, 5, -8]],
    tint: .1,
    shadow: { color: '#2b1f3d', opacity: .45, size: 2.1, stretch: 1.7, offset: .35 },
  },
};

/** One soft radial blob, shared by every shadow. */
function blobTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(.35, 'rgba(255,255,255,.8)');
  grad.addColorStop(.7, 'rgba(255,255,255,.3)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createMood({ scene, renderer, canvas, hemi, sun, fill, islands = [] }) {
  const layers = { sky: true, fog: true, tint: true, shadows: true };
  let moodId = 'current', view = 'player';

  // Tint: a faint emissive wash of the island hue on every island material.
  // Emissive adds a constant colour, so it costs nothing extra per frame.
  const original = new Map();
  const islandMaterials = islands.map(({ group }) => {
    const set = new Set();
    group.traverse(node => {
      if (!node.isMesh) return;
      for (const m of [].concat(node.material)) if (m?.emissive) set.add(m);
    });
    for (const m of set) if (!original.has(m)) original.set(m, m.emissive.clone());
    return set;
  });

  // Contact shadows: one InstancedMesh, so every blob is a single draw call.
  const MAX = 256;
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: blobTexture(), transparent: true, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const shadows = new THREE.InstancedMesh(plane, shadowMaterial, MAX);
  shadows.count = 0;
  shadows.renderOrder = 1;
  shadows.frustumCulled = false;
  scene.add(shadows);
  let spots = [];

  function layoutShadows(spec) {
    const sunDir = new THREE.Vector3(...MOODS[moodId].sun[2]).setY(0).normalize().negate();
    const angle = Math.atan2(sunDir.x, sunDir.z);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    const p = new THREE.Vector3(), s = new THREE.Vector3();
    shadows.count = Math.min(spots.length, MAX);
    for (let i = 0; i < shadows.count; i++) {
      const { x, y, z, radius } = spots[i];
      const r = radius * spec.size;
      // Stretch away from the sun for low light; offset pushes the blob to the far side.
      p.set(x + sunDir.x * r * spec.offset, y + .012, z + sunDir.z * r * spec.offset);
      s.set(r, 1, r * spec.stretch);
      shadows.setMatrixAt(i, m.compose(p, q, s));
    }
    shadows.instanceMatrix.needsUpdate = true;
  }

  function apply(nextMood = moodId, nextView = view) {
    moodId = MOODS[nextMood] ? nextMood : 'current';
    view = nextView === 'world' ? 'world' : 'player';
    const mood = MOODS[moodId];
    const base = CURRENT;

    // Sky
    canvas.style.background = (layers.sky ? mood : base).sky[view];

    // Lights and exposure belong to the mood's sky, so they follow the sky layer.
    const light = layers.sky ? mood : base;
    renderer.toneMappingExposure = light.exposure;
    hemi.color.set(light.hemi[0]); hemi.groundColor.set(light.hemi[1]); hemi.intensity = light.hemi[2];
    sun.color.set(light.sun[0]); sun.intensity = light.sun[1]; sun.position.set(...light.sun[2]);
    fill.color.set(light.fill[0]); fill.intensity = light.fill[1]; fill.position.set(...light.fill[2]);

    // Fog
    if (layers.fog && mood.fog) {
      const [near, far] = mood.fog[view];
      if (scene.fog) { scene.fog.color.set(mood.fog.color); scene.fog.near = near; scene.fog.far = far; }
      else scene.fog = new THREE.Fog(mood.fog.color, near, far);
    } else scene.fog = null;

    // Tint
    const hue = new THREE.Color();
    islandMaterials.forEach((set, index) => {
      hue.set(islands[index].hue);
      const amount = layers.tint ? mood.tint : 0;
      for (const m of set) m.emissive.copy(original.get(m)).lerp(hue, amount);
    });

    // Contact shadows
    shadows.visible = Boolean(layers.shadows && mood.shadow);
    if (shadows.visible) {
      shadowMaterial.color.set(mood.shadow.color);
      shadowMaterial.opacity = mood.shadow.opacity;
      layoutShadows(mood.shadow);
    }
  }

  return {
    apply,
    setLayers(next) { Object.assign(layers, next); apply(); },
    setShadowSpots(next) { spots = next; apply(); },
    get layers() { return { ...layers }; },
    get mood() { return moodId; },
    get view() { return view; },
  };
}
