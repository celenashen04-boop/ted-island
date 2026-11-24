// Island plants (Figma 31:1150). Replaces #browse-plants and #island-plants.
// Opens from the island chip (top left), as marked in the Figma frame. A
// 560 px right panel: every plant growing on the island you are on, filtered
// by All, Growing, Mature and Dormant. Adopted plants show their origin island.
//
//   const islandPlants = createIslandPlants({
//     island: 0,
//     plants: [ { id, island: originId, title, stage, dormant, at, newReplies, contributors }, ... ],  // see plant-row.mjs
//     onOpen: plant => detail.open(...),
//   });
//   document.body.append(islandPlants.layer);
//   chip.addEventListener('click', () => islandPlants.open());
//   islandPlants.open({ island: 2, plants });   // visiting another island

import { el, islandUi } from './islands-ui.mjs';
import { createPanelShell } from './panel.mjs';
import { createPlantRow, sortPlants } from './plant-row.mjs';

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'growing', label: 'Growing', test: p => !p.dormant && p.stage !== 'mature' },
  { id: 'mature', label: 'Mature', test: p => !p.dormant && p.stage === 'mature' },
  { id: 'dormant', label: 'Dormant', test: p => Boolean(p.dormant) },
];

/** "9 ideas · 3 mature (33%)", or "No ideas yet" (never 0%). */
export function islandPlantsSummary(plants = []) {
  const total = plants.length;
  if (!total) return 'No ideas yet';
  const mature = plants.filter(FILTERS[2].test).length;
  return `${total} ${total === 1 ? 'idea' : 'ideas'} · ${mature} mature (${Math.round((mature / total) * 100)}%)`;
}

export function createIslandPlants({ island = 0, plants = [], onOpen, onClose, contained = false, now }) {
  const shell = createPanelShell({
    title: 'Island plants', island, className: 'ui-panel--island-plants',
    closeLabel: 'Close Island plants', contained, onClose,
  });

  let current = island, data = plants, filter = 'all';
  const buttons = FILTERS.map(f => {
    const count = el('span', { class: 'ui-filter__count' });
    const b = el('button', { type: 'button', class: 'ui-filter', 'aria-pressed': 'false', onclick: () => { filter = f.id; render(); } }, `${f.label} `, count);
    return { f, b, count };
  });
  const filters = el('div', { class: 'ui-filters', role: 'group', 'aria-label': 'Filter plants by stage' }, buttons.map(x => x.b));
  const list = el('ul', { class: 'ui-plant-list' });
  const empty = el('p', { class: 'ui-plant-empty__body', hidden: true }, 'No plants here yet. Plant the first idea with +.');
  shell.body.append(filters, list, empty);

  function render() {
    shell.header.setIsland(current);
    shell.header.setSubtitle(`${islandUi(current).name} · ${islandPlantsSummary(data)}`);
    for (const { f, b, count } of buttons) {
      const n = data.filter(f.test).length;
      count.textContent = String(n);
      b.disabled = n === 0 && f.id !== 'all';
      b.setAttribute('aria-pressed', String(filter === f.id));
    }
    const active = FILTERS.find(f => f.id === filter);
    if (filter !== 'all' && !data.some(active.test)) filter = 'all';
    for (const { f, b } of buttons) b.setAttribute('aria-pressed', String(filter === f.id));
    const shown = sortPlants(data.filter(FILTERS.find(f => f.id === filter).test));
    list.replaceChildren(...shown.map(p => el('li', {}, createPlantRow(p, { onOpen, now: now ?? Date.now() }))));
    list.hidden = !shown.length;
    filters.hidden = !data.length;
    empty.hidden = Boolean(data.length);
  }
  render();

  return {
    layer: shell.layer,
    panel: shell.panel,
    open({ island: nextIsland = current, plants: nextPlants = data } = {}) {
      current = nextIsland; data = nextPlants; filter = 'all'; render(); return shell.open();
    },
    close: shell.close,
    update(next) { data = next; render(); },
  };
}
