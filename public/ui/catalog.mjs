// Seed Catalog (Figma 23:187, filtered 23:335, Catalog Card 16:257).
// 700 px right panel. Filters for the other islands, cards with Adopt seed
// beside "Opens 48 hours on {island}". Opened filtered from Unlock access at a
// locked bridge, it explains how to open that bridge.
//
//   const catalog = createSeedCatalog({
//     homeIsland: 0,
//     seeds: [ { id, island: 2, title, idea, stage: 'seed' | 'sprout' | 'young' | 'mature', growing: false, planted: false }, ... ],
//     isLocked: islandId => !access.has(islandId),     // for the filtered note
//     onAdopt: seed => startAdoption(seed),            // close the catalog, ready the acorn
//     onView: seed => goToPlant(seed.id),              // a seed already planted on your island
//   });
//   document.body.append(catalog.layer);
//   catalog.open();                 // all islands
//   catalog.open({ island: 2 });    // from Unlock access at the Games & Play bridge
//   catalog.update(seeds);

import { el, icon, islandBadgeSrc, islandClass, islandUi, ISLAND_UI } from './islands-ui.mjs';
import { createPanelShell } from './panel.mjs';

const STAGE_WORD = { seed: 'Seed', sprout: 'Sprout', young: 'Young plant', mature: 'Mature', dormant: 'Dormant' };

function createCard(seed, onAdopt, onView) {
  const island = islandUi(seed.island);
  const titleId = `ui-seed-${seed.id}`;
  const adopt = el('button', {
    type: 'button',
    class: 'ui-btn ui-btn--s',
    'aria-describedby': `${titleId}-opens`,
    onclick: () => onAdopt?.(seed),
  }, icon('seed'), el('span', { class: 'ui-btn__label' }, 'Adopt seed'));
  return el('article', { class: `ui-seed-card ${islandClass(seed.island)}`, 'aria-labelledby': titleId },
    el('div', { class: 'ui-seed-card__head' },
      el('img', { class: 'ui-badge ui-badge--24', src: islandBadgeSrc(seed.island), alt: '' }),
      el('span', { class: 'ui-seed-card__island' }, island.name),
      el('span', { class: 'ui-seed-card__stage' }, STAGE_WORD[seed.stage] ?? seed.stage)),
    el('div', { class: 'ui-seed-card__main' },
      el('img', { class: 'ui-stage ui-seed-card__thumb', src: `/ui/stages/${seed.stage}.svg`, alt: '' }),
      el('div', { class: 'ui-seed-card__text' },
        el('h3', { class: 'ui-seed-card__title', id: titleId }, seed.title),
        el('p', { class: 'ui-seed-card__idea' }, seed.idea),
        seed.question ? el('p', { class: 'ui-seed-card__idea' }, seed.question) : null)),
    seed.growing && !seed.planted ? el('p', { class: 'ui-seed-card__growing' }, 'This idea is already growing. Bring its current tree and shared conversation to your island.') : null,
    // Planted (16:202): already on your island, so Go to plant replaces Adopt seed
    // and takes the player to it in the scene.
    seed.planted
      ? el('div', { class: 'ui-seed-card__foot' },
        el('p', { class: 'ui-seed-card__planted' }, icon('check'), 'Planted on your island'),
        el('button', { type: 'button', class: 'ui-btn ui-btn--ghost ui-btn--s', 'aria-describedby': titleId, onclick: () => onView?.(seed) },
          icon('arrow-right'), el('span', { class: 'ui-btn__label' }, 'Go to plant')))
      : el('div', { class: 'ui-seed-card__foot' },
        el('p', { class: 'ui-seed-card__opens', id: `${titleId}-opens` }, `Plant to open 48 hours on ${island.name}`),
        adopt));
}

export function createSeedCatalog({ homeIsland = 0, seeds = [], isLocked = () => false, onAdopt, onView, onClose, contained = false }) {
  const shell = createPanelShell({
    title: 'Seed Catalog', island: homeIsland, className: 'ui-panel--catalog',
    closeLabel: 'Close Seed Catalog', contained, onClose,
  });

  let data = seeds;
  let filter = null; // null = all

  // Filters: All plus every island except home.
  const islands = ISLAND_UI.filter(i => i.id !== homeIsland);
  const filterButtons = [null, ...islands.map(i => i.id)].map(id => {
    const b = el('button', { type: 'button', class: `ui-filter${id == null ? '' : ` ${islandClass(id)}`}`, 'aria-pressed': 'false', onclick: () => setFilter(id) },
      id == null ? null : el('span', { class: 'ui-filter__swatch', 'aria-hidden': 'true' }),
      id == null ? 'All' : islandUi(id).name);
    b.dataset.island = id == null ? '' : String(id);
    return b;
  });
  const filters = el('div', { class: 'ui-filters', role: 'group', 'aria-label': 'Filter seeds by island' }, filterButtons);
  const lockedText = el('span', {});
  const locked = el('p', { class: 'ui-catalog__locked', hidden: true }, icon('lock'), lockedText);
  const grid = el('div', { class: 'ui-catalog__grid' });
  const empty = el('p', { class: 'ui-catalog__empty', hidden: true });
  shell.body.classList.add('ui-catalog');
  shell.body.append(filters, locked, grid, empty);

  function render() {
    const list = data.filter(s => s.island !== homeIsland && (filter == null || s.island === filter));
    grid.replaceChildren(...list.map(s => createCard(s, onAdopt, onView)));
    for (const b of filterButtons) b.setAttribute('aria-pressed', String(b.dataset.island === (filter == null ? '' : String(filter))));
    const others = data.filter(s => s.island !== homeIsland).length;
    shell.header.setSubtitle(`Adopt ideas from other islands · ${others} ${others === 1 ? 'seed' : 'seeds'}`);
    const showLock = filter != null && isLocked(filter);
    locked.hidden = !showLock;
    if (showLock) lockedText.textContent = `Adopt and plant a ${islandUi(filter).name} seed to unlock this bridge for 48 hours.`;
    empty.hidden = list.length > 0;
    empty.textContent = filter == null ? 'No seeds from other islands yet.' : `No ${islandUi(filter).name} seeds yet.`;
  }

  function setFilter(id) { filter = id; render(); }

  render();
  return {
    layer: shell.layer,
    panel: shell.panel,
    open({ island = null } = {}) { filter = island; render(); shell.open(); },
    close: shell.close,
    update(next) { data = next; render(); },
    setFilter,
  };
}
