export const plots = [
  [-2.13, 1.7], [-3.10, .55], [-1.08, 2.72], [1.10, 2.72],
  [2.19, 1.76], [3.11, .55], [-2.12, -2.19], [2.13, -2.19]
];

const growthStages=['Seed planted','Sprout','Young plant','Tree','Mature tree'];

export function plantStage(growth) {
  return growthStages[growth] ?? growthStages[0];
}

export const tileWidth = .85 * Math.sqrt(3);
export const tileDepth = .74 * Math.sqrt(3);

export function onIsland(x, z, margin = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const inside = (px, pz) => {
    const i = Math.abs(Math.round(px / tileWidth));
    const j = Math.abs(Math.round(pz / tileDepth));
    return i <= 3 && j <= 3 && i + j < 6;
  };
  return inside(x-margin,z-margin) && inside(x-margin,z+margin)
    && inside(x+margin,z-margin) && inside(x+margin,z+margin);
}

export function inBuilding(x,z,margin=0) {
  return Math.abs(x) < 1.28+margin && z > -1.3-margin && z < 1.53+margin;
}

export function canPlant(x,z) {
  return onIsland(x,z,.10) && !inBuilding(x,z,.10)
    && !(Math.abs(x)<.42 && z>1.43);
}
