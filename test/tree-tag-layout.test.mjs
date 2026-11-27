import assert from 'node:assert/strict';
import test from 'node:test';
import { islandScale } from '../public/islands.mjs';
import { islandModel } from '../public/island-kit/navigation.mjs';
import { createScene } from '../public/scene.mjs';

test('an automatic tree tag leaves the View idea card clear', () => {
  const tags = [], frames = [], clips = [];
  let ideaBounds = null;
  const context = new Proxy({
    globalAlpha: 1,
    clip(rule) { clips.push(rule); },
  }, {get: (target, key) => target[key] ?? (() => {})});
  const canvas = {
    addEventListener() {},
    getContext() { return context; },
    getBoundingClientRect() { return {width: 640, height: 360}; },
    parentElement: {append(tag) { tags.push(tag); }},
  };
  const element = () => ({style: {}, dataset: {}, append() {}, setAttribute() {}});
  const previous = {};
  for (const [key, value] of Object.entries({
    document: {
      activeElement: canvas, getElementById: id => id === 'seed-mode' ? canvas : null,
      querySelector: () => null, createElement: element,
    },
    window: {addEventListener() {}},
    devicePixelRatio: 1,
    requestAnimationFrame: callback => frames.push(callback),
  })) {
    previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {value, configurable: true});
  }
  let clock = 0;
  const frame = () => frames.shift()(clock += 16);
  function bounds(tag) {
    const match = /translate\(([-.\d]+)px,([-.\d]+)px\) scale\(([-.\d]+)\)/.exec(tag.style.transform);
    const [left, top, scale] = match.slice(1).map(Number);
    return {left, top, right: left + parseFloat(tag.style.width)*scale, bottom: top + parseFloat(tag.style.height)*scale};
  }
  try {
    const scene = createScene(canvas, {
      onFrame(frame) {
        assert.equal(frame.plant?.id, 'fixture');
        return ideaBounds;
      },
      islandRenderer: {
        nativePlants: true,
        setBridgeFaces() {}, player() {},
        plantedStage: () => 'seed',
        plantIsOccluded: () => false, tagIsOccluded: () => false,
      },
    });
    scene.update([{id: 'fixture', x: 0, z: -2/islandScale, growth: 0, originalIsland: 1}], 0);
    const model = islandModel(0);
    const feet = model.queryIsland(0, 0, 0).height;
    const seedHeight = model.queryIsland(0, -2, 0).height + .05;
    scene.arrive({x: 0, z: 0, feet, yaw: 0, pitch: Math.atan2(seedHeight - feet - 1.05, 2)});
    frame();
    assert.equal(tags.length, 1);
    assert.equal(tags[0].hidden, false);
    ideaBounds = bounds(tags[0]);
    frame();
    assert.equal(tags[0].hidden, false, 'a clear alternate position is available');
    const tag = bounds(tags[0]);
    assert.ok(tag.right <= ideaBounds.left-10 || ideaBounds.right+10 <= tag.left ||
      tag.bottom <= ideaBounds.top-10 || ideaBounds.bottom+10 <= tag.top);
    assert.equal(clips.at(-1), 'evenodd', 'the connector also leaves the card clear');
    ideaBounds = {left: 0, top: 0, right: 640, bottom: 360};
    frame();
    assert.equal(tags[0].hidden, true, 'the View idea card takes priority when no tag position fits');
  } finally {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
