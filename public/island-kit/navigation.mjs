import { islands, islandScale, islandSpacing } from '../islands.mjs';
import { createIsland } from './source/index.js';
import { createIslandCollision } from './collision.mjs';

const models = new Map();
const homeViews = {
  spiral: { starts: [[-2.3,4.47],[-2.95,4.4],[-3.72,4.28]], target: [-1.08,.64], pitch: .075 },
  verdant: { starts: [[-4.4,3.4],[-3.65,4.05],[.4,4.65]], target: [-1.80,.60], pitch: .045 },
  pinwheel: { starts: [[3.35,-3.45],[2.15,-4.15],[3.30,-2.02]], target: [.65,-.35], pitch: .11 },
};

export function islandModel(id) {
  if (models.has(id)) return models.get(id);
  const island = islands.find(entry => entry.id === id);
  if (!island) return null;
  const [west, east] = islands.filter(entry => entry.id !== id);
  const direction = peer => {
    const distance = Math.hypot(peer.x - island.x, peer.z - island.z);
    return [(peer.x - island.x) / distance, (peer.z - island.z) / distance];
  };
  const [wx, wz] = direction(west), [ex, ez] = direction(east);
  const rotation = Math.atan2(wz - ez, ex - wx);
  const cos = Math.cos(rotation), sin = Math.sin(rotation);
  const model = createIsland(island.model, {
    position: [island.x * islandSpacing, island.y * islandSpacing, island.z * islandSpacing],
    rotationY: rotation,
    scale: islandScale,
  });
  model.setSceneryTreesSolid(false);
  const localToIsland = (x, z) => [
    (x * cos + z * sin) * islandScale,
    (-x * sin + z * cos) * islandScale,
  ];
  const toLocal = (x, z) => [
    (x * cos - z * sin) / islandScale,
    (x * sin + z * cos) / islandScale,
  ];
  const bridgeLandings = model.bridgeLandings();
  let collision;
  const navigation = {
    ...model,
    localToIsland,
    blocksMovement(...movement) {
      collision ??= createIslandCollision(model);
      return collision.blocksMovement(...movement);
    },
    solidFloorAt(...location) {
      collision ??= createIslandCollision(model);
      return collision.floorAt(...location);
    },
    containsLand(x, z) {
      return model.blockedReason(...toLocal(x,z),0) !== 'island_boundary';
    },
    floorHeight(x,z,ceiling) {
      return model.floorHeight(...toLocal(x,z),ceiling/islandScale)*islandScale;
    },
    queryIsland(x, z, radius = .13) {
      const nav = model.query(...toLocal(x, z), { radius: radius / islandScale });
      return {
        ...nav,
        height: nav.height * islandScale,
        waterSurfaceY: nav.waterSurfaceY === null ? null : nav.waterSurfaceY * islandScale,
        waterDepth: nav.waterDepth * islandScale,
      };
    },
    landingFor(peer) {
      return bridgeLandings[peer === west.id ? 0 : 1];
    },
    spawn() {
      const view = homeViews[island.model];
      const start = view.starts.find(([x,z]) => {
        const surface=model.query(x,z);
        return surface.walkable&&!surface.waterBelow;
      })
        ?? [0, 0];
      const [x, z] = localToIsland(...start);
      const [targetX,targetZ] = localToIsland(...view.target);
      return { x, z, yaw: Math.atan2(targetX-x,z-targetZ), pitch: view.pitch };
    },
  };
  models.set(id, navigation);
  return navigation;
}

export function canPlantOnIsland(id, x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const nav = islandModel(id)?.queryIsland(x, z, .14);
  return Boolean(nav?.walkable && !nav.waterBelow && nav.surfaceType === 'terrain' && nav.slopeDegrees <= 35);
}
