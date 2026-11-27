import * as THREE from './three.module.min.js';

const stages = ['seed', 'sprout', 'young', 'tree', 'mature'];
const seedIslands = [0, 1, 2];
const appearances = [
  ...stages.map((stage, growth) => ({stage,growth})),
  ...seedIslands.map(island => ({stage:'seed',growth:0,island})),
];
const batchIndex = plant => plant.growth || (
  seedIslands.includes(plant.island) ? stages.length + plant.island : 0
);
const width = 192, height = 224, baseline = 210, oakWidth = 160, oakHeight = 186, seedRadius = 75;

export function createPlantBillboards(scene) {
  const group = new THREE.Group();
  group.name = 'Depth-tested garden plants';
  scene.add(group);

  const board = new THREE.PlaneGeometry();
  const soilGeometry = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  const soil = {
    geometry: soilGeometry,
    material: new THREE.MeshBasicMaterial({ color: 0x715642, toneMapped: false }),
  };
  const batches = appearances.map(() => ({ geometry: board }));
  const counts = new Uint32Array(batches.length);
  const transform = new THREE.Object3D();

  function resize(batch, needed) {
    if (!batch.mesh && !needed) return;
    if (!batch.mesh || needed > batch.capacity) {
      if (batch.mesh) {
        group.remove(batch.mesh);
        batch.mesh.dispose();
      }
      batch.capacity = Math.max(needed, (batch.capacity ?? 0) * 2, 4);
      batch.mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.capacity);
      batch.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      batch.mesh.frustumCulled = false;
      group.add(batch.mesh);
    }
    batch.mesh.count = needed;
    batch.mesh.visible = needed > 0;
  }

  function prepare(batch, { growth, island }, image, paint) {
    if (!batch.material) {
      batch.canvas = document.createElement('canvas');
      batch.canvas.width = width;
      batch.canvas.height = height;
      batch.context = batch.canvas.getContext('2d');
      batch.texture = new THREE.CanvasTexture(batch.canvas);
      batch.texture.colorSpace = THREE.SRGBColorSpace;
      batch.material = new THREE.MeshBasicMaterial({
        map: batch.texture, alphaTest: .3, toneMapped: false, side: THREE.DoubleSide,
      });
    } else if (batch.image === image) {
      return;
    }
    batch.image = image;
    const ctx = batch.context;
    ctx.clearRect(0, 0, width, height);
    if (growth === 0) {
      paint.seed(width / 2, height / 2, seedRadius, -.45, ctx, island);
    } else if (image) {
      const imageWidth = Math.min(oakWidth * 2, oakWidth * image.width / image.height, width);
      ctx.drawImage(image, (width - imageWidth) / 2, baseline - oakHeight, imageWidth, oakHeight);
    } else {
      ctx.save();
      ctx.translate(width / 2, baseline);
      paint.oak(oakWidth, oakHeight, growth, ctx);
      ctx.restore();
    }
    batch.texture.needsUpdate = true;
  }

  return {
    hide() { group.visible = false; },
    draw(plants, location, yaw, artwork, paint, nativePlants) {
      group.visible = true;
      group.position.set(...location);
      counts.fill(0);
      for (const plant of plants) if (!nativePlants?.has(plant)) counts[batchIndex(plant)]++;
      for (const [index, batch] of batches.entries()) {
        const appearance = appearances[index];
        if (counts[index]) prepare(batch, appearance, artwork.get(appearance.stage), paint);
        resize(batch, counts[index]);
      }
      resize(soil, plants.filter(plant=>!plant.scenerySeed).length);
      counts.fill(0);
      let soilIndex=0;
      for (const plant of plants) {
        transform.position.set(plant.x, plant.y + .016, plant.z);
        if (!plant.scenerySeed) {
          const soilSize=plant.growth?1:.66;
          transform.rotation.y=0;
          transform.scale.set(.12*soilSize,1,.085*soilSize);
          transform.updateMatrix();
          soil.mesh.setMatrixAt(soilIndex++,transform.matrix);
        }
        if (nativePlants?.has(plant)) continue;

        const index = batchIndex(plant);
        transform.rotation.y = -yaw;
        if (plant.growth) {
          transform.position.y += (baseline - height / 2) * plant.height / oakHeight;
          transform.scale.set(width * plant.width / oakWidth, height * plant.height / oakHeight, 1);
        } else {
          transform.position.y = plant.y + plant.seedY;
          transform.scale.set(width * .061 / seedRadius, height * .061 / seedRadius, 1);
        }
        transform.updateMatrix();
        batches[index].mesh.setMatrixAt(counts[index]++, transform.matrix);
      }
      for (const batch of [...batches, soil]) {
        if (batch.mesh?.visible) batch.mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
