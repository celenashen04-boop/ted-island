import assert from 'node:assert/strict';
import test from 'node:test';
import { Group } from '../public/island-kit/three.module.min.js';
import { islandModel } from '../public/island-kit/navigation.mjs';
import { createPlantedTrees } from '../public/island-kit/planted-trees.mjs';

test('resident trees follow earned stages, preserve stems in dormancy, and revive', () => {
  const scene = new Group();
  const models = [0, 1, 2].map(islandModel);
  const trees = createPlantedTrees(scene, models);
  for (const [island, model] of models.entries()) {
    model.group.traverse(object => assert.ok(!object.userData.lifecycleTree));
    const plant = {id: 'idea', x: 0, y: 0, z: 0};
    const draw = (growth, now, extra) => trees.drawPlanted(island, [{...plant, growth, ...extra}], [0, 0, 0], now);
    assert.equal(draw(0, 0).size, 0);
    assert.equal(draw(1, 100).size, 1);
    assert.equal(trees.stage(island, plant.id), 'sprout');
    assert.ok(trees.blocksPlanted(island, {...plant, growth: 1}, 0, 0, 0, 0, 0, .13, .8));
    draw(2, 200);
    assert.equal(trees.stage(island, plant.id), 'sapling');
    draw(2, 1500);
    assert.equal(trees.stage(island, plant.id), 'young');
    const young = trees.tagTargets()[0].children[1].children[1];
    const trunk = young.children[0];
    const foliage = young.children.find(child => child.geometry?.type === 'SphereGeometry');
    const healthy = foliage.scale.toArray();
    const stem = trunk.scale.toArray();
    draw(2, 1600, {dormant: true, displayScale: .28});
    assert.equal(trees.stage(island, plant.id), 'young');
    assert.notDeepEqual(foliage.scale.toArray(), healthy);
    assert.deepEqual(trunk.scale.toArray(), stem);
    draw(2, 1800);
    assert.notDeepEqual(foliage.scale.toArray(), healthy);
    draw(2, 2800);
    assert.deepEqual(foliage.scale.toArray(), healthy);
    draw(4, 3000);
    assert.equal(trees.stage(island, plant.id), 'mature');
    trees.drawPlanted(island, [], [0, 0, 0], 3100);
    assert.deepEqual(trees.tagTargets(), []);
  }
});
