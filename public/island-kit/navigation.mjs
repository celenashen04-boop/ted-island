import { islands, islandScale, islandSpacing } from '../islands.mjs';
import { createIsland } from './source/index.js';
import { createIslandCollision } from './collision.mjs';

const models = new Map();
const spawnCandidates = {
  spiral: [[.4, 2.6], [0, 2.4]],
  verdant: [[0, 3.3], [-2.4, 2.8]],
  pinwheel: [[.8, 2.7], [1.7, 2.5]],
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
      const start = spawnCandidates[island.model].find(([x, z]) => model.query(x, z).walkable)
        ?? [0, 0];
      const [x, z] = localToIsland(...start);
      return { x, z, yaw: rotation * -1, pitch: -.12 };
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
