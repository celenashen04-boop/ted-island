import assert from 'node:assert/strict';
import test from 'node:test';
import { islandModel } from '../public/island-kit/navigation.mjs';
import {
  bridgeAirSpan, bridgeGateDistance, bridgeHalfWidth, bridgePath, bridgeSpeedFactor, bridgeSurfaceHeight,
} from '../public/plots.mjs';
import { createScene } from '../public/scene.mjs';

test('All bridge entrances lock, open, and retain footing at both shores', () => {
  const canvas = {
    addEventListener() {},
    getContext() { return { setTransform() {}, clearRect() {} }; },
    getBoundingClientRect() { return { width:640,height:360 }; },
  };
  const keyEvents = new Map();
  const pendingFrames = [];
  globalThis.document = {
    activeElement: canvas,
    getElementById: id => id === 'seed-mode' ? canvas : null,
    querySelector: () => null,
  };
  globalThis.window = { addEventListener: (type, listener) => keyEvents.set(type, listener) };
  globalThis.requestAnimationFrame = callback => pendingFrames.push(callback);
  globalThis.devicePixelRatio = 1;
  let clock = 0;
  const tick = (frames = 1) => {
    for (let i = 0; i < frames; i++) pendingFrames.shift()(clock += 1000 / 60);
  };
  const key = (code, count) => {
    keyEvents.get('keydown')({ code, preventDefault() {} });
    tick(count);
    keyEvents.get('keyup')({ code });
  };

  try {
    for (const [first, last] of [[0, 1], [0, 2], [1, 2]]) {
      for (const [from, to, direction] of [[first, last, 1], [last, first, -1]]) {
        pendingFrames.length = 0;
        const ends = [{ island: first }, { island: last }];
        const bridge = { permanent: true, open: true, canCross: true, ends };
        const links = island => [{ ...bridge, destination: island === first ? last : first }];
        const path = bridgePath(bridge, from);
        const air = bridgeAirSpan(path, from, true);
        assert.equal(bridgeSpeedFactor(air.start, air), 1);
        assert.equal(bridgeSpeedFactor(air.end, air), 1);
        assert.ok(Math.abs(bridgeSpeedFactor(air.handoff, air) - 1.35) < .001);
        const [dx, , dz] = path.point(path.length).map((value, i) => value - path.point(0)[i]);
        const yaw = Math.atan2(dx * direction, -dz * direction);
        let crossings = 0;
        const denied = [];
        const openings = [];
        let visibleGates;
        let sampling = false, camera;
        const sampled = new Error('Camera sampled');
        const cameraPose = () => {
          sampling=true;
          try { tick(); } catch(error) { if(error!==sampled)throw error; }
          finally { sampling=false; }
          return camera;
        };
        const scene = createScene(canvas, {
          islandRenderer: {
            setBridgeFaces() {},
            setGates(island,gates) { visibleGates=gates; },
            setGateOpening(key,opening) { openings.push({key,opening}); },
            player(canvas,view) { camera=view;throw sampled; },
          },
          isVisible: () => sampling,
          onBridgeLocked(destination) { denied.push(destination); },
          onCross(destination) {
            assert.equal(destination, to);
            crossings++;
            scene.update([], destination, links(destination), { carryPose: true });
          },
        });
        const model=islandModel(from);
        const gate=bridgeGateDistance(path,direction===1?0:1,from,true);
        // The whole threshold is beyond the shore, including both deck edges.
        for(const offset of [-.78,-.52,-.26,0,.26,.52,.78]){
          for(const beyond of [0,.20,.50,.90]){
            const [x,,z]=path.point(gate+direction*beyond,offset);
            assert.equal(model.containsLand(x,z),false,`${from} → ${to}: shore reaches behind gate`);
          }
        }
        const approach=gate-direction*.30;
        const [gateX,,gateZ]=path.point(approach);
        scene.update([],from,links(from).map(link=>({...link,canCross:false})));
        assert.deepEqual(visibleGates.map(item=>item.key).sort(),[`${from}:${to}`,`${to}:${from}`].sort());
        scene.arrive({x:gateX,z:gateZ,feet:bridgeSurfaceHeight(path,approach,0),yaw});
        tick();
        key('KeyW',12);
        const stopped=cameraPose();
        assert.ok(stopped && (path.locate(stopped.x,stopped.z).distance-gate)*direction<0,
          `${from} → ${to} gate should stop outward movement`);
        assert.deepEqual(denied,[to]);
        assert.deepEqual(openings,[]);
        scene.update([], from, links(from));
        tick(24);
        assert.ok(openings.some(({key,opening})=>key===`${from}:${to}` && opening===1));
        key('KeyW',9);
        const beyondGate=cameraPose();
        assert.ok(beyondGate && (path.locate(beyondGate.x,beyondGate.z).distance-gate)*direction>0,
          `${from} → ${to} gate should clear the path when unlocked`);
        const postApproach=gate-direction*.33;
        const postOffset=.58;
        const [postX,,postZ]=path.point(postApproach,postOffset);
        scene.arrive({x:postX,z:postZ,feet:bridgeSurfaceHeight(path,postApproach,postOffset),yaw});
        tick();
        key('KeyW',12);
        const postStop=cameraPose();
        assert.ok((path.locate(postStop.x,postStop.z).distance-gate)*direction<0,
          `${from} → ${to} post should stay solid when open`);
        const shoreStart = direction === 1 ? 0 : path.length;
        for (const side of [-1, 1]) {
          const shore = [.15, .35, .6, .9, 1.2, 1.6].map(inset => shoreStart + direction * inset)
            .find(distance => {
              const [sx, , sz] = path.point(distance, side * .92);
              const ground = model.queryIsland(sx, sz);
              return ground.walkable && Math.abs(ground.height - bridgeSurfaceHeight(path, distance, side * .62)) < .5;
            });
          if (shore === undefined) continue;
          const offset = side * .58;
          const [sx, , sz] = path.point(shore, offset);
          scene.arrive({ x: sx, z: sz, feet: bridgeSurfaceHeight(path, shore, offset), yaw });
          tick();
          key(side === direction ? 'KeyD' : 'KeyA', 8);
          const landed = scene.pose();
          assert.ok(landed && Math.abs(path.locate(landed.x, landed.z).offset) > bridgeHalfWidth,
            `${from} → ${to} shore exit, side ${side}`);
        }
        // Approach the handoff along the left edge of the deck, beside the
        // decorative branches. An extra outward step cannot enter open air.
        const offset = -direction * (bridgeHalfWidth - .02);
        const start = air.handoff - direction;
        const [x, , z] = path.point(start, offset);
        scene.arrive({ x, z, feet: bridgeSurfaceHeight(path, start, offset), yaw });
        tick();
        key('KeyA', 4);
        key('KeyW', 38);
        assert.equal(crossings, 1, `${from} → ${to} left edge`);

        // A persisted position below the island recovers before another frame.
        const spawn = islandModel(to).spawn();
        scene.arrive({ ...spawn, feet: -5 });
        tick();
        const recovered = scene.pose();
        assert.ok(recovered, `No supported spawn after ${from} → ${to}`);
        assert.ok(Math.hypot(recovered.x - spawn.x, recovered.z - spawn.z) < .001);
      }
    }
  } finally {
    delete globalThis.document;
    delete globalThis.window;
    delete globalThis.requestAnimationFrame;
    delete globalThis.devicePixelRatio;
  }
});
