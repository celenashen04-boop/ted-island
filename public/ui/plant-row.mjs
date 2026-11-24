// Plant Row (Figma 30:273): New activity, Up to date, Dormant.
// Used by Followed plants and Island plants. The whole row is one button
// that opens the plant. The black tab marks new activity, and the status
// line says it in words too, so the tab is never the only signal.
//
//   const row = createPlantRow(
//     { id, island: 0, title: 'Haptics for calm breathing', stage: 'young',
//       dormant: false, at: lastActivityMs, newReplies: 2, contributors: 3 },
//     { onOpen: plant => detail.open(...) });
//   list.append(row);

import { el, icon, islandClass, islandUi } from './islands-ui.mjs';
import { ageLabel } from './notifications.mjs';

const STAGE_WORD = { seed: 'Seed', sprout: 'Sprout', young: 'Young plant', mature: 'Mature' };

/** 'new' | 'current' | 'dormant'. Dormant wins over new activity. */
export function plantRowState(plant) {
  if (plant.dormant) return 'dormant';
  return plant.newReplies > 0 ? 'new' : 'current';
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** The status line under the title. */
export function plantRowStatus(plant) {
  const state = plantRowState(plant);
  if (state === 'dormant') return 'Dormant · one like or comment revives it';
  const stage = STAGE_WORD[plant.stage] ?? plant.stage;
  if (state === 'new') return `${stage} · ${plural(plant.newReplies, 'new reply', 'new replies')}`;
  return `${stage} · ${plural(plant.contributors ?? 0, 'contributor', 'contributors')}`;
}

export function createPlantRow(plant, { onOpen, now = Date.now() } = {}) {
  const state = plantRowState(plant);
  const stage = state === 'dormant' ? 'dormant' : plant.stage;
  const meta = plant.at == null ? islandUi(plant.island).name : `${islandUi(plant.island).name} · ${ageLabel(plant.at, now)}`;
  return el('button', {
    type: 'button',
    class: `ui-plant-row ui-plant-row--${state} ${islandClass(plant.island)}`,
    dataset: { id: plant.id },
    onclick: () => onOpen?.(plant),
  },
  el('span', { class: 'ui-plant-row__tab', 'aria-hidden': 'true' }),
  el('img', { class: 'ui-stage ui-plant-row__stage', src: `/ui/stages/${stage}.svg`, alt: '', width: 48, height: 48 }),
  el('span', { class: 'ui-plant-row__text' },
    el('span', { class: 'ui-plant-row__meta' }, el('span', { class: 'ui-plant-row__swatch', 'aria-hidden': 'true' }), meta),
    el('span', { class: 'ui-plant-row__title' }, plant.title),
    el('span', { class: 'ui-plant-row__status' }, plantRowStatus(plant))),
  icon('arrow-right'));
}

/** New activity first, then most recent, dormant last. */
export function sortPlants(plants) {
  const rank = { new: 0, current: 1, dormant: 2 };
  return [...plants].sort((a, b) => rank[plantRowState(a)] - rank[plantRowState(b)] || (b.at ?? 0) - (a.at ?? 0));
}
