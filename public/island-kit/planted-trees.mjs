import { createTreeLifecycle } from './specimen-willow.mjs';

const growthForms = ['seed', 'sprout', 'young', 'young', 'mature'];
const saplingDuration = 1200;
const revivalDuration = 900;

function dormancyAmount(plant) {
  return plant.dormant ? Math.min(1, Math.max(0, (1 - (plant.displayScale ?? 1)) / .72)) : 0;
}

export function createPlantedTrees(scene, models) {
  const sources = models.map(model => {
    const trees = [];
    model.group.traverse(node => {
      if (node.userData.lifecycleTree) trees.push(node);
    });
    for (const tree of trees) tree.removeFromParent();
    return trees.find(tree => tree.name === 'Greenhouse approach willow')
      ?? trees.find(tree => tree.userData.lifecycleTree.style === 'blossom') ?? trees[0];
  });
  const spawns = models.map(model => model.spawn());
  const planted = new Map();
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

  function modelFor(island, plant) {
    const key = island + ':' + plant.id;
    if (!planted.has(key) && sources[island]) {
      const mesh = createTreeLifecycle(scene, sources[island], .88, models[island]);
      mesh.object.userData.tagId = plant.id;
      planted.set(key, {mesh});
    }
    return planted.get(key);
  }

  function formFor(entry, plant, now) {
    const amount = dormancyAmount(plant);
    if (!reducedMotion?.matches && entry.last?.dormant && !plant.dormant) {
      entry.revival = {growth: entry.last.growth, amount: entry.last.amount, start: now};
    }
    const revival = entry.revival;
    if (revival && (plant.dormant || now - revival.start >= revivalDuration)) delete entry.revival;
    if (plant.growth === 2 && entry.last && entry.last.growth < 2) entry.youngAt = now;
    if (revival?.growth < 2 && plant.growth === 2 && !entry.revival) entry.youngAt = now;
    entry.last = {growth: plant.growth, dormant: plant.dormant, amount};

    if (entry.revival) {
      const fraction = (now - revival.start) / revivalDuration;
      return {growth: revival.growth, stage: growthForms[revival.growth], amount: revival.amount * (1 - fraction)};
    }
    const sapling = plant.growth === 2 && now - entry.youngAt < saplingDuration;
    return {growth: plant.growth, stage: sapling ? 'sapling' : growthForms[plant.growth], amount};
  }

  return {
    drawPlanted(island, garden, origin, now) {
      const native = new Set();
      const current = new Set();
      for (const plant of garden) {
        const entry = modelFor(island, plant);
        if (!entry) continue;
        const key = island + ':' + plant.id;
        current.add(key);
        const form = formFor(entry, plant, now);
        entry.stage = form.stage;
        const spawn = spawns[island];
        const emblemYaw = plant.emblemYaw ?? Math.atan2(spawn.x - plant.x, spawn.z - plant.z);
        entry.mesh.draw({...plant, growth: form.growth, previewStage: form.stage,
          dormancyAmount: form.amount, emblemYaw}, origin, now);
        if (form.growth) native.add(plant);
      }
      for (const [key, entry] of planted) {
        if (current.has(key)) continue;
        entry.mesh.remove();
        planted.delete(key);
      }
      return native;
    },
    hidePlanted() {
      for (const entry of planted.values()) entry.mesh.hide();
    },
    tagTargets() {
      return [...planted.values()].map(entry => entry.mesh.object).filter(root => root.visible);
    },
    stage(island, id) {
      return planted.get(island + ':' + id)?.stage;
    },
    blocksPlanted(island, plant, ...motion) {
      if (!plant.growth) return false;
      const entry = modelFor(island, plant);
      const previewStage = entry?.stage ?? growthForms[plant.growth];
      return entry?.mesh.blocksMovement({...plant, previewStage}, ...motion) ?? false;
    },
  };
}
