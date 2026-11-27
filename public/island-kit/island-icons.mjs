// 24-unit outlines shared by the navigation labels and wooden origin emblems.
export const islandIconOutlines = [
  'M21 12a9 9 0 1 0-9 9c4.2 0 6.5-2.8 6.5-6s-2.2-5.4-5.2-5.4c-2.6 0-4.2 1.5-4.2 3.5 0 1.8 1.3 3.1 3.4 3.1',
  'M12 17c0-7 3-11 9-12 0 6-3.5 9-9 9M9 15C5 14 3 11 3 7c4 .5 6 3 6 8M12 17v4M7 21h10',
  'M11 10 5 4c4-1 7 2 6 6ZM14 11l6-6c1 4-2 7-6 6ZM13 14l6 6c-4 1-7-2-6-6ZM10 13l-6 6c-1-4 2-7 6-6Z',
];

// Preview origins are render-only. Saved seeds keep the backend origin even
// when a player adopts and plants them on another island.
export const displayOriginIsland = plant => plant.originalIsland ?? plant.previewOriginIsland;

export function displayOriginIslands(plant) {
  if (Array.isArray(plant.originIslands) && plant.originIslands.length) return [...new Set(plant.originIslands)];
  const origin=displayOriginIsland(plant);
  return origin==null?[]:[origin];
}
