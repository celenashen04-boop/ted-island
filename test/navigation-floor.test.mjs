import assert from 'node:assert/strict';
import test from 'node:test';
import { islandModel } from '../public/island-kit/navigation.mjs';

test('Verdant greenhouse stairs and boardwalk retain ground below their decks', () => {
  const model = islandModel(1);
  const junction = [[.4, 2.75], [.76, 2.9], [.8, 2.95], [.8, 3], [.85, 2.6],
    [.9, 2.6], [1.05, 2.55], [1.15, 2.55], [1.45, 2.65], [.4, 3.1]];

  for (const [localX, localZ] of junction) {
    const [x, z] = model.localToIsland(localX, localZ);
    const deck = model.queryIsland(x, z, 0);
    assert.notEqual(deck.surfaceType, 'terrain');
    assert.ok(Math.abs(model.floorHeight(x, z, deck.height + .001) - deck.height) < .001);

    const belowDeck = deck.height - .15;
    const meadow = model.floorHeight(x, z, belowDeck);
    assert.ok(Number.isFinite(meadow) && meadow <= belowDeck, `Missing terrain at ${localX}, ${localZ}`);
    assert.ok(Math.abs(model.floorHeight(x, z, meadow + .001) - meadow) < .001);
  }
});

test('Floor checks support a rotated planter and stop at the island boundary', () => {
  const model = islandModel(1);
  const [x, z] = model.localToIsland(3.1, 4.05);
  const bed = model.queryIsland(x, z, 0);
  assert.equal(bed.surfaceType, 'planting_bed');
  assert.ok(Math.abs(model.floorHeight(x, z, bed.height + .001) - bed.height) < .001);
  assert.equal(model.floorHeight(30, 30, 5), -Infinity);
});
