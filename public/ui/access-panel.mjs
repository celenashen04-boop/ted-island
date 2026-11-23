// Island Access panel (Figma 21:3 wide, 21:148 phone, 21:379 selected, 21:559 empty).
// Right-side overlay. Wide screens show full cards; landscape phones (short
// viewports) show compact rows in a 440 px panel, as decided in Figma.
//
//   const access = createAccessPanel({
//     homeIsland: 0,
//     islands: [ { islandId, expiresAt, maturity, isHome }, ... ],   // see access-ring.mjs
//     onVisit: id => turnToward(id),
//     onUnlock: id => openCatalog({ island: id }),
//     onOpenCatalog: () => openCatalog(),
//   });
//   document.body.append(access.layer);
//   access.open();
//   access.update(islands);        // after an action; rings and numerals animate
//
// While open, the panel re-renders every 30 s so times count down.

import { el, icon, islandClass, islandUi } from './islands-ui.mjs';
import { openPanel, closePanel } from './motion.mjs';
import { createAccessCard, createAccessRow } from './access-ring.mjs';

const COMPACT_QUERY = '(max-height: 560px)';
const TICK_MS = 30 * 1000;

export function createAccessPanel({
  homeIsland, islands, onVisit, onUnlock, onOpenCatalog, onClose,
  layout = 'auto', contained = false, now = () => Date.now(),
}) {
  const home = islandUi(homeIsland);
  const titleId = `ui-access-title-${Math.random().toString(36).slice(2, 8)}`;

  const close = el('button', { type: 'button', class: 'ui-panel-header__close', 'aria-label': 'Close Island Access', title: 'Close' }, icon('close'));
  const header = el('header', { class: `ui-panel-header ${islandClass(homeIsland)}` },
    el('div', { class: 'ui-panel-header__row' },
      el('div', { class: 'ui-panel-header__text' },
        el('h2', { class: 'ui-panel-header__title', id: titleId }, 'Island Access'),
        el('p', { class: 'ui-panel-header__subtitle' }, `Home · ${home.name}`)),
      close),
    el('div', { class: 'ui-panel-header__rule', 'aria-hidden': 'true' }, el('i'), el('i'), el('i')));

  const intro = el('p', { class: 'ui-access__intro' }, 'Adopt, water, or nourish ideas to unlock other islands and extend your visits.');
  const cards = el('div', { class: 'ui-access__cards' });
  const rows = el('div', { class: 'ui-access__rows' });
  const empty = el('div', { class: 'ui-access__empty' },
    el('h3', { class: 'ui-access__empty-title' }, 'No other islands open yet'),
    el('p', { class: 'ui-access__empty-body' }, 'Adopt a seed from another island to open its bridge for 48 hours. Watering and nourishing its ideas adds more time.'),
    el('button', { type: 'button', class: 'ui-btn ui-access__empty-action', onclick: () => onOpenCatalog?.() },
      icon('seed'), el('span', { class: 'ui-btn__label' }, 'Open Seed Catalog')));
  const note = el('p', { class: 'ui-access__note' }, 'Every action adds time, up to 5 days per island.');

  const panel = el('aside', { class: 'ui-panel ui-panel--access', 'aria-labelledby': titleId, role: 'dialog', 'aria-modal': 'true' },
    el('div', { class: 'ui-access' }, header, intro, cards, rows, empty, note));
  const backdrop = el('div', { class: 'ui-backdrop' });
  const layer = el('div', { class: `ui-layer${contained ? ' ui-layer--contained' : ''}`, dataset: { state: 'closed' } }, backdrop, panel);

  const handlers = {
    onVisit: id => onVisit?.(id),
    onUnlock: id => onUnlock?.(id),
    onSelect: (id, on) => { if (on) for (const item of items.values()) if (item.islandId !== id) item.card.setSelected(false), item.row.setSelected(false); },
  };

  // One card and one row per island; CSS shows one set depending on layout.
  const items = new Map();
  let data = islands;

  function sorted(list) {
    return [...list].sort((a, b) => (b.isHome ? 1 : 0) - (a.isHome ? 1 : 0) || a.islandId - b.islandId);
  }

  function update(nextIslands = data) {
    data = nextIslands;
    const t = now();
    const list = sorted(data);
    for (const island of list) {
      const entry = { ...island, now: t };
      let item = items.get(island.islandId);
      if (!item) {
        item = { islandId: island.islandId, card: createAccessCard(entry, handlers), row: createAccessRow(entry, handlers) };
        items.set(island.islandId, item);
      } else {
        item.card.update(entry);
        item.row.update(entry);
      }
    }
    cards.replaceChildren(...list.map(i => items.get(i.islandId).card.element));
    rows.replaceChildren(...list.map(i => items.get(i.islandId).row.element));

    // Empty state: no island besides home has ever been opened.
    const isEmpty = list.every(i => i.isHome || i.expiresAt == null);
    panel.classList.toggle('is-empty', isEmpty);
    for (const i of list) {
      if (i.isHome) continue;
      items.get(i.islandId).card.element.hidden = isEmpty;
      items.get(i.islandId).row.element.hidden = isEmpty;
    }
  }

  // Layout: cards on wide screens, rows on short (landscape phone) screens.
  const media = matchMedia(COMPACT_QUERY);
  function applyLayout() {
    const compact = layout === 'rows' || (layout === 'auto' && media.matches);
    panel.classList.toggle('is-compact', compact);
  }
  media.addEventListener('change', applyLayout);
  applyLayout();

  let timer = 0;
  function open() {
    update();
    openPanel(layer);
    clearInterval(timer);
    timer = setInterval(() => update(), TICK_MS);
  }
  async function hide() {
    clearInterval(timer);
    await closePanel(layer);
    onClose?.();
  }
  close.addEventListener('click', hide);
  backdrop.addEventListener('click', hide);
  layer.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });

  update();
  return {
    layer,
    panel,
    open,
    close: hide,
    update,
    setLayout(next) { layout = next; applyLayout(); },
    item: id => items.get(id),
  };
}
